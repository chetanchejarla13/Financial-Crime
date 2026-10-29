import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetails from './pages/CaseDetails';
import Investigation from './pages/Investigation';
import Report from './pages/Report';
import api from './api';

export default function App() {
  const [user, setUser] = useState(() => api.auth.getUser());
  const [currentRoute, setCurrentRoute] = useState(() => {
    return api.auth.isAuthenticated() ? 'dashboard' : 'login';
  });
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ checked: false, online: false });

  // Periodically check Flask API status for real-time visibility
  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        await api.health.check();
        if (isMounted) setBackendStatus({ checked: true, online: true });
      } catch {
        if (isMounted) setBackendStatus({ checked: true, online: false });
      }
    }
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentRoute('dashboard');
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setSelectedCaseId(null);
    setCurrentRoute('login');
  };

  const getBreadcrumbTitle = () => {
    switch (currentRoute) {
      case 'dashboard':
        return 'Executive Overview';
      case 'cases':
        return 'Case Intake Repository';
      case 'case-details':
        return selectedCaseId ? `Case Dossier #${selectedCaseId}` : 'Case Details';
      case 'investigation':
        return 'AI-Assisted Investigation';
      case 'reports':
        return 'Evidentiary Reports';
      default:
        return 'Console';
    }
  };

  // If user is not authenticated, render auth views
  if (!user && currentRoute !== 'signup') {
    return (
      <div className="auth-layout">
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigate={(route) => setCurrentRoute(route)}
        />
      </div>
    );
  }

  if (!user && currentRoute === 'signup') {
    return (
      <div className="auth-layout">
        <Signup onNavigate={(route) => setCurrentRoute(route)} />
      </div>
    );
  }

  // Authenticated Admin portal view
  return (
    <div className="app-shell">
      {/* Dark Teal / Navy Left Sidebar */}
      <Sidebar
        currentRoute={currentRoute}
        onNavigate={setCurrentRoute}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="app-main-viewport">
        {/* Top Header Bar */}
        <header className="top-system-bar no-print">
          <div className="bar-left">
            <div className="breadcrumb-trail">
              <span className="breadcrumb-root">FCIS</span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{getBreadcrumbTitle()}</span>
            </div>
          </div>

          <div className="bar-right">
            {/* Live Backend Connection Indicator */}
            <div
              className={`api-indicator-pill ${backendStatus.online ? 'api-online' : 'api-offline'}`}
              title={
                backendStatus.online
                  ? 'Connected to Flask REST API (port 5000)'
                  : 'Flask REST API is currently offline. Start Flask on port 5000.'
              }
            >
              <span className="api-dot" />
              <span className="api-text">
                {backendStatus.online ? 'Backend Connected' : 'Flask API Offline'}
              </span>
            </div>
          </div>
        </header>

        {/* Page View Area - Spaced cleanly directly under top system bar */}
        <main className="main-content-scroll">
          <div className="content-container">
            {currentRoute === 'dashboard' && (
              <Dashboard
                onNavigate={setCurrentRoute}
                onSelectCase={(id) => setSelectedCaseId(id)}
              />
            )}

            {currentRoute === 'cases' && (
              <Cases
                onSelectCase={(id) => setSelectedCaseId(id)}
                onNavigate={setCurrentRoute}
              />
            )}

            {currentRoute === 'case-details' && (
              <CaseDetails
                caseId={selectedCaseId}
                onNavigate={setCurrentRoute}
                onSelectCase={(id) => setSelectedCaseId(id)}
              />
            )}

            {currentRoute === 'investigation' && (
              <Investigation
                caseId={selectedCaseId}
                onSelectCase={(id) => setSelectedCaseId(id)}
                onNavigate={setCurrentRoute}
              />
            )}

            {currentRoute === 'reports' && (
              <Report
                caseId={selectedCaseId}
                onSelectCase={(id) => setSelectedCaseId(id)}
                onNavigate={setCurrentRoute}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
