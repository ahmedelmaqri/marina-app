from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import GroupeDePlaces, Place, Affectation
from .serializers import GroupeDePlacesSerializer, PlaceSerializer, AffectationSerializer


class GroupeDePlacesViewSet(viewsets.ModelViewSet):
    queryset = GroupeDePlaces.objects.all()
    serializer_class = GroupeDePlacesSerializer


class PlaceViewSet(viewsets.ModelViewSet):
    queryset = Place.objects.all()
    serializer_class = PlaceSerializer


class AffectationViewSet(viewsets.ModelViewSet):
    queryset = Affectation.objects.all()
    serializer_class = AffectationSerializer