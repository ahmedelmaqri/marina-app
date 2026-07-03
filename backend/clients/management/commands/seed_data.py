from django.core.management.base import BaseCommand
from faker import Faker
from clients.models import Client
from bateaux.models import Bateau
from contrats.models import GrilleTarifaire
from quais.models import GroupeDePlaces, Place
import random

fake = Faker('fr_FR')


class Command(BaseCommand):
    help = 'Génère des données de test (clients, bateaux, grilles tarifaires, places)'

    def handle(self, *args, **options):
        # Grille tarifaire
        grille, _ = GrilleTarifaire.objects.get_or_create(
            nom='Tarif standard',
            defaults={
                'structure_tarifaire': 'journaliere',
                'tarif_base': 150.00,
                'taxe': 20.00,
            }
        )
        self.stdout.write(self.style.SUCCESS(f'Grille tarifaire: {grille}'))

        # Groupe de places + places
        groupe_places, _ = GroupeDePlaces.objects.get_or_create(
            nom='Ponton A',
            defaults={'type_bassin': 'Bassin de plaisance', 'total_inventaire': 20}
        )
        for i in range(1, 6):
            Place.objects.get_or_create(
                nom=f'A{i}',
                defaults={'type_place': 'Standard', 'groupe_de_places': groupe_places}
            )
        self.stdout.write(self.style.SUCCESS('5 places créées dans Ponton A'))

        # Clients + bateaux
        for i in range(5):
            client = Client.objects.create(
                type_client='physique',
                nom_prenom=fake.name(),
                email=fake.email(),
                telephone=fake.phone_number(),
                adresse=fake.address(),
                numero_passeport_cin=fake.bothify('??######'),
            )
            Bateau.objects.create(
                client=client,
                nom_navire=fake.word().capitalize() + ' ' + fake.word().capitalize(),
                type_bateau=random.choice(['Voilier', 'Yacht', 'Catamaran']),
                longueur=random.uniform(8, 20),
                largeur=random.uniform(2, 6),
                numero_immatriculation=fake.bothify('MA-####-??'),
            )
            self.stdout.write(self.style.SUCCESS(f'Client + bateau créés: {client}'))
            # Groupe de contrat + document
        from contrats.models import Document, GroupeDeContrat
        from reservations.models import Contrat
        from datetime import date, timedelta

        document, _ = Document.objects.get_or_create(
            nom='Règles de la marina',
            defaults={'fichier': 'documents_contrats/reglement.pdf'}
        )

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

        # Contrat de test avec le premier client/bateau créés
        premier_client = Client.objects.first()
        premier_bateau = Bateau.objects.filter(client=premier_client).first()

        if premier_client and premier_bateau:
            contrat = Contrat.objects.create(
                client=premier_client,
                bateau=premier_bateau,
                date_arrivee=date.today(),
                date_depart=date.today() + timedelta(days=365),
                grille_tarifaire=grille,
                groupe_contrat=groupe_contrat,
                statut='confirmee',
                statut_signature='a_envoyer',
            )
            self.stdout.write(self.style.SUCCESS(f'Contrat de test créé: {contrat} (id={contrat.id})'))
            # Test remise sur le contrat créé
        from reservations.models import Remise

        if contrat:
            prix_avant = contrat.prix_total
            self.stdout.write(self.style.SUCCESS(f'Prix AVANT remise: {prix_avant}'))

            remise = Remise.objects.create(
                reservation=contrat,
                appliquee_mise_a_quai=True,
                montant=10,
                unite='pourcentage',
                raison='Remise fidélité test',
            )

            contrat.refresh_from_db()
            self.stdout.write(self.style.SUCCESS(f'Prix APRES remise (-10%): {contrat.prix_total}'))

        self.stdout.write(self.style.SUCCESS('Terminé !'))