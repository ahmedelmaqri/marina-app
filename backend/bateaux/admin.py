from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Bateau


@admin.register(Bateau)
class BateauAdmin(admin.ModelAdmin):
    list_display = ('nom_navire', 'client', 'type_bateau', 'longueur', 'largeur', 'numero_immatriculation')
    list_filter = ('type_bateau',)
    search_fields = ('nom_navire', 'numero_immatriculation', 'client__nom_prenom', 'client__raison_sociale')