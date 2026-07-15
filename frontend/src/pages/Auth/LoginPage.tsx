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
    <div className="glass-card p-8">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Welcome back</h2>
      <p className="text-text-secondary text-sm mb-6">Sign in to your VitalLoop account</p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger-500/15 border border-danger-500/30 text-danger-400 text-sm">
          {error}
          <button onClick={clearError} className="float-right text-danger-400/60 hover:text-danger-400">✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
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
          <label htmlFor="login-password" className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
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

      <p className="mt-6 text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Create one
        </Link>
      </p>
    </div>
  );
}
