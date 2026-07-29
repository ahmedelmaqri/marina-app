from rest_framework import serializers
from django.contrib.auth import get_user_model
from clients.models import Client
from bateaux.models import Bateau
from reservations.models import Reservation, PaiementProgramme
from .models import DocumentClient, Facture

Utilisateur = get_user_model()


class ClientActivationSerializer(serializers.Serializer):
    """Le client 'active' son compte : il doit connaître son email + un identifiant
    de sa fiche client (ex: numéro fourni par le gestionnaire à la création)."""
    client_id = serializers.IntegerField()
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, data):
        try:
            client = Client.objects.get(id=data['client_id'], email__iexact=data['email'])
        except Client.DoesNotExist:
            raise serializers.ValidationError("Aucun client trouvé avec ces informations.")
        if client.compte_id is not None:
            raise serializers.ValidationError("Un compte existe déjà pour ce client.")
        self.client_obj = client
        return data

    def create(self, validated_data):
        user = Utilisateur.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            role='client',
        )
        self.client_obj.compte = user
        self.client_obj.save(update_fields=['compte'])
        return user


class BateauPortailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bateau
        fields = '__all__'
        read_only_fields = ['client']


class PaiementProgrammeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaiementProgramme
        fields = '__all__'


class ReservationPortailSerializer(serializers.ModelSerializer):
    paiements = PaiementProgrammeSerializer(many=True, read_only=True)
    bateau_nom = serializers.CharField(source='bateau.nom_navire', read_only=True)

    class Meta:
        model = Reservation
        fields = '__all__'


class DocumentClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentClient
        fields = '__all__'
        read_only_fields = ['client', 'nom_original', 'date_ajout']


class FactureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Facture
        fields = '__all__'