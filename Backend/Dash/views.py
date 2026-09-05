from django.shortcuts import render

# Create your views here.
# dashboard/views.py
class TodayDashboardView(APIView):
    def get(self, request):
        user = request.user
        today = timezone.localdate()
        profile = user.profile

        meals_qs = MealEntry.objects.filter(user=user, date=today)
        consumed = meals_qs.aggregate(total=Sum('calories'))['total'] or 0
        macros_consumed = meals_qs.aggregate(
            protein=Sum('protein_g'), carbs=Sum('carbs_g'),
            fat=Sum('fat_g'), sugar=Sum('sugar_g'),
        )
        burned = ActivityEntry.objects.filter(user=user, date=today).aggregate(
            total=Sum('calories_burned'))['total'] or 0
        water = WaterLog.objects.filter(user=user, date=today).first()
        weight = WeightLog.objects.filter(user=user, date=today).first()

        meals_by_type = {
            k: {'items': list(meals_qs.filter(meal_type=k).values('id','name','calories')),
                'kcal': meals_qs.filter(meal_type=k).aggregate(t=Sum('calories'))['t'] or 0}
            for k in ['breakfast', 'lunch', 'snacks', 'dinner']
        }

        return Response({
            'goal': profile.daily_calorie_goal,
            'consumed': consumed,
            'burned': burned,
            'remaining': max(profile.daily_calorie_goal - consumed + burned, 0),
            'macros': {'consumed': macros_consumed, 'goal': profile.macro_goals_g},
            'water': {'liters': water.liters if water else 0, 'goal': profile.water_goal_liters},
            'weight': {'today_kg': weight.weight_kg if weight else None, 'goal_kg': profile.goal_weight_kg},
            'meals': meals_by_type,
        })