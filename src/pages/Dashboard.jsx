import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Dashboard({ onNavigate, onSelectCase }) {
  const [stats, setStats] = useState({
    casesReceived: 0,
    casesUnderInvestigation: 0,
    completedInvestigations: 0,
    reportsGenerated: 0,
  });
  const [recentCases, setRecentCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      setLoading(true);
      setConnectionError(false);
      try {
        const [statsRes, casesRes] = await Promise.allSettled([
          api.dashboard.getStats(),
          api.cases.list(),
        ]);

        if (!isMounted) return;

        let cases = [];
        if (casesRes.status === 'fulfilled' && Array.isArray(casesRes.value)) {
          cases = casesRes.value;
          setRecentCases(cases.slice(0, 5));
        } else {
          setRecentCases([]);
        }

        if (statsRes.status === 'fulfilled' && statsRes.value) {
          setStats({
            casesReceived: statsRes.value.casesReceived ?? cases.length,
            casesUnderInvestigation: statsRes.value.casesUnderInvestigation ?? cases.filter((c) => c.status === 'investigating').length,
            completedInvestigations: statsRes.value.completedInvestigations ?? cases.filter((c) => c.status === 'completed').length,
            reportsGenerated: statsRes.value.reportsGenerated ?? 0,
          });
        } else {
          // Derive strictly from real cases if stats endpoint is not yet defined
          setStats({
            casesReceived: cases.length,
            casesUnderInvestigation: cases.filter((c) => c.status === 'investigating').length,
            completedInvestigations: cases.filter((c) => c.status === 'completed').length,
            reportsGenerated: cases.filter((c) => c.status === 'completed' || c.has_report).length,
          });
        }
      } catch {
        if (isMounted) {
          setConnectionError(true);
          setRecentCases([]);
          setStats({
            casesReceived: 0,
            casesUnderInvestigation: 0,
            completedInvestigations: 0,
            reportsGenerated: 0,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCaseClick = (id) => {
    onSelectCase(id);
    onNavigate('investigation');
  };

  const hasData = recentCases.length > 0 || stats.casesReceived > 0;

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Executive Dashboard</h2>
          <p className="page-description">
            High-level overview of incident intake, AI-assisted investigations, and published reports.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('cases')}
          >
            View All Cases
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('cases')}
          >
            + Register Case
          </button>
        </div>
      </div>

      {connectionError && (
        <div className="form-error" style={{ marginBottom: '20px' }}>
          Backend API is offline. Connect the Flask REST API on port 5000 to display live SQLite case records.
        </div>
      )}

      {/* Metrics Row: 4 Clean Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Cases</span>
            <span className="metric-icon-wrap icon-teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </span>
          </div>
          <div className="metric-value">{loading ? '-' : stats.casesReceived}</div>
          <div className="metric-footer">
            <span>Intake repository</span>
            <span className="metric-tag">{stats.casesReceived === 0 ? 'No data yet' : 'Real SQL count'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Under Investigation</span>
            <span className="metric-icon-wrap icon-orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
          <div className="metric-value">{loading ? '-' : stats.casesUnderInvestigation}</div>
          <div className="metric-footer">
            <span>AI analysis in progress</span>
            <span className="metric-tag">{stats.casesUnderInvestigation === 0 ? '0 active' : 'Active'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Completed</span>
            <span className="metric-icon-wrap icon-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </span>
          </div>
          <div className="metric-value">{loading ? '-' : stats.completedInvestigations}</div>
          <div className="metric-footer">
            <span>Validated findings</span>
            <span className="metric-tag">{stats.completedInvestigations === 0 ? '0 closed' : 'Synthesized'}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Reports Generated</span>
            <span className="metric-icon-wrap icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <line x1="16" y1="13" x2="8" y2="13" />
              </svg>
            </span>
          </div>
          <div className="metric-value">{loading ? '-' : stats.reportsGenerated}</div>
          <div className="metric-footer">
            <span>Published dossiers</span>
            <span className="metric-tag">{stats.reportsGenerated === 0 ? '0 published' : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Cases & Activity */}
      <div className="dashboard-content-grid">
        {/* Recent Cases */}
        <div className="card dashboard-section">
          <div className="card-header">
            <div>
              <h3 className="card-title">Recent Cases</h3>
              <p className="card-subtitle">Latest incidents logged for investigation</p>
            </div>
            {recentCases.length > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('cases')}
              >
                View Table
              </button>
            )}
          </div>

          {loading ? (
            <div className="section-loading">Loading recent cases...</div>
          ) : recentCases.length === 0 ? (
            <div className="dashboard-empty-card">
              <div className="empty-sub-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 36, height: 36 }}>
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <line x1="9" y1="9" x2="15" y2="9" />
                  <line x1="9" y1="13" x2="15" y2="13" />
                </svg>
              </div>
              <h4 className="empty-sub-title">No cases available yet.</h4>
              <p className="empty-sub-desc">
                No financial crime cases have been received into the system yet.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('cases')}
              >
                + Register First Case
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case Ref</th>
                    <th>Title & Type</th>
                    <th>Complainant</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => {
                    const id = c.id || c.case_id;
                    return (
                      <tr key={id}>
                        <td>
                          <span className="table-ref">{c.case_id || `FCIS-${c.id}`}</span>
                        </td>
                        <td>
                          <div className="table-primary-text">{c.title}</div>
                          <span className="scam-tag-sm">{c.scam_type}</span>
                        </td>
                        <td>{c.victim_name || 'Complainant'}</td>
                        <td className="amount-col">
                          {c.currency || 'USD'} {Number(c.transaction_amount || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className={`status-pill pill-${c.status || 'received'}`}>
                            {c.status || 'received'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleCaseClick(id)}
                          >
                            Investigate →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Investigation Activity */}
        <div className="card dashboard-section">
          <div className="card-header">
            <div>
              <h3 className="card-title">Investigation Activity</h3>
              <p className="card-subtitle">Live audit log of automated and manual inquiries</p>
            </div>
          </div>

          {loading ? (
            <div className="section-loading">Checking audit logs...</div>
          ) : !hasData ? (
            <div className="dashboard-empty-card">
              <div className="empty-sub-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 36, height: 36 }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h4 className="empty-sub-title">No investigation activity yet.</h4>
              <p className="empty-sub-desc">
                Activity events will automatically appear here once investigations are initiated.
              </p>
            </div>
          ) : (
            <div className="activity-timeline">
              {recentCases.map((c) => {
                const id = c.id || c.case_id;
                return (
                  <div key={id} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-details">
                      <div className="activity-text">
                        <strong>Case #{c.case_id || id}</strong> received ({c.scam_type})
                      </div>
                      <div className="activity-sub">
                        Reported loss: {c.currency || 'USD'} {Number(c.transaction_amount || 0).toLocaleString()} • {c.created_at || 'Recently logged'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-link-sm"
                      onClick={() => handleCaseClick(id)}
                    >
                      Open
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
