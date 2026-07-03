from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import (
    Reservation, Escale, Contrat, ArticleCharge, Charge,
    Remise, ListeAttente, PaiementProgramme
)
from .serializers import (
    ReservationSerializer, EscaleSerializer, ContratSerializer, ArticleChargeSerializer,
    ChargeSerializer, RemiseSerializer, ListeAttenteSerializer, PaiementProgrammeSerializer
)


class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer


class EscaleViewSet(viewsets.ModelViewSet):
    queryset = Escale.objects.all()
    serializer_class = EscaleSerializer


class ContratViewSet(viewsets.ModelViewSet):
    queryset = Contrat.objects.all()
    serializer_class = ContratSerializer


class ArticleChargeViewSet(viewsets.ModelViewSet):
    queryset = ArticleCharge.objects.all()
    serializer_class = ArticleChargeSerializer


class ChargeViewSet(viewsets.ModelViewSet):
    queryset = Charge.objects.all()
    serializer_class = ChargeSerializer


class RemiseViewSet(viewsets.ModelViewSet):
    queryset = Remise.objects.all()
    serializer_class = RemiseSerializer


class ListeAttenteViewSet(viewsets.ModelViewSet):
    queryset = ListeAttente.objects.all()
    serializer_class = ListeAttenteSerializer


class PaiementProgrammeViewSet(viewsets.ModelViewSet):
    queryset = PaiementProgramme.objects.all()
    serializer_class = PaiementProgrammeSerializer