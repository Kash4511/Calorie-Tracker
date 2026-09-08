from django.urls import path, include
from .views import RegisterView, OnboardingView, OnboardingStatusView, ProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('onboarding/status/', OnboardingStatusView.as_view(), name='onboarding-status'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('logs/', include('logs.urls')),
]
