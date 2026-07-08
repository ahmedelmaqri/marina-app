from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, GrilleTarifaireViewSet, GroupeDeContratViewSet, FraisRemiseGroupeViewSet

router = DefaultRouter()
router.register('documents', DocumentViewSet)
router.register('grilles-tarifaires', GrilleTarifaireViewSet)
router.register('groupes-contrats', GroupeDeContratViewSet)
router.register('frais-remises-groupe', FraisRemiseGroupeViewSet)

urlpatterns = router.urls