import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Report({ caseId, onSelectCase, onNavigate }) {
  const [casesList, setCasesList] = useState([]);
  const [selectedId, setSelectedId] = useState(caseId || '');
  const [currentCase, setCurrentCase] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadCases() {
      try {
        const data = await api.cases.list();
        if (isMounted && Array.isArray(data)) {
          setCasesList(data);
          if (!caseId && data.length > 0) {
            const firstId = data[0].id || data[0].case_id;
            setSelectedId(firstId);
            onSelectCase(firstId);
          }
        }
      } catch {
        if (isMounted) setCasesList([]);
      }
    }
    loadCases();
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCaseId = caseId || selectedId;

  useEffect(() => {
    if (!activeCaseId) {
      return;
    }

    let isMounted = true;
    async function fetchReportAndCase() {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      try {
        const caseRecord = await api.cases.get(activeCaseId);
        if (isMounted) setCurrentCase(caseRecord);
      } catch {
        if (isMounted) {
          const found = casesList.find((c) => String(c.id) === String(activeCaseId) || c.case_id === activeCaseId);
          setCurrentCase(found || null);
        }
      }

      try {
        const data = await api.reports.get(activeCaseId);
        if (isMounted) {
          setReportData(data);
        }
      } catch (err) {
        if (isMounted) {
          setReportData(null);
          if (err.status !== 404 && !err.isConnectionError) {
            setError(err.message || 'No report found for this case.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchReportAndCase();

    return () => {
      isMounted = false;
    };
  }, [activeCaseId, casesList]);

  const handleCaseChange = (e) => {
    const newId = e.target.value;
    setSelectedId(newId);
    onSelectCase(newId);
  };

  const handleGenerateReport = async () => {
    if (!activeCaseId) return;
    setGenerating(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.reports.generate(activeCaseId);
      setReportData(res);
      setSuccessMsg('Investigation report dossier synthesized successfully.');
    } catch (err) {
      if (err.isConnectionError) {
        setError('Flask backend is offline. Start the Flask API server to synthesize formal report records.');
      } else {
        setError(err.message || 'Failed to generate report from backend.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="reports-page">
      {/* Page Header */}
      <div className="page-header no-print">
        <div>
          <h2 className="page-title">Investigation Reports</h2>
          <p className="page-description">
            Evidentiary dossier synthesized from verified case facts and AI-assisted investigation findings.
          </p>
        </div>

        <div className="header-case-controls">
          <label htmlFor="report-case-select" className="control-label">
            Case Dossier:
          </label>
          <select
            id="report-case-select"
            className="form-select case-picker"
            value={activeCaseId}
            onChange={handleCaseChange}
          >
            {casesList.length === 0 ? (
              <option value="">No cases registered</option>
            ) : (
              casesList.map((c) => {
                const id = c.id || c.case_id;
                return (
                  <option key={id} value={id}>
                    Case #{c.case_id || id} — {c.title || c.scam_type || 'Unspecified'}
                  </option>
                );
              })
            )}
          </select>

          {activeCaseId && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const id = activeCaseId;
                setSelectedId('');
                setTimeout(() => setSelectedId(id), 50);
              }}
            >
              Refresh
            </button>
          )}

          {reportData && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleExport}
              title="Print or Save as PDF"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, marginRight: 6 }}>
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Export / Print
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error no-print" role="alert">{error}</div>}
      {successMsg && <div className="form-success no-print" role="status">{successMsg}</div>}

      {/* When no cases exist in system */}
      {casesList.length === 0 && !activeCaseId ? (
        <div className="empty-state">
          <div className="empty-state-icon-wrap">
            <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="empty-state-title">No reports available yet.</h3>
          <p className="empty-state-text">
            No incident reports have been generated. Once a case is investigated, you can synthesize the formal final report.
          </p>
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('cases')}
            >
              Go to Cases Page
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="card loading-card">
          <div className="spinner" />
          <span>Retrieving report dossier from database...</span>
        </div>
      ) : !reportData ? (
        /* Case is selected, but report not generated yet */
        <div className="card start-investigation-card">
          <div className="start-inv-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="start-inv-title">No reports available yet for Case #{activeCaseId}</h3>
          <p className="start-inv-desc">
            The AI investigation must be compiled into a formal evidentiary dossier. Click below to generate the structured investigation report from the case data and AI findings.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={() => onNavigate('investigation')}
            >
              ← Review AI Investigation
            </button>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              disabled={generating}
              onClick={handleGenerateReport}
            >
              {generating ? 'Synthesizing Formal Dossier...' : 'Generate Final Report'}
            </button>
          </div>
        </div>
      ) : (
        /* Real Formal Report Dossier */
        <div className="report-dossier-wrapper">
          {/* Dossier Document Sheet */}
          <div className="dossier-sheet">
            {/* Dossier Letterhead */}
            <div className="dossier-letterhead">
              <div className="dossier-org-badge">
                <span className="logo-badge-dossier">FCIS</span>
                <div>
                  <div className="dossier-org-name">Financial Crime Investigation System</div>
                  <div className="dossier-org-sub">Specialized Fraud & Financial Intelligence Unit</div>
                </div>
              </div>
              <div className="dossier-serial-block">
                <div className="dossier-serial">REF: {reportData.report_id || `REP-${activeCaseId}`}</div>
                <div className="dossier-date">
                  Date: {reportData.generated_at ? new Date(reportData.generated_at).toLocaleDateString() : new Date().toLocaleDateString()}
                </div>
                <div className="dossier-classification">OFFICIAL INVESTIGATION RECORD</div>
              </div>
            </div>

            {/* Dossier Title */}
            <div className="dossier-title-banner">
              <h1 className="dossier-main-title">
                {reportData.title || `Investigation Dossier: Case #${activeCaseId}`}
              </h1>
              <p className="dossier-case-ref">
                Underlying Incident: Case {currentCase?.case_id || activeCaseId} • Category: {reportData.scam_type || currentCase?.scam_type}
              </p>
            </div>

            {/* Dossier Metrics Strip */}
            <div className="dossier-metrics-strip">
              <div className="strip-item">
                <span className="strip-label">Complainant / Target:</span>
                <span className="strip-value">{reportData.victim || currentCase?.victim_name || 'Complainant'}</span>
              </div>
              <div className="strip-item">
                <span className="strip-label">Total Disputed Loss:</span>
                <span className="strip-value highlight-strip-val">
                  {reportData.currency || currentCase?.currency || 'USD'} {Number(reportData.total_loss || currentCase?.transaction_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="strip-item">
                <span className="strip-label">Incident Typology:</span>
                <span className="strip-value">{reportData.scam_type || currentCase?.scam_type}</span>
              </div>
              <div className="strip-item">
                <span className="strip-label">Status:</span>
                <span className="strip-value status-pill pill-completed">Completed</span>
              </div>
            </div>

            {/* Section 1: Investigation Summary / Executive Summary */}
            <div className="dossier-section">
              <h3 className="dossier-section-title">1. Investigation Summary</h3>
              <div className="dossier-body-text">
                {reportData.executive_summary || currentCase?.description || 'No executive narrative recorded.'}
              </div>
            </div>

            {/* Section 2: Important Findings */}
            <div className="dossier-section">
              <h3 className="dossier-section-title">2. Important Findings</h3>
              <div className="dossier-body-text">
                {typeof reportData.findings === 'string'
                  ? reportData.findings
                  : JSON.stringify(reportData.findings, null, 2)}
              </div>
            </div>

            {/* Section 3: Evidence Summary */}
            <div className="dossier-section">
              <h3 className="dossier-section-title">3. Evidence Summary</h3>
              <div className="dossier-body-text">
                {currentCase?.evidence_notes ? (
                  <p>{currentCase.evidence_notes}</p>
                ) : (
                  <p className="empty-subtext">Primary narrative testimony and verified transaction parameters logged into repository.</p>
                )}
              </div>
            </div>

            {/* Section 4: AI Findings & Directives */}
            <div className="dossier-section">
              <h3 className="dossier-section-title">4. Formal Recommendations & Remediation</h3>
              <div className="dossier-recommendations">
                {reportData.recommendations ? (
                  <div style={{ whiteSpace: 'pre-line' }}>{reportData.recommendations}</div>
                ) : (
                  <ol className="recommendations-list">
                    <li>Submit evidentiary referral to designated law enforcement fraud desk.</li>
                    <li>Transmit institutional freeze request to recipient banking intermediary.</li>
                    <li>Archive telemetry indicators to inter-bank anti-fraud intelligence registry.</li>
                  </ol>
                )}
              </div>
            </div>

            {/* Dossier Sign-off Footer */}
            <div className="dossier-signoff">
              <div className="signoff-column">
                <div className="signoff-line" />
                <div className="signoff-label">Investigating Administrator</div>
                <div className="signoff-sub">FCIS Authorized Compliance Desk</div>
              </div>
              <div className="signoff-column" style={{ textAlign: 'right' }}>
                <div className="signoff-badge">VERIFIED EVIDENTIARY RECORD</div>
                <div className="signoff-sub">Generated by FCIS Automated Intelligence Suite</div>
              </div>
            </div>
          </div>

          {/* Action Bar below sheet */}
          <div className="dossier-bottom-actions no-print">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('investigation')}
            >
              ← Back to Investigation
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={generating}
              onClick={handleGenerateReport}
            >
              {generating ? 'Re-synthesizing...' : 'Re-generate Report'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExport}
            >
              Export / Print Formal Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
