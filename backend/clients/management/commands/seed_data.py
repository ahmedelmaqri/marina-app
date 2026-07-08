"""
Seed de données réaliste et cohérent pour la marina.

Principes suivis :
- Les bateaux ont des noms/modèles/assureurs réels et plausibles (pas de mots français
  aléatoires générés par Faker pour les entités "métier").
- Les dimensions des bateaux respectent réellement les plages définies par chaque
  GroupeDePlaces, pour que l'affectation automatique (Reservation.save() ->
  quais.services.affecter_place_automatiquement) place chaque bateau dans un ponton
  cohérent avec sa taille (petits voiliers -> Ponton A, bateaux moyens -> Ponton B,
  grosses unités / catamarans -> Ponton C, zone technique).
- Les dates sont calculées relativement à timezone.now(), pour que le seed reste
  logique (passé / en cours / futur) quel que soit le jour où il est lancé.
- Les statuts (Escale.statut, Contrat.statut_signature, PaiementProgramme.type_paiement)
  couvrent volontairement toutes les valeurs possibles, pour pouvoir tester chaque
  état de l'interface.
- Faker n'est utilisé que pour des données volontairement variables et sans impact
  métier (adresse, liste d'attente).
"""

from datetime import date, datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
import random

from accounts.models import Utilisateur
from clients.models import Client
from bateaux.models import Bateau
from contrats.models import Document, GrilleTarifaire, GroupeDeContrat, FraisRemiseGroupe
from quais.models import GroupeDePlaces, Place, Affectation
from reservations.models import (
    Escale, Contrat, ArticleCharge, Charge, Remise, ListeAttente, PaiementProgramme
)

fake = Faker('fr_FR')


def aware(d):
    """Convertit une date en datetime timezone-aware à minuit."""
    return timezone.make_aware(datetime.combine(d, datetime.min.time()))


class Command(BaseCommand):
    help = "Génère un jeu de données réaliste et cohérent pour la marina"

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help="Supprime les données existantes des apps métier avant de reseeder",
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.reset_data()

        self.seed_utilisateurs()
        grilles = self.seed_grilles_tarifaires()
        self.seed_places()
        articles = self.seed_articles_charge()
        documents = self.seed_documents()
        groupes_contrat = self.seed_groupes_contrat(documents, grilles)
        bateaux_par_client = self.seed_clients_et_bateaux()
        self.seed_escales(bateaux_par_client, grilles['journaliere'], articles)
        self.seed_contrats(bateaux_par_client, grilles, groupes_contrat)
        self.seed_liste_attente()

        self.stdout.write(self.style.SUCCESS('\nSeed terminé avec succès !'))

    # ------------------------------------------------------------------
    def reset_data(self):
        self.stdout.write(self.style.WARNING('Suppression des données existantes...'))
        Affectation.objects.all().delete()
        PaiementProgramme.objects.all().delete()
        Charge.objects.all().delete()
        Remise.objects.all().delete()
        ListeAttente.objects.all().delete()
        Contrat.objects.all().delete()
        Escale.objects.all().delete()
        Bateau.objects.all().delete()
        Client.objects.all().delete()
        Place.objects.all().delete()
        GroupeDePlaces.objects.all().delete()
        FraisRemiseGroupe.objects.all().delete()
        GroupeDeContrat.objects.all().delete()
        Document.objects.all().delete()
        ArticleCharge.objects.all().delete()
        GrilleTarifaire.objects.all().delete()

    # ------------------------------------------------------------------
    def seed_utilisateurs(self):
        admin, created = Utilisateur.objects.get_or_create(
            username='admin',
            defaults={'email': 'admin@marina.ma', 'role': 'admin', 'is_staff': True, 'is_superuser': True},
        )
        if created:
            admin.set_password('admin1234')
            admin.save()

        gestionnaire, created = Utilisateur.objects.get_or_create(
            username='gestionnaire1',
            defaults={'email': 'gestionnaire@marina.ma', 'role': 'gestionnaire', 'is_staff': True},
        )
        if created:
            gestionnaire.set_password('gestion1234')
            gestionnaire.save()

        self.stdout.write(self.style.SUCCESS('Utilisateurs: admin / gestionnaire1 créés'))

    def seed_grilles_tarifaires(self):
        journaliere, _ = GrilleTarifaire.objects.get_or_create(
            nom='Tarif journalier standard',
            defaults={'structure_tarifaire': 'journaliere', 'tarif_base': 150.00, 'taxe': 20.00},
        )
        mensuelle, _ = GrilleTarifaire.objects.get_or_create(
            nom='Tarif mensuel Ponton B',
            defaults={'structure_tarifaire': 'mensuelle', 'tarif_base': 3500.00, 'taxe': 20.00},
        )
        annuelle, _ = GrilleTarifaire.objects.get_or_create(
            nom='Tarif annuel zone technique',
            defaults={'structure_tarifaire': 'annuelle', 'tarif_base': 32000.00, 'taxe': 20.00},
        )
        grilles = {'journaliere': journaliere, 'mensuelle': mensuelle, 'annuelle': annuelle}
        self.stdout.write(self.style.SUCCESS('3 grilles tarifaires créées (journalière / mensuelle / annuelle)'))
        return grilles

    def seed_places(self):
        groupes = []
        places = []
        # (nom, type_bassin, nb_places, longueur_min, longueur_max, largeur_min, largeur_max, tirant_min, tirant_max)
        config = [
            ('Ponton A', 'Bassin de plaisance', 8, 0, 12, 0, 4, 0, 2),
            ('Ponton B', 'Bassin de plaisance', 6, 12, 20, 4, 6, 2, 3),
            ('Ponton C', 'Zone technique', 4, 0, 20, 0, 6, 0, 3),
        ]
        for nom, type_bassin, nb_places, l_min, l_max, la_min, la_max, t_min, t_max in config:
            groupe, _ = GroupeDePlaces.objects.get_or_create(
                nom=nom,
                defaults={
                    'type_bassin': type_bassin,
                    'total_inventaire': nb_places,
                    'longueur_min': l_min, 'longueur_max': l_max,
                    'largeur_min': la_min, 'largeur_max': la_max,
                    'tirant_eau_min': t_min, 'tirant_eau_max': t_max,
                }
            )
            groupes.append(groupe)
            for i in range(1, nb_places + 1):
                place, _ = Place.objects.get_or_create(
                    nom=f'{nom[-1]}{i}',
                    defaults={'type_place': 'Standard', 'groupe_de_places': groupe}
                )
                places.append(place)

        self.stdout.write(self.style.SUCCESS(f'{len(groupes)} groupes de places / {len(places)} places créés'))
        return groupes, places

    def seed_articles_charge(self):
        data = [
            ('Glaçons', 'autres', 0, 30.00),
            ('Compteur électrique', 'electricite', 5, 10.00),
            ('Nettoyage coque', 'services', 0, 500.00),
            ('Amarre supplémentaire', 'provisions', 7, 100.00),
            ('Frais équipage', 'autres', 0, 250.00),
        ]
        articles = []
        for nom, categorie, taxe, prix in data:
            article, _ = ArticleCharge.objects.get_or_create(
                nom=nom,
                defaults={'categorie': categorie, 'taxe': taxe, 'prix': prix}
            )
            articles.append(article)
        self.stdout.write(self.style.SUCCESS(f'{len(articles)} articles de charge créés'))
        return articles

    def seed_documents(self):
        reglement, _ = Document.objects.get_or_create(
            nom='Règles de la marina',
            defaults={'fichier': 'documents_contrats/reglement.pdf'}
        )
        cgv, _ = Document.objects.get_or_create(
            nom='Conditions générales de vente',
            defaults={'fichier': 'documents_contrats/cgv.pdf'}
        )
        return {'reglement': reglement, 'cgv': cgv}

    def seed_groupes_contrat(self, documents, grilles):
        annuel, _ = GroupeDeContrat.objects.get_or_create(
            nom='Contrats annuels — Zone technique',
            defaults={
                'date_debut': date(2026, 1, 1),
                'date_fin': date(2026, 12, 31),
                'type_espace': 'Zone technique',
                'grille_tarifaire': grilles['annuelle'],
                'structure_tarifaire': 'annuelle',
                'taxe': 20.00,
                'cycle_facturation': 'debut_mois',
                'renouvellement_automatique': True,
            }
        )
        annuel.documents.add(documents['reglement'], documents['cgv'])
        FraisRemiseGroupe.objects.get_or_create(
            groupe=annuel, categorie='eau_electricite', nom='Forfait eau/électricité annuel',
            defaults={'prix': 1200.00}
        )
        FraisRemiseGroupe.objects.get_or_create(
            groupe=annuel, categorie='remise', nom='Remise fidélité 2e année',
            defaults={'prix': 5.00}
        )

        mensuel, _ = GroupeDeContrat.objects.get_or_create(
            nom='Contrats mensuels — Ponton B',
            defaults={
                'date_debut': date(2026, 1, 1),
                'date_fin': date(2026, 12, 31),
                'type_espace': 'Bassin de plaisance',
                'grille_tarifaire': grilles['mensuelle'],
                'structure_tarifaire': 'mensuelle',
                'taxe': 20.00,
                'cycle_facturation': 'avance',
            }
        )
        mensuel.documents.add(documents['reglement'])
        FraisRemiseGroupe.objects.get_or_create(
            groupe=mensuel, categorie='frais', nom='Frais de dossier',
            defaults={'prix': 300.00}
        )

        self.stdout.write(self.style.SUCCESS('2 groupes de contrat créés (annuel / mensuel) avec frais & remises'))
        return {'annuel': annuel, 'mensuel': mensuel}

    def seed_clients_et_bateaux(self):
        """
        Chaque bateau est dimensionné pour correspondre réellement à un ponton :
        - Ponton A (0-12m, 0-4m larg., 0-2m tirant)  -> petits voiliers
        - Ponton B (12-20m, 4-6m larg., 2-3m tirant) -> unités moyennes
        - Ponton C (0-20m, 0-6m larg., 0-3m tirant, zone technique) -> gros bateaux / catamarans
        """
        cast = [
            # (type_client, identite, email, tel, nom_navire, type_bateau, modele,
            #  longueur, largeur, tirant_eau, assurance, numero_police, echeance_jours)
            ('physique', 'Yasmine El Fassi', 'yasmine.elfassi@example.ma', '+212 661 234 567',
             'Zéphyr', 'Voilier', 'Bavaria Cruiser 34', 10.50, 3.40, 1.60,
             'Saham Assurance', 'POL-448210', 300),
            ('physique', 'Karim Bennani', 'karim.bennani@example.ma', '+212 662 345 678',
             'Atlantica', 'Voilier', 'Bénéteau Océanis 38', 11.80, 3.90, 1.90,
             'Wafa Assurance', 'POL-448322', 210),
            ('physique', 'Hicham Tazi', 'hicham.tazi@example.ma', '+212 663 456 789',
             'Étoile du Sud', 'Voilier', 'Hanse 388', 11.20, 3.70, 1.50,
             'RMA Assurance', 'POL-448455', 90),
            ('physique', 'Sofia Radi', 'sofia.radi@example.ma', '+212 664 567 890',
             'Bella Vita', 'Bateau à moteur', 'Princess V50', 15.80, 4.60, 2.30,
             'AXA Maroc', 'POL-448560', 400),
            ('physique', 'Nadia Chraibi', 'nadia.chraibi@example.ma', '+212 665 678 901',
             'Océane', 'Voilier', 'Jeanneau Sun Odyssey 410', 12.40, 4.20, 2.10,
             'Saham Assurance', 'POL-448671', 150),
            ('physique', 'Yassine Amrani', 'yassine.amrani@example.ma', '+212 666 789 012',
             'Poséidon II', 'Bateau à moteur', 'Fairline Targa 48', 14.80, 4.30, 2.40,
             'Wafa Assurance', 'POL-448782', 60),
            ('physique', 'Omar Idrissi', 'omar.idrissi@example.ma', '+212 667 890 123',
             'Le Corsaire', 'Voilier', 'Dufour 430', 13.10, 4.10, 2.00,
             'RMA Assurance', 'POL-448893', 250),
            ('morale', 'Atlas Charters SARL', 'contact@atlascharters.ma', '+212 522 123 456',
             'Ocean Breeze', 'Catamaran', 'Lagoon 40', 12.00, 5.80, 1.10,
             'AXA Maroc', 'POL-449004', 500),
            ('morale', 'Blue Horizon Yachting', 'contact@bluehorizon.ma', '+212 522 234 567',
             'Azur Dream', 'Yacht', 'Sunseeker Manhattan 60', 18.30, 5.20, 1.60,
             'Saham Assurance', 'POL-449115', 500),
        ]

        bateaux_par_client = {}
        for (type_client, identite, email, tel, nom_navire, type_bateau, modele,
             longueur, largeur, tirant_eau, assurance, police, echeance_jours) in cast:

            if type_client == 'physique':
                client, _ = Client.objects.get_or_create(
                    email=email,
                    defaults={
                        'type_client': 'physique',
                        'nom_prenom': identite,
                        'telephone': tel,
                        'adresse': fake.address().replace('\n', ', '),
                        'numero_passeport_cin': fake.bothify('??######').upper(),
                    }
                )
            else:
                client, _ = Client.objects.get_or_create(
                    email=email,
                    defaults={
                        'type_client': 'morale',
                        'raison_sociale': identite,
                        'telephone': tel,
                        'siege_social': fake.address().replace('\n', ', '),
                        'registre_commerce': fake.bothify('RC-#####'),
                    }
                )

            bateau, _ = Bateau.objects.get_or_create(
                nom_navire=nom_navire,
                client=client,
                defaults={
                    'type_bateau': type_bateau,
                    'modele': modele,
                    'port_attache': 'Tanger',
                    'longueur': longueur,
                    'largeur': largeur,
                    'tirant_eau': tirant_eau,
                    'numero_immatriculation': fake.bothify('MA-####-??').upper(),
                    'pavillon': 'Maroc',
                    'assurance': assurance,
                    'numero_police': police,
                    'echeance_assurance': date.today() + timedelta(days=echeance_jours),
                }
            )
            bateaux_par_client[nom_navire] = {'client': client, 'bateau': bateau}

        self.stdout.write(self.style.SUCCESS(f'{len(cast)} clients + bateaux créés (dimensions cohérentes par ponton)'))
        return bateaux_par_client

    def seed_escales(self, bateaux, grille_journaliere, articles):
        maintenant = timezone.now()
        aujourdhui = timezone.now().date()

        # (nom_navire, jours_arrivee_relatifs, duree_nuits, statut, electricite_eau, methode_paiement)
        plan = [
            ('Zéphyr', -10, 3, 'facturee', 'eau_electricite', 'carte'),
            ('Atlantica', -5, 2, 'a_facturer', 'eau', 'espece'),
            ('Étoile du Sud', -1, 3, 'en_cours', 'aucun', 'virement'),
            ('Bella Vita', 3, 4, 'confirmee', 'eau_electricite', 'carte'),
            ('Poséidon II', 10, 1, 'confirmee', 'aucun', 'cheque'),
            ('Zéphyr', 20, 2, 'confirmee', 'eau', 'carte'),
            ('Atlantica', 15, 1, 'annulee', 'aucun', 'espece'),
        ]

        escales = []
        for nom_navire, jours_arrivee, duree, statut, elec, methode in plan:
            infos = bateaux[nom_navire]
            arrivee = aware(aujourdhui + timedelta(days=jours_arrivee))
            depart = arrivee + timedelta(days=duree)

            escale = Escale.objects.create(
                client=infos['client'],
                bateau=infos['bateau'],
                grille_tarifaire=grille_journaliere,
                date_arrivee=arrivee,
                date_depart=depart,
                longueur=infos['bateau'].longueur,
                largeur=infos['bateau'].largeur,
                statut='confirmee',  # posé confirmée puis ajusté ci-dessous comme le ferait l'appli
                electricite_eau=elec,
                methode_paiement=methode,
            )

            if statut != 'confirmee':
                escale.statut = statut
                escale.save()

            escales.append(escale)

        # Charge + remise sur l'escale à venir de Bella Vita, pour valider l'impact sur le prix
        bella = next(e for e in escales if e.bateau.nom_navire == 'Bella Vita')
        prix_avant = bella.prix_total
        Charge.objects.create(reservation=bella, article=articles[2], quantite=1)  # Nettoyage coque
        Charge.objects.create(reservation=bella, article=articles[0], quantite=2)  # Glaçons
        Remise.objects.create(
            reservation=bella, appliquee_mise_a_quai=True,
            montant=10, unite='pourcentage', raison='Client fidèle depuis 3 ans',
        )
        bella.refresh_from_db()
        self.stdout.write(self.style.SUCCESS(
            f'Escale Bella Vita — prix avant charges/remise: {prix_avant} / après: {bella.prix_total}'
        ))

        # Escale passée déjà facturée -> on marque son paiement comme réglé (historique cohérent)
        zephyr_passee = escales[0]
        paiement = zephyr_passee.paiements.filter(type_paiement='a_regler').first()
        if paiement:
            paiement.type_paiement = 'regle'
            paiement.methode = 'carte'
            paiement.date_traitement = (aujourdhui + timedelta(days=-7))
            paiement.save()
            zephyr_passee.synchroniser_paiement()

        self.stdout.write(self.style.SUCCESS(f'{len(escales)} escales créées (statuts variés, historique cohérent)'))
        return escales

    def seed_contrats(self, bateaux, grilles, groupes_contrat):
        maintenant = timezone.now()
        aujourdhui = timezone.now().date()
        contrats = []

        # 1. Contrat annuel signé, en cours (zone technique) — Le Corsaire
        c1 = Contrat.objects.create(
            client=bateaux['Le Corsaire']['client'],
            bateau=bateaux['Le Corsaire']['bateau'],
            grille_tarifaire=grilles['annuelle'],
            groupe_contrat=groupes_contrat['annuel'],
            date_arrivee=aware(date(2026, 1, 1)),
            date_depart=aware(date(2026, 12, 31)),
            longueur=bateaux['Le Corsaire']['bateau'].longueur,
            largeur=bateaux['Le Corsaire']['bateau'].largeur,
            statut='confirmee',
            statut_signature='envoye',
        )
        c1.date_envoi = aware(date(2025, 12, 20))
        c1.statut_signature = 'signe'
        c1.date_signature = aware(date(2025, 12, 22))
        c1.save()
        contrats.append(c1)

        # 2. Contrat annuel pas encore envoyé — Ocean Breeze
        c2 = Contrat.objects.create(
            client=bateaux['Ocean Breeze']['client'],
            bateau=bateaux['Ocean Breeze']['bateau'],
            grille_tarifaire=grilles['annuelle'],
            groupe_contrat=groupes_contrat['annuel'],
            date_arrivee=aware(date(2026, 1, 1)),
            date_depart=aware(date(2026, 12, 31)),
            longueur=bateaux['Ocean Breeze']['bateau'].longueur,
            largeur=bateaux['Ocean Breeze']['bateau'].largeur,
            statut='confirmee',
            statut_signature='a_envoyer',
        )
        contrats.append(c2)

        # 3. Contrat mensuel envoyé, en attente de signature — Azur Dream
        c3 = Contrat.objects.create(
            client=bateaux['Azur Dream']['client'],
            bateau=bateaux['Azur Dream']['bateau'],
            grille_tarifaire=grilles['mensuelle'],
            groupe_contrat=groupes_contrat['mensuel'],
            date_arrivee=aware(date(2026, 7, 1)),
            date_depart=aware(date(2026, 7, 31)),
            longueur=bateaux['Azur Dream']['bateau'].longueur,
            largeur=bateaux['Azur Dream']['bateau'].largeur,
            statut='confirmee',
            statut_signature='envoye',
        )
        c3.date_envoi = aware(aujourdhui + timedelta(days=-2))
        c3.save()
        contrats.append(c3)

        # 4. Historique de contrats mensuels pour Océane : un archivé (année précédente)
        c4 = Contrat.objects.create(
            client=bateaux['Océane']['client'],
            bateau=bateaux['Océane']['bateau'],
            grille_tarifaire=grilles['mensuelle'],
            groupe_contrat=groupes_contrat['mensuel'],
            date_arrivee=aware(date(2025, 6, 1)),
            date_depart=aware(date(2025, 6, 30)),
            longueur=bateaux['Océane']['bateau'].longueur,
            largeur=bateaux['Océane']['bateau'].largeur,
            statut='facturee',
            statut_signature='envoye',
        )
        c4.date_envoi = aware(date(2025, 5, 25))
        c4.date_signature = aware(date(2025, 5, 27))
        c4.statut_signature = 'archive'
        c4.save()
        contrats.append(c4)

        paiement_c4 = c4.paiements.filter(type_paiement='a_regler').first()
        if paiement_c4:
            paiement_c4.type_paiement = 'regle'
            paiement_c4.methode = 'virement'
            paiement_c4.date_traitement = date(2025, 6, 5)
            paiement_c4.save()
            c4.synchroniser_paiement()

        # ... et un second, résilié en cours d'année (le client a quitté la marina plus tôt que prévu)
        c5 = Contrat.objects.create(
            client=bateaux['Océane']['client'],
            bateau=bateaux['Océane']['bateau'],
            grille_tarifaire=grilles['mensuelle'],
            groupe_contrat=groupes_contrat['mensuel'],
            date_arrivee=aware(date(2026, 2, 1)),
            date_depart=aware(date(2026, 2, 28)),
            longueur=bateaux['Océane']['bateau'].longueur,
            largeur=bateaux['Océane']['bateau'].largeur,
            statut='annulee',
            statut_signature='envoye',
            note='Résilié anticipativement : le client a changé de port d\'attache.',
        )
        c5.date_envoi = aware(date(2026, 1, 25))
        c5.date_signature = aware(date(2026, 1, 27))
        c5.statut_signature = 'resilie'
        c5.save()
        contrats.append(c5)

        self.stdout.write(self.style.SUCCESS(
            f'{len(contrats)} contrats créés (statuts a_envoyer / envoyé / signé / archivé / résilié)'
        ))
        return contrats

    def seed_liste_attente(self):
        entrees = [
            ('Réda Chakiri', 'reda.chakiri@example.ma', '+212 668 111 222', 16.5, 5.0, 'Yacht'),
            ('Meriem Alaoui', 'meriem.alaoui@example.ma', '+212 669 222 333', 9.8, 3.2, 'Voilier'),
        ]
        aujourdhui = date.today()
        for nom, email, tel, longueur, largeur, type_bateau in entrees:
            ListeAttente.objects.get_or_create(
                email=email,
                defaults={
                    'nom_prenom': nom,
                    'telephone': tel,
                    'longueur': longueur,
                    'largeur': largeur,
                    'type_bateau': type_bateau,
                    'date_arrivee': aujourdhui + timedelta(days=random.randint(5, 20)),
                    'date_depart': aujourdhui + timedelta(days=random.randint(21, 35)),
                    'requete_speciale': "Toutes les places compatibles avec ce gabarit sont actuellement occupées.",
                }
            )
        self.stdout.write(self.style.SUCCESS(f'{len(entrees)} entrées liste d\'attente créées'))