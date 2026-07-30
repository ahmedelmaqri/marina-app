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
    facture = serializers.SerializerMethodField()

    class Meta:
        model = Escale
        fields = '__all__'

    def get_facture(self, obj):
        facture = obj.factures.order_by('-date_emission').first()
        if not facture:
            return None
        return {
            'id': facture.id,
            'numero': facture.numero,
            'montant': str(facture.montant),
            'statut': facture.statut,
        }


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
        read_only_fields = ('montant',)


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