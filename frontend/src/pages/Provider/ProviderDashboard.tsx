import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function ProviderDashboard() {
  const { data } = useQuery<{ patients: any[] }>({
    queryKey: ['provider-patients'],
    queryFn: async () => (await api.get('/analytics/provider/patients')).data,
  });

  const getRiskColor = (risk: string) => {
    if (risk === 'critical') return 'badge-critical';
    if (risk === 'high') return 'badge-high';
    if (risk === 'medium') return 'badge-medium';
    return 'badge-low';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Provider Dashboard 👨‍⚕️</h1>
        <p className="text-text-secondary mt-1">Monitor your patients' health and risk levels</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-brand-400">{data?.patients?.length || 0}</p>
          <p className="text-xs text-text-muted mt-1">Active Patients</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-danger-400">
            {data?.patients?.filter((p: any) => ['high', 'critical'].includes(p.latest_risk)).length || 0}
          </p>
          <p className="text-xs text-text-muted mt-1">High Risk</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-alert-400">
            {data?.patients?.filter((p: any) => p.latest_risk === 'medium').length || 0}
          </p>
          <p className="text-xs text-text-muted mt-1">Medium Risk</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-health-400">
            {data?.patients?.filter((p: any) => p.latest_risk === 'low' || !p.latest_risk).length || 0}
          </p>
          <p className="text-xs text-text-muted mt-1">Low Risk</p>
        </div>
      </div>

      {/* Patient List */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-surface-700">
          <h3 className="font-semibold text-text-primary">Patient List</h3>
        </div>
        
        {data?.patients && data.patients.length > 0 ? (
          <div className="divide-y divide-surface-700">
            {data.patients.map((patient: any) => (
              <div key={patient.id} className="p-4 flex items-center justify-between hover:bg-surface-700/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                    {patient.first_name?.[0]}{patient.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{patient.first_name} {patient.last_name}</p>
                    <p className="text-xs text-text-muted">{patient.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">
                      {patient.avg_glucose_7d ? `${patient.avg_glucose_7d} mg/dL` : '—'}
                    </p>
                    <p className="text-xs text-text-muted">7-day avg glucose</p>
                  </div>
                  {patient.latest_risk && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(patient.latest_risk)}`}>
                      {patient.latest_risk}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <span className="text-5xl mb-4 block">👨‍⚕️</span>
            <h3 className="text-lg font-semibold text-text-primary mb-2">No patients yet</h3>
            <p className="text-text-secondary">Patients will appear here once they're linked to your account.</p>
          </div>
        )}
      </div>
    </div>
  );
}
