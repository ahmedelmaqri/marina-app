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

        self.stdout.write(self.style.SUCCESS('Terminé !'))