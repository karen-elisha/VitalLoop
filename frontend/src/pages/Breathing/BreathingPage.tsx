import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { BreathingSession, BreathingStats, SessionType } from '../../types';

const SESSION_CONFIGS: Record<SessionType, {
  name: string; icon: string; description: string;
  circleFrom: string; circleTo: string;
  glowColor: string; tagColor: string; tagBg: string;
  inhale: number; hold1: number; exhale: number; hold2: number;
  defaultDuration: number;
}> = {
  paced: {
    name: 'Paced Breathing',
    icon: '🌊',
    description: 'Slow, rhythmic breathing to calm your nervous system',
    circleFrom: 'rgba(59, 130, 246, 0.25)', circleTo: 'rgba(6, 182, 212, 0.20)',
    glowColor: 'rgba(59, 130, 246, 0.22)',
    tagColor: '#1d4ed8', tagBg: 'rgba(59, 130, 246, 0.10)',
    inhale: 4, hold1: 0, exhale: 6, hold2: 0,
    defaultDuration: 300,
  },
  box: {
    name: 'Box Breathing',
    icon: '⬜',
    description: 'Equal intervals of inhale, hold, exhale, hold',
    circleFrom: 'rgba(139, 92, 246, 0.25)', circleTo: 'rgba(99, 102, 241, 0.20)',
    glowColor: 'rgba(139, 92, 246, 0.22)',
    tagColor: '#6d28d9', tagBg: 'rgba(139, 92, 246, 0.10)',
    inhale: 4, hold1: 4, exhale: 4, hold2: 4,
    defaultDuration: 240,
  },
  post_meal: {
    name: 'Post-Meal Breathing',
    icon: '🍽️',
    description: 'After high-carb meals to support glucose metabolism',
    circleFrom: 'rgba(34, 197, 94, 0.25)', circleTo: 'rgba(16, 185, 129, 0.20)',
    glowColor: 'rgba(34, 197, 94, 0.22)',
    tagColor: '#15803d', tagBg: 'rgba(34, 197, 94, 0.10)',
    inhale: 4, hold1: 2, exhale: 6, hold2: 2,
    defaultDuration: 300,
  },
  sleep_prep: {
    name: 'Sleep Preparation',
    icon: '🌙',
    description: 'Deep, slow breathing to prepare for restful sleep',
    circleFrom: 'rgba(99, 102, 241, 0.25)', circleTo: 'rgba(168, 85, 247, 0.20)',
    glowColor: 'rgba(99, 102, 241, 0.22)',
    tagColor: '#4f46e5', tagBg: 'rgba(99, 102, 241, 0.10)',
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
  const [, setCurrentSessionId] = useState<string | null>(null);
  const [duration, setDuration] = useState(300);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

    intervalRef.current = setInterval(() => {
      elapsed++;
      phaseCountdown--;

      setTotalTime(elapsed);
      setPhaseTime(phaseCountdown);

      if (elapsed >= duration) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsActive(false);
        setCurrentSessionId((id) => {
          if (id) completeMutation.mutate({ id, status: 'completed' });
          return null;
        });
        return;
      }

      if (phaseCountdown <= 0) {
        phaseIdx = (phaseIdx + 1) % phases.length;
        phaseCountdown = phases[phaseIdx].dur;
        setCurrentPhase(phases[phaseIdx].phase);
        setPhaseTime(phaseCountdown);
      }
    }, 1000);
  };

  const handleStart = () => {
    if (!selectedType) return;
    startMutation.mutate({
      sessionType: selectedType,
      durationSeconds: duration,
    });
  };

  const handleStop = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsActive(false);
    setCurrentSessionId((id) => {
      if (id) completeMutation.mutate({ id, status: 'cancelled' });
      return null;
    });
  };

  const phaseLabel: Record<Phase, string> = {
    inhale: 'Breathe In',
    hold1: 'Hold',
    exhale: 'Breathe Out',
    hold2: 'Hold',
  };

  // Active session view
  if (isActive && selectedType) {
    const config = SESSION_CONFIGS[selectedType];
    const isExpanding = currentPhase === 'inhale' || currentPhase === 'hold1';
    const progress = (totalTime / duration) * 100;

    return (
      <div className="max-w-lg mx-auto text-center space-y-8 py-8">
        {/* Session name + timer */}
        <div>
          <p className="text-sm font-medium" style={{ color: '#64748b' }}>{config.name}</p>
          <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
            {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}
            {' '}/{' '}
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </p>
        </div>

        {/* Breathing Circle */}
        <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
          {/* Outer ring */}
          <div
            className="rounded-full flex items-center justify-center transition-all ease-in-out"
            style={{
              width: isExpanding ? '228px' : '196px',
              height: isExpanding ? '228px' : '196px',
              background: `radial-gradient(circle at 40% 40%, ${config.circleFrom}, ${config.circleTo})`,
              boxShadow: `0 0 60px ${config.glowColor}, 0 0 120px ${config.glowColor.replace('0.22', '0.10')}`,
              transition: 'all 1s ease-in-out',
              border: `2px solid ${config.circleFrom.replace('0.25', '0.4')}`,
            }}
          >
            {/* Inner ring */}
            <div
              className="rounded-full flex items-center justify-center transition-all ease-in-out"
              style={{
                width: isExpanding ? '152px' : '128px',
                height: isExpanding ? '152px' : '128px',
                background: `radial-gradient(circle at 40% 40%, ${config.circleFrom.replace('0.25', '0.40')}, ${config.circleTo.replace('0.20', '0.35')})`,
                transition: 'all 1s ease-in-out',
              }}
            >
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: '#0f172a' }}>{phaseTime}</p>
                <p className="text-xs font-semibold mt-0.5 tracking-wide" style={{ color: '#475569' }}>
                  {phaseLabel[currentPhase]}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full rounded-full h-2" style={{ background: 'rgba(148, 163, 184, 0.20)' }}>
          <div
            className="h-2 rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${config.circleFrom.replace('0.25', '0.8')}, ${config.circleTo.replace('0.20', '0.7')})`,
            }}
          />
        </div>

        <button onClick={handleStop} className="btn-secondary px-10">
          Stop Session
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#0f172a' }}>
          Breathing Engine 🫁
        </h1>
        <p className="mt-1" style={{ color: '#64748b' }}>
          Guided breathing sessions for stress management and glucose regulation
        </p>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: stats.totalCompleted, label: 'Total Sessions', color: '#2563eb', bg: 'rgba(59, 130, 246, 0.08)' },
            { value: stats.thisWeek, label: 'This Week', color: '#15803d', bg: 'rgba(34, 197, 94, 0.08)' },
            { value: stats.totalMinutes, label: 'Total Minutes', color: '#6d28d9', bg: 'rgba(139, 92, 246, 0.08)' },
            { value: `${stats.streakDays} 🔥`, label: 'Day Streak', color: '#b45309', bg: 'rgba(245, 158, 11, 0.08)' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Session Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.entries(SESSION_CONFIGS) as [SessionType, typeof SESSION_CONFIGS[SessionType]][]).map(([type, config]) => (
          <button
            key={type}
            onClick={() => { setSelectedType(type); setDuration(config.defaultDuration); }}
            className="glass-card p-6 text-left transition-all"
            style={selectedType === type ? {
              border: '2px solid rgba(59, 130, 246, 0.35)',
              boxShadow: '0 4px 24px rgba(59, 130, 246, 0.14)',
              background: 'rgba(255, 255, 255, 0.92)',
            } : {}}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-3xl">{config.icon}</span>
              {selectedType === type && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: config.tagBg, color: config.tagColor }}
                >
                  Selected
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: '#0f172a' }}>{config.name}</h3>
            <p className="text-sm mb-3" style={{ color: '#64748b' }}>{config.description}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: `Inhale ${config.inhale}s` },
                ...(config.hold1 > 0 ? [{ label: `Hold ${config.hold1}s` }] : []),
                { label: `Exhale ${config.exhale}s` },
                ...(config.hold2 > 0 ? [{ label: `Hold ${config.hold2}s` }] : []),
              ].map((item, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#475569' }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Duration & Start */}
      {selectedType && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-semibold" style={{ color: '#0f172a' }}>Session Duration</h3>
          <div className="flex flex-wrap gap-3">
            {[120, 180, 300, 480, 600].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={duration === d
                  ? {
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563eb',
                      border: '1.5px solid rgba(59, 130, 246, 0.25)',
                    }
                  : {
                      background: 'rgba(255, 255, 255, 0.70)',
                      color: '#64748b',
                      border: '1.5px solid rgba(148, 163, 184, 0.25)',
                    }
                }
              >
                {Math.floor(d / 60)} min
              </button>
            ))}
          </div>
          <button
            onClick={handleStart}
            disabled={startMutation.isPending}
            className="btn-health w-full py-3 text-base"
          >
            {startMutation.isPending
              ? 'Starting...'
              : `Start ${SESSION_CONFIGS[selectedType].name}`}
          </button>
        </div>
      )}

      {/* Recent Sessions */}
      {sessionsData?.sessions && sessionsData.sessions.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4" style={{ color: '#0f172a' }}>Recent Sessions</h3>
          <div className="space-y-3">
            {sessionsData.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {SESSION_CONFIGS[session.session_type]?.icon || '🫁'}
                  </span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#0f172a' }}>
                      {SESSION_CONFIGS[session.session_type]?.name || session.session_type}
                    </p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {new Date(session.started_at).toLocaleDateString()} · {Math.floor(session.duration_seconds / 60)} min
                    </p>
                  </div>
                </div>
                <span className={`badge-${
                  session.completion_status === 'completed' ? 'low' :
                  session.completion_status === 'cancelled' ? 'medium' : 'high'
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
