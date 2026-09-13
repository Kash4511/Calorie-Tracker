import { useEffect, useMemo, useRef, useState } from 'react';
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
  Camera,
  Upload,
  X as CloseIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type StreakData, type BadgeItem } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import './dashboard.css';
import './progress.css';
import './streak.css';

const NAV_TABS = ['Today', 'Log', 'Progress', 'Settings'] as const;

const PRESET_AVATARS = ['🏃', '🏋️', '🥗', '🥑', '🚴', '⚡', '👑', '🧘', '🌟', '🎯'];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, updateUser } = useAuth();
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    name: user?.name || user?.first_name || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    profile_photo: user?.profile_photo || '',
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
          const loadedName = profile.name || profile.first_name || user?.name || user?.first_name || '';
          setForm({
            name: loadedName,
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            profile_photo: profile.profile_photo || user?.profile_photo || '',
            weight_kg: profile.weight_kg || 70,
            height_cm: profile.height_cm || 175,
            age: profile.age || 25,
            gender: profile.gender || 'male',
            activity_level: profile.activity_level || 'moderate',
            goal: profile.goal || 'maintain',
            diet_preference: profile.diet_preference || 'none',
          });

          if (profile.profile_photo || loadedName) {
            updateUser({
              name: loadedName,
              profile_photo: profile.profile_photo,
              first_name: profile.first_name,
              last_name: profile.last_name,
            });
          }
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

  // Handle local image file upload & compression via canvas
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 280;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setForm((prev) => ({ ...prev, profile_photo: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Preset avatar click handler (generates stylish gradient emoji avatar)
  const handleSelectPresetAvatar = (emoji: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 160, 160);
      grad.addColorStop(0, '#667eea');
      grad.addColorStop(1, '#764ba2');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 160, 160);
      ctx.font = '76px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 80, 85);
      const dataUrl = canvas.toDataURL('image/png');
      setForm((prev) => ({ ...prev, profile_photo: dataUrl }));
    }
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, profile_photo: '' }));
  };

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
      const trimmedName = form.name.trim();
      const parts = trimmedName.split(' ');
      const fName = parts[0] || '';
      const lName = parts.slice(1).join(' ');

      await api.updateProfile({
        ...form,
        name: trimmedName,
        first_name: fName,
        last_name: lName,
      });

      updateUser({
        name: trimmedName || user?.username || 'user',
        first_name: fName,
        last_name: lName,
        profile_photo: form.profile_photo || null,
      });

      setSuccessMsg('✓ Profile, photo, body metrics and targets updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch {
      setSuccessMsg('Could not save settings. Please check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const unlockedCount = streakData?.unlocked_badges_count ?? badges.filter((b) => b.unlocked).length;
  const totalBadges = streakData?.total_badges_count ?? badges.length ?? 17;
  const displayName = form.name || user?.first_name || user?.name || user?.username || 'User';

  return (
    <div className="cal-root">
      <a href="#cal-main" className="cal-skip-link">
        Skip to content
      </a>

      {/* Navbar (without Foods tab) */}
      <header className="cal-navbar" role="banner">
        <div className="cal-nav-brand">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </div>

        <div className="cal-nav-greeting" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {form.profile_photo && (
            <img src={form.profile_photo} alt={displayName} className="cal-nav-avatar" />
          )}
          <div>
            <p className="cal-nav-name">Settings &amp; Theme</p>
            <p className="cal-nav-date">{displayName}</p>
          </div>
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
          <h1 className="cal-settings-title">Account &amp; App Settings</h1>
          <p className="cal-settings-subtitle">
            Update your profile name, upload photos, manage weight and height goals, and toggle light/dark appearance.
          </p>
        </div>

        {/* ===========================================================
            Appearance & Light / Dark Mode Toggle Switch
           =========================================================== */}
        <section className="cal-settings-card" aria-labelledby="appearance-heading">
          <div className="cal-settings-card-head">
            <div className="cal-card-icon-pill">
              {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <h2 id="appearance-heading" className="cal-settings-card-title">
                Appearance &amp; Theme Mode
              </h2>
              <p className="cal-settings-card-desc">
                Toggle between light mode and dark mode or match your device system settings.
              </p>
            </div>
          </div>

          {/* Direct Light / Dark Toggle Switch Bar */}
          <div className="cal-theme-toggle-switch-card">
            <div>
              <strong style={{ fontSize: 14.5, color: 'var(--cal-ink)', display: 'block' }}>
                Active Theme: {resolvedTheme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </strong>
              <span style={{ fontSize: 13, color: 'var(--cal-ink-muted)' }}>
                Click either mode to instantly switch the app appearance.
              </span>
            </div>

            <div className="cal-theme-switch-control">
              <button
                type="button"
                className={`cal-theme-pill-btn${resolvedTheme === 'light' ? ' is-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={15} />
                <span>Light</span>
              </button>
              <button
                type="button"
                className={`cal-theme-pill-btn${resolvedTheme === 'dark' ? ' is-active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={15} />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Theme Selection Cards */}
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
                <span className="cal-theme-card-desc">Crisp, high-contrast daytime interface</span>
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
                <span className="cal-theme-card-desc">Deep night palette, comfortable in low light</span>
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
                <span className="cal-theme-card-title">System Auto</span>
                <span className="cal-theme-card-desc">Syncs automatically with your OS preference</span>
              </div>
              <div className="cal-theme-card-check">
                {theme === 'system' && <Check size={16} />}
              </div>
            </button>
          </div>
        </section>

        {/* ===========================================================
            Profile Photo, Name, Weight & Body Metrics Form
           =========================================================== */}
        <section className="cal-settings-card" aria-labelledby="profile-heading">
          <div className="cal-settings-card-head">
            <div className="cal-card-icon-pill">
              <User size={18} />
            </div>
            <div>
              <h2 id="profile-heading" className="cal-settings-card-title">
                Personal Profile &amp; Body Metrics
              </h2>
              <p className="cal-settings-card-desc">
                Change your name, profile photo, current weight, height, and recalculate Mifflin-St Jeor daily targets.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="cal-settings-form">
            {/* ---- Normal Settings Page Profile Photo Upload Section ---- */}
            <div className="cal-avatar-section">
              <div className="cal-avatar-preview-wrap">
                {form.profile_photo ? (
                  <img src={form.profile_photo} alt={displayName} className="cal-avatar-img" />
                ) : (
                  <div className="cal-avatar-fallback">
                    {displayName.charAt(0) || 'U'}
                  </div>
                )}
                <button
                  type="button"
                  className="cal-avatar-upload-icon-overlay"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile photo"
                  aria-label="Upload profile photo"
                >
                  <Camera size={15} />
                </button>
              </div>

              <div className="cal-avatar-controls">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <div className="cal-avatar-btns-row">
                  <button
                    type="button"
                    className="cal-avatar-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    <span>Upload New Photo</span>
                  </button>
                  {form.profile_photo && (
                    <button
                      type="button"
                      className="cal-avatar-remove-btn"
                      onClick={handleRemovePhoto}
                    >
                      <CloseIcon size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Preset Avatar Emojis */}
                <span className="cal-avatar-presets-label">Or choose a fun fitness avatar:</span>
                <div className="cal-avatar-presets-row">
                  {PRESET_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="cal-avatar-preset-btn"
                      onClick={() => handleSelectPresetAvatar(emoji)}
                      title={`Select ${emoji} avatar`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ---- Form Fields Grid ---- */}
            <div className="cal-form-grid">
              {/* User's Name Field */}
              <div className="cal-form-group cal-form-group--full">
                <label className="cal-form-label" htmlFor="s-name">
                  Full Name / Display Name
                </label>
                <input
                  id="s-name"
                  type="text"
                  className="cal-form-input"
                  placeholder="e.g. Alex Morgan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              {/* Weight Field */}
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

              {/* Height Field */}
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

              {/* Age Field */}
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

              {/* Gender Field */}
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

              {/* Activity Level Field */}
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
                  <option value="sedentary">🛋️ Sedentary (desk job, little or no exercise - 1.20x multiplier)</option>
                  <option value="light">🚶 Light Activity (light walks or exercise 1–3 days/week - 1.375x)</option>
                  <option value="moderate">🏃 Moderate Activity (exercise 3–5 days/week - 1.55x multiplier)</option>
                  <option value="active">🚴 Active (heavy workouts 6–7 days/week - 1.725x multiplier)</option>
                  <option value="very_active">🔥 Very Active (physical work or endurance athlete - 1.90x)</option>
                </select>
              </div>

              {/* Target Goal Field */}
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
                  <option value="lose_weight">🏋️ Weight Loss (-500 kcal healthy daily deficit for ~0.5kg/wk loss)</option>
                  <option value="maintain">⚖️ Weight Maintenance (eat at energy balance)</option>
                  <option value="gain_muscle">💪 Muscle Gain (+350 kcal surplus for lean muscle building)</option>
                </select>
              </div>
            </div>

            {/* Live Mifflin-St Jeor Calculation Preview Card */}
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
                    <span className="cal-preview-cell-lbl">BMR (Rest)</span>
                    <span className="cal-preview-cell-val">{preview.bmr.toLocaleString()} kcal</span>
                  </div>
                  <div className="cal-preview-cell">
                    <span className="cal-preview-cell-lbl">TDEE (Burn)</span>
                    <span className="cal-preview-cell-val">{preview.tdee.toLocaleString()} kcal</span>
                  </div>
                  <div className="cal-preview-cell cal-preview-cell--primary">
                    <span className="cal-preview-cell-lbl">Target Calories</span>
                    <span className="cal-preview-cell-val cal-preview-target">{preview.target.toLocaleString()} kcal</span>
                  </div>
                </div>
                <p className="cal-preview-note">
                  <strong>Formula Strategy:</strong> {preview.strategy}. Daily water intake target auto-calibrated to{' '}
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
                {saving ? 'Updating & Recalculating…' : 'Save Changes & Update Targets'}
              </button>
            </div>
          </form>
        </section>

        {/* ===========================================================
            Streak & Consistency Overview Link
           =========================================================== */}
        {streakData && (
          <section className="cal-settings-card">
            <div className="cal-settings-card-head">
              <div className="cal-card-icon-pill" style={{ background: '#fef3c7', color: '#d97706' }}>
                <Award size={18} />
              </div>
              <div>
                <h2 className="cal-settings-card-title">Consistency &amp; Badges</h2>
                <p className="cal-settings-card-desc">
                  Your daily commitment streak and contribution graph across the app.
                </p>
              </div>
              <button
                type="button"
                className="cal-edit-stats-btn"
                onClick={() => navigate('/streak')}
              >
                View Streak &amp; Badges Page &rarr;
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

        {/* ===========================================================
            Account Credentials Section
           =========================================================== */}
        <section className="cal-settings-card">
          <div className="cal-settings-card-head">
            <div className="cal-card-icon-pill">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="cal-settings-card-title">User Account &amp; Credentials</h2>
              <p className="cal-settings-card-desc">Your login username and active session.</p>
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
