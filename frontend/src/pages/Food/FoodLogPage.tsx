import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Meal, FoodItem, FoodSearchResult, MealType } from '../../types';

export default function FoodLogPage() {
  const [showForm, setShowForm] = useState(false);
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [items, setItems] = useState<FoodItem[]>([{ foodName: '', portionGrams: 100, calories: 0, carbsG: 0, proteinG: 0, fatG: 0, fiberG: 0 }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: mealsData } = useQuery<{ meals: Meal[] }>({
    queryKey: ['meals'],
    queryFn: async () => (await api.get('/food/meals?limit=20')).data,
  });

  const { data: triggers } = useQuery<{ triggers: any[] }>({
    queryKey: ['food-triggers'],
    queryFn: async () => (await api.get('/food/triggers')).data,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/food/meals', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['food-triggers'] });
      setShowForm(false);
      setItems([{ foodName: '', portionGrams: 100, calories: 0, carbsG: 0, proteinG: 0, fatG: 0, fiberG: 0 }]);
      setNotes('');
    },
  });

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      try {
        const result = await api.get(`/food/search?q=${encodeURIComponent(query)}`);
        setSearchResults(result.data.foods);
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const addFoodFromSearch = (food: FoodSearchResult) => {
    const newItem: FoodItem = {
      foodId: food.id,
      foodName: food.name,
      portionGrams: 100,
      calories: food.calories_per_100g,
      carbsG: food.carbs_g,
      proteinG: food.protein_g,
      fatG: food.fat_g,
      fiberG: food.fiber_g,
      giIndex: food.gi_index,
    };
    setItems(prev => [...prev.filter(i => i.foodName), newItem]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.foodName);
    if (validItems.length === 0) return;

    createMutation.mutate({
      mealType,
      loggedAt: new Date().toISOString(),
      notes: notes || undefined,
      items: validItems,
    });
  };

  const getImpactColor = (impact?: string) => {
    if (impact === 'high') return 'badge-critical';
    if (impact === 'moderate') return 'badge-medium';
    return 'badge-low';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Food Log 🍽️</h1>
          <p className="text-text-secondary mt-1">Track meals and understand your glucose triggers</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + Log Meal
        </button>
      </div>

      {/* Glucose Triggers */}
      {triggers?.triggers && triggers.triggers.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-3">⚡ Your Glucose Triggers</h3>
          <p className="text-sm text-text-secondary mb-4">Foods associated with higher post-meal glucose readings</p>
          <div className="flex flex-wrap gap-2">
            {triggers.triggers.map((t: any, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-danger-500/15 text-danger-400 text-sm font-medium">
                {t.food_name} · {t.avg_post_meal_glucose} mg/dL avg
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Log Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-text-primary">Log a Meal</h3>
          
          {/* Meal Type */}
          <div className="flex flex-wrap gap-2">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all
                  ${mealType === type 
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' 
                    : 'bg-surface-700 text-text-secondary hover:bg-surface-600'
                  }`}
              >
                {type === 'breakfast' ? '🌅' : type === 'lunch' ? '☀️' : type === 'dinner' ? '🌙' : '🍎'} {type}
              </button>
            ))}
          </div>

          {/* Food Search */}
          <div className="relative">
            <label className="block text-sm text-text-secondary mb-1.5">Search Food Database</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="input-field"
              placeholder="Search for food (e.g., rice, chicken, salad...)"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface-700 border border-surface-500 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => addFoodFromSearch(food)}
                    className="w-full text-left px-4 py-2.5 hover:bg-surface-600 transition-colors border-b border-surface-600 last:border-0"
                  >
                    <p className="text-sm font-medium text-text-primary">{food.name}</p>
                    <p className="text-xs text-text-muted">
                      {food.calories_per_100g} cal · {food.carbs_g}g carbs · {food.protein_g}g protein per 100g
                      {food.gi_index ? ` · GI: ${food.gi_index}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Food Items */}
          <div className="space-y-3">
            <label className="block text-sm text-text-secondary">Food Items</label>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 bg-surface-700/50 rounded-xl">
                <input
                  className="input-field col-span-2 md:col-span-2"
                  placeholder="Food name"
                  value={item.foodName}
                  onChange={(e) => updateItem(idx, 'foodName', e.target.value)}
                  required
                />
                <input
                  className="input-field"
                  type="number"
                  placeholder="Grams"
                  value={item.portionGrams || ''}
                  onChange={(e) => updateItem(idx, 'portionGrams', parseFloat(e.target.value))}
                />
                <input
                  className="input-field"
                  type="number"
                  placeholder="Carbs (g)"
                  value={item.carbsG || ''}
                  onChange={(e) => updateItem(idx, 'carbsG', parseFloat(e.target.value))}
                />
                <input
                  className="input-field"
                  type="number"
                  placeholder="Calories"
                  value={item.calories || ''}
                  onChange={(e) => updateItem(idx, 'calories', parseFloat(e.target.value))}
                />
                <button type="button" onClick={() => removeItem(idx)} className="text-danger-400 hover:text-danger-300 text-sm">
                  ✕ Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems(prev => [...prev, { foodName: '', portionGrams: 100, calories: 0, carbsG: 0, proteinG: 0, fatG: 0, fiberG: 0 }])}
              className="text-sm text-brand-400 hover:text-brand-300"
            >
              + Add another item
            </button>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              placeholder="How did this meal make you feel?"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : 'Log Meal'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Meal History */}
      {mealsData?.meals && mealsData.meals.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-text-primary">Meal History</h3>
          {mealsData.meals.map((meal) => (
            <div key={meal.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">
                      {meal.meal_type === 'breakfast' ? '🌅' : meal.meal_type === 'lunch' ? '☀️' : meal.meal_type === 'dinner' ? '🌙' : '🍎'}
                    </span>
                    <h4 className="font-semibold text-text-primary capitalize">{meal.meal_type}</h4>
                    <span className="text-xs text-text-muted">
                      {new Date(meal.logged_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-text-secondary mt-2">
                    <span>{meal.total_calories} cal</span>
                    <span>{meal.total_carbs_g}g carbs</span>
                    <span>{meal.total_protein_g}g protein</span>
                    <span>{meal.total_fat_g}g fat</span>
                  </div>
                </div>
                {meal.ai_analysis && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getImpactColor(meal.ai_analysis.glucoseImpact)}`}>
                    {meal.ai_analysis.glucoseImpact} impact
                  </span>
                )}
              </div>
              
              {/* AI Analysis */}
              {meal.ai_analysis && (
                <div className="mt-3 pt-3 border-t border-surface-700">
                  <p className="text-xs text-text-muted mb-1">🤖 AI Analysis</p>
                  {meal.ai_analysis.insights?.slice(0, 2).map((insight, i) => (
                    <p key={i} className="text-sm text-text-secondary">• {insight}</p>
                  ))}
                  {meal.ai_analysis.recommendations?.slice(0, 1).map((rec, i) => (
                    <p key={i} className="text-sm text-health-400 mt-1">💡 {rec}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
