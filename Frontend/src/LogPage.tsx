import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, type FoodItem, type MealEntry, type MealKey } from './api';
import './log.css';

const MEALS: Array<{ key: MealKey; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' }, { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' }, { key: 'snacks', label: 'Snacks' },
];
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const formatDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export default function LogPage() {
  const navigate = useNavigate();
  const today = isoDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [query, setQuery] = useState('');
  const [mealType, setMealType] = useState<MealKey>('breakfast');
  const [grams, setGrams] = useState('100');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [editing, setEditing] = useState<MealEntry | null>(null);
  const [editServings, setEditServings] = useState('1');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [foodsError, setFoodsError] = useState(false);

  const totals = useMemo(() => entries.reduce((sum, entry) => ({
    calories: sum.calories + entry.calories, protein: sum.protein + entry.protein_g,
    carbs: sum.carbs + entry.carbs_g, fat: sum.fat + entry.fat_g, sugar: sum.sugar + entry.sugar_g,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0 }), [entries]);
  const grouped = useMemo(() => MEALS.map((meal) => ({ ...meal, entries: entries.filter((entry) => entry.meal_type === meal.key) })), [entries]);
  
  const nutritionPreview = useMemo(() => {
    if (!selectedFood) return null;
    const amount = Number(grams);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const factor = amount / 100;
    return {
      calories: Math.round(selectedFood.calories_per_100g * factor),
      protein: Number((selectedFood.protein_per_100g * factor).toFixed(1)),
      carbs: Number((selectedFood.carbs_per_100g * factor).toFixed(1)),
      fat: Number((selectedFood.fat_per_100g * factor).toFixed(1)),
      sugar: Number((selectedFood.sugar_per_100g * factor).toFixed(1)),
    };
  }, [selectedFood, grams]);

  useEffect(() => {
    let active = true;
    setBusy(true);
    api.getMeals(selectedDate).then((data) => active && setEntries(data)).catch(() => active && setStatus('Could not load this day.')).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [selectedDate]);
  useEffect(() => {
    setFoodsLoading(true);
    setFoodsError(false);
    setSelectedFood(null);
    const timer = window.setTimeout(() => {
      api.getFoods(query).then(setFoods).catch(() => { setFoods([]); setFoodsError(true); }).finally(() => setFoodsLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const foodImage = (food: FoodItem) => {
    const image = food.category === 'Fruits'
      ? 'photo-1610832958506-aa56368176cf'
      : food.category === 'Vegetables'
        ? 'photo-1540420773420-3366772f4999'
        : food.category === 'Dairy'
          ? 'photo-1628088062854-d1870b4553da'
          : food.category === 'Non-Veg'
            ? 'photo-1604503468506-a8da13d82791'
            : food.category === 'Dal & Curry'
              ? 'photo-1601050690597-df0568f70950'
              : 'photo-1512621776951-a57141f2eefd';
    return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=96&h=96&q=80&fm=png`;
  };

  const shiftDate = (days: number) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    setSelectedDate(isoDate(date));
  };
  const addFood = async (foodToAdd: FoodItem) => {
    const amount = Number(grams);
    if (!Number.isFinite(amount) || amount <= 0) { setStatus('Enter a quantity greater than zero.'); return; }
    setBusy(true);
    try {
      const entry = await api.addFood({ date: selectedDate, meal_type: mealType, food_item_id: foodToAdd.id, grams: amount });
      setEntries((current) => [...current, entry]); setStatus(`${entry.name} added to ${mealType}.`);
    } catch { setStatus('Could not add this food.'); } finally { setBusy(false); }
  };
  const saveEdit = async () => {
    if (!editing) return;
    const servings = Number(editServings);
    if (!Number.isFinite(servings) || servings <= 0) { setStatus('Servings must be greater than zero.'); return; }
    try {
      const updated = await api.updateMeal(editing.id, servings);
      setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry)); setEditing(null); setStatus(`${updated.name} updated.`);
    } catch { setStatus('Could not update this food.'); }
  };
  const removeEntry = async (entry: MealEntry) => {
    if (!window.confirm(`Delete ${entry.name}?`)) return;
    try { await api.deleteMeal(entry.id); setEntries((current) => current.filter((item) => item.id !== entry.id)); setStatus(`${entry.name} deleted.`); }
    catch { setStatus('Could not delete this food.'); }
  };

  return <div className="log-root">
    <header className="log-navbar"><button type="button" className="log-back-btn" onClick={() => navigate('/dashboard')} aria-label="Back to dashboard"><ChevronLeft size={18} /></button><div className="log-navbar-title"><h1>Food log</h1><p>Everything you eat, in one place</p></div></header>
    <main className="log-content">
      <section className="log-date-bar" aria-label="Selected date"><button type="button" className="log-icon-btn" onClick={() => shiftDate(-1)} aria-label="Previous day"><ChevronLeft size={18} /></button><div><p className="log-date-label">{selectedDate === today ? 'Today' : 'Selected day'}</p><h2>{formatDate(selectedDate)}</h2></div><button type="button" className="log-icon-btn" onClick={() => shiftDate(1)} aria-label="Next day"><ChevronRight size={18} /></button>{selectedDate !== today && <button type="button" className="log-today-btn" onClick={() => setSelectedDate(today)}>Today</button>}</section>
      <section className="log-total-grid" aria-label="Daily totals">{([['calories', 'Calories', 'kcal'], ['protein', 'Protein', 'g'], ['carbs', 'Carbs', 'g'], ['fat', 'Fat', 'g'], ['sugar', 'Sugar', 'g']] as const).map(([key, label, unit]) => <div className="log-total" key={key}><span>{label}</span><strong>{Math.round(totals[key])}</strong><small>{unit}</small></div>)}</section>
      {status && <div className="log-status log-status--success" role="status">{status}</div>}
      <section className="log-add-panel" aria-labelledby="add-food-heading"><div className="log-panel-heading"><div><p className="log-kicker">Add something</p><h2 id="add-food-heading">Build your day</h2></div><Plus size={20} /></div><div className="log-add-controls"><label className="log-field">Meal<select value={mealType} onChange={(event) => setMealType(event.target.value as MealKey)}>{MEALS.map((meal) => <option key={meal.key} value={meal.key}>{meal.label}</option>)}</select></label><label className="log-field">Quantity (g)<input type="number" min="1" value={grams} onChange={(event) => setGrams(event.target.value)} /></label><label className="log-field log-search-field">Search food<div className="log-search-wrap"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Indian foods, fruits, vegetables..." /></div></label></div>{nutritionPreview && selectedFood && (<div className="log-nutrition-preview"><p className="log-preview-label">Nutrition for {selectedFood.name} ({grams}g):</p><div className="log-preview-values"><span>{nutritionPreview.calories} kcal</span><span>P {nutritionPreview.protein}g</span><span>C {nutritionPreview.carbs}g</span><span>F {nutritionPreview.fat}g</span><span>S {nutritionPreview.sugar}g</span></div><button type="button" className="log-add-btn" onClick={() => { selectedFood && addFood(selectedFood); setSelectedFood(null); }} disabled={busy}>Add to {mealType}</button></div>)}<div className={`log-food-results${query.trim() ? ' is-drawer-open' : ''}`} role="listbox" aria-label="Food search results">{foodsLoading ? <p className="log-empty">Loading foods...</p> : foodsError ? <p className="log-empty">Food search is unavailable. Check that the backend is running and you are signed in.</p> : foods.length ? foods.map((food) => <div className="log-food-result" key={food.id} onClick={() => setSelectedFood(food)} style={{cursor: 'pointer'}}><img className="log-food-image" src={foodImage(food)} alt="" loading="lazy" /><span><strong>{food.name}</strong><small>{food.category} · {food.calories_per_100g} kcal · P {food.protein_per_100g}g · C {food.carbs_per_100g}g · F {food.fat_per_100g}g · S {food.sugar_per_100g}g per 100g</small></span><button type="button" className="log-food-plus" onClick={(e) => { e.stopPropagation(); addFood(food); setSelectedFood(null); }} disabled={busy} aria-label={`Add ${food.name} to ${mealType}`}><Plus size={18} /></button></div>) : query.trim() ? <p className="log-empty">No foods found for “{query}”.</p> : null}</div></section>
      <section className="log-meal-list">{grouped.map((meal) => <article className="log-meal-section" key={meal.key}><div className="log-meal-heading"><div><h2>{meal.label}</h2><span>{meal.entries.reduce((sum, entry) => sum + entry.calories, 0)} kcal</span></div><button type="button" className="log-small-add" onClick={() => { setMealType(meal.key); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Plus size={15} /> Add food</button></div>{meal.entries.length === 0 ? <p className="log-empty">No foods logged yet.</p> : <div className="log-entry-list">{meal.entries.map((entry) => <div className="log-entry" key={entry.id}><div className="log-entry-main"><strong>{entry.name}</strong><span>{entry.servings.toFixed(2)} serving{entry.servings === 1 ? '' : 's'} · {entry.calories} kcal</span></div><div className="log-entry-macros">P {entry.protein_g.toFixed(1)} · C {entry.carbs_g.toFixed(1)} · F {entry.fat_g.toFixed(1)} · S {entry.sugar_g.toFixed(1)}</div><div className="log-entry-actions"><button type="button" onClick={() => { setEditing(entry); setEditServings(String(entry.servings)); }} aria-label={`Edit ${entry.name}`}><Pencil size={15} /></button><button type="button" onClick={() => removeEntry(entry)} aria-label={`Delete ${entry.name}`}><Trash2 size={15} /></button></div></div>)}</div>}</article>)}</section>
      {editing && <div className="log-modal-backdrop"><div className="log-modal" role="dialog" aria-modal="true" aria-labelledby="edit-food-heading"><button type="button" className="log-modal-close" onClick={() => setEditing(null)} aria-label="Close"><X size={18} /></button><p className="log-kicker">Edit entry</p><h2 id="edit-food-heading">{editing.name}</h2><p>Change servings to recalculate nutrition totals.</p><label className="log-field">Servings<input type="number" min="0.01" step="0.01" value={editServings} onChange={(event) => setEditServings(event.target.value)} /></label><button type="button" className="log-add-btn log-add-btn--wide" onClick={saveEdit}>Save changes</button></div></div>}
    </main>
  </div>;
}
