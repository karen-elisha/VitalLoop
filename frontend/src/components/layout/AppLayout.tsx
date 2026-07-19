import { Outlet, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/glucose', label: 'Glucose', icon: '🩸' },
  { path: '/food', label: 'Food Log', icon: '🍽️' },
  { path: '/breathing', label: 'Breathing', icon: '🫁' },
  { path: '/weight', label: 'Weight', icon: '⚖️' },
  { path: '/coach', label: 'AI Coach', icon: '🤖' },
  { path: '/alerts', label: 'Alerts', icon: '🔔' },
];

const providerItems = [
  { path: '/provider', label: 'Patients', icon: '👨‍⚕️' },
];

const institutionItems = [
  { path: '/institution', label: 'Analytics', icon: '🏥' },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const allNavItems = [
    ...navItems,
    ...(user?.role === 'provider' || user?.role === 'institution_admin' ? providerItems : []),
    ...(user?.role === 'institution_admin' ? institutionItems : []),
  ];

  return (
    <div className="min-h-screen flex" style={{
      background: 'linear-gradient(135deg, #eef4ff 0%, #f8fbff 45%, #f0fdf6 100%)',
      backgroundAttachment: 'fixed',
    }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — frosted white glass */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'rgba(255, 255, 255, 0.80)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(148, 163, 184, 0.18)',
          boxShadow: '4px 0 32px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* Logo */}
        <div className="p-5" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.14)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">VitalLoop</h1>
              <p className="text-xs" style={{ color: '#94a3b8' }}>Health Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {allNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
              style={({ isActive }) => isActive
                ? {
                    background: 'rgba(59, 130, 246, 0.09)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    color: '#2563eb',
                    boxShadow: '0 1px 4px rgba(59, 130, 246, 0.10)',
                  }
                : {
                    color: '#64748b',
                    border: '1px solid transparent',
                  }
              }
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'rgba(255, 255, 255, 0.65)';
                  el.style.color = '#0f172a';
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!el.getAttribute('aria-current')) {
                  el.style.background = '';
                  el.style.color = '#64748b';
                }
              }}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.14)' }}>
          <NavLink
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200"
            style={({ isActive }) => isActive
              ? {
                  background: 'rgba(59, 130, 246, 0.09)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                }
              : { border: '1px solid transparent' }
            }
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #22c55e)' }}
            >
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate" style={{ color: '#0f172a', fontSize: '0.875rem' }}>
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs truncate capitalize" style={{ color: '#94a3b8' }}>
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </NavLink>
          <button
            onClick={logout}
            className="w-full mt-1 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
            style={{ color: '#94a3b8' }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = 'rgba(239, 68, 68, 0.07)';
              el.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = '';
              el.style.color = '#94a3b8';
            }}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar (mobile) */}
        <header
          className="lg:hidden sticky top-0 z-30 px-4 py-3 flex items-center gap-4"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
            boxShadow: '0 2px 16px rgba(15, 23, 42, 0.05)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{ color: '#0f172a' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold gradient-text">VitalLoop</h1>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
