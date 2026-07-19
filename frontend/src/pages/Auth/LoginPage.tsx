import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // Error handled by store
    }
  };

  return (
    <div
      className="glass-card p-8"
      style={{ boxShadow: '0 8px 48px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)' }}
    >
      <h2 className="text-2xl font-bold mb-1" style={{ color: '#0f172a' }}>Welcome back</h2>
      <p className="text-sm mb-6" style={{ color: '#64748b' }}>
        Sign in to your VitalLoop account
      </p>

      {error && (
        <div
          className="mb-4 p-3 rounded-xl text-sm flex items-start justify-between"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.20)',
            color: '#b91c1c',
          }}
        >
          <span>{error}</span>
          <button
            onClick={clearError}
            className="ml-2 transition-opacity hover:opacity-60"
            style={{ color: '#f87171' }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#374151' }}
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#374151' }}
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: '#94a3b8' }}>
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-semibold transition-colors"
          style={{ color: '#2563eb' }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
