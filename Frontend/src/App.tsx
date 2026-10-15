import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Flame, Sun, Moon, ArrowRight, BarChart3, Target, Salad } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import OnboardingPage from './OnboardingPage';
import DashboardPage from './DashboardPage';
import LogPage from './LogPage';
import ProgressPage from './ProgressPage';
import SettingsPage from './SettingsPage';
import StreakPage from './StreakPage';
import './dashboard.css';
import './auth.css';

const LANDING_FEATURES = [
  { icon: <BarChart3 size={18} />, text: 'Smart calorie tracking' },
  { icon: <Target size={18} />, text: 'Personalized goals' },
  { icon: <Salad size={18} />, text: 'Dietary preferences' },
];

function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  if (loading) {
    return <div className="cal-root cal-auth-root cal-auth-loading">Loading…</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const themeLabel = `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`;

  return (
    <div className="cal-root cal-auth-root">
      <header className="cal-navbar" role="banner">
        <div className="cal-nav-brand">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </div>

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

      <main className="cal-landing-main">
        <div className="cal-landing-hero">
          <span className="cal-landing-badge">
            <Flame size={15} aria-hidden="true" />
            Calorie Tracker
          </span>
          <h1 className="cal-landing-title">
            Track your calories,
            <br />
            achieve your goals.
          </h1>
          <p className="cal-landing-subtitle">
            The simplest way to log meals, monitor macros, and stay on track with
            your fitness journey — whether you want to lose, maintain, or gain.
          </p>
          <div className="cal-landing-actions">
            <Link to="/register" className="cal-landing-btn cal-landing-btn--primary">
              Get Started Free
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link to="/login" className="cal-landing-btn cal-landing-btn--secondary">
              Sign In
            </Link>
          </div>
          <div className="cal-landing-features">
            {LANDING_FEATURES.map((feature) => (
              <div key={feature.text} className="cal-landing-feature">
                <span className="cal-landing-feature-icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <span className="cal-landing-feature-text">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="cal-root cal-auth-root cal-auth-loading">Loading…</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/log" element={<LogPage />} />
      <Route path="/streak" element={<StreakPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
