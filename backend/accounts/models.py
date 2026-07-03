from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    ROLE_CHOICES = [
        ('gestionnaire', 'Gestionnaire'),
        ('admin', 'Administrateur'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='gestionnaire')

    def __str__(self):
        return f"{self.username} ({self.role})"