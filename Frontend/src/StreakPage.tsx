import { useEffect, useState } from 'react';
import { Flame, LogOut, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type StreakData, type BadgeItem } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import StreakView from './StreakView';
import './dashboard.css';
import './streak.css';

const NAV_TABS = ['Today', 'Log', 'Progress', 'Settings'] as const;

export default function StreakPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [streak, setStreak] = useState<StreakData | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    api.getBadges()
      .then((res) => {
        if (res) {
          setStreak(res.streak);
          setBadges(res.badges || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate]);

  const displayName = user?.first_name || user?.name || user?.username || 'there';

  return (
    <div className="cal-root">
      <a href="#cal-main" className="cal-skip-link">
        Skip to content
      </a>

      {/* Primary Navigation Bar (without Foods) */}
      <header className="cal-navbar" role="banner">
        <div className="cal-nav-brand">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </div>

        <div className="cal-nav-greeting">
          <p className="cal-nav-name">Streak &amp; Consistency</p>
          <p className="cal-nav-date">Welcome back, {displayName}</p>
        </div>

        <nav className="cal-nav-tabs" aria-label="Primary">
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className="cal-nav-tab"
              onClick={() => {
                if (tab === 'Today') navigate('/dashboard');
                if (tab === 'Log') navigate('/log');
                if (tab === 'Progress') navigate('/progress');
                if (tab === 'Settings') navigate('/settings');
              }}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Quick Dark Mode Toggle */}
        <button
          type="button"
          className="cal-theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          type="button"
          className="cal-logout-icon"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={17} aria-hidden="true" />
        </button>
      </header>

      <main id="cal-main" className="cal-content" tabIndex={-1}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button
            type="button"
            className="cal-edit-stats-btn"
            onClick={() => navigate('/dashboard')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--cal-ink-muted)' }}>
            Loading your consistency streak &amp; badges...
          </div>
        ) : (
          <StreakView streak={streak || undefined} badges={badges} />
        )}
      </main>
    </div>
  );
}
