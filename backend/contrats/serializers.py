from rest_framework import serializers
from .models import Document, GrilleTarifaire, GroupeDeContrat


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'


class GrilleTarifaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrilleTarifaire
        fields = '__all__'


class GroupeDeContratSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupeDeContrat
        fields = '__all__'