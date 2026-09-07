from django.shortcuts import render

# Create your views here.
from django.utils import timezone
from django.db.models import Q, Sum
from rest_framework import generics, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from Auth.models import Profile
from .models import MealEntry, ActivityEntry, WaterLog, WeightLog, FoodItem
from .serializers import (
    MealEntrySerializer, ActivityEntrySerializer,
    WaterLogSerializer, WeightLogSerializer,
    FoodItemSerializer,
)


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
        if raw_servings is not None and entry.food_item_id:
            try:
                servings = float(raw_servings)
                if servings <= 0:
                    raise ValueError
            except (TypeError, ValueError):
                raise serializers.ValidationError({'servings': 'Servings must be positive.'})
            food = entry.food_item
            serializer.save(
                servings=servings,
                calories=round(food.calories_per_100g * servings),
                protein_g=round(food.protein_per_100g * servings, 1),
                carbs_g=round(food.carbs_per_100g * servings, 1),
                fat_g=round(food.fat_per_100g * servings, 1),
                sugar_g=round(food.sugar_per_100g * servings, 1),
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
    """GET/PUT today's weight entry — matches the frontend's single 'Save' button."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        log = WeightLog.objects.filter(user=request.user, date=timezone.localdate()).first()
        if log:
            return Response(WeightLogSerializer(log).data)
        return Response({'date': str(timezone.localdate()), 'weight_kg': None})

    def put(self, request):
        weight_kg = request.data.get('weight_kg')
        if weight_kg is None:
            return Response({'detail': 'weight_kg is required.'}, status=status.HTTP_400_BAD_REQUEST)
        log, _ = WeightLog.objects.update_or_create(
            user=request.user, date=timezone.localdate(),
            defaults={'weight_kg': weight_kg},
        )
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
    Returns everything DashboardPage.tsx currently hardcodes as placeholder state.
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

        goal = profile.daily_calorie_goal or 0

        meals_by_type = {}
        for key, _label in MealEntry.MEAL_CHOICES:
            qs = meals_qs.filter(meal_type=key)
            meals_by_type[key] = {
                'items': list(qs.values('id', 'name', 'calories')),
                'kcal': qs.aggregate(t=Sum('calories'))['t'] or 0,
            }

        return Response({
            'date': selected_date,
            'goal': goal,
            'consumed': consumed,
            'burned': burned,
            'remaining': max(goal - consumed + burned, 0),
            'macros': {'consumed': macros_consumed, 'goal': profile.macro_goals_g},
            'water': {'liters': water.liters if water else 0, 'goal': profile.water_goal_liters},
            'weight': {'today_kg': weight.weight_kg if weight else None, 'goal_kg': profile.goal_weight_kg},
            'meals': meals_by_type,
        })
        # ---- Append to logs/views.py ----
# (needs added to the existing imports:
#    from .models import FoodItem   (add to the existing MealEntry, ActivityEntry... line)
#    from .serializers import FoodItemSerializer  (add to the existing import line) )

class FoodSearchView(generics.ListAPIView):
    """GET /api/logs/foods/?q=alm  — searches the catalog by name, case-insensitive."""
    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        qs = FoodItem.objects.all()
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


class MealEntryFromFoodView(APIView):
    """
    POST /api/logs/meals/from-food/
    body: { "food_item_id": 3, "grams": 150, "meal_type": "breakfast" }
    Computes calories/macros server-side from the per-100g catalog values —
    the frontend never does this math itself.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        food_id = request.data.get('food_item_id')
        grams = request.data.get('grams')
        meal_type = request.data.get('meal_type')
        selected_date = request.data.get('date', str(timezone.localdate()))

        if not all([food_id, grams, meal_type]):
            return Response(
                {'detail': 'food_item_id, grams, and meal_type are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            food = FoodItem.objects.get(id=food_id)
        except FoodItem.DoesNotExist:
            return Response({'detail': 'Food item not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            grams = float(grams)
            if grams <= 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'detail': 'grams must be a positive number.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_meal_types = {k for k, _ in MealEntry.MEAL_CHOICES}
        if meal_type not in valid_meal_types:
            return Response({'detail': f'meal_type must be one of {sorted(valid_meal_types)}.'}, status=status.HTTP_400_BAD_REQUEST)

        factor = grams / 100
        entry = MealEntry.objects.create(
            user=request.user,
            date=selected_date,
            meal_type=meal_type,
            name=food.name,
            calories=round(food.calories_per_100g * factor),
            protein_g=round(food.protein_per_100g * factor, 1),
            carbs_g=round(food.carbs_per_100g * factor, 1),
            fat_g=round(food.fat_per_100g * factor, 1),
            sugar_g=round(food.sugar_per_100g * factor, 1),
            servings=round(factor, 2),
            food_item=food,
        )
        return Response(MealEntrySerializer(entry).data, status=status.HTTP_201_CREATED)