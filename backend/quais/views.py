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

from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime


@api_view(['GET'])
def disponibilite(request):
    date_arrivee = request.GET.get('date_arrivee')
    date_depart = request.GET.get('date_depart')

    if not date_arrivee or not date_depart:
        return Response({'error': 'date_arrivee et date_depart sont requis (format YYYY-MM-DD)'}, status=400)

    try:
        date_arrivee = datetime.strptime(date_arrivee, '%Y-%m-%d').date()
        date_depart = datetime.strptime(date_depart, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Format de date invalide, utilisez YYYY-MM-DD'}, status=400)

    places_occupees = Affectation.objects.filter(
        date__gte=date_arrivee,
        date__lt=date_depart,
        statut__in=['present', 'aucun']
    ).values_list('place_id', flat=True).distinct()

    places_libres = Place.objects.exclude(id__in=places_occupees)

    data = [
        {
            'id': p.id,
            'nom': p.nom,
            'type_place': p.type_place,
            'groupe_de_places': p.groupe_de_places.nom if p.groupe_de_places else None,
        }
        for p in places_libres
    ]

    return Response({
        'date_arrivee': date_arrivee,
        'date_depart': date_depart,
        'places_disponibles': data,
        'total': len(data),
    })