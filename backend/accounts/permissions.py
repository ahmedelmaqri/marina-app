from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Autorise uniquement les utilisateurs avec le rôle 'admin'."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsClient(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role == 'client'
            and hasattr(request.user, 'client_profile')
        )


class EstGestionnaireOuAdmin(BasePermission):
    """Autorise uniquement les comptes internes (gestionnaire ou admin).
    Exclut explicitement les comptes 'client' du portail, qui ne doivent voir
    que leurs propres données via les endpoints /api/portail/."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('gestionnaire', 'admin')
        )