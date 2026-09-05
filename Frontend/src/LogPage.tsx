import { useEffect, useRef, useState } from 'react';
import { Search, PenLine, ScanLine, ArrowLeftRight, Flame, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './log.css';

type MealKey = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
type SubTab = 'search' | 'scan' | 'manual' | 'move';

interface FoodItem {
  id: number;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  sugar_per_100g: number;
}

const MEAL_TABS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'dinner', label: 'Dinner' },
];

// TODO: point this at your actual API base (env var, proxy config, etc.)
const API_BASE = '/api/logs';

// TODO: replace with however AuthContext actually exposes the token
function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token'); // adjust to your real auth storage
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function LogPage() {
  const navigate = useNavigate();
  const [activeMeal, setActiveMeal] = useState<MealKey>('breakfast');
  const [activeTab, setActiveTab] = useState<SubTab>('search');

  // ---- Search state ----
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [expandedFoodId, setExpandedFoodId] = useState<number | null>(null);
  const [grams, setGrams] = useState('100');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Manual entry state ----
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ---- Live search, debounced ----
  useEffect(() => {
    if (activeTab !== 'search') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_BASE}/foods/?q=${encodeURIComponent(query.trim())}`, {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const data: FoodItem[] = await res.json();
        setResults(data);
      } catch (err) {
        console.error(err);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeTab]);

  const showStatus = (text: string, kind: 'success' | 'error') => {
    setStatusMsg({ text, kind });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleAddFromCatalog = async (food: FoodItem) => {
    const gramsNum = parseFloat(grams);
    if (Number.isNaN(gramsNum) || gramsNum <= 0) {
      showStatus('Enter a valid quantity in grams.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/meals/from-food/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ food_item_id: food.id, grams: gramsNum, meal_type: activeMeal }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed (${res.status})`);
      }
      showStatus(`Added ${food.name} to ${activeMeal}.`, 'success');
      setExpandedFoodId(null);
      setGrams('100');
      setQuery('');
      setResults([]);
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Something went wrong.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualName.trim() || !manualCalories.trim()) {
      showStatus('Name and calories are required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/meals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          meal_type: activeMeal,
          name: manualName.trim(),
          calories: Math.round(parseFloat(manualCalories) || 0),
          protein_g: parseFloat(manualProtein) || 0,
          carbs_g: parseFloat(manualCarbs) || 0,
          fat_g: parseFloat(manualFat) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Failed (${res.status})`);
      }
      showStatus(`Added ${manualName.trim()} to ${activeMeal}.`, 'success');
      setManualName('');
      setManualCalories('');
      setManualProtein('');
      setManualCarbs('');
      setManualFat('');
    } catch (err) {
      showStatus(err instanceof Error ? err.message : 'Something went wrong.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="log-root">
      <header className="log-navbar">
        <button
          type="button"
          className="log-back-btn"
          onClick={() => navigate('/dashboard')}
          aria-label="Back to dashboard"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="log-navbar-title">
          <h1>Log food</h1>
          <p>Search, scan or enter it yourself</p>
        </div>
      </header>

      <main className="log-content">
        <section aria-labelledby="log-meal-heading">
          <h2 id="log-meal-heading" className="log-section-label">Meal</h2>
          <div className="log-meal-tabs" role="tablist" aria-label="Meal">
            {MEAL_TABS.map((m) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={activeMeal === m.key}
                className={`log-meal-tab${activeMeal === m.key ? ' is-active' : ''}`}
                onClick={() => setActiveMeal(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <div className="log-subtabs" role="tablist" aria-label="Log method">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'search'}
            className={`log-subtab${activeTab === 'search' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Search size={15} /> Search
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'scan'}
            className="log-subtab is-disabled"
            disabled
            title="Coming soon"
          >
            <ScanLine size={15} /> Scan
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manual'}
            className={`log-subtab${activeTab === 'manual' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <PenLine size={15} /> Manual
          </button>
          <button
            type="button"
            role="tab"
            className="log-subtab is-disabled"
            disabled
            title="Coming soon"
          >
            <ArrowLeftRight size={15} /> Move
          </button>
        </div>

        {statusMsg && (
          <div className={`log-status log-status--${statusMsg.kind}`} role="status">
            {statusMsg.text}
          </div>
        )}

        {activeTab === 'search' && (
          <section aria-label="Search foods">
            <input
              type="text"
              className="log-search-input"
              placeholder="Try 'roti', 'dal', 'idli', 'chai'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            {searching && <p className="log-search-hint">Searching…</p>}
            {!searching && query.trim() && results.length === 0 && (
              <p className="log-search-hint">No matches — try Manual entry instead.</p>
            )}

            <ul className="log-results">
              {results.map((food) => (
                <li key={food.id} className="log-result-card">
                  <button
                    type="button"
                    className="log-result-row"
                    onClick={() => setExpandedFoodId(expandedFoodId === food.id ? null : food.id)}
                    aria-expanded={expandedFoodId === food.id}
                  >
                    <span className="log-result-icon" aria-hidden="true">
                      <Flame size={15} />
                    </span>
                    <span className="log-result-body">
                      <span className="log-result-name">{food.name}</span>
                      <span className="log-result-meta">
                        {food.category} · {Math.round(food.calories_per_100g)} kcal / 100g
                      </span>
                    </span>
                  </button>

                  {expandedFoodId === food.id && (
                    <div className="log-result-expand">
                      <label className="log-grams-label">
                        Quantity (g)
                        <input
                          type="number"
                          inputMode="decimal"
                          className="log-grams-input"
                          value={grams}
                          onChange={(e) => setGrams(e.target.value)}
                          min={1}
                        />
                      </label>
                      <button
                        type="button"
                        className="log-add-btn"
                        onClick={() => handleAddFromCatalog(food)}
                        disabled={submitting}
                      >
                        Add to {activeMeal}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'manual' && (
          <section className="log-manual-form" aria-label="Manual entry">
            <label className="log-field">
              Name
              <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Homemade sandwich" />
            </label>
            <div className="log-manual-grid">
              <label className="log-field">
                Calories
                <input type="number" inputMode="numeric" value={manualCalories} onChange={(e) => setManualCalories(e.target.value)} placeholder="kcal" />
              </label>
              <label className="log-field">
                Protein (g)
                <input type="number" inputMode="decimal" value={manualProtein} onChange={(e) => setManualProtein(e.target.value)} placeholder="0" />
              </label>
              <label className="log-field">
                Carbs (g)
                <input type="number" inputMode="decimal" value={manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} placeholder="0" />
              </label>
              <label className="log-field">
                Fat (g)
                <input type="number" inputMode="decimal" value={manualFat} onChange={(e) => setManualFat(e.target.value)} placeholder="0" />
              </label>
            </div>
            <button type="button" className="log-add-btn log-add-btn--wide" onClick={handleManualSubmit} disabled={submitting}>
              Add to {activeMeal}
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
