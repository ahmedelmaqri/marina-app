from rest_framework.routers import DefaultRouter
from .views import (
    ReservationViewSet, EscaleViewSet, ContratViewSet, ArticleChargeViewSet,
    ChargeViewSet, RemiseViewSet, ListeAttenteViewSet, PaiementProgrammeViewSet
)

router = DefaultRouter()
router.register('reservations', ReservationViewSet)
router.register('escales', EscaleViewSet)
router.register('contrats-reservations', ContratViewSet)
router.register('articles-charges', ArticleChargeViewSet)
router.register('charges', ChargeViewSet)
router.register('remises', RemiseViewSet)
router.register('liste-attente', ListeAttenteViewSet)
router.register('paiements', PaiementProgrammeViewSet)

urlpatterns = router.urls