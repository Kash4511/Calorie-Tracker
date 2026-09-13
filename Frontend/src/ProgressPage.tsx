import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Flame,
  LogOut,
  TrendingDown,
  TrendingUp,
  Minus,
  Scale,
  Plus,
  Sun,
  Moon,
  Check,
  Calendar,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, type ProgressResponse } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import './dashboard.css';
import './progress.css';

const NAV_TABS = ['Today', 'Log', 'Progress', 'Settings'] as const;

const NAV_ROUTES: Record<(typeof NAV_TABS)[number], string> = {
  Today: '/dashboard',
  Log: '/log',
  Progress: '/progress',
  Settings: '/settings',
};

const RANGE_OPTIONS = [
  { days: 7, label: '7 Days (1 Week)' },
  { days: 14, label: '14 Days (2 Weeks)' },
  { days: 30, label: '30 Days (1 Month)' },
  { days: 90, label: '90 Days (3 Months)' },
];

function formatShortDate(iso: string) {
  try {
    const parts = iso.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    }
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [rangeDays, setRangeDays] = useState<number>(14);
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick weight logging state
  const [quickWeightModal, setQuickWeightModal] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightSuccessMsg, setWeightSuccessMsg] = useState('');

  const activeTab = useMemo<(typeof NAV_TABS)[number]>(() => {
    const match = NAV_TABS.find((tab) => NAV_ROUTES[tab] === location.pathname);
    return match ?? 'Progress';
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
  }, [isAuthenticated, navigate]);

  const loadProgress = async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const json = await api.getProgress(days);
      setData(json);
      if (json.current_weight_kg) {
        setNewWeightInput(String(json.current_weight_kg));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load progress data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress(rangeDays);
  }, [rangeDays]);

  const handleSaveQuickWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeightInput);
    if (Number.isNaN(val) || val < 20 || val > 400) {
      setWeightSuccessMsg('Please enter a valid weight between 20 and 400 kg.');
      return;
    }
    setSavingWeight(true);
    setWeightSuccessMsg('');
    try {
      await api.saveWeight(val);
      setWeightSuccessMsg('✓ Today\'s weight logged & progress recalculated!');
      await loadProgress(rangeDays);
      setTimeout(() => {
        setWeightSuccessMsg('');
        setQuickWeightModal(false);
      }, 1200);
    } catch {
      setWeightSuccessMsg('Failed to save weight.');
    } finally {
      setSavingWeight(false);
    }
  };

  const chartData = useMemo(
    () =>
      (data?.daily_calories ?? []).map((d) => ({
        ...d,
        label: formatShortDate(d.date),
      })),
    [data]
  );

  const weightChartData = useMemo(
    () =>
      (data?.weight_trend ?? []).map((d) => ({
        ...d,
        label: formatShortDate(d.date),
      })),
    [data]
  );

  const hasWeightTrend = weightChartData.length >= 1;

  // Weekly & Monthly calculations from backend data
  const weekProg = data?.week_progress;
  const monthProg = data?.month_progress;
  const totalProg = data?.total_progress;

  return (
    <div className="cal-root">
      <a href="#cal-main" className="cal-skip-link">
        Skip to content
      </a>

      {/* Header / Navbar */}
      <header className="cal-navbar" role="banner">
        <div className="cal-nav-brand">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </div>

        <div className="cal-nav-greeting" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user?.profile_photo && (
            <img src={user.profile_photo} alt={user?.name || user?.username || 'User'} className="cal-nav-avatar" />
          )}
          <div>
            <p className="cal-nav-name">Progress &amp; Trends</p>
            <p className="cal-nav-date">Analytics &amp; Weight History</p>
          </div>
        </div>

        <nav className="cal-nav-tabs" aria-label="Primary">
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`cal-nav-tab${activeTab === tab ? ' is-active' : ''}`}
              onClick={() => navigate(NAV_ROUTES[tab])}
              aria-current={activeTab === tab ? 'page' : undefined}
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
        {/* Top Controls Row */}
        <div className="prog-header-bar">
          <div>
            <h1 className="cal-settings-title" style={{ margin: 0 }}>
              Progress Analytics
            </h1>
            <p className="cal-settings-subtitle">
              Detailed tracking of your weekly and monthly weight changes, calorie consistency, and macro compliance.
            </p>
          </div>

          <div className="prog-range-pills">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                className={`prog-range-pill${rangeDays === opt.days ? ' is-active' : ''}`}
                onClick={() => setRangeDays(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="prog-error" role="alert">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="cal-mini-card" style={{ textAlign: 'center', padding: 40 }}>
            <p className="prog-hint">Calculating your progress metrics…</p>
          </div>
        )}

        {data && (
          <>
            {/* =========================================================
                WEEK & MONTH WEIGHT CHANGE HIGHLIGHT CARDS
               ========================================================= */}
            <section className="prog-weight-changes-grid">
              {/* 1. WEEK WEIGHT CHANGE */}
              <div className="prog-weight-card prog-weight-card--week">
                <div className="prog-weight-card-head">
                  <span className="prog-weight-tag">Last 7 Days</span>
                  <Scale size={16} className="prog-weight-icon" />
                </div>

                <div className="prog-weight-card-main">
                  <p className="prog-weight-card-label">Weight Gained / Lost in 1 Week</p>
                  <div className="prog-weight-val-row">
                    <span className="prog-weight-val">
                      {weekProg?.formatted ?? '0.0 kg'}
                    </span>
                    {weekProg?.status === 'lost' ? (
                      <span className="prog-diff-badge prog-diff-badge--loss">
                        <TrendingDown size={14} />
                        Lost {Math.abs(weekProg.change_kg || 0)} kg
                      </span>
                    ) : weekProg?.status === 'gained' ? (
                      <span className="prog-diff-badge prog-diff-badge--gain">
                        <TrendingUp size={14} />
                        Gained {Math.abs(weekProg.change_kg || 0)} kg
                      </span>
                    ) : (
                      <span className="prog-diff-badge prog-diff-badge--steady">
                        <Minus size={14} />
                        Maintained
                      </span>
                    )}
                  </div>

                  <p className="prog-weight-card-sub">
                    {weekProg?.baseline_kg && data.current_weight_kg ? (
                      <>
                        7d Baseline: <strong>{weekProg.baseline_kg} kg</strong> &rarr; Now: <strong>{data.current_weight_kg} kg</strong>
                      </>
                    ) : (
                      'Recorded from your active weight logs'
                    )}
                  </p>
                </div>
              </div>

              {/* 2. MONTH WEIGHT CHANGE */}
              <div className="prog-weight-card prog-weight-card--month">
                <div className="prog-weight-card-head">
                  <span className="prog-weight-tag">Last 30 Days</span>
                  <Calendar size={16} className="prog-weight-icon" />
                </div>

                <div className="prog-weight-card-main">
                  <p className="prog-weight-card-label">Weight Gained / Lost in 1 Month</p>
                  <div className="prog-weight-val-row">
                    <span className="prog-weight-val">
                      {monthProg?.formatted ?? '0.0 kg'}
                    </span>
                    {monthProg?.status === 'lost' ? (
                      <span className="prog-diff-badge prog-diff-badge--loss">
                        <TrendingDown size={14} />
                        Lost {Math.abs(monthProg.change_kg || 0)} kg
                      </span>
                    ) : monthProg?.status === 'gained' ? (
                      <span className="prog-diff-badge prog-diff-badge--gain">
                        <TrendingUp size={14} />
                        Gained {Math.abs(monthProg.change_kg || 0)} kg
                      </span>
                    ) : (
                      <span className="prog-diff-badge prog-diff-badge--steady">
                        <Minus size={14} />
                        Maintained
                      </span>
                    )}
                  </div>

                  <p className="prog-weight-card-sub">
                    {monthProg?.baseline_kg && data.current_weight_kg ? (
                      <>
                        30d Baseline: <strong>{monthProg.baseline_kg} kg</strong> &rarr; Now: <strong>{data.current_weight_kg} kg</strong>
                      </>
                    ) : (
                      'Recorded over 30 days of data'
                    )}
                  </p>
                </div>
              </div>

              {/* 3. TOTAL PROGRESS & GOAL DISTANCE */}
              <div className="prog-weight-card prog-weight-card--total">
                <div className="prog-weight-card-head">
                  <span className="prog-weight-tag">Goal Journey</span>
                  <button
                    type="button"
                    className="prog-quick-log-btn"
                    onClick={() => setQuickWeightModal(true)}
                  >
                    <Plus size={13} />
                    Log Weight
                  </button>
                </div>

                <div className="prog-weight-card-main">
                  <p className="prog-weight-card-label">Current vs Goal Weight</p>
                  <div className="prog-weight-val-row">
                    <span className="prog-weight-val">
                      {data.current_weight_kg !== null ? `${data.current_weight_kg} kg` : '—'}
                    </span>
                    {data.goal_weight_kg && (
                      <span className="prog-goal-tag">
                        Target: <strong>{data.goal_weight_kg} kg</strong>
                      </span>
                    )}
                  </div>

                  <p className="prog-weight-card-sub">
                    {data.remaining_to_goal_kg !== null ? (
                      <>
                        {data.remaining_to_goal_kg === 0 ? (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>🎉 Target weight reached!</span>
                        ) : (
                          <span>{data.remaining_to_goal_kg} kg away from goal weight</span>
                        )}
                        {totalProg?.change_kg !== 0 && (
                          <span> &middot; {totalProg?.change_kg && totalProg.change_kg > 0 ? `+${totalProg.change_kg}` : totalProg?.change_kg} kg overall</span>
                        )}
                      </>
                    ) : (
                      'Keep logging weight to track your progress line'
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* =========================================================
                NUTRITION & ACTIVITY STATS OVERVIEW
               ========================================================= */}
            <section className="prog-stats-grid">
              <div className="prog-stat-card">
                <p className="prog-stat-label">Avg Calories Eaten</p>
                <p className="prog-stat-value">
                  {data.avg_calories.toLocaleString()}
                  <span className="prog-stat-unit"> kcal/day</span>
                </p>
                <p className="prog-stat-sub">
                  Target: {data.calorie_target.toLocaleString()} kcal &middot;{' '}
                  {data.avg_calories > data.calorie_target ? (
                    <span style={{ color: '#ef4444' }}>+{data.avg_calories - data.calorie_target} over</span>
                  ) : (
                    <span style={{ color: '#10b981' }}>{data.calorie_target - data.avg_calories} deficit</span>
                  )}
                </p>
              </div>

              <div className="prog-stat-card">
                <p className="prog-stat-label">Avg Protein</p>
                <p className="prog-stat-value">
                  {data.avg_protein_g}
                  <span className="prog-stat-unit"> g/day</span>
                </p>
                <p className="prog-stat-sub">Target: {data.protein_target_g} g &middot; muscle recovery</p>
              </div>

              <div className="prog-stat-card">
                <p className="prog-stat-label">Activity Burned</p>
                <p className="prog-stat-value">
                  {data.total_burned.toLocaleString()}
                  <span className="prog-stat-unit"> kcal</span>
                </p>
                <p className="prog-stat-sub">Burned over {data.range_days} days</p>
              </div>

              <div className="prog-stat-card">
                <p className="prog-stat-label">Logging Consistency</p>
                <p className="prog-stat-value">
                  {data.consistency_pct}
                  <span className="prog-stat-unit">%</span>
                </p>
                <p className="prog-stat-sub">
                  Logged {data.logged_days_count} of {data.range_days} days
                </p>
              </div>
            </section>

            {/* =========================================================
                CHARTS: CALORIES PER DAY & WEIGHT TREND
               ========================================================= */}
            {/* Calories per Day Chart */}
            <section className="prog-chart-card">
              <div className="prog-chart-head-row">
                <div>
                  <h2 className="prog-chart-title">Calories per Day vs Target</h2>
                  <p className="prog-chart-subtitle">
                    Daily intake from meals with reference target line over the last {data.range_days} days.
                  </p>
                </div>
                {data.calorie_target > 0 && (
                  <div className="prog-target-legend">
                    <span className="prog-target-dash-line" />
                    <span>Target: {data.calorie_target} kcal</span>
                  </div>
                )}
              </div>

              <div className="prog-chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 12, right: 16, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--cal-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: 'var(--cal-ink-muted)' }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--cal-border)' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'var(--cal-ink-muted)' }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--cal-card-bg)',
                        color: 'var(--cal-ink)',
                        borderRadius: 10,
                        border: '1px solid var(--cal-border)',
                        fontSize: 13,
                        boxShadow: 'var(--cal-shadow-sm)',
                      }}
                      formatter={(value: any) => [`${Number(value || 0).toLocaleString()} kcal`, 'Calories']}
                    />
                    {data.calorie_target > 0 && (
                      <ReferenceLine
                        y={data.calorie_target}
                        stroke="#10b981"
                        strokeDasharray="5 5"
                        strokeWidth={1.5}
                        label={{
                          value: `Target (${data.calorie_target})`,
                          position: 'insideTopRight',
                          fontSize: 11,
                          fill: '#10b981',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="var(--cal-accent)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: 'var(--cal-accent)' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Weight Trend Chart */}
            <section className="prog-chart-card">
              <div className="prog-chart-head-row">
                <div>
                  <h2 className="prog-chart-title">Weight Progress &amp; Trend</h2>
                  <p className="prog-chart-subtitle">
                    Recorded body weight measurements and trajectory toward your goal weight.
                  </p>
                </div>
                <button
                  type="button"
                  className="cal-edit-stats-btn"
                  onClick={() => setQuickWeightModal(true)}
                >
                  <Plus size={13} />
                  Record Today&apos;s Weight
                </button>
              </div>

              {hasWeightTrend ? (
                <div className="prog-chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={weightChartData} margin={{ top: 12, right: 16, left: -8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="4 4" stroke="var(--cal-border)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: 'var(--cal-ink-muted)' }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--cal-border)' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'var(--cal-ink-muted)' }}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                        domain={['dataMin - 1', 'dataMax + 1']}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--cal-card-bg)',
                          color: 'var(--cal-ink)',
                          borderRadius: 10,
                          border: '1px solid var(--cal-border)',
                          fontSize: 13,
                          boxShadow: 'var(--cal-shadow-sm)',
                        }}
                        formatter={(value: any) => [`${Number(value || 0).toFixed(1)} kg`, 'Weight']}
                      />
                      {data.goal_weight_kg && (
                        <ReferenceLine
                          y={data.goal_weight_kg}
                          stroke="#0284c7"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: `Goal (${data.goal_weight_kg} kg)`,
                            position: 'insideTopRight',
                            fontSize: 11,
                            fill: '#0284c7',
                          }}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="weight_kg"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0ea5e9' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="prog-empty-wrap">
                  <Scale size={32} style={{ color: 'var(--cal-ink-faint)', marginBottom: 8 }} />
                  <p className="prog-empty">
                    Log your weight on a few days to visualize your trend line and progress toward your goal.
                  </p>
                  <button
                    type="button"
                    className="cal-btn-primary"
                    style={{ marginTop: 12 }}
                    onClick={() => setQuickWeightModal(true)}
                  >
                    Log First Weight Entry
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Quick Weight Modal */}
      {quickWeightModal && (
        <div className="cal-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cal-modal-card" style={{ maxWidth: 440 }}>
            <div className="cal-modal-header">
              <div>
                <h3 className="cal-modal-title">Record Body Weight</h3>
                <p className="cal-modal-subtitle">
                  Updates your daily weight log and recalculates your weekly and monthly changes.
                </p>
              </div>
              <button
                type="button"
                className="cal-modal-close"
                onClick={() => setQuickWeightModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveQuickWeight}>
              <div className="cal-modal-body">
                <div className="cal-form-group">
                  <label className="cal-form-label" htmlFor="quick-w-inp">
                    Today&apos;s Weight (kg)
                  </label>
                  <input
                    id="quick-w-inp"
                    type="number"
                    step="0.1"
                    min="20"
                    max="400"
                    className="cal-form-input"
                    value={newWeightInput}
                    onChange={(e) => setNewWeightInput(e.target.value)}
                    placeholder="e.g. 68.5"
                    autoFocus
                    required
                  />
                </div>

                {weightSuccessMsg && (
                  <div className="cal-modal-alert">
                    <Check size={16} />
                    <span>{weightSuccessMsg}</span>
                  </div>
                )}
              </div>

              <div className="cal-modal-footer">
                <button
                  type="button"
                  className="cal-btn-secondary"
                  onClick={() => setQuickWeightModal(false)}
                  disabled={savingWeight}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cal-btn-primary"
                  disabled={savingWeight}
                >
                  {savingWeight ? 'Saving…' : 'Save & Refresh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
