from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from bateaux.models import Bateau
from reservations.models import Reservation
from .models import DocumentClient, Facture, PaiementStripe
from .serializers import (
    ClientActivationSerializer, BateauPortailSerializer,
    ReservationPortailSerializer, DocumentClientSerializer, FactureSerializer,
    PortailTokenObtainPairSerializer,
)
from .permissions import EstProprietaireClient
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings
import stripe
from .services import creer_session_paiement

class PortailTokenObtainPairView(TokenObtainPairView):
    """Connexion pour le portail client : refuse les comptes gestionnaire/admin."""
    serializer_class = PortailTokenObtainPairSerializer


class ActivationCompteClientView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ClientActivationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'message': 'Compte activé, vous pouvez vous connecter.'}, status=status.HTTP_201_CREATED)


class MesInfosView(APIView):
    permission_classes = [IsAuthenticated, EstProprietaireClient]

    def get(self, request):
        from clients.serializers import ClientSerializer
        client = request.user.client_profile
        return Response(ClientSerializer(client).data)


class MesReservationsViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ReservationPortailSerializer
    permission_classes = [IsAuthenticated, EstProprietaireClient]

    def get_queryset(self):
        return Reservation.objects.filter(
            client=self.request.user.client_profile
        ).select_related('bateau').prefetch_related('paiements')


class MesBateauxViewSet(viewsets.ModelViewSet):
    serializer_class = BateauPortailSerializer
    permission_classes = [IsAuthenticated, EstProprietaireClient]

    def get_queryset(self):
        return Bateau.objects.filter(client=self.request.user.client_profile)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client_profile)


class MesDocumentsViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentClientSerializer
    permission_classes = [IsAuthenticated, EstProprietaireClient]

    def get_queryset(self):
        return DocumentClient.objects.filter(client=self.request.user.client_profile)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user.client_profile)


class MesFacturesViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = FactureSerializer
    permission_classes = [IsAuthenticated, EstProprietaireClient]

    def get_queryset(self):
        return Facture.objects.filter(
            reservation__client=self.request.user.client_profile
        ).select_related('reservation')


class CreerPaiementFactureView(APIView):
    permission_classes = [IsAuthenticated, EstProprietaireClient]

    def post(self, request, facture_id):
        try:
            facture = Facture.objects.get(
                id=facture_id,
                reservation__client=request.user.client_profile,
                statut='impayee',
            )
        except Facture.DoesNotExist:
            return Response({'error': 'Facture introuvable ou déjà payée.'}, status=404)

        try:
            session = creer_session_paiement(facture, request)
        except stripe.error.StripeError as e:
            return Response({'error': str(e)}, status=502)

        return Response({'checkout_url': session.url})


@csrf_exempt
@require_POST
def webhook_stripe(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        facture_id = session['metadata']['facture_id']

        try:
            facture = Facture.objects.get(id=facture_id)
        except Facture.DoesNotExist:
            return HttpResponse(status=200)

        facture.statut = 'payee'
        facture.date_paiement = timezone.now()
        facture.save()

        PaiementStripe.objects.filter(stripe_session_id=session['id']).update(
            statut='reussi',
            stripe_payment_intent=session.get('payment_intent', ''),
        )

    return HttpResponse(status=200)