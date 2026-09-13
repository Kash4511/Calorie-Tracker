import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setTokens, clearTokens } from './api';
import type { AuthTokens } from './api';

export interface AuthUser {
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  profile_photo?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    password2: string;
  }) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_USER_KEY = 'auth_user';

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null): void {
  if (!user) {
    localStorage.removeItem(STORAGE_USER_KEY);
    return;
  }
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const hasToken = !!localStorage.getItem('access_token');
    if (hasToken) {
      setIsAuthenticated(true);
      const stored = readStoredUser();
      setUser(stored);
      // Background sync profile to pick up name or profile photo changes
      api.getProfile().then((prof) => {
        if (prof) {
          const updated: AuthUser = {
            username: prof.username || stored?.username || 'user',
            email: prof.email || stored?.email,
            first_name: prof.first_name,
            last_name: prof.last_name,
            name: prof.name,
            profile_photo: prof.profile_photo,
          };
          setUser(updated);
          writeStoredUser(updated);
        }
      }).catch(() => {
        // ignore
      });
    }
    setLoading(false);
  }, []);

  const updateUser = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      const next: AuthUser = prev ? { ...prev, ...updates } : { username: 'user', ...updates };
      writeStoredUser(next);
      return next;
    });
  };

  const login = async (username: string, password: string) => {
    const tokens: AuthTokens = await api.login(username, password);
    setTokens(tokens);
    const profile: AuthUser = { username };
    setUser(profile);
    writeStoredUser(profile);
    setIsAuthenticated(true);
    // Sync full profile
    api.getProfile().then((prof) => {
      if (prof) {
        const updated: AuthUser = {
          username: prof.username || username,
          email: prof.email,
          first_name: prof.first_name,
          last_name: prof.last_name,
          name: prof.name,
          profile_photo: prof.profile_photo,
        };
        setUser(updated);
        writeStoredUser(updated);
      }
    }).catch(() => {});
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    password2: string;
  }) => {
    const result = await api.register(data);
    setTokens({ access: result.access, refresh: result.refresh });
    const profile: AuthUser = {
      username: data.username,
      email: data.email,
    };
    setUser(profile);
    writeStoredUser(profile);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearTokens();
    writeStoredUser(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, register, logout, updateUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
