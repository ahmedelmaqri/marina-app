from django.db import models
from clients.models import Client
from reservations.models import Reservation
import uuid


def upload_path_document_client(instance, filename):
    return f'documents_clients/client_{instance.client_id}/{filename}'


class DocumentClient(models.Model):
    TYPE_CHOICES = [
        ('permis_navigation', 'Permis de navigation'),
        ('assurance', 'Assurance bateau'),
        ('piece_identite', "Pièce d'identité"),
        ('autre', 'Autre'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='documents_client')
    type_document = models.CharField(max_length=30, choices=TYPE_CHOICES, default='autre')
    fichier = models.FileField(upload_to=upload_path_document_client)
    nom_original = models.CharField(max_length=255, blank=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.nom_original and self.fichier:
            self.nom_original = self.fichier.name
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_type_document_display()} - {self.client}"


class Facture(models.Model):
    STATUT_CHOICES = [
        ('impayee', 'Impayée'),
        ('payee', 'Payée'),
        ('annulee', 'Annulée'),
    ]

    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name='factures')
    numero = models.CharField(max_length=30, unique=True, editable=False)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='impayee')
    date_emission = models.DateTimeField(auto_now_add=True)
    date_paiement = models.DateTimeField(blank=True, null=True)
    pdf = models.FileField(upload_to='factures/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.numero:
            self.numero = f"FAC-{self.reservation.id}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.numero} ({self.get_statut_display()})"


class PaiementStripe(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('reussi', 'Réussi'),
        ('echoue', 'Échoué'),
    ]

    facture = models.ForeignKey(Facture, on_delete=models.CASCADE, related_name='paiements_stripe')
    stripe_session_id = models.CharField(max_length=255, blank=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_attente')
    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Paiement {self.montant} - {self.facture.numero}"