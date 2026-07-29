from rest_framework.routers import DefaultRouter
from .views import ClientViewSet, DocumentClientViewSet

router = DefaultRouter()
router.register('clients', ClientViewSet)
router.register('documents-clients', DocumentClientViewSet, basename='documents-clients')

urlpatterns = router.urls