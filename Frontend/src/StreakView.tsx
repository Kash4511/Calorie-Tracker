import { useMemo, useState } from 'react';
import {
  Flame,
  Trophy,
  Zap,
  Calendar,
  Lock,
  Award,
} from 'lucide-react';
import type { StreakData, BadgeItem, ActivityDayInfo } from './api';
import './streak.css';

interface StreakViewProps {
  streak?: StreakData;
  badges: BadgeItem[];
}

type RangeOption = 'year' | '6months' | '30days';

interface DayCellData {
  dateStr: string;
  dayOfMonth: number;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  month: number; // 0-11
  count: number;
  level: number;
  isFuture: boolean;
  isToday: boolean;
  details?: ActivityDayInfo;
}

interface WeekCol {
  weekIndex: number;
  days: (DayCellData | null)[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function StreakView({ streak, badges }: StreakViewProps) {
  const [range, setRange] = useState<RangeOption>('year');
  const [badgeCategory, setBadgeCategory] = useState<'all' | 'login' | 'logging' | 'goals'>('all');
  const [hoveredDay, setHoveredDay] = useState<DayCellData | null>(null);

  const currentStreak = streak?.current_streak ?? 1;
  const longestStreak = streak?.longest_streak ?? 1;
  const totalBadges = badges.length || 17;
  const unlockedBadgesCount = useMemo(() => badges.filter((b) => b.unlocked).length, [badges]);

  // Determine active days history
  const activityHistory = useMemo(() => streak?.activity_history ?? {}, [streak?.activity_history]);

  // Calculate days count based on range
  const rangeDaysCount = useMemo(() => {
    if (range === '30days') return 35; // 5 weeks
    if (range === '6months') return 182; // 26 weeks
    return 364; // 52 weeks
  }, [range]);

  // Build grid of weeks & days (GitHub/LeetCode style: Sunday = row 0, Saturday = row 6)
  const { weeks, monthLabels, totalContributions, activeDaysCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);

    // End date is current week's Saturday
    const end = new Date(today);
    const endDayOfWeek = end.getDay(); // 0 is Sun, 6 is Sat
    end.setDate(end.getDate() + (6 - endDayOfWeek));

    // Total weeks needed
    const totalWeeks = Math.ceil(rangeDaysCount / 7);
    const start = new Date(end);
    start.setDate(start.getDate() - totalWeeks * 7 + 1);

    const weekCols: WeekCol[] = [];
    const months: Array<{ label: string; weekIdx: number }> = [];
    let lastMonth = -1;
    let contribCount = 0;
    let activeDays = 0;

    const cur = new Date(start);

    for (let w = 0; w < totalWeeks; w++) {
      const days: (DayCellData | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cur.toISOString().slice(0, 10);
        const isFuture = cur > today;
        const isToday = dateStr === todayIso;

        // Check if day falls within current streak
        let effectiveCount = 0;
        let effectiveLevel = 0;
        const info = activityHistory[dateStr];

        if (info) {
          effectiveCount = info.count;
          effectiveLevel = info.level;
        } else if (!isFuture && currentStreak > 0 && streak?.last_active_date) {
          const lastActive = new Date(streak.last_active_date);
          const diffDays = Math.round((lastActive.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < currentStreak) {
            effectiveCount = 1;
            effectiveLevel = 1;
          }
        }

        if (effectiveLevel > 0 && !isFuture) {
          contribCount += effectiveCount;
          activeDays += 1;
        }

        const cellData: DayCellData = {
          dateStr,
          dayOfMonth: cur.getDate(),
          dayOfWeek: cur.getDay(),
          month: cur.getMonth(),
          count: effectiveCount,
          level: effectiveLevel,
          isFuture,
          isToday,
          details: info,
        };

        // Month label tracking
        if (d === 0 && cellData.month !== lastMonth) {
          months.push({ label: MONTH_NAMES[cellData.month], weekIdx: w });
          lastMonth = cellData.month;
        }

        days.push(cellData);
        cur.setDate(cur.getDate() + 1);
      }
      weekCols.push({ weekIndex: w, days });
    }

    return {
      weeks: weekCols,
      monthLabels: months,
      totalContributions: contribCount,
      activeDaysCount: activeDays,
    };
  }, [activityHistory, currentStreak, rangeDaysCount, streak?.last_active_date]);

  const filteredBadges = useMemo(() => {
    if (badgeCategory === 'all') return badges;
    return badges.filter((b) => b.category === badgeCategory);
  }, [badges, badgeCategory]);

  return (
    <div className="cal-streak-view-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ---- Hero Streak Header (Matches Dashboard Daily Count) ---- */}
      <section className="cal-streak-card" aria-label="Login Streak Overview">
        <div className="cal-streak-main">
          <div className="cal-streak-flame-wrap">
            <div className="cal-streak-flame-circle" style={{ width: 62, height: 62 }}>
              <Flame size={32} className="cal-streak-flame-icon" />
            </div>
            <div className="cal-streak-count-col">
              <div className="cal-streak-num-row">
                <span className="cal-streak-number" style={{ fontSize: 42 }}>{currentStreak}</span>
                <span className="cal-streak-word" style={{ fontSize: 22 }}>Day Streak!</span>
              </div>
              <p className="cal-streak-sub" style={{ fontSize: 14 }}>
                {currentStreak > 1
                  ? `You're on fire! Unbroken daily login and activity consistency. Keep it up!`
                  : `Log in and track meals or workouts daily to build your consistency streak.`}
              </p>
            </div>
          </div>

          <div className="cal-streak-right">
            <div className="cal-streak-best-pill">
              <span className="cal-streak-best-lbl">Best Streak</span>
              <span className="cal-streak-best-val">⚡ {longestStreak} days</span>
            </div>
            <div className="cal-streak-best-pill">
              <span className="cal-streak-best-lbl">Active Days (Year)</span>
              <span className="cal-streak-best-val">📅 {activeDaysCount} days</span>
            </div>
            <div className="cal-streak-best-pill">
              <span className="cal-streak-best-lbl">Badges Earned</span>
              <span className="cal-streak-best-val">🏆 {unlockedBadgesCount} / {totalBadges}</span>
            </div>
          </div>
        </div>

        {/* This Week's 7-Day Consistency Tracker */}
        <div className="cal-streak-week-tracker">
          <span className="cal-streak-week-label">This Week's Activity:</span>
          <div className="cal-streak-days-row">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => {
              const isActive = streak?.active_days_week?.[idx] ?? false;
              return (
                <div key={dayName} className={`cal-streak-day-chip${isActive ? ' is-active' : ''}`}>
                  <span className="cal-streak-day-name">{dayName}</span>
                  <span className="cal-streak-day-dot">{isActive ? '✓' : '·'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- Quick Key Stats Cards Grid ---- */}
      <div className="cal-streak-stats-grid">
        <div className="cal-streak-stat-card">
          <div className="cal-streak-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Flame size={20} />
          </div>
          <div className="cal-streak-stat-info">
            <span className="cal-streak-stat-number">{currentStreak} Days</span>
            <span className="cal-streak-stat-label">Current Active Streak</span>
          </div>
        </div>

        <div className="cal-streak-stat-card">
          <div className="cal-streak-stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
            <Zap size={20} />
          </div>
          <div className="cal-streak-stat-info">
            <span className="cal-streak-stat-number">{longestStreak} Days</span>
            <span className="cal-streak-stat-label">Personal Best Streak</span>
          </div>
        </div>

        <div className="cal-streak-stat-card">
          <div className="cal-streak-stat-icon" style={{ background: '#dcfce7', color: '#15803d' }}>
            <Calendar size={20} />
          </div>
          <div className="cal-streak-stat-info">
            <span className="cal-streak-stat-number">{activeDaysCount} Days</span>
            <span className="cal-streak-stat-label">Active Days Logged</span>
          </div>
        </div>

        <div className="cal-streak-stat-card">
          <div className="cal-streak-stat-icon" style={{ background: '#fef08a', color: '#ca8a04' }}>
            <Award size={20} />
          </div>
          <div className="cal-streak-stat-info">
            <span className="cal-streak-stat-number">{unlockedBadgesCount} / {totalBadges}</span>
            <span className="cal-streak-stat-label">Milestones Unlocked</span>
          </div>
        </div>
      </div>

      {/* ===========================================================
          GitHub / LeetCode Style Activity Heatmap (Green Boxes)
         =========================================================== */}
      <section className="cal-heatmap-card" aria-label="Activity Contribution Heatmap">
        <div className="cal-heatmap-header">
          <div className="cal-heatmap-title-col">
            <div className="cal-heatmap-title-row">
              <span style={{ fontSize: 20 }}>🟩</span>
              <h3 className="cal-heatmap-title">Daily Activity &amp; Consistency Heatmap</h3>
            </div>
            <p className="cal-heatmap-subtitle">
              GitHub &amp; LeetCode-style contribution grid of your daily meal logs, workouts, and hydration.
            </p>
          </div>

          <div className="cal-heatmap-range-tabs">
            <button
              type="button"
              className={`cal-heatmap-range-btn${range === 'year' ? ' is-active' : ''}`}
              onClick={() => setRange('year')}
            >
              Past 12 Months
            </button>
            <button
              type="button"
              className={`cal-heatmap-range-btn${range === '6months' ? ' is-active' : ''}`}
              onClick={() => setRange('6months')}
            >
              Past 6 Months
            </button>
            <button
              type="button"
              className={`cal-heatmap-range-btn${range === '30days' ? ' is-active' : ''}`}
              onClick={() => setRange('30days')}
            >
              Past 35 Days
            </button>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="cal-heatmap-scroll-wrap">
          <div className="cal-heatmap-container">
            {/* Month Labels Row */}
            <div className="cal-heatmap-months-row" style={{ position: 'relative' }}>
              {monthLabels.map((m, idx) => (
                <span
                  key={`${m.label}-${idx}`}
                  className="cal-heatmap-month-label"
                  style={{ left: `${m.weekIdx * 15.5}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* Matrix with weekday labels (Mon, Wed, Fri) */}
            <div className="cal-heatmap-grid-area">
              <div className="cal-heatmap-weekday-labels">
                <span></span>
                <span>Mon</span>
                <span></span>
                <span>Wed</span>
                <span></span>
                <span>Fri</span>
                <span></span>
              </div>

              <div className="cal-heatmap-weeks-track">
                {weeks.map((week) => (
                  <div className="cal-heatmap-week-col" key={week.weekIndex}>
                    {week.days.map((day, dIdx) => {
                      if (!day) return <div key={dIdx} className="cal-heatmap-cell level-0" />;
                      return (
                        <div
                          key={day.dateStr}
                          className={`cal-heatmap-cell level-${day.level}${day.isFuture ? ' is-future' : ''}${
                            day.isToday ? ' is-today' : ''
                          }`}
                          onMouseEnter={() => setHoveredDay(day)}
                          onClick={() => setHoveredDay(day)}
                          title={`${day.dateStr}: ${
                            day.count > 0 ? `${day.count} activities logged` : 'No activity logged'
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tooltip Card showing details of hovered/focused day */}
        {hoveredDay && (
          <div className="cal-heatmap-tooltip-card">
            <div>
              <span className="cal-heatmap-tooltip-date">
                {new Date(hoveredDay.dateStr + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="cal-heatmap-tooltip-desc" style={{ marginLeft: 8 }}>
                {hoveredDay.count > 0
                  ? `• ${hoveredDay.count} activities logged${
                      hoveredDay.details?.calories ? ` (${hoveredDay.details.calories.toLocaleString()} kcal)` : ''
                    }${hoveredDay.details?.water ? ` • ${hoveredDay.details.water}L water` : ''}`
                  : '• No activity logged on this day'}
              </span>
            </div>
            <span className={`cal-heatmap-tooltip-tag ${hoveredDay.count > 0 ? 'active' : 'inactive'}`}>
              {hoveredDay.count > 0 ? `Level ${hoveredDay.level} Active` : 'Inactive'}
            </span>
          </div>
        )}

        {/* Heatmap Footer: Total Count & Legend */}
        <div className="cal-heatmap-footer">
          <div className="cal-heatmap-summary-text">
            <strong>{activeDaysCount}</strong> active days logged • <strong>{totalContributions}</strong> total entries
          </div>

          <div className="cal-heatmap-legend">
            <span>Less</span>
            <div className="cal-heatmap-legend-cells">
              <span className="cal-heatmap-cell level-0 cal-heatmap-legend-cell" title="0 entries" />
              <span className="cal-heatmap-cell level-1 cal-heatmap-legend-cell" title="1 entry" />
              <span className="cal-heatmap-cell level-2 cal-heatmap-legend-cell" title="2 entries" />
              <span className="cal-heatmap-cell level-3 cal-heatmap-legend-cell" title="3-4 entries" />
              <span className="cal-heatmap-cell level-4 cal-heatmap-legend-cell" title="5+ entries" />
            </div>
            <span>More</span>
          </div>
        </div>
      </section>

      {/* ===========================================================
          Badges & Milestones ("and the badges like it previously was")
         =========================================================== */}
      <section className="cal-badges-section" aria-labelledby="streak-badges-heading">
        <div className="cal-badges-header">
          <div className="cal-badges-header-left">
            <div className="cal-badges-title-wrap">
              <Trophy size={20} className="cal-badges-trophy" />
              <h2 id="streak-badges-heading" className="cal-badges-title">
                Consistency Badges &amp; Milestones
              </h2>
            </div>
            <p className="cal-badges-subtitle">
              Complete daily login streaks, log meals &amp; workouts, and reach your targets to earn achievement badges.
            </p>
          </div>
          <div className="cal-badges-count-pill">
            <strong>{unlockedBadgesCount}</strong> of <strong>{totalBadges}</strong> Badges Earned
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="cal-badges-tabs" role="tablist">
          {(['all', 'login', 'logging', 'goals'] as const).map((cat) => {
            const label =
              cat === 'all'
                ? `All (${badges.length})`
                : cat === 'login'
                ? `Login Streaks (${badges.filter((b) => b.category === 'login').length})`
                : cat === 'logging'
                ? `Adding Logs (${badges.filter((b) => b.category === 'logging').length})`
                : `Meeting Goals (${badges.filter((b) => b.category === 'goals').length})`;
            return (
              <button
                key={cat}
                type="button"
                className={`cal-badge-tab${badgeCategory === cat ? ' is-active' : ''}`}
                onClick={() => setBadgeCategory(cat)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Badges Grid */}
        <div className="cal-badges-grid">
          {filteredBadges.map((badge) => (
            <div
              key={badge.id}
              className={`cal-badge-card${badge.unlocked ? ' is-unlocked' : ' is-locked'}`}
            >
              <div className="cal-badge-card-icon-wrap">
                <span className="cal-badge-emoji">{badge.icon}</span>
                {badge.unlocked ? (
                  <span className="cal-badge-check-icon" title="Unlocked!">✓</span>
                ) : (
                  <span className="cal-badge-lock-icon" title="In Progress">
                    <Lock size={12} />
                  </span>
                )}
              </div>
              <div className="cal-badge-card-body">
                <div className="cal-badge-title-row">
                  <h4 className="cal-badge-card-title">{badge.title}</h4>
                  {badge.unlocked && <span className="cal-badge-unlocked-tag">Earned</span>}
                </div>
                <p className="cal-badge-card-desc">{badge.description}</p>
                <div className="cal-badge-card-progress">
                  <div className="cal-badge-bar-track">
                    <div
                      className="cal-badge-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.round((badge.progress / badge.max_progress) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="cal-badge-progress-text">
                    {badge.unlocked ? 'Unlocked' : `${badge.progress} / ${badge.max_progress}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
