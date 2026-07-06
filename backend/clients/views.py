from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer

    def perform_destroy(self, instance):
        if instance.bateaux.exists():
            raise ValidationError(
                "Impossible de supprimer ce client : il possède au moins un bateau "
                "enregistré (avec potentiellement des réservations liées). "
                "Retirez d'abord ses bateaux, ou archivez le client plutôt que de le supprimer."
            )
        super().perform_destroy(instance)   