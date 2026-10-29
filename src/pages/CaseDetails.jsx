import React, { useState, useEffect } from 'react';
import api from '../api';

export default function CaseDetails({ caseId, onNavigate, onSelectCase }) {
  const [caseData, setCaseData] = useState(null);
  const [investigationData, setInvestigationData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(caseId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!caseId) return;

    let isMounted = true;
    async function loadDetails() {
      setLoading(true);
      setError('');
      try {
        const [caseRes, invRes, repRes] = await Promise.allSettled([
          api.cases.get(caseId),
          api.investigations.get(caseId),
          api.reports.get(caseId),
        ]);

        if (!isMounted) return;

        if (caseRes.status === 'fulfilled') {
          setCaseData(caseRes.value);
        } else {
          setError(caseRes.reason?.message || 'Case record not found.');
        }

        if (invRes.status === 'fulfilled') {
          setInvestigationData(invRes.value);
        } else {
          setInvestigationData(null);
        }

        if (repRes.status === 'fulfilled') {
          setReportData(repRes.value);
        } else {
          setReportData(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load case dossier.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [caseId]);

  if (!caseId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon-wrap">
          <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="empty-state-title">No case selected.</h3>
        <p className="empty-state-text">
          Please select a case from the Cases repository to review incident parameters, evidence, and investigations.
        </p>
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('cases')}
          >
            Go to Cases
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card loading-card">
        <div className="spinner" />
        <span>Loading case dossier for #{caseId}...</span>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div>
        <div className="page-header">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('cases')}
          >
            ← Back to Cases
          </button>
        </div>
        <div className="empty-state">
          <h3 className="empty-state-title">Case record unavailable</h3>
          <p className="empty-state-text">{error || `No data returned for case ID: ${caseId}`}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="case-details-page">
      {/* Navigation Breadcrumb / Header */}
      <div className="page-header">
        <div>
          <button
            type="button"
            className="btn-back"
            onClick={() => onNavigate('cases')}
          >
            ← Back to Cases
          </button>
          <div className="details-header-title">
            <span className="case-badge">{caseData.case_id || `FCIS-${caseData.id}`}</span>
            <h2 className="page-title">{caseData.title}</h2>
          </div>
          <div className="details-meta-row">
            <span className="scam-tag">{caseData.scam_type}</span>
            <span className={`status-pill pill-${caseData.status || 'received'}`}>
              {caseData.status || 'received'}
            </span>
            <span className="meta-text">Received: {caseData.created_at || 'Recently added'}</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (onSelectCase) onSelectCase(caseData.id || caseData.case_id);
              onNavigate('reports');
            }}
          >
            {reportData ? 'View Report' : 'Reports Dossier'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              if (onSelectCase) onSelectCase(caseData.id || caseData.case_id);
              onNavigate('investigation');
            }}
          >
            Open Investigation →
          </button>
        </div>
      </div>

      <div className="details-grid">
        {/* Section 1: Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">1. Overview</h3>
            <span className="badge badge-teal">Case Profile</span>
          </div>
          <div className="details-table">
            <div className="detail-row">
              <span className="detail-label">Case Reference:</span>
              <span className="detail-value mono-val">{caseData.case_id || `FCIS-${caseData.id}`}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Scam Category:</span>
              <span className="detail-value">{caseData.scam_type}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date Ingested:</span>
              <span className="detail-value">{caseData.created_at || 'N/A'}</span>
            </div>
            <div className="detail-row full-row">
              <span className="detail-label">Incident Narrative:</span>
              <p className="detail-narrative">
                {caseData.description || 'No detailed incident narrative entered.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Transaction Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">2. Transaction Information</h3>
            <span className="badge badge-orange">Financial Impact</span>
          </div>
          <div className="details-table">
            <div className="detail-row">
              <span className="detail-label">Complainant / Target:</span>
              <span className="detail-value">{caseData.victim_name || 'Complainant'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Disputed Loss:</span>
              <span className="detail-value highlight-loss">
                {caseData.currency || 'USD'} {Number(caseData.transaction_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Currency:</span>
              <span className="detail-value">{caseData.currency || 'USD'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Current Pipeline Status:</span>
              <span className={`status-pill pill-${caseData.status || 'received'}`}>
                {caseData.status || 'received'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Evidence */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">3. Evidence</h3>
          </div>
          <div className="evidence-box">
            {caseData.evidence_notes ? (
              <p className="evidence-text">{caseData.evidence_notes}</p>
            ) : (
              <p className="empty-subtext">No supplemental evidence notes provided during intake.</p>
            )}
          </div>
        </div>

        {/* Section 4: Investigation */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">4. Investigation</h3>
            <span className={`status-pill pill-${investigationData ? 'completed' : 'received'}`}>
              {investigationData ? 'Analyzed' : 'Pending AI Analysis'}
            </span>
          </div>
          {investigationData ? (
            <div>
              <p className="detail-narrative" style={{ marginBottom: '12px' }}>
                {investigationData.ai_analysis || investigationData.findings}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (onSelectCase) onSelectCase(caseData.id || caseData.case_id);
                  onNavigate('investigation');
                }}
              >
                Inspect AI Assistant & Indicators →
              </button>
            </div>
          ) : (
            <div className="section-empty-callout">
              <p>No AI investigation executed for this case yet.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  if (onSelectCase) onSelectCase(caseData.id || caseData.case_id);
                  onNavigate('investigation');
                }}
              >
                Start AI Investigation
              </button>
            </div>
          )}
        </div>

        {/* Section 5: Reports */}
        <div className="card full-width-card">
          <div className="card-header">
            <h3 className="card-title">5. Reports</h3>
            <span className={`status-pill pill-${reportData ? 'completed' : 'received'}`}>
              {reportData ? 'Dossier Published' : 'Unpublished'}
            </span>
          </div>
          {reportData ? (
            <div className="report-preview-strip">
              <div>
                <strong>{reportData.title || `Report for ${caseData.case_id}`}</strong>
                <p className="report-subtext">
                  Dossier Ref: {reportData.report_id} • Generated: {reportData.generated_at || 'Recently'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (onSelectCase) onSelectCase(caseData.id || caseData.case_id);
                  onNavigate('reports');
                }}
              >
                View Full Evidentiary Dossier →
              </button>
            </div>
          ) : (
            <div className="section-empty-callout">
              <p>No final report generated yet.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  if (onSelectCase) onSelectCase(caseData.id || caseData.case_id);
                  onNavigate('reports');
                }}
              >
                Go to Report Builder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
