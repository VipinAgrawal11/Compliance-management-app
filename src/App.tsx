import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataProvider } from '@/contexts/DataContext';
import { OfflineProvider } from '@/contexts/OfflineContext';
import { Layout } from '@/components/layout/Layout';
import { FullPageSpinner } from '@/components/ui/Misc';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Clients } from '@/pages/Clients';
import { ClientDetail } from '@/pages/ClientDetail';
import { ComplianceCalendar } from '@/pages/ComplianceCalendar';
import { Audits } from '@/pages/Audits';
import { AuditDetail } from '@/pages/AuditDetail';
import { Documents } from '@/pages/Documents';
import { Reports } from '@/pages/Reports';
import { Employees } from '@/pages/Employees';
import { SettingsPage } from '@/pages/Settings';
import { Notifications } from '@/pages/Notifications';
import { Profile } from '@/pages/Profile';
import type { UserRole } from '@/types';

/** Gate that requires an authenticated session (and optionally a role). */
function RequireAuth({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <FullPageSpinner />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <DataProvider>
                    <Layout />
                  </DataProvider>
                </RequireAuth>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/calendar" element={<ComplianceCalendar />} />
              <Route path="/audits" element={<Audits />} />
              <Route path="/audits/:id" element={<AuditDetail />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/reports" element={<Reports />} />
              <Route
                path="/employees"
                element={
                  <RequireAuth roles={['partner']}>
                    <Employees />
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth roles={['partner']}>
                    <SettingsPage />
                  </RequireAuth>
                }
              />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
