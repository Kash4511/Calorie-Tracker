from django.urls import path
from .views import (
    MealEntryListCreateView,
    MealEntryDeleteView,
    MealEntryUpdateView,
    ActivityEntryListCreateView,
    WaterTodayView,
    WeightTodayView,
    WeightHistoryView,
    TodayDashboardView,
    FoodSearchView,
    MealEntryFromFoodView,
)

urlpatterns = [
    path('dashboard/today/', TodayDashboardView.as_view(), name='dashboard-today'),
    path('foods/', FoodSearchView.as_view(), name='food-search'),
    path('meals/from-food/', MealEntryFromFoodView.as_view(), name='meal-from-food'),
    path('meals/', MealEntryListCreateView.as_view(), name='meal-list-create'),
    path('meals/<int:pk>/', MealEntryDeleteView.as_view(), name='meal-delete'),
    path('meals/<int:pk>/edit/', MealEntryUpdateView.as_view(), name='meal-edit'),
    path('activity/', ActivityEntryListCreateView.as_view(), name='activity-list-create'),
    path('water/today/', WaterTodayView.as_view(), name='water-today'),
    path('weight/today/', WeightTodayView.as_view(), name='weight-today'),
    path('weight/history/', WeightHistoryView.as_view(), name='weight-history'),
]