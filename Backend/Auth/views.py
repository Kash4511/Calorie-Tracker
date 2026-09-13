from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import ProfileSerializer, RegisterSerializer


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        return Response({
            'onboarding_completed': profile.onboarding_completed
        }, status=status.HTTP_200_OK)


class OnboardingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            profile.onboarding_completed = True
            profile.recalculate_and_save_goals()
            profile.save()
            return Response({
                'onboarding_completed': True,
                'profile': ProfileSerializer(profile).data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(APIView):
    """
    GET /api/profile/ - Retrieve authenticated user's profile with calculated metrics.
    PATCH/PUT /api/profile/ - Update body stats (weight, height, age, activity, goal)
                              and automatically recalculate calorie & macro goals.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        if not profile.daily_calorie_goal and profile.weight_kg and profile.height_cm and profile.age:
            profile.recalculate_and_save_goals()
            profile.save()
        serializer = ProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        profile = request.user.profile
        if 'name' in request.data:
            name_val = str(request.data['name']).strip()
            parts = name_val.split(' ', 1)
            request.user.first_name = parts[0]
            request.user.last_name = parts[1] if len(parts) > 1 else ''
            request.user.save()
        if 'first_name' in request.data:
            request.user.first_name = str(request.data['first_name']).strip()
            request.user.save()
        if 'last_name' in request.data:
            request.user.last_name = str(request.data['last_name']).strip()
            request.user.save()

        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            profile.recalculate_and_save_goals()
            profile.save()
            return Response(ProfileSerializer(profile).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)

