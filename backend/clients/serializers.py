from rest_framework import serializers
from .models import Client
from portail.models import DocumentClient


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'


class DocumentClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentClient
        fields = '__all__'
        read_only_fields = ['nom_original', 'date_ajout']