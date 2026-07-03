from rest_framework import serializers
from .models import GroupeDePlaces, Place, Affectation


class GroupeDePlacesSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupeDePlaces
        fields = '__all__'


class PlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Place
        fields = '__all__'


class AffectationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Affectation
        fields = '__all__'