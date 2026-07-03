from rest_framework import serializers
from .models import (
    Reservation, Escale, Contrat, ArticleCharge, Charge,
    Remise, ListeAttente, PaiementProgramme
)


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = '__all__'


class EscaleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Escale
        fields = '__all__'


class ContratSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrat
        fields = '__all__'


class ArticleChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticleCharge
        fields = '__all__'


class ChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Charge
        fields = '__all__'


class RemiseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Remise
        fields = '__all__'


class ListeAttenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListeAttente
        fields = '__all__'


class PaiementProgrammeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaiementProgramme
        fields = '__all__'