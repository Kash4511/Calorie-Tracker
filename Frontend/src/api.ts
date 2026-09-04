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
};
