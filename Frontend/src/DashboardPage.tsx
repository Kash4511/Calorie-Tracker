import { useEffect, useMemo, useRef, useState } from 'react';
import anime from 'animejs';
import {
  Flame,
  Droplets,
  Scale,
  Plus,
  LogOut,
  Activity as ActivityIcon,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
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

export default function DashboardPage() {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof NAV_TABS)[number]>('Today');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    setReady(true);
  }, [isAuthenticated, navigate]);

  // ---- Placeholder data — wire to real API later ----
  const consumed = 0;
  const burned = 0;
  const goal = 1640; // TODO: replace with TDEE-derived target from onboarding
  const remaining = Math.max(goal - consumed + burned, 0);
  const progress = Math.min((consumed / goal) * 100, 100);

  const macros: MacroRow[] = useMemo(
    () => [
      { key: 'protein', label: 'Protein', consumed: 0, goalG: 140 },
      { key: 'carbs', label: 'Carbs', consumed: 0, goalG: 168 },
      { key: 'fat', label: 'Fat', consumed: 0, goalG: 46 },
      { key: 'sugar', label: 'Sugar', consumed: 0, goalG: 50 }, // TODO: derive from onboarding, not a fixed default
    ],
    []
  );

  const [meals, setMeals] = useState<MealSection[]>([
    { key: 'breakfast', label: 'Breakfast', kcal: 0, items: [] },
    { key: 'lunch', label: 'Lunch', kcal: 0, items: [] },
    { key: 'snacks', label: 'Snacks', kcal: 0, items: [] },
    { key: 'dinner', label: 'Dinner', kcal: 0, items: [] },
  ]);

  // ---- Water — liters, goal derived from calorie target (1 mL per kcal) ----
  const [waterLiters, setWaterLiters] = useState(0);
  const waterGoalLiters = useMemo(() => Math.round((goal / 1000) * 100) / 100, [goal]);

  const adjustWater = (delta: number) => {
    setWaterLiters((v) => Math.max(0, Math.round((v + delta) * 100) / 100));
  };

  const [weightInput, setWeightInput] = useState('70');
  const [savedWeight, setSavedWeight] = useState<number | null>(null);
  const weightGoal = 64;

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

    const setEndState = () => {
      if (overviewValueRef.current) {
        overviewValueRef.current.textContent = remaining.toLocaleString();
      }
      if (overviewBarRef.current) {
        overviewBarRef.current.style.width = `${progress}%`;
      }
      macros.forEach((m) => {
        const el = macroBarRefs.current[m.key];
        if (el) el.style.width = `${(m.consumed / m.goalG) * 100}%`;
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
        val: remaining,
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
              `${(macros[i].consumed / macros[i].goalG) * 100}%`,
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
  }, [ready]);

  if (!ready) return null;

  const displayName = user?.username || user?.email?.split('@')[0] || 'there';

  const handleSaveWeight = () => {
    const parsed = parseFloat(weightInput);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setSavedWeight(parsed);
      // TODO: POST to /api/weight-logs/
    }
  };

  const handleAddMeal = (key: MealKey) => {
    // TODO: open meal-add modal / navigate to /log?meal=key
    console.log('Add item to', key);
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
              onClick={() => setActiveTab(tab)}
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
          <div className="cal-overview-icon" aria-hidden="true">
            <Flame size={18} />
          </div>

          <p id="cal-overview-title" className="cal-overview-label">
            Calories remaining
          </p>
          <h2 className="cal-overview-value" ref={overviewValueRef} aria-live="polite">
            0
          </h2>
          <p className="cal-overview-sub">
            {consumed.toLocaleString()} eaten &middot; {burned.toLocaleString()} burned &middot;{' '}
            {goal.toLocaleString()} target
          </p>

          <div
            className="cal-overview-track"
            role="progressbar"
            aria-label="Daily calorie progress"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={consumed}
          >
            <div ref={overviewBarRef} className="cal-overview-fill" style={{ width: 0 }} />
          </div>

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
              <span className="cal-mini-meta">Goal {weightGoal} kg</span>
            </div>
            <div className="cal-weight-row">
              <div className="cal-weight-input-wrap">
                <input
                  type="number"
                  inputMode="decimal"
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
            {savedWeight !== null && (
              <p className="cal-weight-saved" role="status">
                Logged {savedWeight} kg
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
              onClick={() => console.log('Add activity')}
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
    </div>
  );
}