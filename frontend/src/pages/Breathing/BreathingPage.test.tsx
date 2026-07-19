import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BreathingPage from './BreathingPage';

import { vi } from 'vitest';

// Mock the API and auth store so we can render isolated
vi.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn().mockResolvedValue({ data: null }),
    post: vi.fn().mockResolvedValue({ data: null }),
  }
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'mock-user' } }))
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('BreathingPage', () => {
  it('renders the breathing engine header', () => {
    renderWithProviders(<BreathingPage />);
    expect(screen.getByText(/Breathing Engine/i)).toBeInTheDocument();
  });

  it('renders all four session types', () => {
    renderWithProviders(<BreathingPage />);
    expect(screen.getByText(/Paced Breathing/i)).toBeInTheDocument();
    expect(screen.getByText(/Box Breathing/i)).toBeInTheDocument();
    expect(screen.getByText(/Post-Meal Breathing/i)).toBeInTheDocument();
    expect(screen.getByText(/Sleep Preparation/i)).toBeInTheDocument();
  });
});
