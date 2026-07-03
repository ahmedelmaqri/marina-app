from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Reservation, Escale, Contrat


@admin.register(Escale)
class EscaleAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'bateau', 'date_arrivee', 'date_depart', 'statut', 'prix_total')
    list_filter = ('statut',)


@admin.register(Contrat)
class ContratAdmin(admin.ModelAdmin):
    list_display = ('id', 'client', 'bateau', 'groupe_contrat', 'statut_signature', 'date_arrivee', 'date_depart')
    list_filter = ('statut_signature', 'groupe_contrat')

from .models import ArticleCharge, Charge, Remise


@admin.register(ArticleCharge)
class ArticleChargeAdmin(admin.ModelAdmin):
    list_display = ('nom', 'categorie', 'prix', 'taxe')
    list_filter = ('categorie',)


@admin.register(Charge)
class ChargeAdmin(admin.ModelAdmin):
    list_display = ('article', 'reservation', 'quantite', 'prix_unitaire')


@admin.register(Remise)
class RemiseAdmin(admin.ModelAdmin):
    list_display = ('reservation', 'montant', 'unite', 'appliquee_mise_a_quai', 'appliquee_electricite')

from .models import ListeAttente


@admin.register(ListeAttente)
class ListeAttenteAdmin(admin.ModelAdmin):
    list_display = ('nom_prenom', 'email', 'telephone', 'date_arrivee', 'date_depart')
    search_fields = ('nom_prenom', 'email', 'telephone')

from .models import PaiementProgramme


@admin.register(PaiementProgramme)
class PaiementProgrammeAdmin(admin.ModelAdmin):
    list_display = ('reservation', 'type_paiement', 'date_echeance', 'montant', 'methode')
    list_filter = ('type_paiement', 'methode')