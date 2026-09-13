from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    goal = serializers.ChoiceField(choices=Profile.GOAL_CHOICES, required=False)
    activity_level = serializers.ChoiceField(choices=Profile.ACTIVITY_LEVEL_CHOICES, required=False)
    gender = serializers.ChoiceField(choices=Profile.GENDER_CHOICES, required=False)
    diet_preference = serializers.ChoiceField(choices=Profile.DIET_PREFERENCE_CHOICES, required=False)
    age = serializers.IntegerField(min_value=10, max_value=100, required=False)
    height_cm = serializers.FloatField(min_value=100.0, max_value=250.0, required=False)
    weight_kg = serializers.FloatField(min_value=20.0, max_value=400.0, required=False)
    goal_weight_kg = serializers.FloatField(min_value=20.0, max_value=400.0, required=False, allow_null=True)
    daily_calorie_goal = serializers.IntegerField(read_only=True)
    macro_goals = serializers.ReadOnlyField(source='macro_goals_g')
    water_goal = serializers.ReadOnlyField(source='water_goal_liters')
    bmr = serializers.ReadOnlyField()
    tdee = serializers.ReadOnlyField()
    bmi = serializers.ReadOnlyField()
    bmi_category = serializers.ReadOnlyField()

    first_name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)
    last_name = serializers.CharField(source='user.last_name', required=False, allow_blank=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    profile_photo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        full = f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip()
        return full or obj.user.username

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        user_changed = False
        if 'first_name' in user_data:
            instance.user.first_name = user_data['first_name']
            user_changed = True
        if 'last_name' in user_data:
            instance.user.last_name = user_data['last_name']
            user_changed = True
        if user_changed:
            instance.user.save()
        return super().update(instance, validated_data)

    class Meta:
        model = Profile
        fields = [
            'name',
            'first_name',
            'last_name',
            'username',
            'email',
            'profile_photo',
            'goal',
            'activity_level',
            'gender',
            'age',
            'height_cm',
            'weight_kg',
            'goal_weight_kg',
            'diet_preference',
            'onboarding_completed',
            'daily_calorie_goal',
            'macro_goals',
            'water_goal',
            'bmr',
            'tdee',
            'bmi',
            'bmi_category',
            'current_streak',
            'longest_streak',
            'theme_preference',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False},
            'last_name': {'required': False}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
