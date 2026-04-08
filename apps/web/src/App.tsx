import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import { ToastProviderWrapper } from './components/ui/Toast';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import NewMeeting from './pages/NewMeeting';
import Settings from './pages/Settings';

// Layout
import DashboardLayout from './components/layouts/DashboardLayout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const onboardingComplete = localStorage.getItem('onboarding_complete');
  if (!onboardingComplete) {
    return <Navigate to="/onboarding" />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ToastProviderWrapper>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <PrivateRoute>
              <Onboarding />
            </PrivateRoute>
          }
        />

        {/* Protected routes - require onboarding */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <OnboardingCheck>
                <DashboardLayout />
              </OnboardingCheck>
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="meetings/new" element={<NewMeeting />} />
          <Route path="meetings/:id" element={<MeetingDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </ToastProviderWrapper>
  );
}
