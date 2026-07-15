import { Outlet, NavLink, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  const allNavItems = [
    ...navItems,
    ...(user?.role === 'provider' || user?.role === 'institution_admin' ? providerItems : []),
    ...(user?.role === 'institution_admin' ? institutionItems : []),
  ];

  return (
    <div className="min-h-screen flex bg-surface-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-surface-800/90 backdrop-blur-xl border-r border-glass-border
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">VitalLoop</h1>
              <p className="text-xs text-text-muted">Health Intelligence</p>
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
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? 'bg-brand-500/15 text-brand-400 shadow-sm border border-brand-500/20' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-700/50'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-glass-border">
          <NavLink
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm
              transition-all duration-200
              ${isActive 
                ? 'bg-brand-500/15 text-brand-400' 
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-700/50'
              }
            `}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-health-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-text-muted truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </NavLink>
          <button
            onClick={logout}
            className="w-full mt-2 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-text-muted hover:text-danger-400 hover:bg-danger-500/10 transition-all duration-200"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-800/90 backdrop-blur-xl border-b border-glass-border px-4 py-3 flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-700 transition-colors"
          >
            <svg className="w-6 h-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
