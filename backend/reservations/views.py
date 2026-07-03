from django.shortcuts import render
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
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

    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        escale = self.get_object()

        if escale.statut == 'annulee':
            return Response({'error': 'Cette escale est déjà annulée.'}, status=400)

        escale.statut = 'annulee'
        escale.save()

        return Response({
            'message': 'Escale annulée avec succès.',
            'id': escale.id,
            'statut': escale.statut,
        })


class ContratViewSet(viewsets.ModelViewSet):
    queryset = Contrat.objects.all()
    serializer_class = ContratSerializer

    @action(detail=True, methods=['post'])
    def resilier(self, request, pk=None):
        contrat = self.get_object()

        if contrat.statut_signature == 'resilie':
            return Response({'error': 'Ce contrat est déjà résilié.'}, status=400)

        frais = float(request.data.get('frais', 0))
        aujourdhui = timezone.now().date()

        jours_total = (contrat.date_depart.date() - contrat.date_arrivee.date()).days or 1
        jours_restants = max((contrat.date_depart.date() - aujourdhui).days, 0)

        montant_remboursement = 0
        if contrat.prix_total:
            montant_remboursement = round(
                (float(contrat.prix_total) / jours_total) * jours_restants - frais, 2
            )

        contrat.statut_signature = 'resilie'
        contrat.statut = 'annulee'
        contrat.save()

        return Response({
            'message': 'Contrat résilié avec succès.',
            'id': contrat.id,
            'statut_signature': contrat.statut_signature,
            'montant_remboursement': montant_remboursement,
            'frais_appliques': frais,
        })


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