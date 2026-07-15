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
    <div className="glass-card p-8">
      <h2 className="text-2xl font-bold text-text-primary mb-2">Create Account</h2>
      <p className="text-text-secondary text-sm mb-6">Start your health intelligence journey</p>

      {displayError && (
        <div className="mb-4 p-3 rounded-lg bg-danger-500/15 border border-danger-500/30 text-danger-400 text-sm">
          {displayError}
          <button onClick={() => { clearError(); setValidationError(''); }} className="float-right text-danger-400/60 hover:text-danger-400">✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-first" className="block text-sm font-medium text-text-secondary mb-1.5">First Name</label>
            <input id="reg-first" name="firstName" type="text" value={form.firstName} onChange={handleChange} className="input-field" placeholder="John" required />
          </div>
          <div>
            <label htmlFor="reg-last" className="block text-sm font-medium text-text-secondary mb-1.5">Last Name</label>
            <input id="reg-last" name="lastName" type="text" value={form.lastName} onChange={handleChange} className="input-field" placeholder="Doe" required />
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
          <input id="reg-email" name="email" type="email" value={form.email} onChange={handleChange} className="input-field" placeholder="you@example.com" required autoComplete="email" />
        </div>

        <div>
          <label htmlFor="reg-role" className="block text-sm font-medium text-text-secondary mb-1.5">I am a</label>
          <select id="reg-role" name="role" value={form.role} onChange={handleChange} className="input-field cursor-pointer">
            <option value="individual">Individual / Patient</option>
            <option value="provider">Healthcare Provider</option>
            <option value="institution_admin">Institution Admin</option>
          </select>
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
          <input id="reg-password" name="password" type="password" value={form.password} onChange={handleChange} className="input-field" placeholder="••••••••" required autoComplete="new-password" />
        </div>

        <div>
          <label htmlFor="reg-confirm" className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
          <input id="reg-confirm" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className="input-field" placeholder="••••••••" required autoComplete="new-password" />
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

      <p className="mt-6 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
