import { useState } from 'react';
import type { FormEvent } from 'react';
import { Flame, Sun, Moon, UserPlus } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from './api';
import './dashboard.css';
import './auth.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== password2) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({ username, email, password, password2 });
      const status = await api.getOnboardingStatus();
      if (status.onboarding_completed) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    } catch (err) {
      try {
        const parsed = JSON.parse((err as Error).message);
        const messages = Object.values(parsed)
          .flat()
          .filter((v) => typeof v === 'string')
          .join(', ');
        setError(messages || 'Registration failed');
      } catch {
        setError('Registration failed. Please try again.');
      }
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
        <section className="cal-auth-card" aria-labelledby="register-title">
          <span className="cal-auth-logo" aria-hidden="true">
            <UserPlus size={22} />
          </span>
          <h1 id="register-title" className="cal-auth-title">
            Create an Account
          </h1>
          <p className="cal-auth-subtitle">
            Start tracking your calories and reach your fitness goals.
          </p>

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
              <label className="cal-auth-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="cal-auth-input"
                required
                minLength={8}
              />
            </div>

            <div className="cal-auth-field">
              <label className="cal-auth-label" htmlFor="password2">
                Confirm Password
              </label>
              <input
                id="password2"
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="cal-auth-input"
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="cal-auth-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="cal-auth-footnote">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
