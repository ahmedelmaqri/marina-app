import stripe
from django.conf import settings
from .models import PaiementStripe

stripe.api_key = settings.STRIPE_SECRET_KEY


def creer_session_paiement(facture, request):
    """Crée une session Stripe Checkout pour une facture donnée."""
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'mad',
                'product_data': {
                    'name': f"Facture {facture.numero}",
                },
                'unit_amount': int(facture.montant * 100),  # Stripe attend des centimes
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=f"{settings.FRONTEND_URL}/portail/factures/{facture.id}?paiement=succes",
        cancel_url=f"{settings.FRONTEND_URL}/portail/factures/{facture.id}?paiement=annule",
        metadata={'facture_id': str(facture.id)},
    )

    PaiementStripe.objects.create(
        facture=facture,
        stripe_session_id=session.id,
        montant=facture.montant,
        statut='en_attente',
    )
    return session