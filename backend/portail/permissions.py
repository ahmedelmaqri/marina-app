from rest_framework.permissions import BasePermission


class EstProprietaireClient(BasePermission):
    """Le client connecté ne peut voir/modifier que ce qui appartient à sa fiche Client."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and hasattr(request.user, 'client_profile')
        )

    def has_object_permission(self, request, view, obj):
        client_profile = request.user.client_profile
        client_id_de_obj = getattr(obj, 'client_id', None)
        if client_id_de_obj is None and hasattr(obj, 'reservation'):
            client_id_de_obj = obj.reservation.client_id
        if client_id_de_obj is None and hasattr(obj, 'facture'):
            client_id_de_obj = obj.facture.reservation.client_id
        return client_id_de_obj == client_profile.id