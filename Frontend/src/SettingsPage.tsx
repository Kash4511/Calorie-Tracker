import { useEffect, useMemo, useState } from 'react';
import {
  Flame,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Check,
  Zap,
  Award,
  User,
  Sliders,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type StreakData, type BadgeItem } from './api';
import { useAuth } from './AuthContext';
import { useTheme, type Theme } from './ThemeContext';
import './dashboard.css';
import './progress.css';

const NAV_TABS = ['Today', 'Log', 'Foods', 'Progress', 'Settings'] as const;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const [form, setForm] = useState({
    weight_kg: 70,
    height_cm: 175,
    age: 25,
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
    diet_preference: 'none',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [profile, badgeRes] = await Promise.all([
          api.getProfile().catch(() => null),
          api.getBadges().catch(() => null),
        ]);

        if (profile) {
          setForm({
            weight_kg: profile.weight_kg || 70,
            height_cm: profile.height_cm || 175,
            age: profile.age || 25,
            gender: profile.gender || 'male',
            activity_level: profile.activity_level || 'moderate',
            goal: profile.goal || 'maintain',
            diet_preference: profile.diet_preference || 'none',
          });
        }

        if (badgeRes) {
          setStreakData(badgeRes.streak);
          setBadges(badgeRes.badges);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, navigate]);

  // Mifflin-St Jeor calculation preview
  const preview = useMemo(() => {
    const w = Number(form.weight_kg) || 0;
    const h = Number(form.height_cm) || 0;
    const a = Number(form.age) || 0;
    if (w <= 0 || h <= 0 || a <= 0) return null;

    const hM = h / 100;
    const bmi = +(w / (hM * hM)).toFixed(1);
    let bmiCategory = 'Normal weight';
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi >= 30) bmiCategory = 'Obese';
    else if (bmi >= 25) bmiCategory = 'Overweight';

    const base = 10 * w + 6.25 * h - 5 * a;
    const genderOffset = form.gender === 'male' ? 5 : form.gender === 'female' ? -161 : -78;
    const bmr = Math.round(base + genderOffset);

    const multMap: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const mult = multMap[form.activity_level] || 1.2;
    const tdee = Math.round(bmr * mult);

    let target = tdee;
    let strategy = 'Maintenance (0 kcal deficit/surplus)';
    if (form.goal === 'lose_weight') {
      const floor = form.gender === 'male' ? 1500 : form.gender === 'female' ? 1200 : 1350;
      target = Math.max(floor, Math.round(tdee - 500));
      strategy = '-500 kcal deficit (~0.5 kg fat loss/week)';
    } else if (form.goal === 'gain_muscle') {
      target = Math.round(tdee + 350);
      strategy = '+350 kcal surplus (lean muscle building)';
    }

    const waterBase = (w * (multMap[form.activity_level] ? 35 : 30)) / 1000;
    const waterLit = +(Math.round(waterBase * 4) / 4).toFixed(2);

    return { bmi, bmiCategory, bmr, tdee, target, strategy, waterLit };
  }, [form]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await api.updateProfile(form);
      setSuccessMsg('✓ Settings and calorie targets updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setSuccessMsg('Could not save settings. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const unlockedCount = streakData?.unlocked_badges_count ?? badges.filter((b) => b.unlocked).length;
  const totalBadges = streakData?.total_badges_count ?? badges.length ?? 17;

  return (
    <div className="cal-root">
      <a href="#cal-main" className="cal-skip-link">
        Skip to content
      </a>

      {/* Navbar */}
      <header className="cal-navbar" role="banner">
        <div className="cal-nav-brand">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </div>

        <div className="cal-nav-greeting">
          <p className="cal-nav-name">Settings &amp; Theme</p>
          <p className="cal-nav-date">Personalize your app</p>
        </div>

        <nav className="cal-nav-tabs" aria-label="Primary">
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`cal-nav-tab${tab === 'Settings' ? ' is-active' : ''}`}
              onClick={() => {
                if (tab === 'Today') navigate('/dashboard');
                if (tab === 'Log') navigate('/log');
                if (tab === 'Foods') navigate('/log?mode=search');
                if (tab === 'Progress') navigate('/progress');
                if (tab === 'Settings') navigate('/settings');
              }}
              aria-current={tab === 'Settings' ? 'page' : undefined}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Quick Dark Mode Toggle in Header */}
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
        <div className="cal-settings-header">
          <h1 className="cal-settings-title">App Settings</h1>
          <p className="cal-settings-subtitle">
            Configure dark mode appearance, adjust body stats to calculate clinical Mifflin-St Jeor daily goals, and review your consistency.
          </p>
        </div>

        {/* Appearance & Dark Mode Card */}
        <section className="cal-settings-card" aria-labelledby="appearance-heading">
          <div className="cal-settings-card-head">
            <div className="cal-card-icon-pill">
              {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <h2 id="appearance-heading" className="cal-settings-card-title">
                Appearance &amp; Dark Mode
              </h2>
              <p className="cal-settings-card-desc">
                Select your preferred color theme or match your operating system settings.
              </p>
            </div>
            <div className="cal-theme-status-badge">
              Active: <strong>{resolvedTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}</strong>
            </div>
          </div>

          <div className="cal-theme-grid">
            <button
              type="button"
              className={`cal-theme-card${theme === 'light' ? ' is-selected' : ''}`}
              onClick={() => setTheme('light')}
            >
              <div className="cal-theme-icon-wrap cal-theme-icon--light">
                <Sun size={24} />
              </div>
              <div className="cal-theme-card-info">
                <span className="cal-theme-card-title">Light Mode</span>
                <span className="cal-theme-card-desc">Clean, crisp, high-contrast bright theme</span>
              </div>
              <div className="cal-theme-card-check">
                {theme === 'light' && <Check size={16} />}
              </div>
            </button>

            <button
              type="button"
              className={`cal-theme-card${theme === 'dark' ? ' is-selected' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <div className="cal-theme-icon-wrap cal-theme-icon--dark">
                <Moon size={24} />
              </div>
              <div className="cal-theme-card-info">
                <span className="cal-theme-card-title">Dark Mode</span>
                <span className="cal-theme-card-desc">Deep night palette, gentle on eyes in dim light</span>
              </div>
              <div className="cal-theme-card-check">
                {theme === 'dark' && <Check size={16} />}
              </div>
            </button>

            <button
              type="button"
              className={`cal-theme-card${theme === 'system' ? ' is-selected' : ''}`}
              onClick={() => setTheme('system')}
            >
              <div className="cal-theme-icon-wrap cal-theme-icon--system">
                <Laptop size={24} />
              </div>
              <div className="cal-theme-card-info">
                <span className="cal-theme-card-title">System Preference</span>
                <span className="cal-theme-card-desc">Sync automatically with your device settings</span>
              </div>
              <div className="cal-theme-card-check">
                {theme === 'system' && <Check size={16} />}
              </div>
            </button>
          </div>
        </section>

        {/* Streak & Consistency Overview Card */}
        {streakData && (
          <section className="cal-settings-card">
            <div className="cal-settings-card-head">
              <div className="cal-card-icon-pill" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Award size={18} />
              </div>
              <div>
                <h2 className="cal-settings-card-title">Consistency &amp; Badges</h2>
                <p className="cal-settings-card-desc">
                  Your daily commitment streak and achievements unlocked across the app.
                </p>
              </div>
              <button
                type="button"
                className="cal-edit-stats-btn"
                onClick={() => navigate('/dashboard')}
              >
                View on Dashboard &rarr;
              </button>
            </div>

            <div className="cal-streak-summary-row">
              <div className="cal-streak-stat">
                <span className="cal-streak-stat-val">🔥 {streakData.current_streak}</span>
                <span className="cal-streak-stat-lbl">Current Streak Days</span>
              </div>
              <div className="cal-streak-stat">
                <span className="cal-streak-stat-val">⚡ {streakData.longest_streak}</span>
                <span className="cal-streak-stat-lbl">Longest Streak</span>
              </div>
              <div className="cal-streak-stat">
                <span className="cal-streak-stat-val">🏆 {unlockedCount} / {totalBadges}</span>
                <span className="cal-streak-stat-lbl">Badges Unlocked</span>
              </div>
            </div>
          </section>
        )}

        {/* Body Stats & Goal Personalization Card */}
        <section className="cal-settings-card" aria-labelledby="body-stats-heading">
          <div className="cal-settings-card-head">
            <div className="cal-card-icon-pill">
              <Sliders size={18} />
            </div>
            <div>
              <h2 id="body-stats-heading" className="cal-settings-card-title">
                Body Metrics &amp; Formula Personalization
              </h2>
              <p className="cal-settings-card-desc">
                Recalculate your BMR, TDEE, and daily caloric requirements using the clinical Mifflin-St Jeor equation.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="cal-settings-form">
            <div className="cal-form-grid">
              <div className="cal-form-group">
                <label className="cal-form-label" htmlFor="s-weight">
                  Current Weight (kg)
                </label>
                <input
                  id="s-weight"
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  className="cal-form-input"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="cal-form-group">
                <label className="cal-form-label" htmlFor="s-height">
                  Height (cm)
                </label>
                <input
                  id="s-height"
                  type="number"
                  step="0.5"
                  min="100"
                  max="250"
                  className="cal-form-input"
                  value={form.height_cm}
                  onChange={(e) => setForm({ ...form, height_cm: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              <div className="cal-form-group">
                <label className="cal-form-label" htmlFor="s-age">
                  Age (years)
                </label>
                <input
                  id="s-age"
                  type="number"
                  min="10"
                  max="100"
                  className="cal-form-input"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: parseInt(e.target.value, 10) || 0 })}
                  required
                />
              </div>

              <div className="cal-form-group">
                <label className="cal-form-label" htmlFor="s-gender">
                  Gender
                </label>
                <select
                  id="s-gender"
                  className="cal-form-select"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="male">Male (+5 BMR offset)</option>
                  <option value="female">Female (-161 BMR offset)</option>
                  <option value="other">Other / Non-binary (-78 BMR offset)</option>
                </select>
              </div>

              <div className="cal-form-group cal-form-group--full">
                <label className="cal-form-label" htmlFor="s-activity">
                  Activity Level
                </label>
                <select
                  id="s-activity"
                  className="cal-form-select"
                  value={form.activity_level}
                  onChange={(e) => setForm({ ...form, activity_level: e.target.value })}
                >
                  <option value="sedentary">🛋️ Sedentary (desk job, little or no exercise - 1.20x)</option>
                  <option value="light">🚶 Light Activity (light exercise 1–3 days/week - 1.375x)</option>
                  <option value="moderate">🏃 Moderate Activity (exercise 3–5 days/week - 1.55x)</option>
                  <option value="active">🚴 Active (heavy workouts 6–7 days/week - 1.725x)</option>
                  <option value="very_active">🔥 Very Active (physical labor or endurance athlete - 1.90x)</option>
                </select>
              </div>

              <div className="cal-form-group cal-form-group--full">
                <label className="cal-form-label" htmlFor="s-goal">
                  Target Fitness Goal
                </label>
                <select
                  id="s-goal"
                  className="cal-form-select"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                >
                  <option value="lose_weight">🏋️ Weight Loss (-500 kcal healthy daily deficit)</option>
                  <option value="maintain">⚖️ Weight Maintenance (eat at energy balance)</option>
                  <option value="gain_muscle">💪 Muscle Gain (+350 kcal surplus for lean hypertrophy)</option>
                </select>
              </div>
            </div>

            {/* Live Calculation Preview Card */}
            {preview && (
              <div className="cal-modal-preview" style={{ marginTop: 20 }}>
                <h4 className="cal-modal-preview-title">
                  <Zap size={14} aria-hidden="true" /> Live Clinical Calculation Preview
                </h4>
                <div className="cal-modal-preview-grid">
                  <div className="cal-preview-cell">
                    <span className="cal-preview-cell-lbl">BMI</span>
                    <span className="cal-preview-cell-val">
                      {preview.bmi} <small>({preview.bmiCategory})</small>
                    </span>
                  </div>
                  <div className="cal-preview-cell">
                    <span className="cal-preview-cell-lbl">BMR (Basal)</span>
                    <span className="cal-preview-cell-val">{preview.bmr.toLocaleString()} kcal</span>
                  </div>
                  <div className="cal-preview-cell">
                    <span className="cal-preview-cell-lbl">TDEE (Daily Burn)</span>
                    <span className="cal-preview-cell-val">{preview.tdee.toLocaleString()} kcal</span>
                  </div>
                  <div className="cal-preview-cell cal-preview-cell--primary">
                    <span className="cal-preview-cell-lbl">Target Calories</span>
                    <span className="cal-preview-cell-val cal-preview-target">{preview.target.toLocaleString()} kcal</span>
                  </div>
                </div>
                <p className="cal-preview-note">
                  <strong>Formula Strategy:</strong> {preview.strategy}. Water intake target auto-calibrated to{' '}
                  <strong>{preview.waterLit} L/day</strong>.
                </p>
              </div>
            )}

            {successMsg && (
              <div className="cal-modal-alert" style={{ marginTop: 16 }}>
                <Check size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="cal-settings-form-actions">
              <button
                type="submit"
                className="cal-btn-primary"
                disabled={saving || loading}
              >
                {saving ? 'Updating & Recalculating…' : 'Save & Update Goals'}
              </button>
            </div>
          </form>
        </section>

        {/* Account Details Card */}
        <section className="cal-settings-card">
          <div className="cal-settings-card-head">
            <div className="cal-card-icon-pill">
              <User size={18} />
            </div>
            <div>
              <h2 className="cal-settings-card-title">User Account</h2>
              <p className="cal-settings-card-desc">Your profile credentials and session control.</p>
            </div>
          </div>
          <div className="cal-account-row">
            <div className="cal-account-field">
              <span className="cal-account-label">Username</span>
              <span className="cal-account-value">{user?.username || 'Active User'}</span>
            </div>
            {user?.email && (
              <div className="cal-account-field">
                <span className="cal-account-label">Email</span>
                <span className="cal-account-value">{user.email}</span>
              </div>
            )}
            <button
              type="button"
              className="cal-btn-secondary"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              style={{ marginLeft: 'auto' }}
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
