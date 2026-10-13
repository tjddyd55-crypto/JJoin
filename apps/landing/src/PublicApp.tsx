import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { PublicJoinPage } from './PublicJoinPage';

export function PublicApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/j/:shareSlug" element={<PublicJoinPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
