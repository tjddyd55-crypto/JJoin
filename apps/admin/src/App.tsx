import { Navigate, Route, Routes } from 'react-router-dom';
import { RedirectIfAuthenticated, RequireAuth } from './lib/auth';
import { AdminLayout } from './layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { JoinsPage } from './pages/JoinsPage';
import { JoinDetailPage } from './pages/JoinDetailPage';
import { CoinSupplyPage } from './pages/CoinSupplyPage';
import { CoinIssuanceDetailPage } from './pages/CoinIssuanceDetailPage';
import { CoinUserPage } from './pages/CoinUserPage';
import { DisputesPage } from './pages/DisputesPage';
import { DisputeDetailPage } from './pages/DisputeDetailPage';
import { VenuesPage } from './pages/VenuesPage';
import { VenueDetailPage } from './pages/VenueDetailPage';
import { AuditPage } from './pages/AuditPage';
import { FuturePage } from './pages/FuturePage';
import { MembershipsPage } from './pages/MembershipsPage';

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/:userId" element={<MemberDetailPage />} />
        <Route path="joins" element={<JoinsPage />} />
        <Route path="joins/:joinId" element={<JoinDetailPage />} />
        <Route path="coin" element={<CoinSupplyPage />} />
        <Route path="coin/issuances/:issuanceId" element={<CoinIssuanceDetailPage />} />
        <Route path="coin/users/:userId" element={<CoinUserPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="disputes/:disputeId" element={<DisputeDetailPage />} />
        <Route path="venues" element={<VenuesPage />} />
        <Route path="venues/:venueId" element={<VenueDetailPage />} />
        <Route path="ops" element={<FuturePage />} />
        <Route path="memberships" element={<MembershipsPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
