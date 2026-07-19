import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'individual',
  });
  const [validationError, setValidationError] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        role: form.role,
      });
      navigate('/dashboard');
    } catch {
      // Error handled by store
    }
  };

  const displayError = validationError || error;

  return (
    <div
      className="glass-card p-8"
      style={{ boxShadow: '0 8px 48px rgba(15, 23, 42, 0.10), 0 2px 8px rgba(15, 23, 42, 0.06)' }}
    >
      <h2 className="text-2xl font-bold mb-1" style={{ color: '#0f172a' }}>Create Account</h2>
      <p className="text-sm mb-6" style={{ color: '#64748b' }}>
        Start your health intelligence journey
      </p>

      {displayError && (
        <div
          className="mb-4 p-3 rounded-xl text-sm flex items-start justify-between"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.20)',
            color: '#b91c1c',
          }}
        >
          <span>{displayError}</span>
          <button
            onClick={() => { clearError(); setValidationError(''); }}
            className="ml-2 transition-opacity hover:opacity-60"
            style={{ color: '#f87171' }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="reg-first"
              className="block text-sm font-medium mb-1.5"
              style={{ color: '#374151' }}
            >
              First Name
            </label>
            <input
              id="reg-first"
              name="firstName"
              type="text"
              value={form.firstName}
              onChange={handleChange}
              className="input-field"
              placeholder="Jane"
              required
            />
          </div>
          <div>
            <label
              htmlFor="reg-last"
              className="block text-sm font-medium mb-1.5"
              style={{ color: '#374151' }}
            >
              Last Name
            </label>
            <input
              id="reg-last"
              name="lastName"
              type="text"
              value={form.lastName}
              onChange={handleChange}
              className="input-field"
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="reg-email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#374151' }}
          >
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="input-field"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label
            htmlFor="reg-role"
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#374151' }}
          >
            I am a
          </label>
          <select
            id="reg-role"
            name="role"
            value={form.role}
            onChange={handleChange}
            className="input-field cursor-pointer"
          >
            <option value="individual">Individual / Patient</option>
            <option value="provider">Healthcare Provider</option>
            <option value="institution_admin">Institution Admin</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="reg-password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#374151' }}
          >
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="input-field"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label
            htmlFor="reg-confirm"
            className="block text-sm font-medium mb-1.5"
            style={{ color: '#374151' }}
          >
            Confirm Password
          </label>
          <input
            id="reg-confirm"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="input-field"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={isLoading} className="btn-primary w-full py-3">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account...
            </span>
          ) : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: '#94a3b8' }}>
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold transition-colors"
          style={{ color: '#2563eb' }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
