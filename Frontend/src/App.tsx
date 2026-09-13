import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import OnboardingPage from './OnboardingPage';
import DashboardPage from './DashboardPage';
import LogPage from './LogPage';
import ProgressPage from './ProgressPage';
import SettingsPage from './SettingsPage';
import { ThemeProvider } from './ThemeContext';
import './App.css';

function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={landingStyles.container}>
      <div style={landingStyles.hero}>
        <div style={landingStyles.heroInner}>
          <div style={landingStyles.badge}>🥗 Calorie Tracker</div>
          <h1 style={landingStyles.heroTitle}>
            Track your calories,
            <br />
            achieve your goals.
          </h1>
          <p style={landingStyles.heroSubtitle}>
            The simplest way to log meals, monitor macros, and stay on track with
            your fitness journey — whether you want to lose, maintain, or gain.
          </p>
          <div style={landingStyles.heroButtons}>
            <Link to="/register" style={landingStyles.primaryBtn}>
              Get Started Free
            </Link>
            <Link to="/login" style={landingStyles.secondaryBtn}>
              Sign In
            </Link>
          </div>
          <div style={landingStyles.features}>
            <div style={landingStyles.feature}>
              <div style={landingStyles.featureIcon}>📊</div>
              <div style={landingStyles.featureText}>Smart calorie tracking</div>
            </div>
            <div style={landingStyles.feature}>
              <div style={landingStyles.featureIcon}>🎯</div>
              <div style={landingStyles.featureText}>Personalized goals</div>
            </div>
            <div style={landingStyles.feature}>
              <div style={landingStyles.featureIcon}>🥑</div>
              <div style={landingStyles.featureText}>Dietary preferences</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const landingStyles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100svh',
    width: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  hero: {
    minHeight: '100svh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  heroInner: {
    maxWidth: '700px',
    textAlign: 'center',
    color: '#fff',
  },
  badge: {
    display: 'inline-block',
    padding: '8px 20px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '24px',
    backdropFilter: 'blur(8px)',
  },
  heroTitle: {
    fontSize: '56px',
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: '20px',
  },
  heroSubtitle: {
    fontSize: '18px',
    lineHeight: 1.7,
    marginBottom: '36px',
    opacity: 0.92,
    maxWidth: '560px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  heroButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: '48px',
  },
  primaryBtn: {
    padding: '14px 32px',
    background: '#fff',
    color: '#5a67d8',
    textDecoration: 'none',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '15px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
  },
  secondaryBtn: {
    padding: '14px 32px',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '15px',
    backdropFilter: 'blur(8px)',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.1)',
    padding: '14px 18px',
    borderRadius: '12px',
    backdropFilter: 'blur(8px)',
  },
  featureIcon: {
    fontSize: '26px',
  },
  featureText: {
    fontSize: '14px',
    fontWeight: 500,
    textAlign: 'left',
  },
};

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100svh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    );
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
