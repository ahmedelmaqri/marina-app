from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
import random

from accounts.models import Utilisateur
from clients.models import Client
from bateaux.models import Bateau
from contrats.models import Document, GrilleTarifaire, GroupeDeContrat
from quais.models import GroupeDePlaces, Place, Affectation
from reservations.models import (
    Escale, Contrat, ArticleCharge, Charge, Remise, ListeAttente, PaiementProgramme
)

fake = Faker('fr_FR')


class Command(BaseCommand):
    help = "Génère un jeu de données de test complet pour la marina"

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help="Supprime les données existantes des apps métier avant de reseeder",
        )

    def handle(self, *args, **options):
        if options['reset']:
            self.reset_data()

        utilisateurs = self.seed_utilisateurs()
        grille = self.seed_grille_tarifaire()
        groupes_places, places = self.seed_places()
        articles = self.seed_articles_charge()
        document = self.seed_document()
        groupe_contrat = self.seed_groupe_contrat(document, grille)
        clients = self.seed_clients_et_bateaux()
        escales = self.seed_escales(clients, grille, articles)
        contrats = self.seed_contrats(clients, grille, groupe_contrat)
        self.seed_liste_attente(clients)
        self.seed_affectations(places, escales, contrats)
        self.seed_paiements(escales, contrats)

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
        GroupeDeContrat.objects.all().delete()
        ArticleCharge.objects.all().delete()
        Document.objects.all().delete()
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
        return {'admin': admin, 'gestionnaire': gestionnaire}

    def seed_grille_tarifaire(self):
        grille, _ = GrilleTarifaire.objects.get_or_create(
            nom='Tarif standard',
            defaults={
                'structure_tarifaire': 'journaliere',
                'tarif_base': 150.00,
                'taxe': 20.00,
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Grille tarifaire: {grille}'))
        return grille

    def seed_places(self):
        groupes = []
        places = []
        config = [
            ('Ponton A', 'Bassin de plaisance', 8),
            ('Ponton B', 'Bassin de plaisance', 6),
            ('Ponton C', 'Zone technique', 4),
        ]
        for nom, type_bassin, nb_places in config:
            groupe, _ = GroupeDePlaces.objects.get_or_create(
                nom=nom,
                defaults={'type_bassin': type_bassin, 'total_inventaire': nb_places}
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
            ('Nettoyage', 'services', 0, 500.00),
            ('Corde', 'provisions', 7, 100.00),
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

    def seed_document(self):
        document, _ = Document.objects.get_or_create(
            nom='Règles de la marina',
            defaults={'fichier': 'documents_contrats/reglement.pdf'}
        )
        return document

    def seed_groupe_contrat(self, document, grille):
        groupe_contrat, _ = GroupeDeContrat.objects.get_or_create(
            nom='Contrats annuels 2026',
            defaults={
                'date_debut': date(2026, 1, 1),
                'date_fin': date(2026, 12, 31),
                'type_espace': 'Bassin de plaisance',
                'grille_tarifaire': grille,
                'cycle_facturation': 'debut_mois',
            }
        )
        groupe_contrat.documents.add(document)
        self.stdout.write(self.style.SUCCESS(f'Groupe de contrat: {groupe_contrat}'))
        return groupe_contrat

    def seed_clients_et_bateaux(self):
        clients = []
        for _ in range(6):
            client = Client.objects.create(
                type_client='physique',
                nom_prenom=fake.name(),
                email=fake.unique.email(),
                telephone=fake.phone_number(),
                adresse=fake.address(),
                numero_passeport_cin=fake.bothify('??######'),
            )
            clients.append(client)

        for _ in range(2):
            client = Client.objects.create(
                type_client='morale',
                raison_sociale=fake.company(),
                email=fake.unique.email(),
                telephone=fake.phone_number(),
                siege_social=fake.address(),
                registre_commerce=fake.bothify('RC-#####'),
            )
            clients.append(client)

        for client in clients:
            Bateau.objects.create(
                client=client,
                nom_navire=fake.word().capitalize() + ' ' + fake.word().capitalize(),
                type_bateau=random.choice(['Voilier', 'Yacht', 'Catamaran']),
                modele=fake.word().capitalize(),
                port_attache='Tanger',
                longueur=round(random.uniform(8, 20), 2),
                largeur=round(random.uniform(2, 6), 2),
                tirant_eau=round(random.uniform(1, 3), 2),
                numero_immatriculation=fake.bothify('MA-####-??'),
                pavillon='Maroc',
                assurance=fake.company(),
                numero_police=fake.bothify('POL-######'),
                echeance_assurance=date.today() + timedelta(days=365),
            )

        self.stdout.write(self.style.SUCCESS(f'{len(clients)} clients + bateaux créés'))
        return clients

    def seed_escales(self, clients, grille, articles):
        escales = []
        aujourdhui = timezone.now()

        for i, client in enumerate(clients[:5]):
            bateau = client.bateaux.first()
            arrivee = aujourdhui + timedelta(days=i)
            depart = arrivee + timedelta(days=random.randint(1, 5))

            escale = Escale.objects.create(
                client=client,
                bateau=bateau,
                grille_tarifaire=grille,
                date_arrivee=arrivee,
                date_depart=depart,
                longueur=bateau.longueur,
                largeur=bateau.largeur,
                statut='confirmee',
                electricite_eau=random.choice(['eau', 'electricite', 'eau_electricite', 'aucun']),
                methode_paiement=random.choice(['carte', 'espece', 'virement', 'cheque']),
            )
            escales.append(escale)

            # Une charge sur la première escale, pour valider l'impact sur le prix
            if i == 0:
                prix_avant = escale.prix_total
                Charge.objects.create(
                    reservation=escale,
                    article=articles[2],  # Nettoyage
                    quantite=1,
                )
                Charge.objects.create(
                    reservation=escale,
                    article=articles[0],  # Glaçons
                    quantite=2,
                )
                escale.refresh_from_db()
                self.stdout.write(self.style.SUCCESS(
                    f'Escale #{escale.id} - prix avant charges: {prix_avant} / après: {escale.prix_total}'
                ))

            # Une remise sur la deuxième escale
            if i == 1:
                prix_avant = escale.prix_total
                Remise.objects.create(
                    reservation=escale,
                    appliquee_mise_a_quai=True,
                    montant=10,
                    unite='pourcentage',
                    raison='Remise fidélité test',
                )
                escale.refresh_from_db()
                self.stdout.write(self.style.SUCCESS(
                    f'Escale #{escale.id} - prix avant remise: {prix_avant} / après: {escale.prix_total}'
                ))

        self.stdout.write(self.style.SUCCESS(f'{len(escales)} escales créées'))
        return escales

    def seed_contrats(self, clients, grille, groupe_contrat):
        contrats = []
        statuts = ['a_envoyer', 'envoye', 'signe']
        aujourdhui = timezone.now()

        for i, client in enumerate(clients[5:8] if len(clients) > 7 else clients[:2]):
            bateau = client.bateaux.first()
            contrat = Contrat.objects.create(
                client=client,
                bateau=bateau,
                grille_tarifaire=grille,
                groupe_contrat=groupe_contrat,
                date_arrivee=aujourdhui,
                date_depart=aujourdhui + timedelta(days=365),
                longueur=bateau.longueur,
                largeur=bateau.largeur,
                statut='confirmee',
                statut_signature=statuts[i % len(statuts)],
            )
            if contrat.statut_signature in ('envoye', 'signe'):
                contrat.date_envoi = aujourdhui
            if contrat.statut_signature == 'signe':
                contrat.date_signature = aujourdhui
            contrat.save()
            contrats.append(contrat)

        self.stdout.write(self.style.SUCCESS(f'{len(contrats)} contrats créés'))
        return contrats

    def seed_liste_attente(self, clients):
        for _ in range(3):
            ListeAttente.objects.create(
                client=random.choice(clients),
                nom_prenom=fake.name(),
                email=fake.email(),
                telephone=fake.phone_number(),
                longueur=round(random.uniform(8, 20), 2),
                largeur=round(random.uniform(2, 6), 2),
                type_bateau=random.choice(['Voilier', 'Yacht', 'Catamaran']),
                date_arrivee=date.today() + timedelta(days=random.randint(5, 20)),
                date_depart=date.today() + timedelta(days=random.randint(21, 30)),
                requete_speciale=fake.sentence(),
            )
        self.stdout.write(self.style.SUCCESS('3 entrées liste d\'attente créées'))

    def seed_affectations(self, places, escales, contrats):
        toutes_reservations = list(escales) + list(contrats)
        count = 0
        for reservation in toutes_reservations:
            place = random.choice(places)
            date_arrivee = reservation.date_arrivee.date()
            date_depart = reservation.date_depart.date()
            jour = date_arrivee
            while jour < date_depart and (jour - date_arrivee).days < 3:
                Affectation.objects.get_or_create(
                    place=place,
                    date=jour,
                    defaults={'reservation': reservation, 'statut': random.choice(['present', 'absent', 'aucun'])}
                )
                count += 1
                jour += timedelta(days=1)
        self.stdout.write(self.style.SUCCESS(f'{count} affectations créées'))

    def seed_paiements(self, escales, contrats):
        # PaiementProgramme est désormais généré automatiquement via
        # Reservation.synchroniser_paiement() (appelée dans save()).
        # On se contente ici de vérifier / afficher ce qui a été créé.
        count = 0
        for reservation in list(escales) + list(contrats):
            count += reservation.paiements.count()
        self.stdout.write(self.style.SUCCESS(f'{count} paiements programmés générés automatiquement'))