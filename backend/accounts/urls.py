from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import UtilisateurViewSet, ChangerMotDePasseView

router = DefaultRouter()
router.register('utilisateurs', UtilisateurViewSet)

urlpatterns = router.urls + [
    path('auth/changer-mot-de-passe/', ChangerMotDePasseView.as_view(), name='changer-mot-de-passe'),
]