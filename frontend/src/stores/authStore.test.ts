import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, error: null });
  });

  it('should initialize with default unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.error).toBeNull();
  });

  it('clearError should reset error state', () => {
    useAuthStore.setState({ error: 'Some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });

  it('logout should remove tokens and clear user', async () => {
    localStorage.setItem('accessToken', 'mock-token');
    useAuthStore.setState({ user: { id: '1', email: 'test@example.com', role: 'individual' } as any, isAuthenticated: true });

    await useAuthStore.getState().logout();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
