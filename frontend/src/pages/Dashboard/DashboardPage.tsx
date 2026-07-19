import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';
import type { DashboardSummary, Prediction } from '../../types';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/analytics/summary')).data,
  });

  const { data: prediction } = useQuery<Prediction | null>({
    queryKey: ['latest-prediction'],
    queryFn: async () => (await api.get('/predictions/latest')).data,
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#0f172a' }}>
            {greeting()}, {user?.firstName} 👋
          </h1>
          <p className="mt-1" style={{ color: '#64748b' }}>
            Here's your health overview for the week
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/glucose" className="btn-primary text-sm">
            + Log Glucose
          </Link>
          <Link to="/food" className="btn-secondary text-sm">
            + Log Meal
          </Link>
        </div>
      </div>

      {/* Risk Score Card */}
      {prediction && (
        <div
          className="glass-card p-6"
          style={{
            borderLeft: `4px solid ${
              prediction.risk_level === 'critical' ? '#ef4444' :
              prediction.risk_level === 'high' ? '#f97316' :
              prediction.risk_level === 'medium' ? '#f59e0b' :
              '#22c55e'
            }`,
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm mb-1" style={{ color: '#64748b' }}>Current Risk Assessment</p>
              <div className="flex items-center gap-3">
                <span className={`badge-${prediction.risk_level}`}>
                  {prediction.risk_level.toUpperCase()}
                </span>
                <span className="text-2xl font-bold" style={{ color: '#0f172a' }}>
                  {prediction.risk_score}/100
                </span>
              </div>
              <p className="mt-2 max-w-lg text-sm" style={{ color: '#64748b' }}>
                {prediction.explanation}
              </p>
            </div>
            <Link to="/coach" className="btn-secondary text-sm whitespace-nowrap">
              Talk to AI Coach →
            </Link>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="🩸"
          label="Avg Glucose"
          value={summary?.glucose.average ? `${summary.glucose.average} mg/dL` : '—'}
          subtitle={`${summary?.glucose.readingsCount || 0} readings`}
          link="/glucose"
          accent="#3b82f6"
          accentLight="rgba(59, 130, 246, 0.08)"
        />
        <StatCard
          icon="🍽️"
          label="Meals Logged"
          value={String(summary?.meals.count || 0)}
          subtitle="this week"
          link="/food"
          accent="#22c55e"
          accentLight="rgba(34, 197, 94, 0.08)"
        />
        <StatCard
          icon="🫁"
          label="Breathing"
          value={String(summary?.breathing.completedSessions || 0)}
          subtitle="sessions this week"
          link="/breathing"
          accent="#8b5cf6"
          accentLight="rgba(139, 92, 246, 0.08)"
        />
        <StatCard
          icon="⚖️"
          label="Weight"
          value={summary?.weight.latest ? `${summary.weight.latest} kg` : '—'}
          subtitle="latest"
          link="/weight"
          accent="#f59e0b"
          accentLight="rgba(245, 158, 11, 0.08)"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          icon="🫁"
          title="Start Breathing Session"
          description="Guided breathing to reduce stress and manage glucose levels"
          link="/breathing"
          gradientFrom="rgba(139, 92, 246, 0.08)"
          gradientTo="rgba(59, 130, 246, 0.06)"
          iconBg="rgba(139, 92, 246, 0.12)"
        />
        <QuickAction
          icon="🤖"
          title="Chat with AI Coach"
          description="Get personalized health guidance and evidence-based answers"
          link="/coach"
          gradientFrom="rgba(59, 130, 246, 0.08)"
          gradientTo="rgba(34, 197, 94, 0.06)"
          iconBg="rgba(59, 130, 246, 0.12)"
        />
        <QuickAction
          icon="📊"
          title="View Glucose Trends"
          description="Analyze your glucose patterns and spot key insights"
          link="/glucose"
          gradientFrom="rgba(34, 197, 94, 0.08)"
          gradientTo="rgba(20, 184, 166, 0.06)"
          iconBg="rgba(34, 197, 94, 0.12)"
        />
      </div>

      {/* Alerts Preview */}
      {summary && summary.alerts.unread > 0 && (
        <Link
          to="/alerts"
          className="glass-card p-4 flex items-center gap-4 group"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.20)' }}
          >
            <span className="text-lg">🔔</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold" style={{ color: '#0f172a' }}>
              You have {summary.alerts.unread} unread alert{summary.alerts.unread > 1 ? 's' : ''}
            </p>
            <p className="text-sm" style={{ color: '#64748b' }}>
              Tap to view and manage your notifications
            </p>
          </div>
          <span className="transition-all duration-200 group-hover:translate-x-1" style={{ color: '#94a3b8', fontSize: '1.25rem' }}>→</span>
        </Link>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, subtitle, link, accent, accentLight,
}: {
  icon: string; label: string; value: string; subtitle: string; link: string;
  accent: string; accentLight: string;
}) {
  return (
    <Link to={link} className="glass-card p-5 block" style={{ textDecoration: 'none' }}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: accentLight, border: `1px solid ${accent}22` }}
        >
          {icon}
        </div>
        <span className="text-sm font-medium" style={{ color: '#64748b' }}>{label}</span>
      </div>
      <p className="text-2xl font-bold mb-1" style={{ color: '#0f172a' }}>{value}</p>
      <p className="text-xs" style={{ color: '#94a3b8' }}>{subtitle}</p>
      <div className="mt-3 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)`, opacity: 0.4 }} />
    </Link>
  );
}

function QuickAction({
  icon, title, description, link, gradientFrom, gradientTo, iconBg,
}: {
  icon: string; title: string; description: string; link: string;
  gradientFrom: string; gradientTo: string; iconBg: string;
}) {
  return (
    <Link
      to={link}
      className="glass-card p-6 block group"
      style={{
        background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo}), rgba(255,255,255,0.65)`,
        textDecoration: 'none',
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-1 transition-colors" style={{ color: '#0f172a' }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: '#64748b' }}>{description}</p>
    </Link>
  );
}
