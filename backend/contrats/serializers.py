from rest_framework import serializers
from .models import Document, GrilleTarifaire, GroupeDeContrat, FraisRemiseGroupe


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'


class GrilleTarifaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrilleTarifaire
        fields = '__all__'


class FraisRemiseGroupeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FraisRemiseGroupe
        fields = '__all__'


class GroupeDeContratSerializer(serializers.ModelSerializer):
    frais_remises = FraisRemiseGroupeSerializer(many=True, read_only=True)

    class Meta:
        model = GroupeDeContrat
        fields = '__all__'