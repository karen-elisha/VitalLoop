import { create } from 'zustand';
import api from '../services/api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
  
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
  
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', data);
      const { user, accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },
  
  fetchUser: async () => {
    if (!localStorage.getItem('accessToken')) {
      set({ isAuthenticated: false });
      return;
    }
    
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },
  
  clearError: () => set({ error: null }),
}));
