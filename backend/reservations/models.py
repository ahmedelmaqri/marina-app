from django.db import models

# Create your models here.
from django.db import models
from clients.models import Client
from bateaux.models import Bateau
from contrats.models import GroupeDeContrat


class Reservation(models.Model):
    STATUT_CHOICES = [
        ('confirmee', 'Confirmée'),
        ('annulee', 'Annulée'),
        ('en_cours', 'En cours'),
        ('a_facturer', 'A facturer'),
        ('facturee', 'Facturée'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='reservations')
    bateau = models.ForeignKey(Bateau, on_delete=models.CASCADE, related_name='reservations')

    date_arrivee = models.DateTimeField()
    date_depart = models.DateTimeField()

    longueur = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    largeur = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)

    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='confirmee')
    prix_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    note = models.TextField(blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_confirmation = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Réservation #{self.id} - {self.client}"


class Escale(Reservation):
    ELECTRICITE_CHOICES = [
        ('eau', 'Eau'),
        ('electricite', 'Electricité'),
        ('eau_electricite', 'Eau et Electricité'),
        ('aucun', 'Aucun'),
    ]
    METHODE_PAIEMENT_CHOICES = [
        ('carte', 'Carte bancaire'),
        ('espece', 'Espèce'),
        ('virement', 'Virement'),
        ('cheque', 'Chèque'),
    ]

    requete_speciale = models.TextField(blank=True)
    electricite_eau = models.CharField(max_length=20, choices=ELECTRICITE_CHOICES, blank=True)
    methode_paiement = models.CharField(max_length=20, choices=METHODE_PAIEMENT_CHOICES, blank=True)

    def __str__(self):
        return f"Escale #{self.id} - {self.client}"


class Contrat(Reservation):
    STATUT_SIGNATURE_CHOICES = [
        ('a_envoyer', 'A envoyer'),
        ('envoye', 'Envoyé'),
        ('signe', 'Signé'),
        ('archive', 'Archivé'),
        ('resilie', 'Résilié'),
    ]

    groupe_contrat = models.ForeignKey(GroupeDeContrat, on_delete=models.PROTECT, related_name='contrats')
    statut_signature = models.CharField(max_length=20, choices=STATUT_SIGNATURE_CHOICES, default='a_envoyer')
    date_envoi = models.DateTimeField(blank=True, null=True)
    date_signature = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Contrat #{self.id} - {self.client}"



class ArticleCharge(models.Model):
    CATEGORIE_CHOICES = [
        ('electricite', 'Electricité'),
        ('provisions', 'Provisions'),
        ('services', 'Services'),
        ('autres', 'Autres'),
    ]

    nom = models.CharField(max_length=100)
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES)
    taxe = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    prix = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.nom


class Charge(models.Model):
    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name='charges')
    article = models.ForeignKey(ArticleCharge, on_delete=models.PROTECT)
    quantite = models.PositiveIntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.article} x{self.quantite} ({self.reservation})"


class Remise(models.Model):
    UNITE_CHOICES = [
        ('devise', 'Devise'),
        ('pourcentage', 'Pourcentage'),
    ]

    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name='remises')

    appliquee_mise_a_quai = models.BooleanField(default=False)
    appliquee_electricite = models.BooleanField(default=False)

    montant = models.DecimalField(max_digits=10, decimal_places=2)
    unite = models.CharField(max_length=15, choices=UNITE_CHOICES)

    jours_gratuits = models.PositiveIntegerField(blank=True, null=True)
    raison = models.TextField(blank=True)

    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Remise {self.montant}{self.unite} ({self.reservation})"

class ListeAttente(models.Model):
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name='liste_attente')

    nom_prenom = models.CharField(max_length=255)
    email = models.EmailField()
    telephone = models.CharField(max_length=20)

    longueur = models.DecimalField(max_digits=6, decimal_places=2)
    largeur = models.DecimalField(max_digits=6, decimal_places=2)
    type_bateau = models.CharField(max_length=100, blank=True)

    date_arrivee = models.DateField()
    date_depart = models.DateField()

    requete_speciale = models.TextField(blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nom_prenom} ({self.date_arrivee} - {self.date_depart})"

class PaiementProgramme(models.Model):
    TYPE_CHOICES = [
        ('a_regler', 'A régler'),
        ('regle', 'Réglé'),
        ('rembourse', 'Remboursé'),
    ]
    METHODE_CHOICES = [
        ('carte', 'Carte bancaire'),
        ('espece', 'Espèce'),
        ('virement', 'Virement'),
        ('cheque', 'Chèque'),
    ]

    reservation = models.ForeignKey(Reservation, on_delete=models.CASCADE, related_name='paiements')

    type_paiement = models.CharField(max_length=15, choices=TYPE_CHOICES, default='a_regler')
    date_echeance = models.DateField()
    date_traitement = models.DateField(blank=True, null=True)
    methode = models.CharField(max_length=15, choices=METHODE_CHOICES, blank=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.montant} - {self.get_type_paiement_display()} ({self.reservation})"