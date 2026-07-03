from django.db import models

# Create your models here.
from django.db import models
from clients.models import Client


class Bateau(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='bateaux')

    nom_navire = models.CharField(max_length=255)
    type_bateau = models.CharField(max_length=100, blank=True)
    modele = models.CharField(max_length=100, blank=True)
    port_attache = models.CharField(max_length=100, blank=True)

    longueur = models.DecimalField(max_digits=6, decimal_places=2)
    largeur = models.DecimalField(max_digits=6, decimal_places=2)
    tirant_eau = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)

    numero_immatriculation = models.CharField(max_length=50, blank=True)
    pavillon = models.CharField(max_length=100, blank=True)

    assurance = models.CharField(max_length=255, blank=True)
    numero_police = models.CharField(max_length=100, blank=True)
    echeance_assurance = models.DateField(blank=True, null=True)

    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nom_navire