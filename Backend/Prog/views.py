from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Avg
from datetime import timedelta
from logs.models import MealEntry, WeightLog, ActivityEntry, WaterLog
from Auth.models import Profile


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def progress_view(request):
    try:
        days = int(request.query_params.get('days', 14))
        if days <= 0:
            days = 14
    except (ValueError, TypeError):
        days = 14

    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    try:
        profile = request.user.profile
    except Profile.DoesNotExist:
        return Response({'detail': 'Profile not found. Complete onboarding first.'}, status=404)

    # All user weight logs ordered chronologically
    all_weights = WeightLog.objects.filter(user=request.user).order_by('date')
    latest_weight_log = all_weights.last()
    earliest_weight_log = all_weights.first()

    current_weight = latest_weight_log.weight_kg if latest_weight_log else profile.weight_kg
    start_weight = earliest_weight_log.weight_kg if earliest_weight_log else profile.weight_kg

    # ---- 1. Accurate Week Weight Change (Last 7 Days) ----
    date_7d_ago = today - timedelta(days=7)
    weight_7d_ago_log = all_weights.filter(date__lte=date_7d_ago).last()

    if weight_7d_ago_log and latest_weight_log and weight_7d_ago_log != latest_weight_log:
        week_baseline = weight_7d_ago_log.weight_kg
        week_change_kg = round(current_weight - week_baseline, 1)
        week_days_span = (latest_weight_log.date - weight_7d_ago_log.date).days
    elif all_weights.count() >= 2:
        earliest_7d = all_weights.filter(date__gte=date_7d_ago).first()
        if earliest_7d and earliest_7d != latest_weight_log:
            week_baseline = earliest_7d.weight_kg
            week_change_kg = round(current_weight - week_baseline, 1)
            week_days_span = (latest_weight_log.date - earliest_7d.date).days
        else:
            week_baseline = current_weight
            week_change_kg = 0.0
            week_days_span = 0
    else:
        week_baseline = current_weight
        week_change_kg = 0.0 if (current_weight is not None and all_weights.exists()) else None
        week_days_span = 0

    if week_change_kg is not None:
        if week_change_kg < 0:
            week_status = 'lost'
        elif week_change_kg > 0:
            week_status = 'gained'
        else:
            week_status = 'maintained'
    else:
        week_status = 'insufficient_data'

    # ---- 2. Accurate Month Weight Change (Last 30 Days) ----
    date_30d_ago = today - timedelta(days=30)
    weight_30d_ago_log = all_weights.filter(date__lte=date_30d_ago).last()

    if weight_30d_ago_log and latest_weight_log and weight_30d_ago_log != latest_weight_log:
        month_baseline = weight_30d_ago_log.weight_kg
        month_change_kg = round(current_weight - month_baseline, 1)
        month_days_span = (latest_weight_log.date - weight_30d_ago_log.date).days
    elif all_weights.count() >= 2:
        earliest_30d = all_weights.filter(date__gte=date_30d_ago).first()
        if earliest_30d and earliest_30d != latest_weight_log:
            month_baseline = earliest_30d.weight_kg
            month_change_kg = round(current_weight - month_baseline, 1)
            month_days_span = (latest_weight_log.date - earliest_30d.date).days
        else:
            month_baseline = current_weight
            month_change_kg = 0.0
            month_days_span = 0
    else:
        month_baseline = current_weight
        month_change_kg = 0.0 if (current_weight is not None and all_weights.exists()) else None
        month_days_span = 0

    if month_change_kg is not None:
        if month_change_kg < 0:
            month_status = 'lost'
        elif month_change_kg > 0:
            month_status = 'gained'
        else:
            month_status = 'maintained'
    else:
        month_status = 'insufficient_data'

    # ---- 3. Total Weight Change & Goal Distance ----
    total_change_kg = round(current_weight - start_weight, 1) if (current_weight and start_weight) else 0.0
    goal_weight_kg = profile.goal_weight_kg
    remaining_to_goal = round(abs(current_weight - goal_weight_kg), 1) if (current_weight and goal_weight_kg) else None

    # ---- 4. Meals & Calorie Breakdown in Selected Range ----
    meals_qs = MealEntry.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=today,
    )

    daily_totals = (
        meals_qs
        .values('date')
        .annotate(
            calories=Sum('calories'),
            protein=Sum('protein_g'),
            carbs=Sum('carbs_g'),
            fat=Sum('fat_g'),
        )
        .order_by('date')
    )
    totals_by_date = {row['date']: row['calories'] for row in daily_totals}

    # Activities in range
    activities_qs = ActivityEntry.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=today,
    )
    burned_by_date_qs = (
        activities_qs
        .values('date')
        .annotate(burned=Sum('calories_burned'))
    )
    burned_by_date = {row['date']: row['burned'] for row in burned_by_date_qs}
    total_burned = sum(burned_by_date.values())

    # Build daily series
    daily_calories = []
    total_consumed = 0
    logged_days_count = 0

    for i in range(days):
        d = start_date + timedelta(days=i)
        cals = totals_by_date.get(d, 0)
        burn = burned_by_date.get(d, 0)
        if cals > 0:
            logged_days_count += 1
            total_consumed += cals

        daily_calories.append({
            'date': str(d),
            'calories': cals,
            'burned': burn,
            'net': cals - burn,
            'target': profile.daily_calorie_goal or 2000,
        })

    avg_calories = round(total_consumed / logged_days_count) if logged_days_count else 0
    consistency_pct = round((logged_days_count / days) * 100) if days else 0

    # Macro averages per logged day
    macros_agg = meals_qs.aggregate(
        protein=Sum('protein_g'),
        carbs=Sum('carbs_g'),
        fat=Sum('fat_g'),
        sugar=Sum('sugar_g'),
    )
    avg_protein = round((macros_agg['protein'] or 0) / logged_days_count, 1) if logged_days_count else 0
    avg_carbs = round((macros_agg['carbs'] or 0) / logged_days_count, 1) if logged_days_count else 0
    avg_fat = round((macros_agg['fat'] or 0) / logged_days_count, 1) if logged_days_count else 0

    # Water in range
    water_qs = WaterLog.objects.filter(
        user=request.user,
        date__gte=start_date,
        date__lte=today,
    )
    total_water = water_qs.aggregate(total=Sum('liters'))['total'] or 0
    avg_water = round(total_water / logged_days_count, 2) if logged_days_count else 0

    # Weight trend points in the range (plus all history if fewer than 2 in range)
    range_weight_logs = all_weights.filter(date__gte=start_date, date__lte=today)
    if range_weight_logs.count() < 2 and all_weights.exists():
        trend_qs = all_weights
    else:
        trend_qs = range_weight_logs

    weight_trend = [
        {'date': str(w.date), 'weight_kg': w.weight_kg, 'target_kg': goal_weight_kg}
        for w in trend_qs
    ]

    week_formatted = 'No logs yet'
    if week_change_kg is not None:
        sign = '+' if week_change_kg > 0 else ''
        week_formatted = f'{sign}{week_change_kg} kg'

    month_formatted = 'No logs yet'
    if month_change_kg is not None:
        sign = '+' if month_change_kg > 0 else ''
        month_formatted = f'{sign}{month_change_kg} kg'

    return Response({
        'range_days': days,
        'logged_days_count': logged_days_count,
        'consistency_pct': consistency_pct,

        # Calorie stats
        'avg_calories': avg_calories,
        'calorie_target': profile.daily_calorie_goal or 2000,
        'total_burned': total_burned,
        'avg_burned': round(total_burned / logged_days_count) if logged_days_count else 0,

        # Macro stats
        'avg_protein_g': avg_protein,
        'protein_target_g': profile.macro_goals_g.get('protein', 0) if profile.macro_goals_g else 0,
        'avg_carbs_g': avg_carbs,
        'carbs_target_g': profile.macro_goals_g.get('carbs', 0) if profile.macro_goals_g else 0,
        'avg_fat_g': avg_fat,
        'fat_target_g': profile.macro_goals_g.get('fat', 0) if profile.macro_goals_g else 0,

        # Water stats
        'avg_water_liters': avg_water,
        'water_target_liters': profile.water_goal_liters,

        # Current & Goal Weight
        'current_weight_kg': current_weight,
        'start_weight_kg': start_weight,
        'goal_weight_kg': goal_weight_kg,
        'remaining_to_goal_kg': remaining_to_goal,

        # Weekly Progress (7 Days)
        'week_progress': {
            'change_kg': week_change_kg,
            'status': week_status,
            'baseline_kg': week_baseline,
            'current_kg': current_weight,
            'days_span': week_days_span,
            'formatted': week_formatted,
        },

        # Monthly Progress (30 Days)
        'month_progress': {
            'change_kg': month_change_kg,
            'status': month_status,
            'baseline_kg': month_baseline,
            'current_kg': current_weight,
            'days_span': month_days_span,
            'formatted': month_formatted,
        },

        # Total Progress
        'total_progress': {
            'change_kg': total_change_kg,
            'status': 'lost' if total_change_kg < 0 else ('gained' if total_change_kg > 0 else 'maintained'),
            'start_kg': start_weight,
            'current_kg': current_weight,
            'goal_kg': goal_weight_kg,
        },

        # Backward compatible fields
        'weight_change_kg': week_change_kg,

        # Series data for charts
        'daily_calories': daily_calories,
        'weight_trend': weight_trend,
    })
