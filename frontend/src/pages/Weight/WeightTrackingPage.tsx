import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../../services/api';
import type { WeightEntry } from '../../types';

export default function WeightTrackingPage() {
  const [showForm, setShowForm] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [days, setDays] = useState(90);
  const queryClient = useQueryClient();

  const { data: entriesData } = useQuery<{ entries: WeightEntry[] }>({
    queryKey: ['weight-entries'],
    queryFn: async () => (await api.get('/weight/entries?limit=100')).data,
  });

  const { data: trendsData } = useQuery<{ trends: any[]; trend: string }>({
    queryKey: ['weight-trends', days],
    queryFn: async () => (await api.get(`/weight/trends?days=${days}`)).data,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/weight/entries', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-entries'] });
      queryClient.invalidateQueries({ queryKey: ['weight-trends'] });
      setShowForm(false);
      setWeightKg('');
      setNotes('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      weightKg: parseFloat(weightKg),
      measuredAt: new Date().toISOString(),
      notes: notes || undefined,
    });
  };

  const latest = entriesData?.entries?.[0];
  const oldest = entriesData?.entries?.[entriesData.entries.length - 1];
  const change = latest && oldest ? (parseFloat(String(latest.weight_kg)) - parseFloat(String(oldest.weight_kg))).toFixed(1) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Weight Management ⚖️</h1>
          <p className="text-text-secondary mt-1">Track your weight and identify behavioral correlations</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">+ Log Weight</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-text-primary">New Weight Entry</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Weight (kg)</label>
              <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                className="input-field" placeholder="75.5" min="20" max="500" step="0.1" required />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                className="input-field" placeholder="Morning weigh-in..." />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{latest ? `${latest.weight_kg}` : '—'}</p>
          <p className="text-xs text-text-muted mt-1">Current (kg)</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className={`text-2xl font-bold ${change && parseFloat(change) < 0 ? 'text-health-400' : change && parseFloat(change) > 0 ? 'text-alert-400' : 'text-text-primary'}`}>
            {change ? `${parseFloat(change) > 0 ? '+' : ''}${change}` : '—'}
          </p>
          <p className="text-xs text-text-muted mt-1">Change (kg)</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className={`text-2xl font-bold capitalize ${
            trendsData?.trend === 'losing' ? 'text-health-400' : 
            trendsData?.trend === 'gaining' ? 'text-alert-400' : 'text-brand-400'
          }`}>
            {trendsData?.trend || '—'}
          </p>
          <p className="text-xs text-text-muted mt-1">Trend</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{entriesData?.entries?.length || 0}</p>
          <p className="text-xs text-text-muted mt-1">Total Entries</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Weight Trend</h3>
          <div className="flex gap-2">
            {[30, 90, 180, 365].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${days === d ? 'bg-brand-500/20 text-brand-400' : 'text-text-muted hover:text-text-secondary'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        
        {trendsData?.trends && trendsData.trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendsData.trends}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: '#0f1629', border: '1px solid #243054', borderRadius: '12px', color: '#f1f5f9' }}
                labelFormatter={(v) => new Date(v).toLocaleDateString()} />
              <Area type="monotone" dataKey="avg_weight" stroke="#a855f7" fill="url(#weightGrad)" strokeWidth={2}
                dot={{ fill: '#a855f7', r: 4 }} name="Weight (kg)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            <p>No weight data yet. Log your first entry to see trends.</p>
          </div>
        )}
      </div>
    </div>
  );
}
