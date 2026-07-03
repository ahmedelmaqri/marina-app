from rest_framework import serializers
from .models import Bateau


class BateauSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bateau
        fields = '__all__'