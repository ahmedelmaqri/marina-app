from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import GroupeDePlaces, Place


@admin.register(GroupeDePlaces)
class GroupeDePlacesAdmin(admin.ModelAdmin):
    list_display = ('nom', 'type_bassin', 'total_inventaire')


@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ('nom', 'type_place', 'groupe_de_places')
    list_filter = ('groupe_de_places',)


from .models import Affectation


@admin.register(Affectation)
class AffectationAdmin(admin.ModelAdmin):
    list_display = ('place', 'reservation', 'date', 'statut')
    list_filter = ('statut', 'date')