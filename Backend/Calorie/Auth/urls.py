from django.urls import path
from .views import RegisterView, OnboardingView, OnboardingStatusView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('onboarding/status/', OnboardingStatusView.as_view(), name='onboarding-status'),
]
