from django.db import models

# Create your models here.
from django.db import models


class Client(models.Model):
    TYPE_CHOICES = [
        ('physique', 'Personne physique'),
        ('morale', 'Personne morale'),
    ]

    type_client = models.CharField(max_length=10, choices=TYPE_CHOICES)

    # Personne physique
    nom_prenom = models.CharField(max_length=255, blank=True)
    numero_passeport_cin = models.CharField(max_length=50, blank=True)
    adresse = models.CharField(max_length=255, blank=True)

    # Personne morale
    raison_sociale = models.CharField(max_length=255, blank=True)
    registre_commerce = models.CharField(max_length=50, blank=True)
    siege_social = models.CharField(max_length=255, blank=True)

    # Commun
    email = models.EmailField()
    telephone = models.CharField(max_length=20)

    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.type_client == 'physique':
            return self.nom_prenom
        return self.raison_sociale