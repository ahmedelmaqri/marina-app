from rest_framework import serializers
from .models import Utilisateur
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class UtilisateurSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Utilisateur
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = Utilisateur(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role'] = user.role
        return token


class StaffTokenObtainPairSerializer(CustomTokenObtainPairSerializer):
    """Connexion réservée aux comptes internes (gestionnaire/admin).
    Les comptes 'client' doivent se connecter via /api/portail/login/."""

    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.role == 'client':
            raise serializers.ValidationError(
                "Ce compte est un compte client, connectez-vous depuis le portail client."
            )
        return data