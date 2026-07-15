import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Alert } from '../../types';

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery<{ alerts: Alert[]; unreadCount: number }>({
    queryKey: ['alerts'],
    queryFn: async () => (await api.get('/alerts?limit=50')).data,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => (await api.put(`/alerts/${id}/read`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => (await api.put('/alerts/read-all')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const severityIcon: Record<string, string> = {
    info: 'ℹ️', warning: '⚠️', critical: '🚨',
  };

  const typeIcon: Record<string, string> = {
    high_risk: '🔴', trend: '📈', medication_reminder: '💊',
    adherence: '✅', coaching_nudge: '💡', breathing_reminder: '🫁', weekly_summary: '📋',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Alerts & Notifications 🔔</h1>
          <p className="text-text-secondary mt-1">
            {data?.unreadCount ? `${data.unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {data?.unreadCount && data.unreadCount > 0 && (
          <button onClick={() => markAllReadMutation.mutate()} className="btn-secondary text-sm">
            Mark all as read
          </button>
        )}
      </div>

      {data?.alerts && data.alerts.length > 0 ? (
        <div className="space-y-3">
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => !alert.read && markReadMutation.mutate(alert.id)}
              className={`glass-card p-4 cursor-pointer transition-all ${
                !alert.read ? 'border-l-4 border-l-brand-500' : 'opacity-70'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{typeIcon[alert.type] || severityIcon[alert.severity]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold text-sm ${!alert.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {alert.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs badge-${
                      alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'medium' : 'low'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{alert.message}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                {!alert.read && (
                  <div className="w-2 h-2 rounded-full bg-brand-500 mt-2 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <span className="text-5xl mb-4 block">🔔</span>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No alerts yet</h3>
          <p className="text-text-secondary">You'll see health alerts and coaching nudges here.</p>
        </div>
      )}
    </div>
  );
}
