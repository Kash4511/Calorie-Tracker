import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import type { OnboardingData } from './api';
import './auth.css';

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
      {
        value: 'lose_weight',
        label: 'Lose Weight',
        emoji: '🏋️',
        description: 'Create a calorie deficit',
      },
      {
        value: 'maintain',
        label: 'Maintain',
        emoji: '⚖️',
        description: 'Stay at your current weight',
      },
      {
        value: 'gain_muscle',
        label: 'Gain Muscle',
        emoji: '💪',
        description: 'Build strength and mass',
      },
    ],
  },
  {
    key: 'activity_level',
    title: 'How active are you?',
    subtitle:
      'Be honest — accurate activity means accurate calorie targets.',
    type: 'choice',
    options: [
      {
        value: 'sedentary',
        label: 'Sedentary',
        emoji: '🛋️',
        description: 'Little to no exercise',
      },
      {
        value: 'light',
        label: 'Light',
        emoji: '🚶',
        description: 'Light walks, 1–3 days/week',
      },
      {
        value: 'moderate',
        label: 'Moderate',
        emoji: '🏃',
        description: 'Exercise 3–5 days/week',
      },
      {
        value: 'active',
        label: 'Active',
        emoji: '🚴',
        description: 'Hard exercise 6–7 days/week',
      },
      {
        value: 'very_active',
        label: 'Very Active',
        emoji: '🔥',
        description: 'Athletic training daily',
      },
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
      {
        value: 'other',
        label: 'Other / Prefer not to say',
        emoji: '🧑',
      },
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
  ft: {
    min: 3.3,
    max: 8.2,
    step: 0.1,
    label: 'ft',
  },
  cm: {
    min: 100,
    max: 250,
    step: 1,
    label: 'cm',
  },
  m: {
    min: 1,
    max: 2.5,
    step: 0.01,
    label: 'm',
  },
} as const;

const INITIAL_DATA: OnboardingData = {
  goal: '',
  activity_level: '',
  gender: '',
  age: 0,
  height_cm: 0,
  weight_kg: 0,
  diet_preference: '',
};

export default function OnboardingPage() {
  const { isAuthenticated } = useAuth();
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
    const step = STEPS[currentStep];

    if (step.type === 'number') {
      const current = data[step.key] as number;

      setNumberInput(
        current && current > 0 ? String(current) : ''
      );

      setNumberError('');
    }
    // Only reset the input when changing steps.
    // Do NOT depend on heightUnit or data here,
    // otherwise changing units would overwrite the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  if (!checkedAuth) {
    return null;
  }

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const validateNumber = (
    raw: string,
    s: Step
  ): { valid: boolean; num: number; error: string } => {
    if (!raw.trim()) {
      return {
        valid: false,
        num: 0,
        error: 'Please enter a value',
      };
    }

    const num = Number(raw);

    if (Number.isNaN(num)) {
      return {
        valid: false,
        num: 0,
        error: 'Enter a valid number',
      };
    }

    if (s.key === 'height_cm') {
      const range = HEIGHT_RANGES[heightUnit];

      if (num < range.min) {
        return {
          valid: false,
          num,
          error: `Minimum is ${range.min} ${range.label}`,
        };
      }

      if (num > range.max) {
        return {
          valid: false,
          num,
          error: `Maximum is ${range.max} ${range.label}`,
        };
      }
    } else {
      if (s.min !== undefined && num < s.min) {
        return {
          valid: false,
          num,
          error: `Minimum is ${s.min}${s.unit ? ` ${s.unit}` : ''}`,
        };
      }

      if (s.max !== undefined && num > s.max) {
        return {
          valid: false,
          num,
          error: `Maximum is ${s.max}${s.unit ? ` ${s.unit}` : ''}`,
        };
      }
    }

    return {
      valid: true,
      num,
      error: '',
    };
  };

  const canGoNext = (): boolean => {
    if (step.type === 'choice') {
      return !!data[step.key];
    }

    return !!numberInput.trim() && !numberError;
  };

  const handleHeightUnitChange = (
    unit: 'ft' | 'cm' | 'm'
  ) => {
    // IMPORTANT:
    // Do not convert or modify numberInput here.
    // The user keeps whatever value they typed.
    setHeightUnit(unit);
    setNumberError('');
  };

  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    setNumberInput(value);

    const result = validateNumber(value, step);
    setNumberError(result.error);
  };

  const handleNext = () => {
    if (step.type === 'number') {
      const result = validateNumber(numberInput, step);

      if (!result.valid) {
        setNumberError(result.error);
        return;
      }

      let valueToStore = result.num;

      // Convert ONLY when leaving the height step.
      // Backend continues to receive height_cm.
      if (step.key === 'height_cm') {
        if (heightUnit === 'ft') {
          valueToStore = result.num * 30.48;
        } else if (heightUnit === 'm') {
          valueToStore = result.num * 100;
        } else {
          valueToStore = result.num;
        }
      }

      setData({
        ...data,
        [step.key]: valueToStore,
      });
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleChoiceSelect = (value: string) => {
    setData({
      ...data,
      [step.key]: value,
    });
  };

  const handleBack = () => {
    setSubmitError('');

    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (step.type === 'number') {
      const result = validateNumber(numberInput, step);

      if (!result.valid) {
        setNumberError(result.error);
        return;
      }

      // This normally won't be needed because height/number
      // is already stored when Continue was clicked, but it
      // keeps the final step safe.
      let valueToStore = result.num;

      if (step.key === 'height_cm') {
        if (heightUnit === 'ft') {
          valueToStore = result.num * 30.48;
        } else if (heightUnit === 'm') {
          valueToStore = result.num * 100;
        }
      }

      setData({
        ...data,
        [step.key]: valueToStore,
      });
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await api.submitOnboarding(data);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      try {
        const parsed = JSON.parse((err as Error).message);

        const messages = Object.values(parsed)
          .flat()
          .filter((v) => typeof v === 'string')
          .join(', ');

        setSubmitError(
          messages || 'Submission failed. Please try again.'
        );
      } catch {
        setSubmitError(
          'Submission failed. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isLastStep = currentStep === totalSteps - 1;

  const heightRange =
    step.key === 'height_cm'
      ? HEIGHT_RANGES[heightUnit]
      : null;

  return (
    <div className="auth-page">
      <div className="onboarding-wrap">
        <div className="onboarding-progress">
          <div className="onboarding-bar">
            <div
              className="onboarding-bar__fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="onboarding-progress__text">
            Step {currentStep + 1} of {totalSteps}
          </div>
        </div>

        <div className="auth-card auth-card--wide">
          <h1 className="auth-title">
            {step.title}
          </h1>

          <p className="auth-subtitle">
            {step.subtitle}
          </p>

          {submitError && (
            <div
              className="auth-alert auth-alert--error"
              style={{ marginBottom: '24px' }}
            >
              {submitError}
            </div>
          )}

          {step.type === 'choice' && (
            <div className="onboarding-options">
              {step.options?.map((opt) => {
                const selected =
                  data[step.key] === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      handleChoiceSelect(opt.value)
                    }
                    className={
                      'onboarding-option' +
                      (selected ? ' is-selected' : '')
                    }
                  >
                    {opt.emoji && (
                      <div className="onboarding-option__emoji">
                        {opt.emoji}
                      </div>
                    )}

                    <div className="onboarding-option__content">
                      <div className="onboarding-option__label">
                        {opt.label}
                      </div>

                      {opt.description && (
                        <div className="onboarding-option__desc">
                          {opt.description}
                        </div>
                      )}
                    </div>

                    {selected && (
                      <div className="onboarding-option__check">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {step.type === 'number' && (
            <div className="onboarding-number">
              {step.key === 'height_cm' && (
                <>
                  <div className="onboarding-height-units">
                    <button
                      type="button"
                      className={
                        heightUnit === 'ft'
                          ? 'is-selected'
                          : ''
                      }
                      onClick={() =>
                        handleHeightUnitChange('ft')
                      }
                    >
                      Feet
                    </button>

                    <button
                      type="button"
                      className={
                        heightUnit === 'cm'
                          ? 'is-selected'
                          : ''
                      }
                      onClick={() =>
                        handleHeightUnitChange('cm')
                      }
                    >
                      Centimeters
                    </button>

                    <button
                      type="button"
                      className={
                        heightUnit === 'm'
                          ? 'is-selected'
                          : ''
                      }
                      onClick={() =>
                        handleHeightUnitChange('m')
                      }
                    >
                      Meters
                    </button>
                  </div>

                  <div className="onboarding-height-info">
                    Enter your height in{' '}
                    {heightRange?.label}.
                  </div>
                </>
              )}

              <div className="onboarding-number__wrap">
                <input
                  type="number"
                  step={
                    step.key === 'height_cm'
                      ? heightRange?.step
                      : '1'
                  }
                  min={
                    step.key === 'height_cm'
                      ? heightRange?.min
                      : step.min
                  }
                  max={
                    step.key === 'height_cm'
                      ? heightRange?.max
                      : step.max
                  }
                  value={numberInput}
                  onChange={handleNumberChange}
                  placeholder={
                    step.key === 'height_cm'
                      ? heightUnit === 'ft'
                        ? 'e.g. 5.8'
                        : heightUnit === 'm'
                          ? 'e.g. 1.75'
                          : 'e.g. 175'
                      : step.placeholder
                  }
                  className={
                    'onboarding-number__input' +
                    (numberError ? ' is-error' : '')
                  }
                />

                <div className="onboarding-number__unit">
                  {step.key === 'height_cm'
                    ? heightRange?.label
                    : step.unit}
                </div>
              </div>

              {numberError && (
                <div className="onboarding-number__error">
                  {numberError}
                </div>
              )}

              <div className="onboarding-number__hint">
                {step.key === 'height_cm'
                  ? `Range: ${heightRange?.min} – ${heightRange?.max} ${heightRange?.label}`
                  : `Range: ${step.min} – ${step.max} ${step.unit}`}
              </div>
            </div>
          )}

          <div className="onboarding-nav">
            <button
              type="button"
              onClick={handleBack}
              disabled={
                currentStep === 0 || submitting
              }
              className="auth-btn auth-btn--secondary"
            >
              Back
            </button>

            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  !canGoNext() || submitting
                }
                className="auth-btn auth-btn--success"
              >
                {submitting
                  ? 'Saving…'
                  : 'Complete Setup'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  !canGoNext() || submitting
                }
                className="auth-btn auth-btn--primary"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
