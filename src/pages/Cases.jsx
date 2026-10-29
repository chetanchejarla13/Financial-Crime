import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Cases({ onSelectCase, onNavigate }) {
  const [casesList, setCasesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Case Intake Form State
  const [newCase, setNewCase] = useState({
    title: '',
    scam_type: 'Investment Scam',
    victim_name: '',
    transaction_amount: '',
    currency: 'USD',
    description: '',
    evidence_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const scamTypes = [
    'Investment Scam',
    'Phishing & Credential Theft',
    'Authorized Push Payment (APP)',
    'Business Email Compromise (BEC)',
    'Crypto Asset Fraud',
    'Identity Theft & Impersonation',
    'Unauthorized Wire Transfer',
  ];

  useEffect(() => {
    let isMounted = true;
    async function loadCases() {
      setLoading(true);
      setError('');
      try {
        const data = await api.cases.list();
        if (isMounted) {
          if (Array.isArray(data)) {
            setCasesList(data);
          } else {
            setCasesList([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (err.isConnectionError) {
            setError('Backend API is offline. Connect the Flask REST API (port 5000) to retrieve cases.');
          } else {
            setError(err.message || 'Unable to retrieve cases.');
          }
          setCasesList([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCases();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateCase = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newCase.title.trim() || !newCase.scam_type.trim()) {
      setFormError('Case Title and Scam Type are mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      await api.cases.create(newCase);
      setIsModalOpen(false);
      setNewCase({
        title: '',
        scam_type: 'Investment Scam',
        victim_name: '',
        transaction_amount: '',
        currency: 'USD',
        description: '',
        evidence_notes: '',
      });

      // Refresh list
      const data = await api.cases.list();
      if (Array.isArray(data)) {
        setCasesList(data);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit case to backend.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter cases based on search and status
  const filteredCases = casesList.filter((c) => {
    const matchesStatus = statusFilter === 'all' || (c.status || 'received').toLowerCase() === statusFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      (c.title && c.title.toLowerCase().includes(query)) ||
      (c.case_id && c.case_id.toLowerCase().includes(query)) ||
      (c.scam_type && c.scam_type.toLowerCase().includes(query)) ||
      (c.victim_name && c.victim_name.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const handleOpenCase = (id) => {
    onSelectCase(id);
    onNavigate('case-details');
  };

  const handleInvestigateCase = (id) => {
    onSelectCase(id);
    onNavigate('investigation');
  };

  return (
    <div className="cases-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Financial Crime Cases</h2>
          <p className="page-description">
            Repository of received financial crime reports awaiting or undergoing AI investigation.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            + New Case
          </button>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="card filters-card">
        <div className="filters-wrapper">
          <div className="search-field">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search by Case Ref, Title, Scam Type, or Complainant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>

          <div className="filter-select-group">
            <label htmlFor="status-filter" className="filter-label">Status:</label>
            <select
              id="status-filter"
              className="form-select status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="received">Received</option>
              <option value="investigating">Under Investigation</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Case List / Table */}
      {loading ? (
        <div className="card loading-card">
          <div className="spinner" />
          <span>Retrieving case records from database...</span>
        </div>
      ) : casesList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon-wrap">
            <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" />
              <line x1="9" y1="9" x2="15" y2="9" strokeWidth="1.5" />
              <line x1="9" y1="13" x2="15" y2="13" strokeWidth="1.5" />
            </svg>
          </div>
          <h3 className="empty-state-title">No cases available yet.</h3>
          <p className="empty-state-text">
            No incident reports have been registered in the database. Ingest a case to begin AI-assisted fraud investigation.
          </p>
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              + Register New Case
            </button>
          </div>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No cases match your search query: "<strong>{searchQuery}</strong>".
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case Information</th>
                  <th>Scam Type</th>
                  <th>Complainant</th>
                  <th>Amount</th>
                  <th>Date Received</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const id = c.id || c.case_id;
                  return (
                    <tr key={id}>
                      <td>
                        <div className="case-cell-id">{c.case_id || `FCIS-${c.id}`}</div>
                        <div className="case-cell-title">{c.title}</div>
                      </td>
                      <td>
                        <span className="scam-tag">{c.scam_type}</span>
                      </td>
                      <td>{c.victim_name || 'Complainant'}</td>
                      <td className="amount-col">
                        {c.currency || 'USD'} {Number(c.transaction_amount || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className="table-date">{c.created_at || 'Recently added'}</span>
                      </td>
                      <td>
                        <span className={`status-pill pill-${c.status || 'received'}`}>
                          {c.status || 'received'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-btn-group">
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleOpenCase(id)}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => handleInvestigateCase(id)}
                          >
                            Investigate →
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Register Financial Crime Case</h3>
                <p className="modal-subtitle">Ingest a new fraudulent incident into the FCIS database</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            {formError && <div className="form-error" role="alert">{formError}</div>}

            <form onSubmit={handleCreateCase}>
              <div className="form-group">
                <label className="form-label" htmlFor="case-title">
                  Case Title <span style={{ color: 'var(--accent-orange)' }}>*</span>
                </label>
                <input
                  id="case-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Unauthorized Wire Diversion via Compromised Vendor"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="case-scam-type">
                    Scam Type <span style={{ color: 'var(--accent-orange)' }}>*</span>
                  </label>
                  <select
                    id="case-scam-type"
                    className="form-select"
                    value={newCase.scam_type}
                    onChange={(e) => setNewCase({ ...newCase, scam_type: e.target.value })}
                  >
                    {scamTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="case-victim">Complainant / Victim Name</label>
                  <input
                    id="case-victim"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Acme Corp / Jane Doe"
                    value={newCase.victim_name}
                    onChange={(e) => setNewCase({ ...newCase, victim_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="case-amount">Disputed Transaction Amount</label>
                  <input
                    id="case-amount"
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 85000"
                    value={newCase.transaction_amount}
                    onChange={(e) => setNewCase({ ...newCase, transaction_amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="case-currency">Currency</label>
                  <select
                    id="case-currency"
                    className="form-select"
                    value={newCase.currency}
                    onChange={(e) => setNewCase({ ...newCase, currency: e.target.value })}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="case-desc">Incident Narrative & Description</label>
                <textarea
                  id="case-desc"
                  className="form-textarea"
                  rows={3}
                  placeholder="Describe the incident narrative, scam mechanism, communication timeline, and fraudulent directives..."
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="case-evidence">Evidence Notes & Transfer References</label>
                <textarea
                  id="case-evidence"
                  className="form-textarea"
                  rows={2}
                  placeholder="Transaction routing numbers, suspicious email domains, wallet hashes, IP addresses..."
                  value={newCase.evidence_notes}
                  onChange={(e) => setNewCase({ ...newCase, evidence_notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Registering Case...' : 'Submit to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
