from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Document, GrilleTarifaire, GroupeDeContrat
from .serializers import DocumentSerializer, GrilleTarifaireSerializer, GroupeDeContratSerializer
from .models import Document, GrilleTarifaire, GroupeDeContrat, FraisRemiseGroupe
from .serializers import DocumentSerializer, GrilleTarifaireSerializer, GroupeDeContratSerializer, FraisRemiseGroupeSerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer


class GrilleTarifaireViewSet(viewsets.ModelViewSet):
    queryset = GrilleTarifaire.objects.all()
    serializer_class = GrilleTarifaireSerializer


class GroupeDeContratViewSet(viewsets.ModelViewSet):
    queryset = GroupeDeContrat.objects.all()
    serializer_class = GroupeDeContratSerializer

class FraisRemiseGroupeViewSet(viewsets.ModelViewSet):
    queryset = FraisRemiseGroupe.objects.all()
    serializer_class = FraisRemiseGroupeSerializer