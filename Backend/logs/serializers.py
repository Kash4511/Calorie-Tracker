from rest_framework import serializers
from .models import MealEntry, ActivityEntry, WaterLog, WeightLog, FoodItem


class MealEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MealEntry
        fields = [
            'id', 'date', 'meal_type', 'name', 'calories',
            'protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ActivityEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityEntry
        fields = ['id', 'date', 'name', 'calories_burned', 'duration_minutes']
        read_only_fields = ['id']


class WaterLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaterLog
        fields = ['id', 'date', 'liters']
        read_only_fields = ['id', 'date']


class WeightLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightLog
        fields = ['id', 'date', 'weight_kg']
        read_only_fields = ['id', 'date']

class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = [
            'id', 'name', 'category',
            'calories_per_100g', 'protein_per_100g', 'carbs_per_100g',
            'fat_per_100g', 'sugar_per_100g',
        ]