
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import progress_view

urlpatterns = [
    path('progress/', progress_view, name='progress'),
    path('Progress/', progress_view, name='progress-capital'),
]
