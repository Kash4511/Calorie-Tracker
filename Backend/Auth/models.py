from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Profile(models.Model):
    GOAL_CHOICES = [
        ('lose_weight', 'Lose Weight'),
        ('maintain', 'Maintain'),
        ('gain_muscle', 'Gain Muscle'),
    ]
    ACTIVITY_LEVEL_CHOICES = [
        ('sedentary', 'Sedentary'),
        ('light', 'Light'),
        ('moderate', 'Moderate'),
        ('active', 'Active'),
        ('very_active', 'Very Active'),
    ]
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    DIET_PREFERENCE_CHOICES = [
        ('none', 'None'),
        ('vegetarian', 'Vegetarian'),
        ('vegan', 'Vegan'),
        ('keto', 'Keto'),
        ('paleo', 'Paleo'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    goal = models.CharField(max_length=20, choices=GOAL_CHOICES, blank=True, null=True)
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_LEVEL_CHOICES, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    age = models.PositiveIntegerField(validators=[MinValueValidator(10), MaxValueValidator(100)], blank=True, null=True)
    height_cm = models.FloatField(validators=[MinValueValidator(100.0), MaxValueValidator(250.0)], blank=True, null=True)
    weight_kg = models.FloatField(validators=[MinValueValidator(20.0), MaxValueValidator(400.0)], blank=True, null=True)
    diet_preference = models.CharField(max_length=20, choices=DIET_PREFERENCE_CHOICES, default='none', blank=True, null=True)
    onboarding_completed = models.BooleanField(default=False)

    # ---- NEW: goal weight, distinct from current weight_kg above ----
    goal_weight_kg = models.FloatField(
        validators=[MinValueValidator(20.0), MaxValueValidator(400.0)],
        blank=True, null=True,
        help_text="Target weight, distinct from current weight_kg"
    )

    # ---- NEW: calorie/macro targets, computed once at onboarding completion ----
    daily_calorie_goal = models.PositiveIntegerField(blank=True, null=True)
    protein_pct = models.FloatField(default=0.30)
    carbs_pct = models.FloatField(default=0.40)
    fat_pct = models.FloatField(default=0.30)
    sugar_goal_g = models.PositiveIntegerField(default=50)  # WHO guideline default, not derived

    def __str__(self):
        return f'{self.user.username} Profile'

    @property
    def macro_goals_g(self):
        if not self.daily_calorie_goal:
            return {'protein': 0, 'carbs': 0, 'fat': 0, 'sugar': self.sugar_goal_g}
        cals = self.daily_calorie_goal
        return {
            'protein': round(cals * self.protein_pct / 4),
            'carbs':   round(cals * self.carbs_pct / 4),
            'fat':     round(cals * self.fat_pct / 9),
            'sugar':   self.sugar_goal_g,
        }

    @property
    def water_goal_liters(self):
        if not self.daily_calorie_goal:
            return 0
        return round(self.daily_calorie_goal / 1000, 2)