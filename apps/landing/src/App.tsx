import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from './LandingPage';
import { AdminApp, AdminLoginPage } from './admin/AdminApp';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
