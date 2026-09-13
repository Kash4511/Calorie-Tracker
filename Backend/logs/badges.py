from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from .models import MealEntry, ActivityEntry, WaterLog, WeightLog


def get_user_badges_and_streak(user):
    try:
        profile = user.profile
    except Exception:
        return {'streak': {'current_streak': 0, 'longest_streak': 0, 'days_active_week': [False]*7}, 'badges': []}

    current_streak = profile.update_streak()
    longest_streak = profile.longest_streak

    today = timezone.localdate()

    # Active days this current week (Monday=0 to Sunday=6)
    start_of_week = today - timedelta(days=today.weekday())
    active_days_week = []
    for day_offset in range(7):
        day_date = start_of_week + timedelta(days=day_offset)
        if day_date > today:
            active_days_week.append(False)
        else:
            is_active = (
                MealEntry.objects.filter(user=user, date=day_date).exists() or
                WaterLog.objects.filter(user=user, date=day_date, liters__gt=0).exists() or
                WeightLog.objects.filter(user=user, date=day_date).exists() or
                ActivityEntry.objects.filter(user=user, date=day_date).exists() or
                profile.last_active_date == day_date
            )
            active_days_week.append(bool(is_active))

    total_meals = MealEntry.objects.filter(user=user).count()
    distinct_meal_dates = MealEntry.objects.filter(user=user).values('date').distinct().count()

    dates_with_meals = MealEntry.objects.filter(user=user).values_list('date', flat=True).distinct()
    has_full_day = False
    for d in dates_with_meals:
        types_count = MealEntry.objects.filter(user=user, date=d).values('meal_type').distinct().count()
        if types_count >= 4:
            has_full_day = True
            break

    water_logged_count = WaterLog.objects.filter(user=user, liters__gt=0).count()
    water_met_count = WaterLog.objects.filter(user=user, liters__gte=profile.water_goal_liters).count()

    weight_logs_count = WeightLog.objects.filter(user=user).count()
    activity_count = ActivityEntry.objects.filter(user=user).count()

    calorie_goal = profile.daily_calorie_goal or 2000
    daily_cals = MealEntry.objects.filter(user=user).values('date').annotate(total=Sum('calories'))
    days_within_target = sum(1 for row in daily_cals if abs(row['total'] - calorie_goal) <= 150)

    protein_goal = profile.macro_goals_g.get('protein', 0) if profile.macro_goals_g else 0
    daily_protein = MealEntry.objects.filter(user=user).values('date').annotate(total=Sum('protein_g'))
    days_protein_met = sum(1 for row in daily_protein if protein_goal > 0 and row['total'] >= protein_goal)

    badges = [
        {
            'id': 'streak_1',
            'title': 'Day 1 Starter',
            'description': 'Started your fitness journey with your first active day',
            'category': 'login',
            'icon': '🌱',
            'unlocked': current_streak >= 1,
            'progress': min(current_streak, 1),
            'max_progress': 1,
        },
        {
            'id': 'streak_3',
            'title': 'On Fire',
            'description': 'Logged in and stayed consistent for 3 days in a row',
            'category': 'login',
            'icon': '🔥',
            'unlocked': current_streak >= 3,
            'progress': min(current_streak, 3),
            'max_progress': 3,
        },
        {
            'id': 'streak_7',
            'title': 'Week Warrior',
            'description': 'Completed a full 7-day consistency streak',
            'category': 'login',
            'icon': '⚡',
            'unlocked': current_streak >= 7,
            'progress': min(current_streak, 7),
            'max_progress': 7,
        },
        {
            'id': 'streak_14',
            'title': 'Fortnight Focus',
            'description': 'Maintained a 14-day consistency streak',
            'category': 'login',
            'icon': '🎯',
            'unlocked': current_streak >= 14,
            'progress': min(current_streak, 14),
            'max_progress': 14,
        },
        {
            'id': 'streak_30',
            'title': 'Monthly Master',
            'description': 'Crushed 30 days of unbroken consistency',
            'category': 'login',
            'icon': '👑',
            'unlocked': current_streak >= 30,
            'progress': min(current_streak, 30),
            'max_progress': 30,
        },
        {
            'id': 'log_first_meal',
            'title': 'First Fuel',
            'description': 'Logged your first meal entry',
            'category': 'logging',
            'icon': '🥗',
            'unlocked': total_meals >= 1,
            'progress': min(total_meals, 1),
            'max_progress': 1,
        },
        {
            'id': 'log_10_meals',
            'title': 'Habit Builder',
            'description': 'Logged 10 total meals in your food journal',
            'category': 'logging',
            'icon': '🍽️',
            'unlocked': total_meals >= 10,
            'progress': min(total_meals, 10),
            'max_progress': 10,
        },
        {
            'id': 'log_50_meals',
            'title': 'Nutrition Pro',
            'description': 'Logged 50 meals — true dedication to nutrition',
            'category': 'logging',
            'icon': '🏆',
            'unlocked': total_meals >= 50,
            'progress': min(total_meals, 50),
            'max_progress': 50,
        },
        {
            'id': 'log_full_day',
            'title': 'Full Day Fuel',
            'description': 'Logged breakfast, lunch, dinner, and snacks in a single day',
            'category': 'logging',
            'icon': '🍱',
            'unlocked': has_full_day,
            'progress': 1 if has_full_day else 0,
            'max_progress': 1,
        },
        {
            'id': 'log_water',
            'title': 'Hydro Starter',
            'description': 'Tracked your daily hydration',
            'category': 'logging',
            'icon': '💧',
            'unlocked': water_logged_count >= 1,
            'progress': min(water_logged_count, 1),
            'max_progress': 1,
        },
        {
            'id': 'log_weight',
            'title': 'Scale Stepper',
            'description': 'Recorded a body weight log',
            'category': 'logging',
            'icon': '⚖️',
            'unlocked': weight_logs_count >= 1,
            'progress': min(weight_logs_count, 1),
            'max_progress': 1,
        },
        {
            'id': 'log_activity',
            'title': 'Sweat Equity',
            'description': 'Logged physical exercise or workout',
            'category': 'logging',
            'icon': '🏃',
            'unlocked': activity_count >= 1,
            'progress': min(activity_count, 1),
            'max_progress': 1,
        },
        {
            'id': 'log_7_days',
            'title': 'Consistent Logger',
            'description': 'Logged meals on 7 distinct calendar days',
            'category': 'logging',
            'icon': '📅',
            'unlocked': distinct_meal_dates >= 7,
            'progress': min(distinct_meal_dates, 7),
            'max_progress': 7,
        },
        {
            'id': 'goal_calorie_hit',
            'title': 'Target Master',
            'description': 'Finished a day within 150 kcal of your calorie target',
            'category': 'goals',
            'icon': '🎯',
            'unlocked': days_within_target >= 1,
            'progress': min(days_within_target, 1),
            'max_progress': 1,
        },
        {
            'id': 'goal_water_hit',
            'title': 'Hydration Hero',
            'description': 'Reached or exceeded your daily water goal',
            'category': 'goals',
            'icon': '🌊',
            'unlocked': water_met_count >= 1,
            'progress': min(water_met_count, 1),
            'max_progress': 1,
        },
        {
            'id': 'goal_protein_hit',
            'title': 'Protein Champion',
            'description': 'Hit or surpassed your daily protein goal',
            'category': 'goals',
            'icon': '💪',
            'unlocked': days_protein_met >= 1,
            'progress': min(days_protein_met, 1),
            'max_progress': 1,
        },
        {
            'id': 'goal_crusher',
            'title': 'Goal Crusher',
            'description': 'Hit both your calorie target and water intake goals',
            'category': 'goals',
            'icon': '⭐',
            'unlocked': days_within_target >= 1 and water_met_count >= 1,
            'progress': 1 if (days_within_target >= 1 and water_met_count >= 1) else 0,
            'max_progress': 1,
        },
    ]

    unlocked_count = sum(1 for b in badges if b['unlocked'])

    return {
        'streak': {
            'current_streak': current_streak,
            'longest_streak': longest_streak,
            'last_active_date': str(profile.last_active_date) if profile.last_active_date else None,
            'active_days_week': active_days_week,
            'unlocked_badges_count': unlocked_count,
            'total_badges_count': len(badges),
        },
        'badges': badges,
    }
