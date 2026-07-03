from django.db import models

# Create your models here.
from django.db import models


class GroupeDePlaces(models.Model):
    nom = models.CharField(max_length=100)
    type_bassin = models.CharField(max_length=100, blank=True)
    type_inventaire = models.CharField(max_length=100, blank=True)
    total_inventaire = models.IntegerField(blank=True, null=True)

    longueur_min = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    longueur_max = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    largeur_min = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    largeur_max = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    tirant_eau_min = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    tirant_eau_max = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return self.nom


class Place(models.Model):
    nom = models.CharField(max_length=50)
    type_place = models.CharField(max_length=100, blank=True)
    groupe_de_places = models.ForeignKey(
        GroupeDePlaces, on_delete=models.SET_NULL, null=True, blank=True, related_name='places'
    )

    def __str__(self):
        return self.nom

from reservations.models import Reservation


class Affectation(models.Model):
    STATUT_CHOICES = [
        ('present', 'Présent'),
        ('absent', 'Absent'),
        ('aucun', 'Ni présent ni absent'),
    ]

    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name='affectations')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='affectations')
    date = models.DateField()
    statut = models.CharField(max_length=10, choices=STATUT_CHOICES, default='aucun')

    date_maj = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('place', 'date')

    def __str__(self):
        return f"{self.place} - {self.date} ({self.statut})"