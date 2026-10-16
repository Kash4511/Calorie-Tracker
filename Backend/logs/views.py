from django.shortcuts import render, get_object_or_404

# Create your views here.
from django.utils import timezone
from django.db.models import Q, Sum
from rest_framework import generics, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from Auth.models import Profile
from .models import MealEntry, ActivityEntry, WaterLog, WeightLog, FoodItem, FoodUnit
from .serializers import (
    MealEntrySerializer, ActivityEntrySerializer,
    WaterLogSerializer, WeightLogSerializer,
    FoodItemSerializer, FoodUnitSerializer,
)
from .units import convert_to_grams, UnitError, WEIGHT_UNITS
from .badges import get_user_badges_and_streak


def _nutrition_for_grams(food, grams):
    """Return (servings_factor, macro_dict) for a gram amount of a food.

    ``servings`` stays the per-100g factor so every existing aggregate and the
    historical log rows keep working unchanged.
    """
    factor = grams / 100
    return factor, {
        'calories': round(food.calories_per_100g * factor),
        'protein_g': round(food.protein_per_100g * factor, 1),
        'carbs_g': round(food.carbs_per_100g * factor, 1),
        'fat_g': round(food.fat_per_100g * factor, 1),
        'sugar_g': round(food.sugar_per_100g * factor, 1),
    }


class MealEntryListCreateView(generics.ListCreateAPIView):
    """List or create meal entries for a selected calendar date."""
    serializer_class = MealEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        selected_date = self.request.query_params.get('date', str(timezone.localdate()))
        return MealEntry.objects.filter(user=self.request.user, date=selected_date).order_by('created_at')

    def perform_create(self, serializer):
        date = serializer.validated_data.get('date') or self.request.data.get('date') or timezone.localdate()
        serializer.save(user=self.request.user, date=date)


class MealEntryUpdateView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MealEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MealEntry.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        entry = self.get_object()
        raw_servings = self.request.data.get('servings')
        quantity = self.request.data.get('quantity')
        unit_label = self.request.data.get('unit_label')

        # Change the unit and/or the quantity — e.g. convert an old gram-based
        # entry to eggs, or fix a mistyped amount.
        if entry.food_item_id and (quantity is not None or unit_label is not None):
            food = entry.food_item
            label = unit_label if unit_label is not None else entry.unit_label
            amount = quantity if quantity is not None else (
                entry.quantity if entry.quantity is not None else entry.servings * 100
            )
            try:
                amount, unit, grams = convert_to_grams(food, label, amount)
            except UnitError as exc:
                raise serializers.ValidationError({'unit_label': str(exc)})
            factor, macros = _nutrition_for_grams(food, grams)
            serializer.save(quantity=amount, unit_label=unit['label'], servings=round(factor, 4), **macros)
            return

        # Legacy path: servings is the per-100g factor.
        if raw_servings is not None and entry.food_item_id:
            try:
                servings = float(raw_servings)
                if servings <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                raise serializers.ValidationError({'servings': 'Servings must be positive.'})
            food = entry.food_item
            factor, macros = _nutrition_for_grams(food, servings * 100)
            serializer.save(
                servings=round(servings, 4), quantity=round(servings * 100, 1), unit_label='g', **macros
            )
            return
        serializer.save()


class MealEntryDeleteView(generics.DestroyAPIView):
    serializer_class = MealEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # scoped to the requesting user so no one can delete someone else's entry by id
        return MealEntry.objects.filter(user=self.request.user)


class ActivityEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = ActivityEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ActivityEntry.objects.filter(user=self.request.user, date=timezone.localdate())

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, date=timezone.localdate())


class WaterTodayView(APIView):
    """GET current day's water total. PATCH with {"delta": 0.25} or {"delta": -0.25}."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        log, _ = WaterLog.objects.get_or_create(user=request.user, date=timezone.localdate())
        return Response(WaterLogSerializer(log).data)

    def patch(self, request):
        log, _ = WaterLog.objects.get_or_create(user=request.user, date=timezone.localdate())
        delta = request.data.get('delta')
        liters = request.data.get('liters')
        if delta is not None:
            log.liters = max(0, round(log.liters + float(delta), 2))
        elif liters is not None:
            log.liters = max(0, round(float(liters), 2))
        else:
            return Response({'detail': 'Provide "delta" or "liters".'}, status=status.HTTP_400_BAD_REQUEST)
        log.save()
        return Response(WaterLogSerializer(log).data)


class WeightTodayView(APIView):
    """GET/PUT today's weight entry — updates daily weight log and user profile goals."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        log = WeightLog.objects.filter(user=request.user, date=timezone.localdate()).first()
        if log:
            return Response(WeightLogSerializer(log).data)
        profile_weight = getattr(request.user.profile, 'weight_kg', None)
        return Response({'date': str(timezone.localdate()), 'weight_kg': profile_weight})

    def put(self, request):
        weight_kg = request.data.get('weight_kg')
        if weight_kg is None:
            return Response({'detail': 'weight_kg is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            weight_kg = float(weight_kg)
            if weight_kg < 20 or weight_kg > 400:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'detail': 'weight_kg must be between 20 and 400 kg.'}, status=status.HTTP_400_BAD_REQUEST)
        log, _ = WeightLog.objects.update_or_create(
            user=request.user, date=timezone.localdate(),
            defaults={'weight_kg': weight_kg},
        )
        try:
            profile = request.user.profile
            profile.weight_kg = weight_kg
            profile.recalculate_and_save_goals()
            profile.save()
        except Profile.DoesNotExist:
            pass
        return Response(WeightLogSerializer(log).data)


class WeightHistoryView(generics.ListAPIView):
    """For the 'Progress' tab already stubbed in the frontend's NAV_TABS."""
    serializer_class = WeightLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WeightLog.objects.filter(user=self.request.user).order_by('-date')[:90]


class TodayDashboardView(APIView):
    """
    Single aggregated GET the frontend calls once on dashboard load.
    Returns calculated goals accurate to weight, height, and age.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        selected_date = request.query_params.get('date', str(timezone.localdate()))

        try:
            profile = user.profile
        except Profile.DoesNotExist:
            profile, _ = Profile.objects.get_or_create(
                user=user,
                defaults={
                    'daily_calorie_goal': 2000,
                    'protein_pct': 0.30,
                    'carbs_pct': 0.40,
                    'fat_pct': 0.30,
                    'sugar_goal_g': 50,
                },
            )

        if not profile.daily_calorie_goal and profile.weight_kg and profile.height_cm and profile.age:
            profile.recalculate_and_save_goals()
            profile.save()

        meals_qs = MealEntry.objects.filter(user=user, date=selected_date)
        consumed = meals_qs.aggregate(total=Sum('calories'))['total'] or 0

        macros_agg = meals_qs.aggregate(
            protein=Sum('protein_g'), carbs=Sum('carbs_g'),
            fat=Sum('fat_g'), sugar=Sum('sugar_g'),
        )
        macros_consumed = {k: (v or 0) for k, v in macros_agg.items()}

        burned = ActivityEntry.objects.filter(user=user, date=selected_date).aggregate(
            total=Sum('calories_burned')
        )['total'] or 0

        water = WaterLog.objects.filter(user=user, date=selected_date).first()
        weight = WeightLog.objects.filter(user=user, date=selected_date).first()

        goal = profile.daily_calorie_goal or 2000
        net = consumed - burned
        remaining = goal - net

        meals_by_type = {}
        for key, _label in MealEntry.MEAL_CHOICES:
            qs = meals_qs.filter(meal_type=key)
            meals_by_type[key] = {
                'items': list(qs.values('id', 'name', 'calories', 'quantity', 'unit_label')),
                'kcal': qs.aggregate(t=Sum('calories'))['t'] or 0,
            }

        profile_summary = {
            'weight_kg': profile.weight_kg,
            'height_cm': profile.height_cm,
            'age': profile.age,
            'gender': profile.gender,
            'activity_level': profile.activity_level,
            'activity_label': profile.get_activity_level_display() if profile.activity_level else 'Sedentary',
            'goal': profile.goal,
            'goal_label': profile.get_goal_display() if profile.goal else 'Maintain',
            'bmr': profile.bmr,
            'tdee': profile.tdee,
            'bmi': profile.bmi,
            'bmi_category': profile.bmi_category,
        }

        streak_info = get_user_badges_and_streak(user)

        return Response({
            'date': selected_date,
            'goal': goal,
            'consumed': consumed,
            'burned': burned,
            'net': net,
            'remaining': remaining,
            'macros': {'consumed': macros_consumed, 'goal': profile.macro_goals_g},
            'water': {'liters': water.liters if water else 0, 'goal': profile.water_goal_liters},
            'weight': {'today_kg': weight.weight_kg if weight else profile.weight_kg, 'goal_kg': profile.goal_weight_kg},
            'meals': meals_by_type,
            'profile_summary': profile_summary,
            'streak': streak_info['streak'],
            'badges': streak_info['badges'],
        })


class BadgesView(APIView):
    """GET /api/logs/badges/ — returns user streak and all earned/unearned badges."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_user_badges_and_streak(request.user))


class FoodSearchView(generics.ListAPIView):
    """GET /api/logs/foods/?q=alm  — searches the catalog by name, case-insensitive."""
    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        qs = FoodItem.objects.prefetch_related('units')
        if q:
            search_terms = [q]
            if q.lower() == 'daal':
                search_terms.append('dal')
            if q.lower() == 'anda' or q.lower() == 'ande':
                search_terms.append('egg')
            query = Q()
            for term in search_terms:
                query |= Q(name__icontains=term)
            qs = qs.filter(query)
        return qs[:200]  # keep the catalog responsive without hiding common foods


class RecentFoodsView(APIView):
    """
    GET /api/logs/foods/recent/?limit=8

    The foods this user logged most recently, newest first and de-duplicated by
    name — including dishes they typed in manually, which have no catalog row.
    Powers the "Recently used" strip at the top of the log search.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            limit = int(request.query_params.get('limit', 8))
        except (TypeError, ValueError):
            limit = 8
        limit = max(1, min(limit, 25))

        entries = (
            MealEntry.objects.filter(user=request.user)
            .select_related('food_item')
            .prefetch_related('food_item__units')
            .order_by('-created_at')[:200]  # bounded scan so heavy loggers stay fast
        )

        recents, seen = [], set()
        for entry in entries:
            key = entry.name.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            recents.append({
                'id': entry.id,
                'name': entry.name,
                'meal_type': entry.meal_type,
                'food_item_id': entry.food_item_id,
                'quantity': entry.quantity,
                'unit_label': entry.unit_label,
                'calories': entry.calories,
                'protein_g': entry.protein_g,
                'carbs_g': entry.carbs_g,
                'fat_g': entry.fat_g,
                'sugar_g': entry.sugar_g,
                'logged_at': entry.created_at,
                # Catalog nutrition + units when it came from the food library,
                # None for a manually typed entry.
                'food': FoodItemSerializer(entry.food_item).data if entry.food_item_id else None,
            })
            if len(recents) >= limit:
                break
        return Response(recents)


class MealEntryFromFoodView(APIView):
    """
    POST /api/logs/meals/from-food/
    body: { "food_item_id": 3, "quantity": 3, "unit_label": "egg", "meal_type": "breakfast" }
    Legacy weight body also works: { "food_item_id": 3, "grams": 150, ... }

    Any quantity/unit is converted to grams and then to calories/macros
    server-side from the per-100g catalog values — the frontend never does
    this math itself.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        food_id = request.data.get('food_item_id')
        meal_type = request.data.get('meal_type')
        selected_date = request.data.get('date', str(timezone.localdate()))
        quantity = request.data.get('quantity')
        unit_label = request.data.get('unit_label')
        grams = request.data.get('grams')

        if food_id is None or meal_type is None:
            return Response(
                {'detail': 'food_item_id and meal_type are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        food = get_object_or_404(FoodItem, id=food_id)

        valid_meal_types = {k for k, _ in MealEntry.MEAL_CHOICES}
        if meal_type not in valid_meal_types:
            return Response({'detail': f'meal_type must be one of {sorted(valid_meal_types)}.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity is not None:
            try:
                quantity, unit, grams = convert_to_grams(food, unit_label, quantity)
            except UnitError as exc:
                return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            unit_label = unit['label']
        elif grams is not None:
            # Legacy grams-only body — logged as a weight entry.
            try:
                grams = float(grams)
                if grams <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                return Response({'detail': 'grams must be a positive number.'}, status=status.HTTP_400_BAD_REQUEST)
            quantity, unit_label = grams, 'g'
        else:
            return Response(
                {'detail': 'Provide "quantity" with "unit_label", or "grams".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        factor, macros = _nutrition_for_grams(food, grams)
        entry = MealEntry.objects.create(
            user=request.user,
            date=selected_date,
            meal_type=meal_type,
            name=food.name,
            quantity=quantity,
            unit_label=unit_label,
            servings=round(factor, 4),
            food_item=food,
            **macros,
        )
        return Response(MealEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class FoodUnitListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/logs/foods/<food_id>/units/  — units valid for this food
    POST /api/logs/foods/<food_id>/units/  — add a custom count unit
         body: { "label": "scoop", "grams_per_unit": 30 }
    """
    serializer_class = FoodUnitSerializer
    permission_classes = [IsAuthenticated]

    def get_food(self):
        return get_object_or_404(FoodItem, id=self.kwargs['food_id'])

    def get_queryset(self):
        return FoodUnit.objects.filter(food_item_id=self.kwargs['food_id'])

    def perform_create(self, serializer):
        food = self.get_food()
        label = (serializer.validated_data.get('label') or '').strip()
        if label.lower() in WEIGHT_UNITS:
            raise serializers.ValidationError({'label': f'"{label}" is a built-in weight unit.'})
        if FoodUnit.objects.filter(food_item=food, label__iexact=label).exists():
            raise serializers.ValidationError({'label': f'{food.name} already has a "{label}" unit.'})
        if serializer.validated_data.get('is_default'):
            FoodUnit.objects.filter(food_item=food, is_default=True).update(is_default=False)
        serializer.save(food_item=food, kind='count', created_by=self.request.user)