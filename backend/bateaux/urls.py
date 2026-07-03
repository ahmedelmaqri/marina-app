from rest_framework.routers import DefaultRouter
from .views import BateauViewSet

router = DefaultRouter()
router.register('bateaux', BateauViewSet)

urlpatterns = router.urls