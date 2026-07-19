import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #eef4ff 0%, #f8fbff 45%, #f0fdf6 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            top: '15%', left: '-5%',
            width: '380px', height: '380px',
            background: 'rgba(59, 130, 246, 0.09)',
            animation: 'orb-drift 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            bottom: '15%', right: '-5%',
            width: '440px', height: '440px',
            background: 'rgba(34, 197, 94, 0.07)',
            animation: 'orb-drift 16s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute rounded-full blur-3xl"
          style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px', height: '600px',
            background: 'rgba(168, 85, 247, 0.04)',
            animation: 'orb-drift 20s ease-in-out infinite',
          }}
        />
        {/* Smaller accent orbs */}
        <div
          className="absolute rounded-full blur-2xl"
          style={{
            top: '30%', right: '20%',
            width: '160px', height: '160px',
            background: 'rgba(251, 191, 36, 0.08)',
            animation: 'orb-drift 9s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute rounded-full blur-2xl"
          style={{
            bottom: '30%', left: '20%',
            width: '200px', height: '200px',
            background: 'rgba(59, 130, 246, 0.07)',
            animation: 'orb-drift 13s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                width: '52px', height: '52px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                boxShadow: '0 6px 24px rgba(59, 130, 246, 0.35)',
              }}
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold gradient-text">VitalLoop</h1>
          </div>
          <p className="text-sm" style={{ color: '#64748b' }}>AI-Powered Digital Health Platform</p>
        </div>

        <Outlet />

        {/* Footer tagline */}
        <p className="text-center mt-6 text-xs" style={{ color: '#94a3b8' }}>
          Your health intelligence, continuously improving
        </p>
      </div>
    </div>
  );
}
