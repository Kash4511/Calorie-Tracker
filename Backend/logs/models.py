from django.db import models
from django.contrib.auth.models import User

class MealEntry(models.Model):
    MEAL_CHOICES = [('breakfast','Breakfast'),('lunch','Lunch'),('snacks','Snacks'),('dinner','Dinner')]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    meal_type = models.CharField(max_length=10, choices=MEAL_CHOICES)
    name = models.CharField(max_length=200)
    calories = models.PositiveIntegerField()
    protein_g = models.FloatField(default=0)
    carbs_g = models.FloatField(default=0)
    fat_g = models.FloatField(default=0)
    sugar_g = models.FloatField(default=0)
    servings = models.FloatField(default=1)
    # Amount the user typed together with the unit they picked (e.g. 3 + "egg").
    # Legacy rows default to grams: quantity = servings * 100, unit_label = 'g'.
    quantity = models.FloatField(null=True, blank=True)
    unit_label = models.CharField(max_length=40, default='g')
    food_item = models.ForeignKey('FoodItem', null=True, blank=True, on_delete=models.SET_NULL, related_name='meal_entries')
    created_at = models.DateTimeField(auto_now_add=True)

class ActivityEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    name = models.CharField(max_length=200)
    calories_burned = models.PositiveIntegerField()
    duration_minutes = models.PositiveIntegerField(null=True)

class WaterLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    liters = models.FloatField(default=0)
    class Meta:
        unique_together = ('user', 'date')

class WeightLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    weight_kg = models.FloatField()
    class Meta:
        unique_together = ('user', 'date')
class FoodItem(models.Model):
    """Read-mostly catalog. calories/macros are per 100g so any
    logged quantity can be computed as a simple ratio."""
    name = models.CharField(max_length=200, db_index=True)
    category = models.CharField(max_length=100, blank=True)
    calories_per_100g = models.FloatField()
    protein_per_100g = models.FloatField(default=0)
    carbs_per_100g = models.FloatField(default=0)
    fat_per_100g = models.FloatField(default=0)
    sugar_per_100g = models.FloatField(default=0)
 
    class Meta:
        ordering = ['name']
 
    def __str__(self):
        return self.name


class FoodUnit(models.Model):
    """A unit a food can be logged in.

    Weight units (g/kg/oz/lb) are universal and defined in ``logs.units``.
    Count units ("egg", "slice", "piece") are food-specific and stored here as
    a gram weight per single unit, so any quantity converts to grams cleanly.
    """
    KIND_CHOICES = [('weight', 'Weight'), ('count', 'Count')]

    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name='units')
    label = models.CharField(max_length=40)
    kind = models.CharField(max_length=10, choices=KIND_CHOICES, default='count')
    grams_per_unit = models.FloatField()
    is_default = models.BooleanField(default=False)
    # Who first added a custom unit (null for the pre-configured catalog units).
    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL, related_name='custom_food_units'
    )

    class Meta:
        ordering = ['-is_default', 'label']
        unique_together = ('food_item', 'label')

    def __str__(self):
        return f'{self.label} ({self.food_item.name})'