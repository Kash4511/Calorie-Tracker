import { useEffect, useMemo, useRef, useState } from 'react';
import anime from 'animejs';
import {
  Flame,
  Drumstick,
  Wheat,
  Droplets,
  Utensils,
  GlassWater,
  Zap,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';

type MacroKey = 'protein' | 'carbs' | 'fat';
type StatKey = 'meals' | 'water' | 'streak';

interface MacroRow {
  key: MacroKey;
  consumed: number;
  goalG: number;
}

interface StatRow {
  key: StatKey;
  label: string;
  value: number | string;
}

const MACROS_META: Record<
  MacroKey,
  { label: string; icon: typeof Drumstick; color: string; token: string }
> = {
  protein: { label: 'Protein', icon: Drumstick, color: '#6366F1', token: 'var(--cal-protein)' },
  carbs: { label: 'Carbs', icon: Wheat, color: '#F59E0B', token: 'var(--cal-carbs)' },
  fat: { label: 'Fat', icon: Droplets, color: '#EC4899', token: 'var(--cal-fat)' },
};

const RING_GEOMETRY = {
  size: 188,
  strokeWidth: 13,
} as const;

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    setReady(true);
  }, [isAuthenticated, navigate]);

  // ---- Placeholder data (wire to real API later) ----
  const consumed = 0;
  const goal = 2000;
  const remaining = Math.max(goal - consumed, 0);
  const progress = Math.min((consumed / goal) * 100, 100);
  const hasLoggedToday = consumed > 0;

  const macros: MacroRow[] = useMemo(
    () => [
      { key: 'protein', consumed: 0, goalG: 125 },
      { key: 'carbs', consumed: 0, goalG: 225 },
      { key: 'fat', consumed: 0, goalG: 67 },
    ],
    []
  );

  const mealsLogged = 0;
  const waterLiters = 0;
  const streakDays = 0;
  const stats: StatRow[] = useMemo(
    () => [
      { key: 'meals', label: 'Meals logged', value: mealsLogged },
      { key: 'water', label: 'Water intake', value: `${waterLiters} L` },
      { key: 'streak', label: 'Day streak', value: streakDays },
    ],
    [mealsLogged, waterLiters, streakDays]
  );

  const greeting = useGreeting();
  const today = useTodayLabel();

  // ---- Ring geometry (derived once) ----
  const { size, strokeWidth } = RING_GEOMETRY;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringTargetOffset = circumference - (progress / 100) * circumference;

  // ---- Typed refs ----
  const ringRef = useRef<SVGCircleElement | null>(null);
  const calorieNumRef = useRef<HTMLSpanElement | null>(null);
  const macroBarRefs = useRef<Record<MacroKey, HTMLDivElement | null>>({
    protein: null,
    carbs: null,
    fat: null,
  });
  const statRefs = useRef<Record<StatKey, HTMLDivElement | null>>({
    meals: null,
    water: null,
    streak: null,
  });

  // ---- In + animations (respects prefers-reduced-motion) ----
  useEffect(() => {
    if (!ready) return;

    const setEndState = () => {
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(ringTargetOffset);
      }
      if (calorieNumRef.current) {
        calorieNumRef.current.textContent = consumed.toLocaleString();
      }
      macros.forEach((m) => {
        const el = macroBarRefs.current[m.key];
        if (el) el.style.width = `${(m.consumed / m.goalG) * 100}%`;
      });
      Object.values(statRefs.current).forEach((el) => {
        if (el) el.classList.add('is-visible');
      });
    };

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof anime !== 'function' || !anime.timeline) {
      setEndState();
      return;
    }

    let tl: anime.AnimeTimelineInstance | null = null;

    try {
      const counter = { val: 0 };
      tl = anime.timeline({ easing: 'easeOutExpo' });

      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = String(circumference);
      }

      tl.add({
        targets: ringRef.current,
        strokeDashoffset: [circumference, ringTargetOffset],
        duration: 900,
        easing: 'easeOutCubic',
      })
        .add(
          {
            targets: counter,
            val: consumed,
            round: 1,
            duration: 900,
            easing: 'easeOutCubic',
            update: () => {
              if (calorieNumRef.current) {
                calorieNumRef.current.textContent = Math.round(
                  counter.val
                ).toLocaleString();
              }
            },
          },
          '-=900'
        )
        .add(
          {
            targets: macros.map((m) => macroBarRefs.current[m.key]).filter(Boolean),
            width: (_el: unknown, i: number) => ['0%', `${(macros[i].consumed / macros[i].goalG) * 100}%`],
            delay: anime.stagger(90),
            duration: 500,
            easing: 'easeOutQuart',
          },
          '-=400'
        );

      // Stagger in stat cells
      requestAnimationFrame(() => {
        const cells = Object.values(statRefs.current).filter(
          (el): el is HTMLDivElement => !!el
        );
        cells.forEach((el, i) => {
          window.setTimeout(() => el.classList.add('is-visible'), 80 * i);
        });
      });
    } catch {
      setEndState();
    }

    return () => {
      tl?.pause?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) return null;

  const displayInitial =
    user?.username?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    'U';

  return (
    <div className="cal-root">
      <a href="#cal-main" className="cal-skip-link">
        Skip to content
      </a>

      <header className="cal-topbar" role="banner">
        <div className="cal-topbar-left">
          <span className="cal-logo" aria-label="Caloria">Caloria</span>
          <span className="cal-plan-badge">Free plan</span>
        </div>

        <div className="cal-topbar-right">
          <time className="cal-date" dateTime={new Date().toISOString().slice(0, 10)}>
            {today}
          </time>

          <div
            className="cal-avatar"
            role="img"
            aria-label={user?.username ? `${user.username} avatar` : 'User avatar'}
            title={user?.username || 'User'}
          >
            <span aria-hidden="true">{displayInitial}</span>
          </div>

          <button
            type="button"
            className="cal-btn cal-btn--ghost"
            onClick={logout}
            aria-label="Log out"
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      </header>

      <main id="cal-main" className="cal-content" tabIndex={-1}>
        <p className="cal-greeting">{greeting}{user?.username ? `, ${user.username}` : ''}</p>
        <h1 className="cal-page-title">Today&apos;s summary</h1>

        {/* ---- Hero: calorie ring + remaining ---- */}
        <section
          className="cal-hero"
          aria-labelledby="cal-hero-title"
        >
          <h2 id="cal-hero-title" className="cal-visually-hidden">
            Daily calorie progress
          </h2>

          <div className="cal-ring-wrap">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              role="img"
              aria-label={`Consumed ${consumed.toLocaleString()} of ${goal.toLocaleString()} calorie goal, ${progress.toFixed(0)} percent complete`}
            >
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={strokeWidth}
                aria-hidden="true"
              />
              <circle
                ref={ringRef}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--cal-accent)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                aria-hidden="true"
              />
            </svg>
            <div className="cal-ring-center" aria-hidden="true">
              <Flame size={18} className="cal-ring-icon" />
              <span
                className="cal-ring-value"
                ref={calorieNumRef}
                aria-live="polite"
              >
                0
              </span>
              <span className="cal-ring-unit">kcal eaten</span>
            </div>
          </div>

          <div className="cal-hero-right">
            <p className="cal-hero-remaining-label">Remaining today</p>
            <p
              className="cal-hero-remaining-value"
              aria-label={`${remaining.toLocaleString()} kilocalories remaining today`}
            >
              {remaining.toLocaleString()}
              <span className="cal-hero-remaining-unit">kcal</span>
            </p>

            <dl className="cal-hero-sub" aria-label="Daily calorie overview">
              <div>
                <dt className="cal-visually-hidden">Goal</dt>
                Goal <b>{goal.toLocaleString()}</b>
              </div>
              <div>
                <dt className="cal-visually-hidden">Consumed</dt>
                Consumed <b>{consumed.toLocaleString()}</b>
              </div>
            </dl>

            {!hasLoggedToday && (
              <div className="cal-hero-empty" role="status" aria-live="polite">
                Nothing logged yet today — add your first meal to get started.
              </div>
            )}

            <div className="cal-hero-cta">
              <button
                type="button"
            className="cal-btn cal-btn--on-dark cal-btn--success"
            onClick={() => navigate('/dashboard')}
            aria-label="Log your first meal"
          >
                Log a meal
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        {/* ---- Macro strip ---- */}
        <section
          className="cal-card cal-macro-strip"
          aria-labelledby="cal-macros-title"
        >
          <h2 id="cal-macros-title" className="cal-visually-hidden">
            Macronutrient progress
          </h2>
          {macros.map((m) => {
            const meta = MACROS_META[m.key];
            const Icon = meta.icon;
            const pct = Math.min((m.consumed / m.goalG) * 100, 100);
            return (
              <div className="cal-macro-row" key={m.key}>
                <div
                  className="cal-macro-icon"
                  style={{ background: `${meta.color}1A` }}
                  aria-hidden="true"
                >
                  <Icon size={17} color={meta.token as string} />
                </div>
                <div className="cal-macro-body">
                  <div className="cal-macro-head">
                    <span className="cal-macro-label">{meta.label}</span>
                    <span
                      className="cal-macro-amount"
                      aria-label={`${meta.label}: ${m.consumed} grams of ${m.goalG} grams goal`}
                    >
                      {m.consumed}g / {m.goalG}g
                    </span>
                  </div>
                  <div
                    className="cal-macro-track"
                    role="progressbar"
                    aria-label={`${meta.label} progress`}
                    aria-valuemin={0}
                    aria-valuemax={m.goalG}
                    aria-valuenow={m.consumed}
                  >
                    <div
                      ref={(el) => {
                        macroBarRefs.current[m.key] = el;
                      }}
                      className="cal-macro-fill"
                      style={{ background: meta.color as string }}
                    />
                  </div>
                  <span className="cal-visually-hidden">
                    {pct.toFixed(0)} percent
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        {/* ---- Stats strip ---- */}
        <section
          className="cal-stats-strip"
          aria-labelledby="cal-stats-title"
        >
          <h2 id="cal-stats-title" className="cal-visually-hidden">
            Daily stats
          </h2>
          {stats.map((s) => {
            const iconFor: Record<StatKey, typeof Utensils> = {
              meals: Utensils,
              water: GlassWater,
              streak: Zap,
            };
            const Icon = iconFor[s.key];
            return (
              <div
                className="cal-stat-cell"
                key={s.key}
                ref={(el) => {
                  statRefs.current[s.key] = el;
                }}
              >
                <div className="cal-stat-icon" aria-hidden="true">
                  <Icon size={15} />
                </div>
                <div className="cal-stat-body">
                  <p className="cal-stat-label">{s.label}</p>
                  <p className="cal-stat-value" aria-label={`${s.label}: ${s.value}`}>
                    {s.value}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
