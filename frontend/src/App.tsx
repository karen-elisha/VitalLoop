import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

// Layouts
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';

// Auth Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';

// App Pages
import DashboardPage from './pages/Dashboard/DashboardPage';
import GlucoseTrackingPage from './pages/Glucose/GlucoseTrackingPage';
import FoodLogPage from './pages/Food/FoodLogPage';
import BreathingPage from './pages/Breathing/BreathingPage';
import WeightTrackingPage from './pages/Weight/WeightTrackingPage';
import AIChatPage from './pages/Coach/AIChatPage';
import AlertsPage from './pages/Alerts/AlertsPage';
import ProfilePage from './pages/Profile/ProfilePage';
import ProviderDashboard from './pages/Provider/ProviderDashboard';
import InstitutionDashboard from './pages/Institution/InstitutionDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
            } />
            <Route path="/register" element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
            } />
          </Route>
          
          {/* App Routes */}
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/glucose" element={<GlucoseTrackingPage />} />
            <Route path="/food" element={<FoodLogPage />} />
            <Route path="/breathing" element={<BreathingPage />} />
            <Route path="/weight" element={<WeightTrackingPage />} />
            <Route path="/coach" element={<AIChatPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/provider" element={<ProviderDashboard />} />
            <Route path="/institution" element={<InstitutionDashboard />} />
          </Route>
          
          {/* Redirect root */}
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
