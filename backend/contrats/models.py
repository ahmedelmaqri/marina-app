from django.db import models


class Document(models.Model):
    nom = models.CharField(max_length=255)
    fichier = models.FileField(upload_to='documents_contrats/')
    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nom


class GrilleTarifaire(models.Model):
    STRUCTURE_CHOICES = [
        ('journaliere', 'Journalière'),
        ('mensuelle', 'Mensuelle'),
        ('annuelle', 'Annuelle'),
    ]

    nom = models.CharField(max_length=100)
    structure_tarifaire = models.CharField(max_length=20, choices=STRUCTURE_CHOICES)
    tarif_base = models.DecimalField(max_digits=10, decimal_places=2)
    taxe = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"{self.nom} ({self.get_structure_tarifaire_display()})"


class GroupeDeContrat(models.Model):
    CYCLE_CHOICES = [
        ('avance', 'A l\'avance'),
        ('debut_mois', 'Début du mois'),
    ]
    STRUCTURE_CHOICES = [
        ('journaliere', 'Journalière'),
        ('mensuelle', 'Mensuelle'),
        ('annuelle', 'Annuelle'),
    ]

    nom = models.CharField(max_length=100)
    documents = models.ManyToManyField(Document, blank=True, related_name='groupes_contrat')
    notes_document = models.TextField(blank=True)

    date_debut = models.DateField()
    date_fin = models.DateField()

    type_espace = models.CharField(max_length=100, blank=True)

    tarif = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    grille_tarifaire = models.ForeignKey(
        GrilleTarifaire, on_delete=models.SET_NULL, null=True, blank=True, related_name='groupes_contrat'
    )
    structure_tarifaire = models.CharField(max_length=20, choices=STRUCTURE_CHOICES, blank=True)
    taxe = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    cycle_facturation = models.CharField(max_length=20, choices=CYCLE_CHOICES, blank=True)

    renouvellement_automatique = models.BooleanField(default=False)
    periode_facturation_personnalisee = models.BooleanField(default=False)
    date_debut_facturation = models.DateField(blank=True, null=True)
    date_fin_facturation = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.nom


class FraisRemiseGroupe(models.Model):
    CATEGORIE_CHOICES = [
        ('frais', 'Frais'),
        ('remise', 'Remise'),
        ('eau_electricite', 'Eau et Electricité'),
    ]

    groupe = models.ForeignKey(GroupeDeContrat, on_delete=models.CASCADE, related_name='frais_remises')
    categorie = models.CharField(max_length=20, choices=CATEGORIE_CHOICES)
    nom = models.CharField(max_length=100)
    prix = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.nom} ({self.get_categorie_display()}) - {self.groupe}"