import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '../config/navigation';

export function Sidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        JJOIN <span>HQ</span>
      </div>
      <nav className="admin-nav" aria-label="관리자 메뉴">
        {NAV_ITEMS.map((item) => {
          if (!item.enabled) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `admin-nav-item is-disabled${isActive ? ' is-active' : ''}`
                }
              >
                {item.label}
                <span className="admin-nav-badge">준비 중</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `admin-nav-item${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
