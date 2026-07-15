import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    language: user?.language || 'en',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    heightCm: user?.heightCm || '',
    timezone: user?.timezone || '',
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => (await api.put('/users/profile', data)).data,
    onSuccess: () => {
      fetchUser();
      setEditing(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      heightCm: form.heightCm ? parseFloat(String(form.heightCm)) : undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-text-primary">Profile Settings</h1>

      <div className="glass-card p-6">
        {/* Avatar & Info */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-700">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-health-500 flex items-center justify-center text-white text-xl font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{user?.firstName} {user?.lastName}</h2>
            <p className="text-sm text-text-secondary">{user?.email}</p>
            <p className="text-xs text-text-muted capitalize mt-0.5">{user?.role?.replace('_', ' ')} · Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</p>
          </div>
          <button onClick={() => setEditing(!editing)} className="ml-auto btn-secondary text-sm">
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">First Name</label>
                <input className="input-field" value={form.firstName} onChange={(e) => setForm(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Last Name</label>
                <input className="input-field" value={form.lastName} onChange={(e) => setForm(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Language</label>
                <select className="input-field" value={form.language} onChange={(e) => setForm(p => ({ ...p, language: e.target.value }))}>
                  <option value="en">English</option>
                  <option value="ar">العربية (Arabic)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Gender</label>
                <select className="input-field" value={form.gender} onChange={(e) => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Date of Birth</label>
                <input type="date" className="input-field" value={form.dateOfBirth} onChange={(e) => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Height (cm)</label>
                <input type="number" className="input-field" value={form.heightCm} onChange={(e) => setForm(p => ({ ...p, heightCm: e.target.value }))} placeholder="175" />
              </div>
            </div>
            <button type="submit" disabled={updateMutation.isPending} className="btn-primary">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-y-4">
            {[
              ['Language', user?.language === 'ar' ? 'العربية' : 'English'],
              ['Gender', user?.gender || 'Not set'],
              ['Date of Birth', user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set'],
              ['Height', user?.heightCm ? `${user.heightCm} cm` : 'Not set'],
              ['Timezone', user?.timezone || 'UTC'],
              ['Role', user?.role?.replace('_', ' ') || ''],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm text-text-primary capitalize">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
