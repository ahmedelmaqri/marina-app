from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, GrilleTarifaireViewSet, GroupeDeContratViewSet

router = DefaultRouter()
router.register('documents', DocumentViewSet)
router.register('grilles-tarifaires', GrilleTarifaireViewSet)
router.register('groupes-contrats', GroupeDeContratViewSet)

urlpatterns = router.urls