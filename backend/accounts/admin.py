from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Utilisateur


class UtilisateurAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Rôle', {'fields': ('role',)}),
    )
    list_display = UserAdmin.list_display + ('role',)


admin.site.register(Utilisateur, UtilisateurAdmin)