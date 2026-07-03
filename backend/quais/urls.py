from rest_framework.routers import DefaultRouter
from .views import GroupeDePlacesViewSet, PlaceViewSet, AffectationViewSet

router = DefaultRouter()
router.register('groupes-places', GroupeDePlacesViewSet)
router.register('places', PlaceViewSet)
router.register('affectations', AffectationViewSet)

urlpatterns = router.urls