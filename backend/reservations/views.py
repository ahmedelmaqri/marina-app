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
    @action(detail=True, methods=['post'])
    def envoyer(self, request, pk=None):
        contrat = self.get_object()

        if contrat.statut_signature != 'a_envoyer':
            return Response({'error': f'Impossible d\'envoyer un contrat au statut "{contrat.statut_signature}".'}, status=400)

        contrat.statut_signature = 'envoye'
        contrat.date_envoi = timezone.now()
        contrat.save()

        return Response({
            'message': 'Contrat envoyé au client.',
            'id': contrat.id,
            'statut_signature': contrat.statut_signature,
            'date_envoi': contrat.date_envoi,
        })

    @action(detail=True, methods=['post'])
    def signer(self, request, pk=None):
        contrat = self.get_object()

        if contrat.statut_signature != 'envoye':
            return Response({'error': f'Impossible de signer un contrat au statut "{contrat.statut_signature}".'}, status=400)

        contrat.statut_signature = 'signe'
        contrat.date_signature = timezone.now()
        contrat.save()

        return Response({
            'message': 'Contrat signé.',
            'id': contrat.id,
            'statut_signature': contrat.statut_signature,
            'date_signature': contrat.date_signature,
        })

    @action(detail=True, methods=['post'])
    def creer_avenant(self, request, pk=None):
        contrat = self.get_object()

        if contrat.statut_signature != 'signe':
            return Response({'error': 'Un avenant ne peut être créé que sur un contrat signé.'}, status=400)

        contrat.statut_signature = 'a_envoyer'
        contrat.date_envoi = None
        contrat.date_signature = None
        contrat.save()

        return Response({
            'message': 'Avenant créé, le contrat repasse au statut "à envoyer".',
            'id': contrat.id,
            'statut_signature': contrat.statut_signature,
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

    @action(detail=True, methods=['post'])
    def transformer_en_escale(self, request, pk=None):
        attente = self.get_object()

        client = attente.client
        if not client:
            return Response({'error': 'Aucun client associé à cette demande.'}, status=400)

        bateau_id = request.data.get('bateau_id')
        if not bateau_id:
            return Response({'error': 'bateau_id est requis.'}, status=400)

        from bateaux.models import Bateau
        try:
            bateau = Bateau.objects.get(id=bateau_id, client=client)
        except Bateau.DoesNotExist:
            return Response({'error': 'Bateau introuvable pour ce client.'}, status=404)

        escale = Escale.objects.create(
            client=client,
            bateau=bateau,
            date_arrivee=attente.date_arrivee,
            date_depart=attente.date_depart,
            longueur=attente.longueur,
            largeur=attente.largeur,
            statut='confirmee',
            note=attente.requete_speciale,
        )

        attente.delete()

        return Response({
            'message': 'Escale créée avec succès depuis la liste d\'attente.',
            'escale_id': escale.id,
        })

class PaiementProgrammeViewSet(viewsets.ModelViewSet):
    queryset = PaiementProgramme.objects.all()
    serializer_class = PaiementProgrammeSerializer