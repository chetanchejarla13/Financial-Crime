import React from 'react';

export default function Sidebar({ currentRoute, onNavigate, user, onLogout }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      id: 'cases',
      label: 'Cases',
      icon: (
        <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v16H4z" />
          <path d="M4 9h16" />
          <path d="M9 20V9" />
        </svg>
      ),
    },
    {
      id: 'investigation',
      label: 'Investigation',
      icon: (
        <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </svg>
      ),
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="app-sidebar no-print">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="logo-shield">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <span className="logo-tag">FCIS</span>
        </div>
        <div className="sidebar-title-group">
          <div className="sidebar-title">Financial Crime</div>
          <div className="sidebar-subtitle">Investigation System</div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        <div className="sidebar-nav-label">Navigation</div>
        {navItems.map((item) => {
          const isActive = currentRoute === item.id || (item.id === 'cases' && currentRoute === 'case-details');
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-label">{item.label}</span>
              {isActive && <span className="active-pip" />}
            </button>
          );
        })}
      </nav>

      {/* User / Footer Section */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar" title="System Administrator">
            AD
          </div>
          <div className="user-details">
            <span className="user-name">System Admin</span>
            <span className="user-email" title={user?.email || 'admin@fcis.internal'}>
              {user?.email || 'admin@fcis.internal'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={onLogout}
          title="Sign out of investigation portal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
