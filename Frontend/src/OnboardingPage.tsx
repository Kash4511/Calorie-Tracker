import { useState, useEffect } from 'react';
import { Flame, Sun, Moon, LogOut, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import type { OnboardingData } from './api';
import './dashboard.css'; // shared cal-* design system
import './onboarding.css'; // onboarding-only additions

interface Option {
  value: string;
  label: string;
  emoji?: string;
  description?: string;
}

interface Step {
  key: keyof OnboardingData;
  title: string;
  subtitle: string;
  type: 'choice' | 'number';
  options?: Option[];
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
}

const STEPS: Step[] = [
  {
    key: 'goal',
    title: "What's your main goal?",
    subtitle: 'We will tailor your daily targets to help you reach it.',
    type: 'choice',
    options: [
      { value: 'lose_weight', label: 'Lose Weight', emoji: '🏋️', description: 'Create a calorie deficit' },
      { value: 'maintain', label: 'Maintain', emoji: '⚖️', description: 'Stay at your current weight' },
      { value: 'gain_muscle', label: 'Gain Muscle', emoji: '💪', description: 'Build strength and mass' },
    ],
  },
  {
    key: 'activity_level',
    title: 'How active are you?',
    subtitle: 'Be honest — accurate activity means accurate calorie targets.',
    type: 'choice',
    options: [
      { value: 'sedentary', label: 'Sedentary', emoji: '🛋️', description: 'Little to no exercise' },
      { value: 'light', label: 'Light', emoji: '🚶', description: 'Light walks, 1–3 days/week' },
      { value: 'moderate', label: 'Moderate', emoji: '🏃', description: 'Exercise 3–5 days/week' },
      { value: 'active', label: 'Active', emoji: '🚴', description: 'Hard exercise 6–7 days/week' },
      { value: 'very_active', label: 'Very Active', emoji: '🔥', description: 'Athletic training daily' },
    ],
  },
  {
    key: 'gender',
    title: 'What is your gender?',
    subtitle: 'Used to calculate your basal metabolic rate.',
    type: 'choice',
    options: [
      { value: 'male', label: 'Male', emoji: '👨' },
      { value: 'female', label: 'Female', emoji: '👩' },
      { value: 'other', label: 'Other / Prefer not to say', emoji: '🧑' },
    ],
  },
  {
    key: 'age',
    title: 'How old are you?',
    subtitle: 'Age is an important factor for calculating your needs.',
    type: 'number',
    min: 10,
    max: 100,
    unit: 'years',
    placeholder: 'Enter your age',
  },
  {
    key: 'height_cm',
    title: "What's your height?",
    subtitle: 'Choose your preferred unit and enter your height.',
    type: 'number',
    min: 100,
    max: 250,
    unit: 'cm',
    placeholder: 'e.g. 175',
  },
  {
    key: 'weight_kg',
    title: "What's your current weight?",
    subtitle: 'Enter your weight in kilograms.',
    type: 'number',
    min: 20,
    max: 400,
    unit: 'kg',
    placeholder: 'e.g. 70',
  },
  {
    key: 'diet_preference',
    title: 'Any dietary preferences?',
    subtitle: 'We will recommend meals that fit your lifestyle.',
    type: 'choice',
    options: [
      { value: 'none', label: 'No restrictions', emoji: '🍽️' },
      { value: 'vegetarian', label: 'Vegetarian', emoji: '🥗' },
      { value: 'vegan', label: 'Vegan', emoji: '🌱' },
      { value: 'keto', label: 'Keto', emoji: '🥑' },
      { value: 'paleo', label: 'Paleo', emoji: '🍖' },
    ],
  },
];

const HEIGHT_RANGES = {
  ft: { min: 3.3, max: 8.2, step: 0.1, label: 'ft' },
  cm: { min: 100, max: 250, step: 1, label: 'cm' },
  m: { min: 1, max: 2.5, step: 0.01, label: 'm' },
} as const;

const HEIGHT_UNITS = [
  { key: 'ft', label: 'Feet' },
  { key: 'cm', label: 'Centimeters' },
  { key: 'm', label: 'Meters' },
] as const;

const INITIAL_DATA: OnboardingData = {
  goal: '',
  activity_level: '',
  gender: '',
  age: 0,
  height_cm: 0,
  weight_kg: 0,
  diet_preference: '',
};

const toCm = (value: number, unit: 'ft' | 'cm' | 'm') =>
  unit === 'ft' ? value * 30.48 : unit === 'm' ? value * 100 : value;

export default function OnboardingPage() {
  const { isAuthenticated, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [numberInput, setNumberInput] = useState('');
  const [numberError, setNumberError] = useState('');
  const [heightUnit, setHeightUnit] = useState<'ft' | 'cm' | 'm'>('cm');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [checkedAuth, setCheckedAuth] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else {
      setCheckedAuth(true);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const s = STEPS[currentStep];
    if (s.type === 'number') {
      const current = data[s.key] as number;
      setNumberInput(current && current > 0 ? String(current) : '');
      setNumberError('');
    }
    // Reset the input only when the step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  if (!checkedAuth) return null;

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps - 1;
  const heightRange = step.key === 'height_cm' ? HEIGHT_RANGES[heightUnit] : null;

  const validateNumber = (raw: string, s: Step): { valid: boolean; num: number; error: string } => {
    if (!raw.trim()) return { valid: false, num: 0, error: 'Please enter a value' };
    const num = Number(raw);
    if (Number.isNaN(num)) return { valid: false, num: 0, error: 'Enter a valid number' };

    if (s.key === 'height_cm') {
      const r = HEIGHT_RANGES[heightUnit];
      if (num < r.min) return { valid: false, num, error: `Minimum is ${r.min} ${r.label}` };
      if (num > r.max) return { valid: false, num, error: `Maximum is ${r.max} ${r.label}` };
    } else {
      if (s.min !== undefined && num < s.min)
        return { valid: false, num, error: `Minimum is ${s.min}${s.unit ? ` ${s.unit}` : ''}` };
      if (s.max !== undefined && num > s.max)
        return { valid: false, num, error: `Maximum is ${s.max}${s.unit ? ` ${s.unit}` : ''}` };
    }
    return { valid: true, num, error: '' };
  };

  const canGoNext = (): boolean => {
    if (step.type === 'choice') return !!data[step.key];
    return !!numberInput.trim() && !numberError;
  };

  const handleHeightUnitChange = (unit: 'ft' | 'cm' | 'm') => {
    setHeightUnit(unit);
    setNumberError('');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNumberInput(e.target.value);
    setNumberError(validateNumber(e.target.value, step).error);
  };

  // Returns the updated data for number steps (or null if invalid).
  const commitNumberStep = (): OnboardingData | null => {
    const result = validateNumber(numberInput, step);
    if (!result.valid) {
      setNumberError(result.error);
      return null;
    }
    const value = step.key === 'height_cm' ? toCm(result.num, heightUnit) : result.num;
    const next = { ...data, [step.key]: value };
    setData(next);
    return next;
  };

  const handleNext = () => {
    if (step.type === 'number' && !commitNumberStep()) return;
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  };

  const handleChoiceSelect = (value: string) => setData({ ...data, [step.key]: value });

  const handleBack = () => {
    setSubmitError('');
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    // Use the freshly computed data, not stale state.
    let finalData = data;
    if (step.type === 'number') {
      const committed = commitNumberStep();
      if (!committed) return;
      finalData = committed;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      await api.submitOnboarding(finalData);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      try {
        const parsed = JSON.parse((err as Error).message);
        const messages = Object.values(parsed)
          .flat()
          .filter((v) => typeof v === 'string')
          .join(', ');
        setSubmitError(messages || 'Submission failed. Please try again.');
      } catch {
        setSubmitError('Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const labelFor = (key: keyof OnboardingData) =>
    STEPS.find((s) => s.key === key)?.options?.find((o) => o.value === data[key])?.label ?? '—';

  const unitLabel = step.key === 'height_cm' ? heightRange?.label : step.unit;

  return (
    <div className="cal-root cal-ob">
      <header className="cal-navbar" role="banner">
        <div className="cal-nav-brand">
          <span className="cal-logo-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="cal-logo-text">Caloria</span>
        </div>

        <div className="cal-ob-spacer" />

        <button
          type="button"
          className="cal-theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button type="button" className="cal-logout-icon" onClick={logout} aria-label="Log out" title="Log out">
          <LogOut size={17} aria-hidden="true" />
        </button>
      </header>

      <main className="cal-content cal-ob-main" tabIndex={-1}>
        <section className="cal-overview cal-ob-card" aria-labelledby="ob-title">
          <div className="cal-ob-progress">
            <div className="cal-ob-progress-head">
              <span>Set up your profile</span>
              <span>
                Step {currentStep + 1} of {totalSteps}
              </span>
            </div>
            <div
              className="cal-overview-track"
              role="progressbar"
              aria-label="Onboarding progress"
              aria-valuemin={0}
              aria-valuemax={totalSteps}
              aria-valuenow={currentStep + 1}
            >
              <div className="cal-overview-fill cal-ob-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <h1 id="ob-title" className="cal-ob-title">
            {step.title}
          </h1>
          <p className="cal-ob-subtitle">{step.subtitle}</p>

          {submitError && (
            <div className="cal-modal-alert cal-ob-error" role="alert">
              <span>{submitError}</span>
            </div>
          )}

          {step.type === 'choice' && (
            <div className="cal-ob-options" role="radiogroup" aria-label={step.title}>
              {step.options?.map((opt) => {
                const selected = data[step.key] === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleChoiceSelect(opt.value)}
                    className={`cal-ob-option${selected ? ' is-selected' : ''}`}
                  >
                    {opt.emoji && (
                      <span className="cal-ob-option-emoji" aria-hidden="true">
                        {opt.emoji}
                      </span>
                    )}
                    <span className="cal-ob-option-text">
                      <span className="cal-ob-option-label">{opt.label}</span>
                      {opt.description && <span className="cal-ob-option-desc">{opt.description}</span>}
                    </span>
                    <span className="cal-ob-option-check" aria-hidden="true">
                      {selected && <Check size={14} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step.type === 'number' && (
            <div className="cal-ob-number">
              {step.key === 'height_cm' && (
                <div className="cal-ob-segment" role="group" aria-label="Height unit">
                  {HEIGHT_UNITS.map((u) => (
                    <button
                      key={u.key}
                      type="button"
                      className={`cal-ob-segment-btn${heightUnit === u.key ? ' is-selected' : ''}`}
                      aria-pressed={heightUnit === u.key}
                      onClick={() => handleHeightUnitChange(u.key)}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="cal-weight-input-wrap cal-ob-input-wrap">
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  step={step.key === 'height_cm' ? heightRange?.step : '1'}
                  min={step.key === 'height_cm' ? heightRange?.min : step.min}
                  max={step.key === 'height_cm' ? heightRange?.max : step.max}
                  value={numberInput}
                  onChange={handleNumberChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canGoNext() && !submitting) {
                      isLastStep ? handleSubmit() : handleNext();
                    }
                  }}
                  placeholder={
                    step.key === 'height_cm'
                      ? heightUnit === 'ft'
                        ? 'e.g. 5.8'
                        : heightUnit === 'm'
                          ? 'e.g. 1.75'
                          : 'e.g. 175'
                      : step.placeholder
                  }
                  className={`cal-weight-input cal-ob-input${numberError ? ' is-error' : ''}`}
                  aria-label={step.title}
                  aria-invalid={!!numberError}
                />
                <span className="cal-weight-unit">{unitLabel}</span>
              </div>

              <p className={`cal-ob-hint${numberError ? ' is-error' : ''}`} role={numberError ? 'alert' : undefined}>
                {numberError ||
                  (step.key === 'height_cm'
                    ? `Range: ${heightRange?.min} – ${heightRange?.max} ${heightRange?.label}`
                    : `Range: ${step.min} – ${step.max} ${step.unit}`)}
              </p>
            </div>
          )}

          {isLastStep && (
            <div className="cal-stats-strip cal-ob-summary">
              <div className="cal-stats-strip-head">
                <span className="cal-stats-strip-title">Your setup so far</span>
              </div>
              <div className="cal-stats-strip-pills">
                <div className="cal-stat-pill">
                  <span className="cal-stat-pill-label">Goal</span>
                  <span className="cal-stat-pill-val">{labelFor('goal')}</span>
                </div>
                <div className="cal-stat-pill">
                  <span className="cal-stat-pill-label">Activity</span>
                  <span className="cal-stat-pill-val">{labelFor('activity_level')}</span>
                </div>
                <div className="cal-stat-pill">
                  <span className="cal-stat-pill-label">Body Stats</span>
                  <span className="cal-stat-pill-val">
                    {data.age} yrs &middot; {Math.round(data.height_cm)} cm
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="cal-ob-nav">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 0 || submitting}
              className="cal-btn-secondary cal-ob-btn"
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canGoNext() || submitting}
                className="cal-btn-primary cal-ob-btn"
              >
                {submitting ? 'Saving…' : 'Complete setup'}
                {!submitting && <Check size={15} aria-hidden="true" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext() || submitting}
                className="cal-btn-primary cal-ob-btn"
              >
                Continue
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}