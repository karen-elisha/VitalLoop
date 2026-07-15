import { useQuery } from '@tanstack/react-query';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import api from '../../services/api';

export default function InstitutionDashboard() {
  const { data } = useQuery<any>({
    queryKey: ['population-analytics'],
    queryFn: async () => (await api.get('/analytics/population')).data,
  });

  const riskColors: Record<string, string> = {
    low: '#00dc5a',
    medium: '#f59e0b',
    high: '#fb923c',
    critical: '#ef4444',
  };

  const riskData = data?.riskDistribution?.map((r: any) => ({
    name: r.risk_level.charAt(0).toUpperCase() + r.risk_level.slice(1),
    value: parseInt(r.count),
    color: riskColors[r.risk_level] || '#64748b',
  })) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Institution Analytics 🏥</h1>
        <p className="text-text-secondary mt-1">Population-level health metrics and risk stratification</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-brand-400">{data?.users?.total_users || 0}</p>
          <p className="text-sm text-text-muted mt-1">Total Users</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-health-400">{data?.users?.patients || 0}</p>
          <p className="text-sm text-text-muted mt-1">Patients</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-purple-400">{data?.users?.providers || 0}</p>
          <p className="text-sm text-text-muted mt-1">Providers</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-text-primary">
            {data?.glucose?.population_avg_glucose || '—'}
          </p>
          <p className="text-sm text-text-muted mt-1">Pop. Avg Glucose</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-4">Risk Stratification (7 days)</h3>
          {riskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f1629', border: '1px solid #243054', borderRadius: '12px', color: '#f1f5f9' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-muted">
              No risk data available yet.
            </div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {riskData.map((r: any) => (
              <div key={r.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-3 h-3 rounded-full" style={{ background: r.color }} />
                {r.name}: {r.value}
              </div>
            ))}
          </div>
        </div>

        {/* Users with Readings */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-4">Program Engagement</h3>
          <div className="space-y-6 pt-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Users with glucose readings (30d)</span>
                <span className="text-text-primary font-semibold">{data?.glucose?.users_with_readings || 0}</span>
              </div>
              <div className="w-full bg-surface-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-brand-500 to-health-500"
                  style={{ width: `${data?.users?.total_users ? Math.min(100, (parseInt(data.glucose.users_with_readings || 0) / parseInt(data.users.total_users)) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="glass-card p-4 bg-gradient-to-br from-brand-500/10 to-health-500/10">
              <h4 className="text-sm font-semibold text-text-primary mb-2">Key Insights</h4>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li>• Population average glucose: {data?.glucose?.population_avg_glucose || '—'} mg/dL</li>
                <li>• {data?.glucose?.users_with_readings || 0} active monitoring users</li>
                <li>• {riskData.find((r: any) => r.name === 'Critical')?.value || 0} critical-risk patients need attention</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
