from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from datetime import timedelta


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

    # ---- Streak & Consistency ----
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    theme_preference = models.CharField(max_length=10, default='system')

    def __str__(self):
        return f'{self.user.username} Profile'

    def update_streak(self):
        today = timezone.localdate()
        if self.last_active_date == today:
            return self.current_streak

        from logs.models import MealEntry
        yesterday = today - timedelta(days=1)

        if self.last_active_date == yesterday:
            self.current_streak = (self.current_streak or 0) + 1
        elif self.last_active_date is None:
            self.current_streak = 1
        else:
            had_yesterday_activity = MealEntry.objects.filter(user=self.user, date=yesterday).exists()
            if had_yesterday_activity:
                self.current_streak = (self.current_streak or 0) + 1
            else:
                self.current_streak = 1

        if self.current_streak > (self.longest_streak or 0):
            self.longest_streak = self.current_streak

        self.last_active_date = today
        self.save(update_fields=['current_streak', 'longest_streak', 'last_active_date'])
        return self.current_streak

    @property
    def bmi(self):
        """Body Mass Index (BMI = weight_kg / (height_m^2))."""
        if not (self.weight_kg and self.height_cm):
            return None
        height_m = self.height_cm / 100.0
        return round(self.weight_kg / (height_m ** 2), 1)

    @property
    def bmi_category(self):
        """Classification of BMI according to WHO standards."""
        bmi_val = self.bmi
        if bmi_val is None:
            return None
        if bmi_val < 18.5:
            return 'Underweight'
        elif bmi_val < 25.0:
            return 'Normal weight'
        elif bmi_val < 30.0:
            return 'Overweight'
        else:
            return 'Obese'

    @property
    def bmr(self):
        """
        Basal Metabolic Rate (BMR) using Mifflin-St Jeor Equation (modern gold standard):
        - Male: 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
        - Female: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
        - Other: 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 78 (midpoint)
        """
        if not (self.weight_kg and self.height_cm and self.age):
            return None
        base = (10.0 * self.weight_kg) + (6.25 * self.height_cm) - (5.0 * self.age)
        if self.gender == 'male':
            return round(base + 5)
        elif self.gender == 'female':
            return round(base - 161)
        else:
            return round(base - 78)

    @property
    def tdee(self):
        """
        Total Daily Energy Expenditure (TDEE) based on activity level multiplier:
        - Sedentary: BMR * 1.20
        - Light: BMR * 1.375
        - Moderate: BMR * 1.55
        - Active: BMR * 1.725
        - Very Active: BMR * 1.90
        """
        bmr_val = self.bmr
        if not bmr_val:
            return None
        multipliers = {
            'sedentary': 1.20,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.90,
        }
        mult = multipliers.get(self.activity_level, 1.20)
        return round(bmr_val * mult)

    def calculate_daily_calorie_goal(self):
        """
        Calculate daily calorie target based on TDEE and user's goal:
        - lose_weight: 500 kcal deficit (~0.5 kg fat loss/week), safe minimum floor applied
        - gain_muscle: +350 kcal surplus (lean muscle building)
        - maintain: TDEE maintenance
        """
        tdee_val = self.tdee
        if not tdee_val:
            return 2000

        if self.goal == 'lose_weight':
            target = tdee_val - 500
            # Safety floors recommended by sports medicine & health authorities
            floor = 1500 if self.gender == 'male' else (1200 if self.gender == 'female' else 1350)
            return max(floor, round(target))
        elif self.goal == 'gain_muscle':
            return round(tdee_val + 350)
        else:
            return round(tdee_val)

    def calculate_macro_percentages(self):
        """Macro distribution percentages tailored to diet preference and fitness goal."""
        if self.diet_preference == 'keto':
            return 0.25, 0.05, 0.70  # Protein, Carbs, Fat
        if self.goal == 'lose_weight':
            return 0.35, 0.35, 0.30  # High protein to preserve muscle
        elif self.goal == 'gain_muscle':
            return 0.30, 0.45, 0.25  # Protein for hypertrophy, carbs for training energy
        else:
            return 0.25, 0.50, 0.25  # Balanced maintenance

    def calculate_default_goal_weight(self):
        """Calculates a sensible goal weight if the user has not explicitly set one."""
        if not (self.weight_kg and self.height_cm):
            return None
        height_m = self.height_cm / 100.0
        if self.goal == 'lose_weight':
            healthy_target = round(22.5 * (height_m ** 2), 1)
            if self.weight_kg > healthy_target:
                return healthy_target
            return round(self.weight_kg * 0.92, 1)
        elif self.goal == 'gain_muscle':
            return round(self.weight_kg + 3.0, 1)
        else:
            return round(self.weight_kg, 1)

    def recalculate_and_save_goals(self):
        """Update daily_calorie_goal, macro percentages, and default goal_weight_kg."""
        if self.weight_kg and self.height_cm and self.age:
            self.daily_calorie_goal = self.calculate_daily_calorie_goal()
            p, c, f = self.calculate_macro_percentages()
            self.protein_pct = p
            self.carbs_pct = c
            self.fat_pct = f
            if not self.goal_weight_kg:
                self.goal_weight_kg = self.calculate_default_goal_weight()

    def save(self, *args, **kwargs):
        if (self.daily_calorie_goal is None or self.daily_calorie_goal == 0) and (self.weight_kg and self.height_cm and self.age):
            self.recalculate_and_save_goals()
        super().save(*args, **kwargs)

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
        """
        Calculate daily water intake goal based on body weight, activity level, and goal.
        Formula: Base (0.5-1 oz per lb / ~30ml per kg) + activity bonus + goal adjustment
        """
        if not self.weight_kg:
            return 2.0  # Default fallback to 2L
        
        # Base water requirement by activity level (ml per kg)
        activity_multipliers = {
            'sedentary': 30,
            'light': 35,
            'moderate': 40,
            'active': 45,
            'very_active': 50,
        }
        
        base_ml_per_kg = activity_multipliers.get(self.activity_level, 35)
        base_liters = (self.weight_kg * base_ml_per_kg) / 1000
        
        # Adjust for goal (weight loss needs more hydration)
        if self.goal == 'lose_weight':
            base_liters *= 1.1  # 10% increase
        
        # Round to nearest 0.25L for easier tracking
        return round(base_liters * 4) / 4