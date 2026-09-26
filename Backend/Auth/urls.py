from django.urls import path, include
from .views import RegisterView, OnboardingView, OnboardingStatusView, ProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register', RegisterView.as_view(), name='register-noslash'),
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    path('onboarding', OnboardingView.as_view(), name='onboarding-noslash'),
    path('onboarding/status/', OnboardingStatusView.as_view(), name='onboarding-status'),
    path('onboarding/status', OnboardingStatusView.as_view(), name='onboarding-status-noslash'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile', ProfileView.as_view(), name='profile-noslash'),
    path('logs/', include('logs.urls')),
]
