import { useEffect, useMemo, useRef, useState } from 'react';
import anime from 'animejs';
import {
  Flame,
  Droplets,
  Scale,
  Plus,
  LogOut,
  Activity as ActivityIcon,
  Sliders,
  Info,
  X,
  Check,
  Zap,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { api, type DashboardData } from './api';
import './dashboard.css';

type MacroKey = 'protein' | 'carbs' | 'fat' | 'sugar';
type MealKey = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

interface MacroRow {
  key: MacroKey;
  label: string;
  consumed: number;
  goalG: number;
}

interface MealSection {
  key: MealKey;
  label: string;
  kcal: number;
  items: string[]; // meal item names, empty = "Nothing logged yet."
}

const NAV_TABS = ['Today', 'Log', 'Foods', 'Progress', 'Settings'] as const;

function useGreeting() {
  return useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);
}

function useTodayLabel() {
  return useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  );
}

function useTodayIso() {
  return useMemo(() => new Date().toISOString().slice(0, 10), []);
}

export default function DashboardPage() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof NAV_TABS)[number]>('Today');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const dashboardDate = useTodayIso();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    setReady(true);
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!ready) return;
    api.getDashboard(dashboardDate).then(setDashboard).catch(() => setDashboard(null));
  }, [dashboardDate, ready]);

  const consumed = dashboard?.consumed ?? 0;
  const burned = dashboard?.burned ?? 0;
  const goal = dashboard?.goal ?? 2000;
  const remaining = goal - consumed + burned;
  const isOverBudget = remaining < 0;
  const progress = goal > 0 ? Math.min(Math.round((consumed / goal) * 100), 100) : 0;

  const macros: MacroRow[] = useMemo(() => (['protein', 'carbs', 'fat', 'sugar'] as MacroKey[]).map((key) => ({
    key,
    label: key[0].toUpperCase() + key.slice(1),
    consumed: dashboard?.macros.consumed[key] ?? 0,
    goalG: dashboard?.macros.goal[key] ?? 0,
  })), [dashboard]);

  const meals: MealSection[] = useMemo(() => (['breakfast', 'lunch', 'snacks', 'dinner'] as MealKey[]).map((key) => ({
    key,
    label: key[0].toUpperCase() + key.slice(1),
    kcal: dashboard?.meals[key].kcal ?? 0,
    items: dashboard?.meals[key].items.map((item) => item.name) ?? [],
  })), [dashboard]);

  // ---- Water — liters and goal from dashboard API ----
  const [waterLiters, setWaterLiters] = useState(0);
  const waterGoalLiters = useMemo(() => dashboard?.water.goal ?? 2.0, [dashboard]);

  useEffect(() => {
    if (dashboard?.water.liters !== undefined) {
      setWaterLiters(dashboard.water.liters);
    }
  }, [dashboard?.water.liters]);

  const adjustWater = async (delta: number) => {
    const newValue = Math.max(0, Math.round((waterLiters + delta) * 100) / 100);
    setWaterLiters(newValue);
    try {
      await api.updateWater(delta);
    } catch {
      // ignore
    }
  };

  const [weightInput, setWeightInput] = useState('70');
  const [savedWeight, setSavedWeight] = useState<number | null>(null);
  const [weightSaveMsg, setWeightSaveMsg] = useState('');
  const weightGoal = dashboard?.weight.goal_kg ?? 65;

  // ---- Stats Modal state ----
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [modalForm, setModalForm] = useState({
    weight_kg: 70,
    height_cm: 175,
    age: 25,
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
    diet_preference: 'none',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Sync profile and weight data from dashboard
  useEffect(() => {
    if (dashboard?.profile_summary) {
      const ps = dashboard.profile_summary;
      setModalForm((prev) => ({
        ...prev,
        weight_kg: ps.weight_kg ?? prev.weight_kg,
        height_cm: ps.height_cm ?? prev.height_cm,
        age: ps.age ?? prev.age,
        gender: ps.gender ?? prev.gender,
        activity_level: ps.activity_level ?? prev.activity_level,
        goal: ps.goal ?? prev.goal,
      }));
    }
    if (dashboard?.weight) {
      const curWeight = dashboard.weight.today_kg ?? dashboard.profile_summary?.weight_kg;
      if (curWeight != null) {
        setWeightInput(String(curWeight));
        setSavedWeight(dashboard.weight.today_kg);
      }
    }
  }, [dashboard]);

  const livePreview = useMemo(() => {
    const w = Number(modalForm.weight_kg) || 0;
    const h = Number(modalForm.height_cm) || 0;
    const a = Number(modalForm.age) || 0;
    if (w <= 0 || h <= 0 || a <= 0) return null;

    const hM = h / 100;
    const bmi = +(w / (hM * hM)).toFixed(1);
    let bmiCategory = 'Normal';
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi >= 30) bmiCategory = 'Obese';
    else if (bmi >= 25) bmiCategory = 'Overweight';

    const base = 10 * w + 6.25 * h - 5 * a;
    const genderOffset = modalForm.gender === 'male' ? 5 : modalForm.gender === 'female' ? -161 : -78;
    const bmr = Math.round(base + genderOffset);

    const multMap: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const mult = multMap[modalForm.activity_level] || 1.2;
    const tdee = Math.round(bmr * mult);

    let target = tdee;
    let adjustment = 'Maintenance (0 kcal)';
    if (modalForm.goal === 'lose_weight') {
      const floor = modalForm.gender === 'male' ? 1500 : modalForm.gender === 'female' ? 1200 : 1350;
      target = Math.max(floor, Math.round(tdee - 500));
      adjustment = '-500 kcal deficit (~0.5 kg/week healthy loss)';
    } else if (modalForm.goal === 'gain_muscle') {
      target = Math.round(tdee + 350);
      adjustment = '+350 kcal surplus (lean muscle building)';
    }

    return { bmi, bmiCategory, bmr, tdee, target, adjustment };
  }, [modalForm]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.updateProfile(modalForm);
      setProfileSuccessMsg('Profile updated & targets recalculated!');
      const updated = await api.getDashboard(dashboardDate);
      setDashboard(updated);
      setTimeout(() => {
        setProfileSuccessMsg('');
        setStatsModalOpen(false);
      }, 1200);
    } catch {
      setProfileSuccessMsg('Update failed. Please check inputs.');
    } finally {
      setSavingProfile(false);
    }
  };

  const greeting = useGreeting();
  const today = useTodayLabel();

  // ---- Refs for anime.js targets (numeric / bar-fill only) ----
  const overviewValueRef = useRef<HTMLHeadingElement | null>(null);
  const overviewBarRef = useRef<HTMLDivElement | null>(null);
  const macroBarRefs = useRef<Record<MacroKey, HTMLDivElement | null>>({
    protein: null,
    carbs: null,
    fat: null,
    sugar: null,
  });

  useEffect(() => {
    if (!ready) return;

    const displayTarget = Math.abs(remaining);

    const setEndState = () => {
      if (overviewValueRef.current) {
        overviewValueRef.current.textContent = displayTarget.toLocaleString();
      }
      if (overviewBarRef.current) {
        overviewBarRef.current.style.width = `${progress}%`;
      }
      macros.forEach((m) => {
        const el = macroBarRefs.current[m.key];
        if (el) el.style.width = `${m.goalG > 0 ? Math.min((m.consumed / m.goalG) * 100, 100) : 0}%`;
      });
    };

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof anime !== 'function' || !anime.timeline) {
      setEndState();
      return;
    }

    try {
      const counter = { val: 0 };
      const tl = anime.timeline({ easing: 'easeOutExpo' });

      tl.add({
        targets: counter,
        val: displayTarget,
        round: 1,
        duration: 850,
        easing: 'easeOutCubic',
        update: () => {
          if (overviewValueRef.current) {
            overviewValueRef.current.textContent = Math.round(counter.val).toLocaleString();
          }
        },
      })
        .add(
          {
            targets: overviewBarRef.current,
            width: ['0%', `${progress}%`],
            duration: 600,
            easing: 'easeOutQuart',
          },
          '-=500'
        )
        .add(
          {
            targets: macros.map((m) => macroBarRefs.current[m.key]).filter(Boolean),
            width: (_el: unknown, i: number) => [
              '0%',
              `${macros[i].goalG > 0 ? Math.min((macros[i].consumed / macros[i].goalG) * 100, 100) : 0}%`,
            ],
            delay: anime.stagger(80),
            duration: 450,
            easing: 'easeOutQuart',
          },
          '-=300'
        );
    } catch {
      setEndState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard, ready]);

  if (!ready) return null;

  const displayName = user?.username || user?.email?.split('@')[0] || 'there';

  const handleSaveWeight = async () => {
    const parsed = parseFloat(weightInput);
    if (!Number.isNaN(parsed) && parsed >= 20 && parsed <= 400) {
      setSavedWeight(parsed);
      setWeightSaveMsg('Saving...');
      try {
        await api.saveWeight(parsed);
        setWeightSaveMsg('✓ Saved! Daily targets updated');
        const updated = await api.getDashboard(dashboardDate);
        setDashboard(updated);
        setTimeout(() => setWeightSaveMsg(''), 4000);
      } catch {
        setWeightSaveMsg('Failed to save weight');
      }
    }
  };

  const handleAddMeal = (key: MealKey) => {
    navigate(`/log?meal=${key}`);
  };

return (
    <div className="cal-root">
      <a href="#cal-main" className="cal-skip-link">
        Skip to content
      </a>

      <header className="cal-navbar" role="banner">
        <div className="cal-nav-brand">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </div>

        <div className="cal-nav-greeting">
          <p className="cal-nav-name">
            {greeting}, {displayName}
          </p>
          <p className="cal-nav-date">{today}</p>
        </div>

        <nav className="cal-nav-tabs" aria-label="Primary">
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`cal-nav-tab${activeTab === tab ? ' is-active' : ''}`}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'Log') navigate('/log');
                if (tab === 'Settings') setStatsModalOpen(true);
              }}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {tab}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="cal-logout-icon"
          onClick={logout}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={17} aria-hidden="true" />
        </button>
      </header>

      <main id="cal-main" className="cal-content" tabIndex={-1}>
        {/* ---- Calories overview ---- */}
        <section className="cal-overview" aria-labelledby="cal-overview-title">
          <div className="cal-overview-top">
            <div>
              <p id="cal-overview-title" className="cal-overview-label">
                {isOverBudget ? 'Calories over target' : remaining === 0 ? 'Daily target reached' : 'Calories remaining'}
              </p>
              <h2 className={`cal-overview-value${isOverBudget ? ' is-over' : ''}`} ref={overviewValueRef} aria-live="polite">
                0
              </h2>
              <p className="cal-overview-sub">
                {isOverBudget ? (
                  <span className="cal-badge-alert">+{Math.abs(remaining).toLocaleString()} kcal over budget</span>
                ) : remaining === 0 ? (
                  <span className="cal-badge-success">Goal achieved!</span>
                ) : (
                  <span><strong>{remaining.toLocaleString()} kcal</strong> left to eat</span>
                )}
                <span>&middot;</span>
                <span>{consumed.toLocaleString()} eaten</span>
                <span>&middot;</span>
                <span>{burned.toLocaleString()} burned</span>
                <span>&middot;</span>
                <span>{goal.toLocaleString()} target</span>
              </p>
            </div>

            <div className="cal-overview-actions">
              <button
                type="button"
                className="cal-edit-stats-btn"
                onClick={() => setStatsModalOpen(true)}
                title="Adjust your weight, height, age or goal to update daily targets"
              >
                <Sliders size={14} aria-hidden="true" />
                <span>Adjust Body Stats</span>
              </button>
              <div className="cal-overview-icon" aria-hidden="true">
                <Flame size={18} />
              </div>
            </div>
          </div>

          <div
            className={`cal-overview-track${isOverBudget ? ' is-over' : ''}`}
            role="progressbar"
            aria-label="Daily calorie progress"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={consumed}
          >
            <div ref={overviewBarRef} className="cal-overview-fill" style={{ width: 0 }} />
          </div>

          {/* ---- Personalized Body Formula Strip ---- */}
          {dashboard?.profile_summary && dashboard.profile_summary.weight_kg && (
            <div className="cal-stats-strip">
              <div className="cal-stats-strip-head">
                <span className="cal-stats-strip-title">
                  <Info size={13} aria-hidden="true" />
                  Personalized to your body metrics (Mifflin-St Jeor Formula)
                </span>
                <button
                  type="button"
                  className="cal-stats-strip-link"
                  onClick={() => setStatsModalOpen(true)}
                >
                  Edit profile
                </button>
              </div>
              <div className="cal-stats-strip-pills">
                <div className="cal-stat-pill">
                  <span className="cal-stat-pill-label">Body Stats</span>
                  <span className="cal-stat-pill-val">
                    {dashboard.profile_summary.weight_kg} kg &middot; {dashboard.profile_summary.height_cm} cm &middot; {dashboard.profile_summary.age} yrs
                  </span>
                </div>
                <div className="cal-stat-pill">
                  <span className="cal-stat-pill-label">BMI</span>
                  <span className="cal-stat-pill-val">
                    {dashboard.profile_summary.bmi} <span className="cal-stat-pill-sub">({dashboard.profile_summary.bmi_category})</span>
                  </span>
                </div>
                <div className="cal-stat-pill">
                  <span className="cal-stat-pill-label">BMR (Rest)</span>
                  <span className="cal-stat-pill-val">
                    {dashboard.profile_summary.bmr?.toLocaleString()} <span className="cal-stat-pill-sub">kcal</span>
                  </span>
                </div>
                <div className="cal-stat-pill">
                  <span className="cal-stat-pill-label">TDEE (Daily Burn)</span>
                  <span className="cal-stat-pill-val">
                    {dashboard.profile_summary.tdee?.toLocaleString()} <span className="cal-stat-pill-sub">kcal</span>
                  </span>
                </div>
                <div className="cal-stat-pill cal-stat-pill--highlight">
                  <span className="cal-stat-pill-label">Target Strategy</span>
                  <span className="cal-stat-pill-val">
                    {dashboard.profile_summary.goal_label}: <strong>{goal.toLocaleString()} kcal</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="cal-macro-inline-row">
            {macros.map((m) => (
              <div className="cal-macro-inline" key={m.key}>
                <div className="cal-macro-inline-head">
                  <span>{m.label}</span>
                  <span className="cal-macro-inline-amount">
                    {m.consumed}/{m.goalG} g
                  </span>
                </div>
                <div
                  className="cal-macro-inline-track"
                  role="progressbar"
                  aria-label={`${m.label} progress`}
                  aria-valuemin={0}
                  aria-valuemax={m.goalG}
                  aria-valuenow={m.consumed}
                >
                  <div
                    ref={(el) => {
                      macroBarRefs.current[m.key] = el;
                    }}
                    className="cal-macro-inline-fill"
                    style={{ width: 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Water + Weight + Activity — three-up row ---- */}
        <section className="cal-grid-3">
          <div className="cal-mini-card">
            <div className="cal-mini-head">
              <span className="cal-mini-title">
                <Droplets size={16} aria-hidden="true" /> Water
              </span>
              <span className="cal-mini-meta">
                {waterLiters.toFixed(2)} / {waterGoalLiters.toFixed(2)} L
              </span>
            </div>

            <div
              className="cal-water-track"
              role="progressbar"
              aria-label="Water intake progress"
              aria-valuemin={0}
              aria-valuemax={waterGoalLiters}
              aria-valuenow={waterLiters}
            >
              <div
                className="cal-water-fill"
                style={{ width: `${Math.min((waterLiters / waterGoalLiters) * 100, 100)}%` }}
              />
            </div>

            <div className="cal-water-actions">
              <button
                type="button"
                className="cal-water-btn"
                onClick={() => adjustWater(-0.25)}
                aria-label="Remove 250 milliliters"
              >
                − 0.25L
              </button>
              <button
                type="button"
                className="cal-water-btn cal-water-btn--fill"
                onClick={() => adjustWater(0.25)}
                aria-label="Add 250 milliliters"
              >
                + 0.25L
              </button>
            </div>
          </div>

          <div className="cal-mini-card">
            <div className="cal-mini-head">
              <span className="cal-mini-title">
                <Scale size={16} aria-hidden="true" /> Today&apos;s weight
              </span>
              <span className="cal-mini-meta">
                Goal {dashboard?.weight.goal_kg ? `${dashboard.weight.goal_kg} kg` : `${weightGoal} kg`}
              </span>
            </div>
            <div className="cal-weight-row">
              <div className="cal-weight-input-wrap">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="20"
                  max="400"
                  className="cal-weight-input"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  aria-label="Today's weight in kilograms"
                />
                <span className="cal-weight-unit">kg</span>
              </div>
              <button type="button" className="cal-save-btn" onClick={handleSaveWeight}>
                Save
              </button>
            </div>
            {weightSaveMsg && (
              <p className="cal-weight-saved" role="status">
                {weightSaveMsg}
              </p>
            )}
            {savedWeight !== null && !weightSaveMsg && (
              <p className="cal-weight-saved" role="status">
                Logged {savedWeight} kg &middot; updates your daily targets
              </p>
            )}
          </div>

          <div className="cal-mini-card">
            <div className="cal-mini-head">
              <span className="cal-mini-title">
                <ActivityIcon size={16} aria-hidden="true" /> Activity
              </span>
            </div>
            <p className="cal-mini-empty">Nothing logged yet.</p>
            <button
              type="button"
              className="cal-add-btn"
              onClick={() => navigate('/log')}
              aria-label="Add activity"
              style={{ marginTop: 14, alignSelf: 'flex-start' }}
            >
              <Plus size={14} aria-hidden="true" />
              Add
            </button>
          </div>
        </section>

        {/* ---- Meals — full width, stacked ---- */}
        <section className="cal-meals-grid">
          {meals.map((meal) => (
            <div
              className="cal-meal-card"
              key={meal.key}
              aria-labelledby={`cal-${meal.key}-title`}
            >
              <div className="cal-meal-head">
                <h3 id={`cal-${meal.key}-title`} className="cal-meal-title">
                  {meal.label}
                </h3>
                <div className="cal-meal-head-right">
                  <span className="cal-meal-kcal">{meal.kcal} kcal</span>
                  <button
                    type="button"
                    className="cal-add-btn"
                    onClick={() => handleAddMeal(meal.key)}
                    aria-label={`Add item to ${meal.label}`}
                  >
                    <Plus size={14} aria-hidden="true" />
                    Add
                  </button>
                </div>
              </div>
              {meal.items.length === 0 ? (
                <p className="cal-meal-empty">Nothing logged yet.</p>
              ) : (
                <ul className="cal-meal-items">
                  {meal.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      </main>

      {/* ---- Body Stats & Goal Adjustment Modal ---- */}
      {statsModalOpen && (
        <div className="cal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title">
          <div className="cal-modal-card">
            <div className="cal-modal-header">
              <div>
                <h3 id="stats-modal-title" className="cal-modal-title">
                  Personalize Body Stats &amp; Target
                </h3>
                <p className="cal-modal-subtitle">
                  We use the clinically validated Mifflin-St Jeor formula to determine your exact daily calorie and macronutrient requirements.
                </p>
              </div>
              <button
                type="button"
                className="cal-modal-close"
                onClick={() => setStatsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="cal-modal-body">
              <div className="cal-form-grid">
                <div className="cal-form-group">
                  <label className="cal-form-label" htmlFor="inp-weight">
                    Current Weight (kg)
                  </label>
                  <input
                    id="inp-weight"
                    type="number"
                    step="0.1"
                    min="20"
                    max="400"
                    className="cal-form-input"
                    value={modalForm.weight_kg}
                    onChange={(e) => setModalForm({ ...modalForm, weight_kg: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="cal-form-group">
                  <label className="cal-form-label" htmlFor="inp-height">
                    Height (cm)
                  </label>
                  <input
                    id="inp-height"
                    type="number"
                    step="0.5"
                    min="100"
                    max="250"
                    className="cal-form-input"
                    value={modalForm.height_cm}
                    onChange={(e) => setModalForm({ ...modalForm, height_cm: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="cal-form-group">
                  <label className="cal-form-label" htmlFor="inp-age">
                    Age (years)
                  </label>
                  <input
                    id="inp-age"
                    type="number"
                    min="10"
                    max="100"
                    className="cal-form-input"
                    value={modalForm.age}
                    onChange={(e) => setModalForm({ ...modalForm, age: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>

                <div className="cal-form-group">
                  <label className="cal-form-label" htmlFor="inp-gender">
                    Gender
                  </label>
                  <select
                    id="inp-gender"
                    className="cal-form-select"
                    value={modalForm.gender}
                    onChange={(e) => setModalForm({ ...modalForm, gender: e.target.value })}
                  >
                    <option value="male">Male (+5 BMR offset)</option>
                    <option value="female">Female (-161 BMR offset)</option>
                    <option value="other">Other / Prefer not to say (-78 BMR offset)</option>
                  </select>
                </div>

                <div className="cal-form-group cal-form-group--full">
                  <label className="cal-form-label" htmlFor="inp-activity">
                    Activity Level
                  </label>
                  <select
                    id="inp-activity"
                    className="cal-form-select"
                    value={modalForm.activity_level}
                    onChange={(e) => setModalForm({ ...modalForm, activity_level: e.target.value })}
                  >
                    <option value="sedentary">🛋️ Sedentary (desk job, 1.20x BMR multiplier)</option>
                    <option value="light">🚶 Light Activity (light walks 1–3 days/wk, 1.375x multiplier)</option>
                    <option value="moderate">🏃 Moderate Exercise (workouts 3–5 days/wk, 1.55x multiplier)</option>
                    <option value="active">🚴 Active (hard workouts 6–7 days/wk, 1.725x multiplier)</option>
                    <option value="very_active">🔥 Very Active (athlete/heavy physical job, 1.90x multiplier)</option>
                  </select>
                </div>

                <div className="cal-form-group cal-form-group--full">
                  <label className="cal-form-label" htmlFor="inp-goal">
                    Fitness Goal
                  </label>
                  <select
                    id="inp-goal"
                    className="cal-form-select"
                    value={modalForm.goal}
                    onChange={(e) => setModalForm({ ...modalForm, goal: e.target.value })}
                  >
                    <option value="lose_weight">🏋️ Lose Weight (-500 kcal daily deficit for ~0.5kg/week fat loss)</option>
                    <option value="maintain">⚖️ Maintain Weight (eat at maintenance TDEE)</option>
                    <option value="gain_muscle">💪 Gain Muscle (+350 kcal daily surplus for lean muscle gain)</option>
                  </select>
                </div>
              </div>

              {/* Real-time Calculation Preview */}
              {livePreview && (
                <div className="cal-modal-preview">
                  <h4 className="cal-modal-preview-title">
                    <Zap size={14} aria-hidden="true" /> Live Target Preview
                  </h4>
                  <div className="cal-modal-preview-grid">
                    <div className="cal-preview-cell">
                      <span className="cal-preview-cell-lbl">BMI</span>
                      <span className="cal-preview-cell-val">
                        {livePreview.bmi} <small>({livePreview.bmiCategory})</small>
                      </span>
                    </div>
                    <div className="cal-preview-cell">
                      <span className="cal-preview-cell-lbl">BMR (Rest)</span>
                      <span className="cal-preview-cell-val">{livePreview.bmr.toLocaleString()} kcal</span>
                    </div>
                    <div className="cal-preview-cell">
                      <span className="cal-preview-cell-lbl">TDEE (Burn)</span>
                      <span className="cal-preview-cell-val">{livePreview.tdee.toLocaleString()} kcal</span>
                    </div>
                    <div className="cal-preview-cell cal-preview-cell--primary">
                      <span className="cal-preview-cell-lbl">New Daily Target</span>
                      <span className="cal-preview-cell-val cal-preview-target">{livePreview.target.toLocaleString()} kcal</span>
                    </div>
                  </div>
                  <p className="cal-preview-note">
                    <strong>Strategy:</strong> {livePreview.adjustment}. Water goal will also calibrate to your body weight!
                  </p>
                </div>
              )}

              {profileSuccessMsg && (
                <div className="cal-modal-alert">
                  <Check size={16} />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}
            </div>

            <div className="cal-modal-footer">
              <button
                type="button"
                className="cal-btn-secondary"
                onClick={() => setStatsModalOpen(false)}
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cal-btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving & Recalculating…' : 'Save & Update Target'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
