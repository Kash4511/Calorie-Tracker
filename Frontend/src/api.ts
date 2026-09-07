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

export interface DashboardData {
  date: string;
  goal: number;
  consumed: number;
  burned: number;
  remaining: number;
  macros: { consumed: Record<'protein' | 'carbs' | 'fat' | 'sugar', number>; goal: Record<string, number> };
  water: { liters: number; goal: number };
  weight: { today_kg: number | null; goal_kg: number };
  meals: Record<MealKey, { items: Array<{ id: number; name: string; calories: number }>; kcal: number }>;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem('access_token', tokens.access);
  localStorage.setItem('refresh_token', tokens.refresh);
}

export function clearTokens(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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
};
