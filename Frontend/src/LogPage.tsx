import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Flame, History, LogOut, Plus, Repeat, ScanLine, Search, SquarePen, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, type FoodItem, type MealKey, type RecentFood } from './api';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import './log.css';

const MEALS: Array<{ key: MealKey; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' }, { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' }, { key: 'snacks', label: 'Snacks' },
];
const NAV_LINKS = [
  { path: '/dashboard', label: 'Today' },
  { path: '/log', label: 'Log' },
  { path: '/progress', label: 'Progress' },
  { path: '/settings', label: 'Settings' },
];
const ACTIVITIES = [
  { label: 'Walking (brisk)', kcalPerMin: 5.3 },
  { label: 'Running', kcalPerMin: 11.4 },
  { label: 'Cycling', kcalPerMin: 7.5 },
  { label: 'Yoga', kcalPerMin: 3.0 },
  { label: 'Strength training', kcalPerMin: 6.0 },
];
type AddMode = 'search' | 'scan' | 'manual' | 'move';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export default function LogPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, loading: authLoading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const today = useMemo(() => isoDate(new Date()), []);

  const queryMeal = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const m = params.get('meal') as MealKey | null;
    if (m && ['breakfast', 'lunch', 'dinner', 'snacks'].includes(m)) {
      return m;
    }
    return null;
  }, [location.search]);

  const [mealType, setMealType] = useState<MealKey>(queryMeal || 'breakfast');

  useEffect(() => {
    if (queryMeal && queryMeal !== mealType) {
      setMealType(queryMeal);
    }
  }, [queryMeal, mealType]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [addMode, setAddMode] = useState<AddMode>('search');
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unitLabel, setUnitLabel] = useState('g');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [foodsError, setFoodsError] = useState(false);

  // Recently used foods — sourced from log history so both library foods and
  // ones typed in manually resurface at the top of search.
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const loadRecent = useCallback(() => {
    api.getRecentFoods(8).then(setRecentFoods).catch(() => setRecentFoods([]));
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadRecent();
  }, [isAuthenticated, loadRecent]);

  // Custom unit composer (shown inside the nutrition preview)
  const [customUnitOpen, setCustomUnitOpen] = useState(false);
  const [customUnitLabel, setCustomUnitLabel] = useState('');
  const [customUnitGrams, setCustomUnitGrams] = useState('');
  const [unitSaving, setUnitSaving] = useState(false);
  const [unitError, setUnitError] = useState('');

  // Scan tab
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);

  // Manual tab: Food name, Calories, Protein, Carbs, Fat, Sugar
  const [manualForm, setManualForm] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    sugar: '',
  });

  // Move tab
  const [activity, setActivity] = useState(ACTIVITIES[0].label);
  const [minutes, setMinutes] = useState('30');
  const [steps, setSteps] = useState('0');

  const selectedUnit = useMemo(() => {
    if (!selectedFood) return null;
    return selectedFood.units.find((unit) => unit.label === unitLabel)
      ?? selectedFood.units.find((unit) => unit.label === selectedFood.default_unit.label)
      ?? null;
  }, [selectedFood, unitLabel]);

  const nutritionPreview = useMemo(() => {
    if (!selectedFood || !selectedUnit) return null;
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const grams = amount * selectedUnit.grams_per_unit;
    const factor = grams / 100;
    return {
      grams,
      calories: Math.round(selectedFood.calories_per_100g * factor),
      protein: Number((selectedFood.protein_per_100g * factor).toFixed(1)),
      carbs: Number((selectedFood.carbs_per_100g * factor).toFixed(1)),
      fat: Number((selectedFood.fat_per_100g * factor).toFixed(1)),
      sugar: Number((selectedFood.sugar_per_100g * factor).toFixed(1)),
    };
  }, [selectedFood, selectedUnit, quantity]);

  const estimatedBurn = useMemo(() => {
    const mins = Number(minutes);
    const rate = ACTIVITIES.find((entry) => entry.label === activity)?.kcalPerMin ?? 5;
    if (!Number.isFinite(mins) || mins <= 0) return 0;
    return Math.round(mins * rate);
  }, [activity, minutes]);

  useEffect(() => {
    if (addMode !== 'search') return;
    setFoodsLoading(true);
    setFoodsError(false);
    setSelectedFood(null);
    const timer = window.setTimeout(() => {
      api.getFoods(query).then(setFoods).catch(() => { setFoods([]); setFoodsError(true); }).finally(() => setFoodsLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, addMode]);

  const foodImage = (food: FoodItem) => {
    const image = food.category === 'Fruits'
      ? 'photo-1610832958506-aa56368176cf'
      : food.category === 'Vegetables'
        ? 'photo-1540420773420-3366772f4999'
        : food.category === 'Dairy'
          ? 'photo-1628088062854-d1870b4553da'
          : food.category === 'Non-Veg' || food.category === 'Protein'
            ? 'photo-1604503468506-a8da13d82791'
            : food.category === 'Dal & Curry'
              ? 'photo-1601050690597-df0568f70950'
              : 'photo-1512621776951-a57141f2eefd';
    return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=96&h=96&q=80&fm=png`;
  };

  const selectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setUnitLabel(food.default_unit.label);
    setQuantity(food.default_unit.kind === 'count' ? '1' : '100');
    setCustomUnitOpen(false);
    setUnitError('');
  };

  const addFood = async (foodToAdd: FoodItem, amount: number, label: string) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus({ text: 'Enter a quantity greater than zero.', type: 'error' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const entry = await api.addFood({
        date: today,
        meal_type: mealType,
        food_item_id: foodToAdd.id,
        quantity: amount,
        unit_label: label,
      });
      setStatus({
        text: `Added ${entry.name} (${entry.calories} kcal) to ${mealType}!`,
        type: 'success',
      });
      setSelectedFood(null);
      setQuantity('100');
      setUnitLabel('g');
      loadRecent();
    } catch {
      setStatus({ text: 'Could not add this food. Please try again.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // One-tap add from the result list uses the food's own default unit.
  const quickAdd = (food: FoodItem) => {
    const def = food.default_unit;
    addFood(food, def.kind === 'count' ? 1 : 100, def.label);
  };

  // Tapping a "Recently used" chip. Library foods open the preview so the
  // amount/unit can be adjusted; manual entries re-log with the same values.
  const reAddRecent = async (recent: RecentFood) => {
    if (recent.food) {
      selectFood(recent.food);
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const entry = await api.addManualMeal({
        date: today,
        meal_type: mealType,
        name: recent.name,
        calories: recent.calories,
        protein_g: recent.protein_g,
        carbs_g: recent.carbs_g,
        fat_g: recent.fat_g,
        sugar_g: recent.sugar_g,
        servings: 1,
      });
      setStatus({
        text: `Added ${entry.name} (${entry.calories} kcal) to ${mealType}!`,
        type: 'success',
      });
      loadRecent();
    } catch {
      setStatus({ text: 'Could not add this food. Please try again.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const addCustomUnit = async () => {
    if (!selectedFood) return;
    const label = customUnitLabel.trim();
    const gramsPer = Number(customUnitGrams);
    if (!label) {
      setUnitError('Enter a unit name, e.g. scoop.');
      return;
    }
    if (!Number.isFinite(gramsPer) || gramsPer <= 0) {
      setUnitError('Enter how many grams one unit weighs.');
      return;
    }
    setUnitSaving(true);
    setUnitError('');
    try {
      const created = await api.addFoodUnit(selectedFood.id, { label, grams_per_unit: gramsPer });
      setSelectedFood({ ...selectedFood, units: [...selectedFood.units, created] });
      setUnitLabel(created.label);
      setCustomUnitLabel('');
      setCustomUnitGrams('');
      setCustomUnitOpen(false);
    } catch {
      setUnitError('Could not save that unit. It may already exist for this food.');
    } finally {
      setUnitSaving(false);
    }
  };

  const findBarcode = async () => {
    if (!barcode.trim()) {
      setStatus({ text: 'Enter a barcode number.', type: 'error' });
      return;
    }
    setScanning(true);
    try {
      const results = await api.getFoods(barcode.trim());
      if (results.length) {
        setFoods(results);
        selectFood(results[0]);
        setStatus({ text: `Found ${results[0].name}.`, type: 'success' });
      } else {
        setStatus({ text: 'No saved food matches that barcode yet — try Manual entry.', type: 'error' });
      }
    } catch {
      setStatus({ text: 'Could not look up that barcode.', type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const submitManual = async () => {
    if (!manualForm.name.trim()) {
      setStatus({ text: 'Please enter a food name.', type: 'error' });
      return;
    }
    if (!manualForm.calories.trim() || Number(manualForm.calories) < 0) {
      setStatus({ text: 'Please enter a valid calorie amount.', type: 'error' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const entry = await api.addManualMeal({
        date: today,
        meal_type: mealType,
        name: manualForm.name.trim(),
        calories: Math.max(0, Math.round(Number(manualForm.calories) || 0)),
        protein_g: Math.max(0, Number(manualForm.protein) || 0),
        carbs_g: Math.max(0, Number(manualForm.carbs) || 0),
        fat_g: Math.max(0, Number(manualForm.fat) || 0),
        sugar_g: Math.max(0, Number(manualForm.sugar) || 0),
        servings: 1,
      });
      setStatus({
        text: `Added ${entry.name} (${entry.calories} kcal) to ${mealType}!`,
        type: 'success',
      });
      setManualForm({
        name: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        sugar: '',
      });
      loadRecent();
    } catch {
      setStatus({ text: 'Could not add manual food. Please check your connection.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const logActivity = async () => {
    if (estimatedBurn <= 0) {
      setStatus({ text: 'Enter minutes greater than zero.', type: 'error' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await api.logActivity({
        name: activity,
        calories_burned: estimatedBurn,
        duration_minutes: Number(minutes) || undefined,
        date: today,
      });
      setStatus({
        text: `Logged ${activity} · ${minutes} min · ${estimatedBurn} kcal burned!`,
        type: 'success',
      });
      setMinutes('30');
      setSteps('0');
    } catch {
      setStatus({ text: 'Could not log this activity.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const quantityControls = selectedFood && selectedUnit ? (
    <div className="log-unit-controls">
      <label className="log-field">Quantity
        <input type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      </label>
      <label className="log-field">Unit
        <select value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)}>
          {selectedFood.units.map((unit) => (
            <option key={unit.label} value={unit.label}>
              {unit.label}{unit.kind === 'count' ? ` (${unit.grams_per_unit} g each)` : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  ) : null;

  const customUnitComposer = selectedFood ? (
    <div className="log-custom-unit">
      {customUnitOpen ? (
        <>
          <div className="log-unit-controls">
            <label className="log-field">Unit name
              <input value={customUnitLabel} onChange={(event) => setCustomUnitLabel(event.target.value)} placeholder="e.g. scoop" />
            </label>
            <label className="log-field">Grams per unit
              <input type="number" min="0" step="any" value={customUnitGrams} onChange={(event) => setCustomUnitGrams(event.target.value)} placeholder="30" />
            </label>
          </div>
          {unitError && <p className="log-unit-error">{unitError}</p>}
          <div className="log-unit-actions">
            <button type="button" className="log-add-btn" onClick={addCustomUnit} disabled={unitSaving}>{unitSaving ? 'Saving…' : 'Save unit'}</button>
            <button type="button" className="log-link-btn" onClick={() => { setCustomUnitOpen(false); setUnitError(''); }}>Cancel</button>
          </div>
        </>
      ) : (
        <button type="button" className="log-link-btn" onClick={() => setCustomUnitOpen(true)}>+ Add a custom unit</button>
      )}
    </div>
  ) : null;

  return <div className="log-root">
    <header className="log-navbar">
      <button type="button" className="log-back-btn" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard"><ChevronLeft size={18} /></button>
      <div className="log-brand"><span className="log-brand-mark"><Flame size={17} /></span>Caloria</div>
      <div className="log-navbar-title"><h1>Log food</h1><p>Search, scan or enter it yourself</p></div>
      <nav className="log-navlinks" aria-label="Primary">
        {NAV_LINKS.map((link) => <button key={link.path} type="button" className={`log-navlink${location.pathname === link.path ? ' is-active' : ''}`} onClick={() => navigate(link.path)}>{link.label}</button>)}
        <button
          type="button"
          className="cal-theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{ width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--cal-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer', color: 'var(--cal-ink-500)' }}
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button type="button" className="log-navlink-signout" aria-label="Sign out" onClick={() => { logout(); navigate('/login'); }}><LogOut size={16} /></button>
      </nav>
    </header>

    <main className="log-content">
      <section aria-label="Meal">
        <p className="log-section-label">Meal</p>
        <div className="log-meal-tabs">
          {MEALS.map((meal) => <button key={meal.key} type="button" className={`log-meal-tab${mealType === meal.key ? ' is-active' : ''}`} onClick={() => setMealType(meal.key)}>{meal.label}</button>)}
        </div>
      </section>

      <div className="log-subtabs" role="tablist" aria-label="Add food method">
        <button type="button" role="tab" aria-selected={addMode === 'search'} className={`log-subtab${addMode === 'search' ? ' is-active' : ''}`} onClick={() => setAddMode('search')}><Search size={15} /> Search</button>
        <button type="button" role="tab" aria-selected={addMode === 'scan'} className={`log-subtab${addMode === 'scan' ? ' is-active' : ''}`} onClick={() => setAddMode('scan')}><ScanLine size={15} /> Scan</button>
        <button type="button" role="tab" aria-selected={addMode === 'manual'} className={`log-subtab${addMode === 'manual' ? ' is-active' : ''}`} onClick={() => setAddMode('manual')}><SquarePen size={15} /> Manual</button>
        <button type="button" role="tab" aria-selected={addMode === 'move'} className={`log-subtab${addMode === 'move' ? ' is-active' : ''}`} onClick={() => setAddMode('move')}><Repeat size={15} /> Move</button>
      </div>

      {status && (
        <div className={`log-status log-status--${status.type}`} role="status">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span>{status.text}</span>
            {status.type === 'success' && (
              <button
                type="button"
                className="log-add-btn"
                style={{ padding: '6px 14px', fontSize: '13px' }}
                onClick={() => navigate('/dashboard')}
              >
                View on Dashboard &rarr;
              </button>
            )}
          </div>
        </div>
      )}

      {addMode === 'search' && (
        <section className="log-panel" aria-labelledby="search-heading">
          <input
            id="search-heading"
            className="log-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search foods (e.g. chicken breast, apple, dal, salmon, rice)..."
          />
          {recentFoods.length > 0 && (
            <div className="log-recent">
              <p className="log-recent-label"><History size={13} /> Recently used</p>
              <div className="log-recent-list">
                {recentFoods.map((recent) => (
                  <button
                    key={recent.id}
                    type="button"
                    className="log-recent-chip"
                    onClick={() => reAddRecent(recent)}
                    disabled={busy}
                    title={recent.food
                      ? `Open ${recent.name} (${recent.calories} kcal last time)`
                      : `Add ${recent.name} again (${recent.calories} kcal)`}
                  >
                    <span className="log-recent-name">{recent.name}</span>
                    <small>
                      {recent.food
                        ? `Last: ${recent.quantity ?? ''} ${recent.unit_label} · ${recent.calories} kcal`
                        : `${recent.calories} kcal · added manually`}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={`log-food-results${query.trim() ? ' is-drawer-open' : ''}`} role="listbox" aria-label="Food search results">
            {foodsLoading ? <p className="log-empty">Loading foods...</p>
              : foodsError ? <p className="log-empty">Food search is unavailable. Check that the backend is running and you are signed in.</p>
              : foods.length ? foods.map((food) => (
                <div className="log-food-result" key={food.id} onClick={() => selectFood(food)}>
                  <img className="log-food-image" src={foodImage(food)} alt="" loading="lazy" />
                  <span><strong>{food.name}</strong><small>{food.category} · {food.calories_per_100g} kcal / 100 g</small></span>
                  <button type="button" className="log-food-plus" onClick={(e) => { e.stopPropagation(); quickAdd(food); }} disabled={busy} aria-label={`Add ${food.name} to ${mealType}`}><Plus size={18} /></button>
                </div>
              )) : query.trim() ? <p className="log-empty">No foods found for "{query}".</p> : null}
          </div>
          {nutritionPreview && selectedFood && (
            <div className="log-nutrition-preview">
              <p className="log-preview-label">Nutrition for {selectedFood.name} ({quantity} {unitLabel} ≈ {nutritionPreview.grams.toFixed(0)} g):</p>
              <div className="log-preview-values"><span>{nutritionPreview.calories} kcal</span><span>P {nutritionPreview.protein}g</span><span>C {nutritionPreview.carbs}g</span><span>F {nutritionPreview.fat}g</span><span>S {nutritionPreview.sugar}g</span></div>
              {quantityControls}
              {customUnitComposer}
              <button type="button" className="log-add-btn log-add-btn--wide" onClick={() => addFood(selectedFood, Number(quantity), unitLabel)} disabled={busy}>Add to {mealType}</button>
            </div>
          )}
        </section>
      )}

      {addMode === 'scan' && (
        <section className="log-panel" aria-labelledby="scan-heading">
          <p id="scan-heading" className="log-panel-hint">Type or paste the barcode number printed on the packet. Saved packaged foods show up instantly.</p>
          <div className="log-scan-row">
            <input className="log-barcode-input" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="8901234567890" inputMode="numeric" />
            <button type="button" className="log-add-btn" onClick={findBarcode} disabled={scanning}>Find</button>
          </div>
          {selectedFood && nutritionPreview && (
            <div className="log-nutrition-preview">
              <p className="log-preview-label">Nutrition for {selectedFood.name} ({quantity} {unitLabel} ≈ {nutritionPreview.grams.toFixed(0)} g):</p>
              <div className="log-preview-values"><span>{nutritionPreview.calories} kcal</span><span>P {nutritionPreview.protein}g</span><span>C {nutritionPreview.carbs}g</span><span>F {nutritionPreview.fat}g</span><span>S {nutritionPreview.sugar}g</span></div>
              {quantityControls}
              {customUnitComposer}
              <button type="button" className="log-add-btn log-add-btn--wide" onClick={() => { const food = selectedFood; addFood(food, Number(quantity), unitLabel); setBarcode(''); }} disabled={busy}>Add to {mealType}</button>
            </div>
          )}
        </section>
      )}

      {addMode === 'manual' && (
        <section className="log-panel" aria-labelledby="manual-heading">
          <div className="log-manual-form">
            <label className="log-field">
              Food name
              <input
                id="manual-heading"
                value={manualForm.name}
                onChange={(event) => setManualForm({ ...manualForm, name: event.target.value })}
                placeholder="e.g. Grilled Chicken Salad"
              />
            </label>

            <label className="log-field">
              Calories (kcal)
              <input
                type="number"
                min="0"
                value={manualForm.calories}
                onChange={(event) => setManualForm({ ...manualForm, calories: event.target.value })}
                placeholder="0"
              />
            </label>

            <div className="log-macros-header">
              <span className="log-macros-title">Macronutrients (optional)</span>
            </div>

            <div className="log-macros-grid">
              <label className="log-field">
                Protein (g)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualForm.protein}
                  onChange={(event) => setManualForm({ ...manualForm, protein: event.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="log-field">
                Carbs (g)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualForm.carbs}
                  onChange={(event) => setManualForm({ ...manualForm, carbs: event.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="log-field">
                Fat (g)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualForm.fat}
                  onChange={(event) => setManualForm({ ...manualForm, fat: event.target.value })}
                  placeholder="0"
                />
              </label>
              <label className="log-field">
                Sugar (g)
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualForm.sugar}
                  onChange={(event) => setManualForm({ ...manualForm, sugar: event.target.value })}
                  placeholder="0"
                />
              </label>
            </div>
            <button type="button" className="log-add-btn log-add-btn--wide" onClick={submitManual} disabled={busy}>Add to {mealType}</button>
          </div>
        </section>
      )}

      {addMode === 'move' && (
        <section className="log-panel" aria-labelledby="move-heading">
          <div className="log-move-form">
            <label className="log-field">Activity<select id="move-heading" value={activity} onChange={(event) => setActivity(event.target.value)}>{ACTIVITIES.map((item) => <option key={item.label} value={item.label}>{item.label}</option>)}</select></label>
            <div className="log-move-row">
              <label className="log-field">Minutes<input type="number" min="0" value={minutes} onChange={(event) => setMinutes(event.target.value)} /></label>
              <label className="log-field">Steps (optional)<input type="number" min="0" value={steps} onChange={(event) => setSteps(event.target.value)} /></label>
            </div>
            <div className="log-burn-estimate"><strong>{estimatedBurn} kcal</strong><small>estimated burn at 70 kg body weight</small></div>
            <button type="button" className="log-add-btn log-add-btn--wide" onClick={logActivity} disabled={busy}>Log activity</button>
          </div>
        </section>
      )}
    </main>
  </div>;
}