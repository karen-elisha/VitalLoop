import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { BreathingSession, BreathingStats, SessionType } from '../../types';

const SESSION_CONFIGS: Record<SessionType, {
  name: string; icon: string; description: string; color: string;
  inhale: number; hold1: number; exhale: number; hold2: number;
  defaultDuration: number;
}> = {
  paced: {
    name: 'Paced Breathing',
    icon: '🌊',
    description: 'Slow, rhythmic breathing to calm your nervous system',
    color: 'from-blue-500/20 to-cyan-500/20',
    inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    defaultDuration: 300,
  },
  box: {
    name: 'Box Breathing',
    icon: '⬜',
    description: 'Equal intervals of inhale, hold, exhale, hold',
    color: 'from-purple-500/20 to-indigo-500/20',
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    defaultDuration: 240,
  },
  post_meal: {
    name: 'Post-Meal Breathing',
    icon: '🍽️',
    description: 'After high-carb meals to support glucose metabolism',
    color: 'from-green-500/20 to-emerald-500/20',
    inhale: 4, hold1: 2, exhale: 6, hold2: 2,
    defaultDuration: 300,
  },
  sleep_prep: {
    name: 'Sleep Preparation',
    icon: '🌙',
    description: 'Deep, slow breathing to prepare for restful sleep',
    color: 'from-indigo-500/20 to-violet-500/20',
    inhale: 4, hold1: 7, exhale: 8, hold2: 0,
    defaultDuration: 300,
  },
};

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

export default function BreathingPage() {
  const [selectedType, setSelectedType] = useState<SessionType | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>('inhale');
  const [phaseTime, setPhaseTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [duration, setDuration] = useState(300);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<BreathingStats>({
    queryKey: ['breathing-stats'],
    queryFn: async () => (await api.get('/breathing/sessions/stats')).data,
  });

  const { data: sessionsData } = useQuery<{ sessions: BreathingSession[] }>({
    queryKey: ['breathing-sessions'],
    queryFn: async () => (await api.get('/breathing/sessions?limit=10')).data,
  });

  const startMutation = useMutation({
    mutationFn: async (data: { sessionType: SessionType; durationSeconds: number }) => {
      return (await api.post('/breathing/sessions', data)).data;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.id);
      setIsActive(true);
      startBreathing();
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return (await api.put(`/breathing/sessions/${id}/complete`, { status })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breathing-stats'] });
      queryClient.invalidateQueries({ queryKey: ['breathing-sessions'] });
    },
  });

  const startBreathing = () => {
    if (!selectedType) return;
    const config = SESSION_CONFIGS[selectedType];
    
    setCurrentPhase('inhale');
    setPhaseTime(config.inhale);
    setTotalTime(0);

    const phases: { phase: Phase; dur: number }[] = [
      { phase: 'inhale', dur: config.inhale },
      ...(config.hold1 > 0 ? [{ phase: 'hold1' as Phase, dur: config.hold1 }] : []),
      { phase: 'exhale', dur: config.exhale },
      ...(config.hold2 > 0 ? [{ phase: 'hold2' as Phase, dur: config.hold2 }] : []),
    ];

    let phaseIdx = 0;
    let phaseCountdown = phases[0].dur;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed++;
      phaseCountdown--;

      setTotalTime(elapsed);
      setPhaseTime(phaseCountdown);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsActive(false);
        if (currentSessionId) {
          completeMutation.mutate({ id: currentSessionId, status: 'completed' });
        }
        return;
      }

      if (phaseCountdown <= 0) {
        phaseIdx = (phaseIdx + 1) % phases.length;
        phaseCountdown = phases[phaseIdx].dur;
        setCurrentPhase(phases[phaseIdx].phase);
        setPhaseTime(phaseCountdown);
      }
    }, 1000);

    // Store interval for cleanup
    (window as any).__breathingInterval = interval;
  };

  const handleStart = () => {
    if (!selectedType) return;
    startMutation.mutate({ 
      sessionType: selectedType, 
      durationSeconds: duration 
    });
  };

  const handleStop = () => {
    clearInterval((window as any).__breathingInterval);
    setIsActive(false);
    if (currentSessionId) {
      completeMutation.mutate({ id: currentSessionId, status: 'cancelled' });
    }
  };

  const phaseLabel: Record<Phase, string> = {
    inhale: 'Breathe In',
    hold1: 'Hold',
    exhale: 'Breathe Out',
    hold2: 'Hold',
  };

  const phaseScale: Record<Phase, string> = {
    inhale: 'scale-110',
    hold1: 'scale-110',
    exhale: 'scale-90',
    hold2: 'scale-90',
  };

  if (isActive && selectedType) {
    const config = SESSION_CONFIGS[selectedType];
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 py-8">
        <div>
          <p className="text-text-secondary text-sm">{config.name}</p>
          <p className="text-text-muted text-xs mt-1">{Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}</p>
        </div>

        {/* Breathing Circle */}
        <div className="flex items-center justify-center" style={{ minHeight: '280px' }}>
          <div className={`
            w-52 h-52 rounded-full flex items-center justify-center
            transition-transform duration-1000 ease-in-out
            ${phaseScale[currentPhase]}
            ${currentPhase === 'inhale' || currentPhase === 'hold1' 
              ? 'bg-gradient-to-br from-brand-500/30 to-health-500/30 shadow-[0_0_60px_rgba(40,165,255,0.3)]' 
              : 'bg-gradient-to-br from-purple-500/20 to-brand-500/20 shadow-[0_0_40px_rgba(139,92,246,0.2)]'
            }
          `}>
            <div className={`
              w-36 h-36 rounded-full flex items-center justify-center
              transition-transform duration-1000 ease-in-out
              ${phaseScale[currentPhase]}
              ${currentPhase === 'inhale' || currentPhase === 'hold1' 
                ? 'bg-gradient-to-br from-brand-500/40 to-health-500/40' 
                : 'bg-gradient-to-br from-purple-500/30 to-brand-500/30'
              }
            `}>
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">{phaseTime}</p>
                <p className="text-sm font-medium text-text-secondary mt-1">{phaseLabel[currentPhase]}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-700 rounded-full h-2">
          <div 
            className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-health-500 transition-all duration-1000"
            style={{ width: `${(totalTime / duration) * 100}%` }}
          />
        </div>

        <button onClick={handleStop} className="btn-secondary px-8">
          Stop Session
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Breathing Engine 🫁</h1>
        <p className="text-text-secondary mt-1">Guided breathing sessions for stress management and glucose regulation</p>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-brand-400">{stats.totalCompleted}</p>
            <p className="text-xs text-text-muted mt-1">Total Sessions</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-health-400">{stats.thisWeek}</p>
            <p className="text-xs text-text-muted mt-1">This Week</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-purple-400">{stats.totalMinutes}</p>
            <p className="text-xs text-text-muted mt-1">Total Minutes</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.streakDays}</p>
            <p className="text-xs text-text-muted mt-1">Day Streak 🔥</p>
          </div>
        </div>
      )}

      {/* Session Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.entries(SESSION_CONFIGS) as [SessionType, typeof SESSION_CONFIGS[SessionType]][]).map(([type, config]) => (
          <button
            key={type}
            onClick={() => { setSelectedType(type); setDuration(config.defaultDuration); }}
            className={`glass-card p-6 text-left bg-gradient-to-br ${config.color} transition-all
              ${selectedType === type ? 'ring-2 ring-brand-500 border-brand-500/40' : ''}
            `}
          >
            <span className="text-3xl">{config.icon}</span>
            <h3 className="text-lg font-semibold text-text-primary mt-3">{config.name}</h3>
            <p className="text-sm text-text-secondary mt-1">{config.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
              <span>Inhale {config.inhale}s</span>
              {config.hold1 > 0 && <span>Hold {config.hold1}s</span>}
              <span>Exhale {config.exhale}s</span>
              {config.hold2 > 0 && <span>Hold {config.hold2}s</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Duration & Start */}
      {selectedType && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold text-text-primary">Session Duration</h3>
          <div className="flex flex-wrap gap-3">
            {[120, 180, 300, 480, 600].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${duration === d 
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/40' 
                    : 'bg-surface-700 text-text-secondary hover:bg-surface-600'
                  }
                `}
              >
                {Math.floor(d / 60)} min
              </button>
            ))}
          </div>
          <button onClick={handleStart} disabled={startMutation.isPending} className="btn-health w-full py-3 text-lg">
            {startMutation.isPending ? 'Starting...' : `Start ${SESSION_CONFIGS[selectedType].name}`}
          </button>
        </div>
      )}

      {/* Recent Sessions */}
      {sessionsData?.sessions && sessionsData.sessions.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-text-primary mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {sessionsData.sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{SESSION_CONFIGS[session.session_type]?.icon || '🫁'}</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {SESSION_CONFIGS[session.session_type]?.name || session.session_type}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(session.started_at).toLocaleDateString()} · {Math.floor(session.duration_seconds / 60)} min
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  session.completion_status === 'completed' ? 'badge-low' : 
                  session.completion_status === 'cancelled' ? 'badge-medium' : 'badge-high'
                }`}>
                  {session.completion_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
