"""
Tests de la logique métier de l'app reservations.

On teste ici le cœur du système : le calcul du prix (3 structures tarifaires),
l'affectation automatique de place, la libération des places à l'annulation,
le cycle de signature d'un contrat, et la synchronisation des paiements
après ajout d'une charge ou d'une remise.

Lancer tous les tests de cette app :
    python manage.py test reservations

Lancer une seule classe :
    python manage.py test reservations.tests.CalculerPrixTestCase
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from clients.models import Client
from bateaux.models import Bateau
from contrats.models import GrilleTarifaire, GroupeDeContrat
from quais.models import GroupeDePlaces, Place, Affectation
from reservations.models import (
    Escale, Contrat, ArticleCharge, Charge, Remise, ListeAttente, PaiementProgramme
)


def aware(d):
    return timezone.make_aware(timezone.datetime.combine(d, timezone.datetime.min.time()))


class BaseReservationTestCase(TestCase):
    """Fixtures communes à la plupart des tests de ce fichier."""

    def setUp(self):
        self.client_obj = Client.objects.create(
            type_client='physique',
            nom_prenom='Test Client',
            email='test.client@example.ma',
            telephone='+212600000000',
        )
        self.bateau = Bateau.objects.create(
            client=self.client_obj,
            nom_navire='Bateau Test',
            type_bateau='Voilier',
            longueur=Decimal('10.00'),
            largeur=Decimal('3.00'),
            tirant_eau=Decimal('1.50'),
        )
        self.groupe_places = GroupeDePlaces.objects.create(
            nom='Ponton Test',
            total_inventaire=3,
            longueur_min=0, longueur_max=12,
            largeur_min=0, largeur_max=4,
            tirant_eau_min=0, tirant_eau_max=2,
        )
        self.place_1 = Place.objects.create(nom='T1', groupe_de_places=self.groupe_places)
        self.place_2 = Place.objects.create(nom='T2', groupe_de_places=self.groupe_places)

        self.grille_journaliere = GrilleTarifaire.objects.create(
            nom='Journalière test', structure_tarifaire='journaliere',
            tarif_base=Decimal('100.00'), taxe=Decimal('20.00'),
        )
        self.grille_mensuelle = GrilleTarifaire.objects.create(
            nom='Mensuelle test', structure_tarifaire='mensuelle',
            tarif_base=Decimal('3000.00'), taxe=Decimal('20.00'),
        )
        self.grille_annuelle = GrilleTarifaire.objects.create(
            nom='Annuelle test', structure_tarifaire='annuelle',
            tarif_base=Decimal('30000.00'), taxe=Decimal('20.00'),
        )


class CalculerPrixTestCase(BaseReservationTestCase):
    """
    Vérifie que calculer_prix() fonctionne pour les 3 structures tarifaires
    sans lever de TypeError (Decimal * float) — c'est le bug rencontré en
    cours de projet sur les contrats mensuels/annuels.
    """

    def test_prix_journalier(self):
        escale = Escale.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_journaliere,
            date_arrivee=aware(date(2026, 8, 1)),
            date_depart=aware(date(2026, 8, 4)),  # 3 nuits
        )
        # 100 * 3 = 300, + 20% taxe = 360
        self.assertEqual(escale.prix_total, Decimal('360.00'))

    def test_prix_mensuel_ne_leve_pas_typeerror(self):
        contrat = Contrat.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_mensuelle,
            groupe_contrat=GroupeDeContrat.objects.create(
                nom='Groupe mensuel test', date_debut=date(2026, 1, 1), date_fin=date(2026, 12, 31),
            ),
            date_arrivee=aware(date(2026, 1, 1)),
            date_depart=aware(date(2026, 1, 31)),  # 30 jours
        )
        # 3000 * (30/30) = 3000, + 20% = 3600
        self.assertEqual(contrat.prix_total, Decimal('3600.00'))

    def test_prix_annuel_ne_leve_pas_typeerror(self):
        contrat = Contrat.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_annuelle,
            groupe_contrat=GroupeDeContrat.objects.create(
                nom='Groupe annuel test', date_debut=date(2026, 1, 1), date_fin=date(2026, 12, 31),
            ),
            date_arrivee=aware(date(2026, 1, 1)),
            date_depart=aware(date(2026, 12, 31)),  # 364 jours
        )
        # 30000 * (364/365) ≈ 29917.81, + 20% ≈ 35901.37
        attendu = round(Decimal('30000.00') * (Decimal(364) / Decimal(365)) * Decimal('1.20'), 2)
        self.assertEqual(contrat.prix_total, attendu)

    def test_date_depart_avant_arrivee_leve_erreur(self):
        with self.assertRaises(ValueError):
            Escale.objects.create(
                client=self.client_obj, bateau=self.bateau,
                grille_tarifaire=self.grille_journaliere,
                date_arrivee=aware(date(2026, 8, 10)),
                date_depart=aware(date(2026, 8, 5)),  # avant l'arrivée
            )


class AffectationAutomatiqueTestCase(BaseReservationTestCase):
    """Vérifie que la place est bien attribuée automatiquement à la création,
    et que deux réservations qui se chevauchent ne peuvent pas prendre la même place."""

    def test_affectation_creee_a_la_reservation(self):
        escale = Escale.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_journaliere,
            date_arrivee=aware(date(2026, 8, 1)),
            date_depart=aware(date(2026, 8, 4)),
        )
        self.assertEqual(escale.affectations.count(), 3)  # 3 nuits
        places_utilisees = set(escale.affectations.values_list('place_id', flat=True))
        self.assertEqual(len(places_utilisees), 1)  # toujours la même place pour tout le séjour

    def test_deuxieme_reservation_chevauchante_va_sur_une_autre_place(self):
        Escale.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_journaliere,
            date_arrivee=aware(date(2026, 8, 1)),
            date_depart=aware(date(2026, 8, 4)),
        )
        bateau_2 = Bateau.objects.create(
            client=self.client_obj, nom_navire='Bateau Test 2',
            type_bateau='Voilier', longueur=Decimal('9.00'),
            largeur=Decimal('3.00'), tirant_eau=Decimal('1.20'),
        )
        escale_2 = Escale.objects.create(
            client=self.client_obj, bateau=bateau_2,
            grille_tarifaire=self.grille_journaliere,
            date_arrivee=aware(date(2026, 8, 2)),  # chevauche la 1ère
            date_depart=aware(date(2026, 8, 5)),
        )
        place_1 = self.place_1
        place_2 = escale_2.affectations.first().place
        self.assertNotEqual(place_1, place_2)

    def test_aucune_place_disponible_va_en_liste_attente(self):
        # On sature les 2 seules places du groupe avec 2 réservations qui couvrent la même période
        for i in range(2):
            bateau = Bateau.objects.create(
                client=self.client_obj, nom_navire=f'Bateau saturant {i}',
                type_bateau='Voilier', longueur=Decimal('9.00'),
                largeur=Decimal('3.00'), tirant_eau=Decimal('1.20'),
            )
            Escale.objects.create(
                client=self.client_obj, bateau=bateau,
                grille_tarifaire=self.grille_journaliere,
                date_arrivee=aware(date(2026, 9, 1)),
                date_depart=aware(date(2026, 9, 4)),
            )

        self.assertEqual(ListeAttente.objects.count(), 0)

        bateau_de_trop = Bateau.objects.create(
            client=self.client_obj, nom_navire='Bateau de trop',
            type_bateau='Voilier', longueur=Decimal('9.00'),
            largeur=Decimal('3.00'), tirant_eau=Decimal('1.20'),
        )
        escale_de_trop = Escale.objects.create(
            client=self.client_obj, bateau=bateau_de_trop,
            grille_tarifaire=self.grille_journaliere,
            date_arrivee=aware(date(2026, 9, 1)),
            date_depart=aware(date(2026, 9, 4)),
        )
        self.assertEqual(escale_de_trop.affectations.count(), 0)
        self.assertEqual(ListeAttente.objects.count(), 1)


class LiberationPlacesTestCase(BaseReservationTestCase):
    """Vérifie que l'annulation libère bien les places futures, tout en gardant l'historique passé."""

    def test_annulation_libere_les_places_futures_uniquement(self):
        aujourdhui = timezone.now().date()
        escale = Escale.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_journaliere,
            date_arrivee=aware(aujourdhui - timedelta(days=2)),
            date_depart=aware(aujourdhui + timedelta(days=3)),  # 5 nuits, à cheval sur aujourd'hui
        )
        total_avant = escale.affectations.count()
        futures_avant = escale.affectations.filter(date__gte=aujourdhui).count()
        self.assertGreater(futures_avant, 0)

        # Reproduit exactement la logique de la vue annuler()
        escale.statut = 'annulee'
        escale.save()
        escale.affectations.filter(date__gte=aujourdhui).delete()

        self.assertEqual(escale.affectations.filter(date__gte=aujourdhui).count(), 0)
        self.assertEqual(
            escale.affectations.count(),
            total_avant - futures_avant,
            "Les affectations passées doivent être conservées pour l'historique.",
            )


class CycleSignatureContratTestCase(BaseReservationTestCase):
    """Vérifie les transitions de statut_signature d'un contrat."""

    def setUp(self):
        super().setUp()
        self.groupe_contrat = GroupeDeContrat.objects.create(
            nom='Groupe test cycle', date_debut=date(2026, 1, 1), date_fin=date(2026, 12, 31),
        )
        self.contrat = Contrat.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_mensuelle,
            groupe_contrat=self.groupe_contrat,
            date_arrivee=aware(date(2026, 6, 1)),
            date_depart=aware(date(2026, 6, 30)),
        )

    def test_contrat_demarre_a_envoyer(self):
        self.assertEqual(self.contrat.statut_signature, 'a_envoyer')

    def test_cycle_complet_envoyer_puis_signer(self):
        self.contrat.statut_signature = 'envoye'
        self.contrat.date_envoi = timezone.now()
        self.contrat.save()
        self.assertEqual(self.contrat.statut_signature, 'envoye')

        self.contrat.statut_signature = 'signe'
        self.contrat.date_signature = timezone.now()
        self.contrat.save()
        self.assertEqual(self.contrat.statut_signature, 'signe')
        self.assertIsNotNone(self.contrat.date_signature)


class SynchronisationPaiementTestCase(BaseReservationTestCase):
    """Vérifie que Charge et Remise mettent bien à jour prix_total et les PaiementProgramme."""

    def setUp(self):
        super().setUp()
        self.escale = Escale.objects.create(
            client=self.client_obj, bateau=self.bateau,
            grille_tarifaire=self.grille_journaliere,
            date_arrivee=aware(date(2026, 8, 1)),
            date_depart=aware(date(2026, 8, 4)),  # prix_total = 360.00
        )
        self.article = ArticleCharge.objects.create(
            nom='Nettoyage', categorie='services', taxe=Decimal('0'), prix=Decimal('50.00'),
        )

    def test_paiement_a_regler_cree_a_la_creation(self):
        paiement = self.escale.paiements.filter(type_paiement='a_regler').first()
        self.assertIsNotNone(paiement)
        self.assertEqual(paiement.montant, self.escale.prix_total)

    def test_ajout_charge_augmente_prix_et_paiement(self):
        prix_avant = self.escale.prix_total
        Charge.objects.create(reservation=self.escale, article=self.article, quantite=2)  # +100

        self.escale.refresh_from_db()
        self.assertEqual(self.escale.prix_total, prix_avant + Decimal('100.00'))

        paiement = self.escale.paiements.filter(type_paiement='a_regler').first()
        self.assertEqual(paiement.montant, self.escale.prix_total)

    def test_remise_pourcentage_diminue_prix(self):
        prix_avant = self.escale.prix_total
        Remise.objects.create(
            reservation=self.escale, appliquee_mise_a_quai=True,
            montant=Decimal('10'), unite='pourcentage', raison='Test',
        )
        self.escale.refresh_from_db()
        attendu = round(float(prix_avant) * 0.9, 2)
        self.assertEqual(float(self.escale.prix_total), attendu)

    def test_marquer_paiement_regle_supprime_le_a_regler(self):
        paiement = self.escale.paiements.filter(type_paiement='a_regler').first()
        paiement.type_paiement = 'regle'
        paiement.methode = 'carte'
        paiement.save()
        self.escale.synchroniser_paiement()

        self.assertEqual(self.escale.paiements.filter(type_paiement='a_regler').count(), 0)
        self.assertEqual(self.escale.paiements.filter(type_paiement='regle').count(), 1)