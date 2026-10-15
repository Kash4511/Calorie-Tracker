from rest_framework import serializers
from .models import MealEntry, ActivityEntry, WaterLog, WeightLog, FoodItem, FoodUnit
from .units import available_units, default_unit, WEIGHT_UNITS


class FoodUnitSerializer(serializers.ModelSerializer):
    label = serializers.CharField(max_length=40)
    grams_per_unit = serializers.FloatField(min_value=0.01)
    is_custom = serializers.SerializerMethodField()

    class Meta:
        model = FoodUnit
        fields = ['id', 'label', 'kind', 'grams_per_unit', 'is_default', 'is_custom']
        read_only_fields = ['id', 'kind', 'is_custom']

    def get_is_custom(self, obj):
        return obj.created_by_id is not None


class MealEntrySerializer(serializers.ModelSerializer):
    date = serializers.DateField(required=False)
    food_item_id = serializers.IntegerField(read_only=True)
    grams = serializers.SerializerMethodField()
    unit_kind = serializers.SerializerMethodField()

    class Meta:
        model = MealEntry
        fields = [
            'id', 'date', 'meal_type', 'name', 'calories',
            'protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'created_at', 'servings',
            'quantity', 'unit_label', 'unit_kind', 'grams', 'food_item_id',
        ]
        read_only_fields = ['id', 'created_at']

    def get_grams(self, obj):
        return round(obj.servings * 100, 1)

    def get_unit_kind(self, obj):
        return 'weight' if (obj.unit_label or 'g').lower() in WEIGHT_UNITS else 'count'


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
    units = serializers.SerializerMethodField()
    default_unit = serializers.SerializerMethodField()

    class Meta:
        model = FoodItem
        fields = [
            'id', 'name', 'category',
            'calories_per_100g', 'protein_per_100g', 'carbs_per_100g',
            'fat_per_100g', 'sugar_per_100g',
            'units', 'default_unit',
        ]

    def get_units(self, obj):
        return available_units(obj)

    def get_default_unit(self, obj):
        return default_unit(obj)
