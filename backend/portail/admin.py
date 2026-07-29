from django.contrib import admin
from .models import DocumentClient, Facture, PaiementStripe


@admin.register(DocumentClient)
class DocumentClientAdmin(admin.ModelAdmin):
    list_display = ('client', 'type_document', 'nom_original', 'date_ajout')
    list_filter = ('type_document',)


@admin.register(Facture)
class FactureAdmin(admin.ModelAdmin):
    list_display = ('numero', 'reservation', 'montant', 'statut', 'date_emission', 'date_paiement')
    list_filter = ('statut',)
    readonly_fields = ('numero',)


@admin.register(PaiementStripe)
class PaiementStripeAdmin(admin.ModelAdmin):
    list_display = ('facture', 'montant', 'statut', 'stripe_session_id', 'date_creation')
    list_filter = ('statut',)
