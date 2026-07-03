from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'type_client', 'email', 'telephone', 'date_creation')
    list_filter = ('type_client',)
    search_fields = ('nom_prenom', 'raison_sociale', 'email', 'telephone')