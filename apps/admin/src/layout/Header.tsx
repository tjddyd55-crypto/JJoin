import { useLocation } from 'react-router-dom';
import { findNavItem } from '../config/navigation';
import { useAuth } from '../lib/auth';

export function Header() {
  const { logout } = useAuth();
  const location = useLocation();
  const nav = findNavItem(location.pathname);

  return (
    <header className="admin-header">
      <div className="admin-header-title">{nav?.label ?? '관리자'}</div>
      <button type="button" className="btn-ghost" onClick={logout}>
        로그아웃
      </button>
    </header>
  );
}
