import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AdminEntry } from './AdminEntry';
import { AdminLoginPage } from './admin/AdminApp';
import { PublicApp } from './PublicApp';

function AdminLoginEntry() {
  return (
    <BrowserRouter basename="/admin">
      <AdminLoginPage />
    </BrowserRouter>
  );
}
import './styles.css';

const { pathname } = window.location;
const isAdminLogin = pathname === '/admin/login';
const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminLogin ? (
      <AdminLoginEntry />
    ) : isAdminPath ? (
      <AdminEntry />
    ) : (
      <PublicApp />
    )}
  </StrictMode>,
);
