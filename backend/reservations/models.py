from django.db import models
from clients.models import Client
from bateaux.models import Bateau
from contrats.models import GroupeDeContrat
from django.utils import timezone


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
    grille_tarifaire = models.ForeignKey(
        'contrats.GrilleTarifaire', on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations'
    )

    date_arrivee = models.DateTimeField()
    date_depart = models.DateTimeField()

    longueur = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    largeur = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    type_bassin = models.CharField(max_length=100, blank=True)  # §5.1.1 / Etape 4 "Type espace"

    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='confirmee')
    prix_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    note = models.TextField(blank=True)

    date_creation = models.DateTimeField(auto_now_add=True)
    date_confirmation = models.DateTimeField(blank=True, null=True)

    def calculer_prix(self):
        if not self.grille_tarifaire:
            return self.prix_total

        duree = (self.date_depart - self.date_arrivee).days or 1
        tarif = self.grille_tarifaire.tarif_base
        taxe = self.grille_tarifaire.taxe or 0

        if self.grille_tarifaire.structure_tarifaire == 'journaliere':
            sous_total = tarif * duree
        elif self.grille_tarifaire.structure_tarifaire == 'mensuelle':
            sous_total = tarif * (duree / 30)
        elif self.grille_tarifaire.structure_tarifaire == 'annuelle':
            sous_total = tarif * (duree / 365)
        else:
            sous_total = tarif

        return round(sous_total + (sous_total * taxe / 100), 2)

    def save(self, *args, **kwargs):
        if self.date_arrivee and self.date_depart and self.date_depart <= self.date_arrivee:
            raise ValueError("La date de départ doit être postérieure à la date d'arrivée.")

        creation = self.pk is None

        if self.grille_tarifaire and self.date_arrivee and self.date_depart:
            self.prix_total = self.calculer_prix()

        super().save(*args, **kwargs)

        if self.prix_total is not None:
            self.synchroniser_paiement()

        if creation:
            from quais.services import affecter_place_automatiquement, AucunePlaceDisponibleError
            try:
                affecter_place_automatiquement(self)
            except AucunePlaceDisponibleError:
                date_arrivee = self.date_arrivee.date() if hasattr(self.date_arrivee, 'date') else self.date_arrivee
                date_depart = self.date_depart.date() if hasattr(self.date_depart, 'date') else self.date_depart
                ListeAttente.objects.create(
                    client=self.client,
                    nom_prenom=str(self.client),
                    email=self.client.email,
                    telephone=self.client.telephone,
                    longueur=self.bateau.longueur,
                    largeur=self.bateau.largeur,
                    type_bateau=self.bateau.type_bateau,
                    date_arrivee=date_arrivee,
                    date_depart=date_depart,
                    requete_speciale=f"Réservation #{self.id} créée sans place disponible — affectation manuelle requise.",
                )

    def __str__(self):
        return f"Réservation #{self.id} - {self.client}"

    def synchroniser_paiement(self):
        """
        Point d'entrée unique qui maintient les PaiementProgramme cohérents avec prix_total.
        Appelé après toute opération qui modifie le prix (création, Charge, Remise, modification).
        """
        montant_regle = self.paiements.filter(type_paiement='regle').aggregate(
            total=models.Sum('montant'))['total'] or 0
        montant_rembourse = self.paiements.filter(type_paiement='rembourse').aggregate(
            total=models.Sum('montant'))['total'] or 0

        solde_restant = round(float(self.prix_total) - float(montant_regle) + float(montant_rembourse), 2)

        paiement_en_attente = self.paiements.filter(type_paiement='a_regler').order_by('id').first()

        if solde_restant > 0:
            if paiement_en_attente:
                paiement_en_attente.montant = solde_restant
                paiement_en_attente.save()
            else:
                PaiementProgramme.objects.create(
                    reservation=self,
                    type_paiement='a_regler',
                    date_echeance=self.date_depart.date() if self.date_depart else timezone.now().date(),
                    montant=solde_restant,
                )
        else:
            if paiement_en_attente:
                paiement_en_attente.delete()
            if solde_restant < 0:
                PaiementProgramme.objects.create(
                    reservation=self,
                    type_paiement='rembourse',
                    date_echeance=timezone.now().date(),
                    montant=abs(solde_restant),
                )


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
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    date_ajout = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.article} x{self.quantite} ({self.reservation})"

    def calculer_montant(self):
        prix_unitaire = self.prix_unitaire if self.prix_unitaire is not None else self.article.prix
        taxe = self.article.taxe or 0
        sous_total = float(prix_unitaire) * self.quantite
        return round(sous_total + (sous_total * float(taxe) / 100), 2)

    def save(self, *args, **kwargs):
        if self.prix_unitaire is None:
            self.prix_unitaire = self.article.prix

        ancien_montant = None
        if self.pk:
            ancienne_version = Charge.objects.filter(pk=self.pk).first()
            if ancienne_version:
                ancien_montant = ancienne_version.montant

        self.montant = self.calculer_montant()
        super().save(*args, **kwargs)
        self._appliquer_au_prix(ancien_montant)

    def delete(self, *args, **kwargs):
        reservation = self.reservation
        nouveau_prix = float(reservation.prix_total or 0) - float(self.montant or 0)
        Reservation.objects.filter(id=reservation.id).update(prix_total=round(max(nouveau_prix, 0), 2))
        super().delete(*args, **kwargs)
        reservation.refresh_from_db()
        reservation.synchroniser_paiement()

    def _appliquer_au_prix(self, ancien_montant=None):
        reservation = self.reservation
        diff = float(self.montant) - float(ancien_montant or 0)
        nouveau_prix = round(float(reservation.prix_total or 0) + diff, 2)
        Reservation.objects.filter(id=reservation.id).update(prix_total=nouveau_prix)
        reservation.refresh_from_db()
        reservation.synchroniser_paiement()


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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.appliquer_au_prix()

    def appliquer_au_prix(self):
        reservation = self.reservation
        prix_base = reservation.calculer_prix() if reservation.grille_tarifaire else reservation.prix_total

        if prix_base is None:
            return

        if self.unite == 'pourcentage':
            nouveau_prix = float(prix_base) - (float(prix_base) * float(self.montant) / 100)
        else:
            nouveau_prix = float(prix_base) - float(self.montant)

        reservation.prix_total = round(max(nouveau_prix, 0), 2)
        Reservation.objects.filter(id=reservation.id).update(prix_total=reservation.prix_total)
        reservation.refresh_from_db()
        reservation.synchroniser_paiement()


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