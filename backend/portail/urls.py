from django.urls import path
from rest_framework.routers import DefaultRouter
from accounts.views import CustomTokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ActivationCompteClientView, MesInfosView,
    MesReservationsViewSet, MesBateauxViewSet, MesDocumentsViewSet, MesFacturesViewSet,
    CreerPaiementFactureView, webhook_stripe,
)

router = DefaultRouter()
router.register('mes-reservations', MesReservationsViewSet, basename='mes-reservations')
router.register('mes-bateaux', MesBateauxViewSet, basename='mes-bateaux')
router.register('mes-documents', MesDocumentsViewSet, basename='mes-documents')
router.register('mes-factures', MesFacturesViewSet, basename='mes-factures')

urlpatterns = router.urls + [
    path('activation/', ActivationCompteClientView.as_view()),
    path('login/', CustomTokenObtainPairView.as_view()),
    path('login/refresh/', TokenRefreshView.as_view()),
    path('me/', MesInfosView.as_view()),
    path('factures/<int:facture_id>/payer/', CreerPaiementFactureView.as_view()),
    path('webhook-stripe/', webhook_stripe),
]