from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Utilisateur
from .serializers import UtilisateurSerializer
from .permissions import IsAdmin
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status




class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [IsAdmin]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class ChangerMotDePasseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ancien = request.data.get('ancien_mot_de_passe')
        nouveau = request.data.get('nouveau_mot_de_passe')

        if not ancien or not nouveau:
            return Response(
                {'error': "L'ancien et le nouveau mot de passe sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        if not user.check_password(ancien):
            return Response(
                {'error': "L'ancien mot de passe est incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(nouveau) < 8:
            return Response(
                {'error': 'Le nouveau mot de passe doit contenir au moins 8 caractères.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(nouveau)
        user.save()

        return Response({'message': 'Mot de passe modifié avec succès.'})