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

  const riskColors: Record<string, string> = {
    low: 'from-health-500 to-health-700',
    medium: 'from-alert-500 to-alert-600',
    high: 'from-orange-500 to-orange-700',
    critical: 'from-danger-500 to-danger-600',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
            {greeting()}, {user?.firstName} 👋
          </h1>
          <p className="text-text-secondary mt-1">Here's your health overview for the week</p>
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
        <div className={`glass-card p-6 border-l-4 ${
          prediction.risk_level === 'critical' ? 'border-l-danger-500' :
          prediction.risk_level === 'high' ? 'border-l-orange-500' :
          prediction.risk_level === 'medium' ? 'border-l-alert-500' :
          'border-l-health-500'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-text-secondary mb-1">Current Risk Assessment</p>
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold badge-${prediction.risk_level}`}>
                  {prediction.risk_level.toUpperCase()}
                </span>
                <span className="text-2xl font-bold text-text-primary">{prediction.risk_score}/100</span>
              </div>
              <p className="text-text-secondary text-sm mt-2 max-w-lg">{prediction.explanation}</p>
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
          color="brand"
        />
        <StatCard
          icon="🍽️"
          label="Meals Logged"
          value={String(summary?.meals.count || 0)}
          subtitle="this week"
          link="/food"
          color="health"
        />
        <StatCard
          icon="🫁"
          label="Breathing"
          value={String(summary?.breathing.completedSessions || 0)}
          subtitle="sessions this week"
          link="/breathing"
          color="purple"
        />
        <StatCard
          icon="⚖️"
          label="Weight"
          value={summary?.weight.latest ? `${summary.weight.latest} kg` : '—'}
          subtitle="latest"
          link="/weight"
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          icon="🫁"
          title="Start Breathing Session"
          description="Guided breathing to reduce stress and manage glucose"
          link="/breathing"
          gradient="from-purple-500/20 to-blue-500/20"
        />
        <QuickAction
          icon="🤖"
          title="Chat with AI Coach"
          description="Get personalized health guidance and answers"
          link="/coach"
          gradient="from-brand-500/20 to-health-500/20"
        />
        <QuickAction
          icon="📊"
          title="View Glucose Trends"
          description="Analyze your glucose patterns over time"
          link="/glucose"
          gradient="from-health-500/20 to-teal-500/20"
        />
      </div>

      {/* Alerts Preview */}
      {summary && summary.alerts.unread > 0 && (
        <Link to="/alerts" className="glass-card p-4 flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-xl bg-alert-500/20 flex items-center justify-center">
            <span className="text-lg">🔔</span>
          </div>
          <div className="flex-1">
            <p className="font-medium text-text-primary">
              You have {summary.alerts.unread} unread alert{summary.alerts.unread > 1 ? 's' : ''}
            </p>
            <p className="text-sm text-text-secondary">Tap to view and manage your notifications</p>
          </div>
          <span className="text-text-muted group-hover:text-brand-400 transition-colors">→</span>
        </Link>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, subtitle, link, color }: {
  icon: string; label: string; value: string; subtitle: string; link: string;
  color: string;
}) {
  const borderColor = color === 'brand' ? 'hover:border-brand-500/40' :
    color === 'health' ? 'hover:border-health-500/40' :
    color === 'purple' ? 'hover:border-purple-500/40' :
    'hover:border-amber-500/40';

  return (
    <Link to={link} className={`glass-card p-5 ${borderColor} transition-all group`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="text-sm text-text-secondary">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary group-hover:text-brand-400 transition-colors">{value}</p>
      <p className="text-xs text-text-muted mt-1">{subtitle}</p>
    </Link>
  );
}

function QuickAction({ icon, title, description, link, gradient }: {
  icon: string; title: string; description: string; link: string; gradient: string;
}) {
  return (
    <Link to={link} className={`glass-card p-5 bg-gradient-to-br ${gradient} group`}>
      <span className="text-3xl mb-3 block">{icon}</span>
      <h3 className="font-semibold text-text-primary group-hover:text-brand-400 transition-colors">{title}</h3>
      <p className="text-sm text-text-secondary mt-1">{description}</p>
    </Link>
  );
}
