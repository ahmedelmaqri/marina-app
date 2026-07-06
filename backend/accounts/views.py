from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Utilisateur
from .serializers import UtilisateurSerializer
from .permissions import IsAdmin


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAdmin]