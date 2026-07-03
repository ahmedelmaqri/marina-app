from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Document, GroupeDeContrat


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('nom', 'date_ajout')


@admin.register(GroupeDeContrat)
class GroupeDeContratAdmin(admin.ModelAdmin):
    list_display = ('nom', 'date_debut', 'date_fin', 'tarif', 'cycle_facturation')
    filter_horizontal = ('documents',)