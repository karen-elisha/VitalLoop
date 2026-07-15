import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import api from '../../services/api';
import type { GlucoseReading, GlucoseStats, GlucoseTrend, ReadingType } from '../../types';

export default function GlucoseTrackingPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    valueMgDl: '',
    readingType: 'fasting' as ReadingType,
    notes: '',
  });
  const [days, setDays] = useState(30);
  const queryClient = useQueryClient();

  const { data: readingsData } = useQuery<{ readings: GlucoseReading[]; total: number }>({
    queryKey: ['glucose-readings'],
    queryFn: async () => (await api.get('/glucose/readings?limit=50')).data,
  });

  const { data: stats } = useQuery<GlucoseStats>({
    queryKey: ['glucose-stats', days],
    queryFn: async () => (await api.get(`/glucose/stats?days=${days}`)).data,
  });

  const { data: trendsData } = useQuery<{ trends: GlucoseTrend[] }>({
    queryKey: ['glucose-trends', days],
    queryFn: async () => (await api.get(`/glucose/trends?days=${days}`)).data,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/glucose/readings', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glucose-readings'] });
      queryClient.invalidateQueries({ queryKey: ['glucose-stats'] });
      queryClient.invalidateQueries({ queryKey: ['glucose-trends'] });
      setShowForm(false);
      setFormData({ valueMgDl: '', readingType: 'fasting', notes: '' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      valueMgDl: parseFloat(formData.valueMgDl),
      readingType: formData.readingType,
      measuredAt: new Date().toISOString(),
      notes: formData.notes || undefined,
    });
  };

  const getGlucoseColor = (value: number) => {
    if (value < 70) return 'text-blue-400';
    if (value <= 100) return 'text-health-400';
    if (value <= 140) return 'text-alert-400';
    return 'text-danger-400';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Glucose Tracking 🩸</h1>
          <p className="text-text-secondary mt-1">Monitor your blood glucose levels and trends</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          + Log Reading
        </button>
      </div>

      {/* Log Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-text-primary">New Glucose Reading</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Glucose (mg/dL)</label>
              <input
                type="number"
                value={formData.valueMgDl}
                onChange={(e) => setFormData(prev => ({ ...prev, valueMgDl: e.target.value }))}
                className="input-field"
                placeholder="120"
                min="20" max="600" step="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Reading Type</label>
              <select
                value={formData.readingType}
                onChange={(e) => setFormData(prev => ({ ...prev, readingType: e.target.value as ReadingType }))}
                className="input-field"
              >
                <option value="fasting">Fasting</option>
                <option value="pre_meal">Pre-Meal</option>
                <option value="post_meal">Post-Meal</option>
                <option value="random">Random</option>
                <option value="bedtime">Bedtime</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input-field"
                placeholder="Before breakfast..."
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? 'Saving...' : 'Save Reading'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${getGlucoseColor(stats.avg_glucose)}`}>
              {stats.avg_glucose || '—'}
            </p>
            <p className="text-xs text-text-muted mt-1">Average mg/dL</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-brand-400">{stats.estimated_a1c || '—'}%</p>
            <p className="text-xs text-text-muted mt-1">Est. A1C</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-health-400">{stats.time_in_range_pct || '—'}%</p>
            <p className="text-xs text-text-muted mt-1">Time in Range</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{stats.total_readings || 0}</p>
            <p className="text-xs text-text-muted mt-1">Readings</p>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Glucose Trends</h3>
          <div className="flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${days === d ? 'bg-brand-500/20 text-brand-400' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        
        {trendsData?.trends && trendsData.trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={trendsData.trends}>
              <defs>
                <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#28a5ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#28a5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2541" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={[50, 250]} />
              <Tooltip
                contentStyle={{ background: '#0f1629', border: '1px solid #243054', borderRadius: '12px', color: '#f1f5f9' }}
                labelFormatter={(v) => new Date(v).toLocaleDateString()}
              />
              <ReferenceLine y={70} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Low', fill: '#64748b', fontSize: 11 }} />
              <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'Normal', fill: '#64748b', fontSize: 11 }} />
              <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'High', fill: '#64748b', fontSize: 11 }} />
              <Area dataKey="avg_glucose" fill="url(#glucoseGrad)" stroke="none" />
              <Line type="monotone" dataKey="avg_glucose" stroke="#28a5ff" strokeWidth={2} dot={{ fill: '#28a5ff', r: 4 }} name="Average" />
              <Line type="monotone" dataKey="max_glucose" stroke="#f87171" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Max" />
              <Line type="monotone" dataKey="min_glucose" stroke="#60a5fa" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Min" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted">
            <p>No glucose data yet. Log your first reading to see trends.</p>
          </div>
        )}
      </div>

      {/* Recent Readings */}
      {readingsData?.readings && readingsData.readings.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-4">Recent Readings</h3>
          <div className="space-y-2">
            {readingsData.readings.slice(0, 15).map((reading) => (
              <div key={reading.id} className="flex items-center justify-between py-2.5 border-b border-surface-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-xl font-bold ${getGlucoseColor(reading.value_mg_dl)}`}>
                    {reading.value_mg_dl}
                  </span>
                  <span className="text-xs text-text-muted">mg/dL</span>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-700 text-text-secondary capitalize">
                    {reading.reading_type.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-text-muted mt-1">
                    {new Date(reading.measured_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
