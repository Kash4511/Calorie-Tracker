const API_BASE_URL = '/api';

export interface OnboardingStatus {
  onboarding_completed: boolean;
}

export interface OnboardingData {
  goal: string;
  activity_level: string;
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  diet_preference: string;
}

export type MealKey = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface FoodItem {
  id: number;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  sugar_per_100g: number;
}

export interface MealEntry {
  id: number;
  date: string;
  meal_type: MealKey;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  servings: number;
  food_item_id: number | null;
}

export interface ProfileSummary {
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
  activity_label: string | null;
  goal: string | null;
  goal_label: string | null;
  bmr: number | null;
  tdee: number | null;
  bmi: number | null;
  bmi_category: string | null;
}

export interface UserProfile {
  name?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  profile_photo?: string | null;
  goal: string;
  activity_level: string;
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg: number | null;
  diet_preference: string;
  onboarding_completed: boolean;
  daily_calorie_goal: number;
  macro_goals: { protein: number; carbs: number; fat: number; sugar: number };
  water_goal: number;
  bmr: number | null;
  tdee: number | null;
  bmi: number | null;
  bmi_category: string | null;
  current_streak?: number;
  longest_streak?: number;
  theme_preference?: string;
}

export interface ActivityDayInfo {
  count: number;
  meals: number;
  calories: number;
  water: number;
  workouts: number;
  level: number; // 0: none, 1: low, 2: medium, 3: high, 4: very high
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  active_days_week: boolean[];
  unlocked_badges_count?: number;
  total_badges_count?: number;
  activity_history?: Record<string, ActivityDayInfo>;
  total_active_days?: number;
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  category: 'login' | 'logging' | 'goals';
  icon: string;
  unlocked: boolean;
  progress: number;
  max_progress: number;
}

export interface WeightPeriodProgress {
  change_kg: number | null;
  status: 'lost' | 'gained' | 'maintained' | 'insufficient_data';
  baseline_kg: number | null;
  current_kg: number | null;
  days_span: number;
  formatted: string;
}

export interface TotalWeightProgress {
  change_kg: number;
  status: 'lost' | 'gained' | 'maintained';
  start_kg: number | null;
  current_kg: number | null;
  goal_kg: number | null;
}

export interface DailyCalorieEntry {
  date: string;
  calories: number;
  burned: number;
  net: number;
  target: number;
}

export interface WeightTrendEntry {
  date: string;
  weight_kg: number;
  target_kg?: number | null;
}

export interface ProgressResponse {
  range_days: number;
  logged_days_count: number;
  consistency_pct: number;
  avg_calories: number;
  calorie_target: number;
  total_burned: number;
  avg_burned: number;
  avg_protein_g: number;
  protein_target_g: number;
  avg_carbs_g: number;
  carbs_target_g: number;
  avg_fat_g: number;
  fat_target_g: number;
  avg_water_liters: number;
  water_target_liters: number;
  current_weight_kg: number | null;
  start_weight_kg: number | null;
  goal_weight_kg: number | null;
  remaining_to_goal_kg: number | null;
  week_progress: WeightPeriodProgress;
  month_progress: WeightPeriodProgress;
  total_progress: TotalWeightProgress;
  weight_change_kg: number | null;
  daily_calories: DailyCalorieEntry[];
  weight_trend: WeightTrendEntry[];
}

export interface DashboardData {
  date: string;
  goal: number;
  consumed: number;
  burned: number;
  net?: number;
  remaining: number;
  macros: { consumed: Record<'protein' | 'carbs' | 'fat' | 'sugar', number>; goal: Record<string, number> };
  water: { liters: number; goal: number };
  weight: { today_kg: number | null; goal_kg: number | null };
  meals: Record<MealKey, { items: Array<{ id: number; name: string; calories: number }>; kcal: number }>;
  profile_summary?: ProfileSummary;
  streak?: StreakData;
  badges?: BadgeItem[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem('access_token', tokens.access);
  if (tokens.refresh) {
    localStorage.setItem('refresh_token', tokens.refresh);
  }
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = (await res.json()) as { access: string; refresh?: string };
    if (data.access) {
      localStorage.setItem('access_token', data.access);
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }
      return data.access;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized and not a token endpoint, attempt silent token refresh and retry
  if (response.status === 401 && !endpoint.startsWith('/token')) {
    if (!refreshPromise) {
      refreshPromise = attemptTokenRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new Error(JSON.stringify(errorData));
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as unknown as T;
}

export const api = {
  login: (username: string, password: string): Promise<AuthTokens> =>
    request<AuthTokens>('/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (data: {
    username: string;
    email: string;
    password: string;
    password2: string;
    first_name?: string;
    last_name?: string;
  }): Promise<AuthTokens & { user: unknown }> =>
    request<AuthTokens & { user: unknown }>('/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOnboardingStatus: (): Promise<OnboardingStatus> =>
    request<OnboardingStatus>('/onboarding/status/', {
      method: 'GET',
    }),

  submitOnboarding: (data: OnboardingData): Promise<{ onboarding_completed: boolean; profile: OnboardingData }> =>
    request<{ onboarding_completed: boolean; profile: OnboardingData }>('/onboarding/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getFoods: (query: string): Promise<FoodItem[]> =>
    request<FoodItem[]>(`/logs/foods/?q=${encodeURIComponent(query)}`),

  getMeals: (date: string): Promise<MealEntry[]> =>
    request<MealEntry[]>(`/logs/meals/?date=${encodeURIComponent(date)}`),

  addFood: (data: { date: string; meal_type: MealKey; food_item_id: number; grams: number }): Promise<MealEntry> =>
    request<MealEntry>('/logs/meals/from-food/', { method: 'POST', body: JSON.stringify(data) }),

  addManualMeal: (data: {
    date?: string;
    meal_type: MealKey;
    name: string;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    sugar_g?: number;
    servings?: number;
  }): Promise<MealEntry> =>
    request<MealEntry>('/logs/meals/', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        date: data.date || new Date().toISOString().slice(0, 10),
      }),
    }),

  logActivity: (data: {
    name: string;
    calories_burned: number;
    duration_minutes?: number;
    date?: string;
  }): Promise<unknown> =>
    request<unknown>('/logs/activity/', { method: 'POST', body: JSON.stringify(data) }),

  updateMeal: (id: number, servings: number): Promise<MealEntry> =>
    request<MealEntry>(`/logs/meals/${id}/edit/`, { method: 'PATCH', body: JSON.stringify({ servings }) }),

  deleteMeal: (id: number): Promise<void> =>
    request<void>(`/logs/meals/${id}/`, { method: 'DELETE' }),

  getDashboard: (date: string): Promise<DashboardData> =>
    request<DashboardData>(`/logs/dashboard/today/?date=${encodeURIComponent(date)}`),

  saveWeight: (weight_kg: number): Promise<{ date: string; weight_kg: number }> =>
    request<{ date: string; weight_kg: number }>('/logs/weight/today/', {
      method: 'PUT',
      body: JSON.stringify({ weight_kg }),
    }),

  updateWater: (delta: number): Promise<{ liters: number }> =>
    request<{ liters: number }>('/logs/water/today/', {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    }),

  getProfile: (): Promise<UserProfile> =>
    request<UserProfile>('/profile/'),

  updateProfile: (data: Partial<UserProfile>): Promise<UserProfile> =>
    request<UserProfile>('/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getProgress: (days = 14): Promise<ProgressResponse> =>
    request<ProgressResponse>(`/progress/?days=${days}`),

  getBadges: (): Promise<{ streak: StreakData; badges: BadgeItem[] }> =>
    request<{ streak: StreakData; badges: BadgeItem[] }>('/logs/badges/'),
};
