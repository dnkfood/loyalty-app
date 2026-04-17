import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/login/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { UsersPage } from './pages/users/UsersPage';
import { UserDetailPage } from './pages/users/UserDetailPage';
import { CampaignsPage } from './pages/campaigns/CampaignsPage';
import { SmsLogsPage } from './pages/sms-logs/SmsLogsPage';
import { AuditLogPage } from './pages/audit/AuditLogPage';
import { StaffPage } from './pages/staff/StaffPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!hasHydrated) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="sms-logs" element={<SmsLogsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="staff" element={<StaffPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
