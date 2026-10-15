import { useState } from 'react';
import type { FormEvent } from 'react';
import { Flame, Sun, Moon, LogIn } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from './api';
import './dashboard.css';
import './auth.css';

export default function LoginPage() {
  const { login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      const status = await api.getOnboardingStatus();
      if (status.onboarding_completed) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const themeLabel = `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`;

  return (
    <div className="cal-root cal-auth-root">
      <header className="cal-navbar" role="banner">
        <Link to="/" className="cal-nav-brand cal-auth-brand-link">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </Link>

        <div className="cal-auth-spacer" />

        <button
          type="button"
          className="cal-theme-toggle-btn"
          onClick={toggleTheme}
          title={themeLabel}
          aria-label={themeLabel}
        >
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      <main className="cal-auth-main">
        <section className="cal-auth-card" aria-labelledby="login-title">
          <span className="cal-auth-logo" aria-hidden="true">
            <LogIn size={22} />
          </span>
          <h1 id="login-title" className="cal-auth-title">
            Welcome Back
          </h1>
          <p className="cal-auth-subtitle">Sign in to continue tracking your calories.</p>

          <form onSubmit={handleSubmit} className="cal-auth-form">
            {error && (
              <div className="cal-auth-alert" role="alert">
                {error}
              </div>
            )}

            <div className="cal-auth-field">
              <label className="cal-auth-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="cal-auth-input"
                required
              />
            </div>

            <div className="cal-auth-field">
              <label className="cal-auth-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cal-auth-input"
                required
              />
            </div>

            <button type="submit" className="cal-auth-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="cal-auth-footnote">
            Don&apos;t have an account? <Link to="/register">Sign up</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
