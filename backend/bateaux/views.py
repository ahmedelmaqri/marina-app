from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Bateau
from .serializers import BateauSerializer


class BateauViewSet(viewsets.ModelViewSet):
    queryset = Bateau.objects.all()
    serializer_class = BateauSerializer