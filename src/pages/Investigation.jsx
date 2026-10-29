import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileTypeCategory(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'Image';
  if (ext === 'pdf') return 'PDF';
  if (['doc', 'docx', 'txt'].includes(ext)) return 'Document';
  if (['csv', 'xlsx'].includes(ext)) return 'Data';
  return 'File';
}

function isValidFileType(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  const allowed = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'];
  return allowed.includes(ext);
}

export default function Investigation({ caseId, onSelectCase, onNavigate }) {
  const [casesList, setCasesList] = useState([]);
  const [selectedId, setSelectedId] = useState(caseId || '');
  const [currentCase, setCurrentCase] = useState(null);
  const [investigationData, setInvestigationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // AI Chatbox State
  const [chatMessages, setChatMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);
  const messageCounterRef = useRef(1);

  // File Attachments State
  const [attachments, setAttachments] = useState([]);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const attachmentMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [fileInputAccept, setFileInputAccept] = useState('*');

  // Suggested questions
  const suggestedQuestions = [
    'Summarize this case.',
    'What suspicious activity was identified?',
    'What transaction details are important?',
    'What evidence is relevant?',
    'Create an investigation timeline.',
    'What are the key findings?',
    'Prepare a final investigation report.',
  ];

  // Close attachment dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setIsAttachmentMenuOpen(false);
      }
    }
    if (isAttachmentMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAttachmentMenuOpen]);

  // Load cases on mount
  useEffect(() => {
    let isMounted = true;
    async function initCases() {
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
    initCases();
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When selected case changes, load details & investigation
  const activeCaseId = caseId || selectedId;

  useEffect(() => {
    if (!activeCaseId) {
      return;
    }

    let isMounted = true;
    async function fetchCaseAndInvestigation() {
      setLoading(true);
      setError('');
      try {
        const caseRecord = await api.cases.get(activeCaseId);
        if (isMounted) {
          setCurrentCase(caseRecord);
        }
      } catch {
        if (isMounted) {
          const found = casesList.find((c) => String(c.id) === String(activeCaseId) || c.case_id === activeCaseId);
          setCurrentCase(found || null);
        }
      }

      try {
        const inv = await api.investigations.get(activeCaseId);
        if (isMounted) {
          setInvestigationData(inv);
        }
      } catch (err) {
        if (isMounted) {
          setInvestigationData(null);
          if (err.status !== 404 && !err.isConnectionError) {
            setError(err.message || 'No investigation on file.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCaseAndInvestigation();

    return () => {
      isMounted = false;
    };
  }, [activeCaseId, casesList]);

  // Scroll to bottom of chat whenever messages change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading, attachments]);

  const handleCaseChange = (e) => {
    const newId = e.target.value;
    setSelectedId(newId);
    setChatMessages([]);
    setAttachments([]);
    onSelectCase(newId);
  };

  // Open file selector with specific mime filter
  const triggerFileInput = (acceptType) => {
    setFileInputAccept(acceptType);
    setIsAttachmentMenuOpen(false);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }, 50);
  };

  // Handle files selected via file input
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = files.map((file, idx) => {
      const isSupported = isValidFileType(file.name);
      const isOversized = file.size > 50 * 1024 * 1024; // 50MB reasonable threshold
      const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(file.name.split('.').pop().toLowerCase());

      let status = 'uploaded';
      let statusText = 'Ready for analysis';

      if (!isSupported) {
        status = 'unsupported';
        statusText = 'File type not supported';
      } else if (isOversized) {
        status = 'failed';
        statusText = 'Upload failed: Exceeds 50MB limit';
      }

      return {
        id: `att_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        type: getFileTypeCategory(file.name),
        previewUrl: isImage && isSupported ? URL.createObjectURL(file) : null,
        status,
        statusText,
      };
    });

    setAttachments((prev) => [...prev, ...newItems]);
  };

  const handleRemoveAttachment = (idToRemove) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === idToRemove);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== idToRemove);
    });
  };

  // Start AI Investigation with step-by-step progress animation
  const handleStartInvestigation = async () => {
    if (!activeCaseId) return;

    setAnalyzing(true);
    setAnalysisStep(1);
    setError('');
    setStatusMessage('');

    const timer1 = setTimeout(() => setAnalysisStep(2), 500);
    const timer2 = setTimeout(() => setAnalysisStep(3), 1100);
    const timer3 = setTimeout(() => setAnalysisStep(4), 1700);

    try {
      const res = await api.investigations.start(activeCaseId);
      setAnalysisStep(5);
      setTimeout(() => {
        setInvestigationData(res);
        setAnalyzing(false);
        setAnalysisStep(0);
        setStatusMessage('AI investigation completed. Findings ready for review.');
      }, 700);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setAnalyzing(false);
      setAnalysisStep(0);
      if (err.isConnectionError) {
        setError('Cannot trigger AI investigation: Flask API server is offline. Please start Flask on port 5000.');
      } else {
        setError(err.message || 'Failed to complete AI investigation.');
      }
    }
  };

  // Send message to AI Investigation Assistant
  const handleSendMessage = async (queryText) => {
    const rawMessage = (queryText || inputQuery).trim();
    // Valid attachments to submit
    const validAttachments = attachments.filter((att) => att.status === 'uploaded');
    const rawFiles = validAttachments.map((att) => att.file);

    // If message is empty but attachments exist, construct intuitive query
    const message = rawMessage || (rawFiles.length > 0 ? `Analyze the attached ${rawFiles.length === 1 ? 'evidence file' : 'evidence files'}.` : '');

    if (!message || !activeCaseId || chatLoading) return;

    messageCounterRef.current += 1;
    const userMsgId = messageCounterRef.current;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Store snapshot of attached files metadata in user message bubble
    const userMessage = {
      id: userMsgId,
      sender: 'user',
      text: message,
      time: timeString,
      attachments: validAttachments.map((att) => ({
        name: att.name,
        size: att.size,
        type: att.type,
      })),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setAttachments([]);
    setChatLoading(true);

    try {
      const res = await api.investigations.chat(activeCaseId, message, rawFiles);
      messageCounterRef.current += 1;
      const aiMsgId = messageCounterRef.current;

      const aiMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: res.response || res.message || res.text || 'Analysis completed.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isReportTrigger: message.toLowerCase().includes('report'),
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      messageCounterRef.current += 1;
      const errorMsgId = messageCounterRef.current;

      const errorMessage = {
        id: errorMsgId,
        sender: 'ai',
        text: err.isConnectionError
          ? 'Unable to connect to Flask AI service. Please verify that the Flask REST API is running.'
          : (err.message || 'The AI assistant was unable to process this request.'),
        isError: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const progressSteps = [
    { id: 1, label: 'Case information' },
    { id: 2, label: 'Transaction details' },
    { id: 3, label: 'Evidence' },
    { id: 4, label: 'Investigation analysis' },
    { id: 5, label: 'Findings' },
  ];

  const hasSendableContent = Boolean(inputQuery.trim() || attachments.some((att) => att.status === 'uploaded'));

  return (
    <div className="investigation-page">
      {/* Hidden file input for attachment triggers */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept={fileInputAccept}
        multiple
        onChange={handleFileSelect}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">AI-Assisted Investigation</h2>
          <p className="page-description">
            Automated intelligence extraction, pattern analysis, and suspicious indicator detection.
          </p>
        </div>

        {/* Case Selector Dropdown & Actions */}
        <div className="header-case-controls">
          <label htmlFor="inv-case-select" className="control-label">
            Case Dossier:
          </label>
          <select
            id="inv-case-select"
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
              title="Reload case and investigation data"
            >
              Refresh
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('cases')}
          >
            + New Case
          </button>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}
      {statusMessage && <div className="form-success" role="status">{statusMessage}</div>}

      {/* When no cases exist at all in the database */}
      {casesList.length === 0 && !activeCaseId ? (
        <div className="empty-state">
          <div className="empty-state-icon-wrap">
            <svg className="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 className="empty-state-title">No cases available yet.</h3>
          <p className="empty-state-text">
            The investigation engine requires an intake case record. Register a new case to initiate AI-assisted fraud analysis.
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
          <span>Retrieving case #{activeCaseId} and investigation records from database...</span>
        </div>
      ) : (
        <>
          {/* Active Case Summary Banner */}
          {currentCase && (
            <div className="active-case-strip">
              <div className="case-strip-main">
                <span className="case-badge">
                  {currentCase.case_id || `FCIS-${currentCase.id}`}
                </span>
                <span className="case-strip-title">{currentCase.title}</span>
                <span className="scam-tag">{currentCase.scam_type}</span>
              </div>
              <div className="case-strip-meta">
                <div className="meta-item">
                  <span className="meta-label">Complainant:</span>
                  <span className="meta-val">{currentCase.victim_name || 'Complainant'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Disputed Flow:</span>
                  <span className="meta-val highlight-val">
                    {currentCase.currency || 'USD'} {Number(currentCase.transaction_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status:</span>
                  <span className={`status-pill pill-${currentCase.status || 'received'}`}>
                    {currentCase.status || 'received'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI Investigation Progress Modal / State (Active during analysis) */}
          {analyzing && (
            <div className="ai-progress-overlay">
              <div className="ai-progress-card">
                <div className="progress-header">
                  <div className="pulse-circle" />
                  <div>
                    <h4>Analyzing case...</h4>
                    <p>Correlating incident details with financial crime intelligence</p>
                  </div>
                </div>

                <div className="progress-steps-list">
                  {progressSteps.map((step) => {
                    const isDone = analysisStep > step.id;
                    const isCurrent = analysisStep === step.id;
                    return (
                      <div
                        key={step.id}
                        className={`progress-step-item ${isDone ? 'step-done' : ''} ${isCurrent ? 'step-current' : ''}`}
                      >
                        <span className="step-icon">
                          {isDone ? '✓' : isCurrent ? '◉' : '○'}
                        </span>
                        <span className="step-text">{step.label}</span>
                        {isCurrent && <span className="step-loading-dots">...</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Two-Column Investigation Workspace */}
          <div className="investigation-split-layout">
            {/* Left Column: Structured Investigation Records & Findings */}
            <div className="investigation-main-column">
              {!investigationData ? (
                /* Empty state when case is selected but not analyzed yet */
                <div className="card start-investigation-card">
                  <div className="start-inv-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </div>
                  <h3 className="start-inv-title">Initiate AI-Assisted Investigation</h3>
                  <p className="start-inv-desc">
                    Case #{activeCaseId} is currently logged in the repository. Run the automated AI engine to synthesize evidence narratives, identify suspicious transaction flows, and isolate primary indicators.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    disabled={analyzing}
                    onClick={handleStartInvestigation}
                  >
                    {analyzing ? 'Analyzing Case...' : 'Start AI Investigation'}
                  </button>
                </div>
              ) : (
                /* Completed Investigation View */
                <div className="investigation-results">
                  {/* Status Banner */}
                  <div className="card inv-status-banner">
                    <div className="status-info">
                      <span className="status-caption">Investigation Status:</span>
                      <span className={`status-pill pill-${investigationData.status || 'completed'}`}>
                        {investigationData.status || 'completed'}
                      </span>
                      {investigationData.analyzed_at && (
                        <span className="analyzed-timestamp">
                          Analyzed: {new Date(investigationData.analyzed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="status-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={analyzing}
                        onClick={handleStartInvestigation}
                      >
                        Re-run Analysis
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onNavigate('reports')}
                      >
                        Proceed to Final Report →
                      </button>
                    </div>
                  </div>

                  {/* Section 1: AI Investigation Narrative */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="section-number">1</span>
                        <span className="card-title">AI Investigation Analysis</span>
                      </div>
                      <span className="badge badge-teal">Automated Synthesis</span>
                    </div>
                    <div className="narrative-box">
                      {investigationData.ai_analysis || investigationData.summary || 'No analysis narrative returned.'}
                    </div>
                  </div>

                  {/* Section 2: Important Extracted Details */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="section-number">2</span>
                        <span className="card-title">Important Details Identified</span>
                      </div>
                    </div>

                    {investigationData.extracted_details && typeof investigationData.extracted_details === 'object' ? (
                      <div className="extracted-grid">
                        {Object.entries(investigationData.extracted_details).map(([key, value]) => (
                          <div key={key} className="extracted-item">
                            <span className="extracted-key">{key.replace(/_/g, ' ')}</span>
                            <span className="extracted-val">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-subtext">No structured parameters extracted by backend.</p>
                    )}
                  </div>

                  {/* Section 3: Suspicious Indicators */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="section-number">3</span>
                        <span className="card-title">Suspicious Indicators</span>
                      </div>
                      <span className="badge badge-orange">Risk Factors</span>
                    </div>

                    {investigationData.suspicious_indicators && Array.isArray(investigationData.suspicious_indicators) && investigationData.suspicious_indicators.length > 0 ? (
                      <ul className="indicators-list">
                        {investigationData.suspicious_indicators.map((indicator, idx) => (
                          <li key={idx} className="indicator-row">
                            <span className="indicator-bullet">!</span>
                            <span className="indicator-text">{indicator}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="empty-subtext">No anomalous indicators flagged by the backend.</p>
                    )}
                  </div>

                  {/* Section 4: Key Investigation Findings */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="section-number">4</span>
                        <span className="card-title">Investigation Findings</span>
                      </div>
                    </div>
                    <div className="findings-box">
                      {investigationData.findings || 'No formal findings logged yet.'}
                    </div>
                  </div>

                  {/* Section 5: Real Investigation Timeline */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title-group">
                        <span className="section-number">5</span>
                        <span className="card-title">Investigation Timeline</span>
                      </div>
                    </div>
                    <div className="timeline-trail">
                      {currentCase?.created_at && (
                        <div className="timeline-node">
                          <span className="node-marker" />
                          <div className="node-content">
                            <span className="node-time">{currentCase.created_at}</span>
                            <span className="node-title">Case Logged & Received</span>
                            <span className="node-desc">Initial scam complaint formally logged into repository.</span>
                          </div>
                        </div>
                      )}
                      {investigationData.analyzed_at && (
                        <div className="timeline-node">
                          <span className="node-marker marker-teal" />
                          <div className="node-content">
                            <span className="node-time">{investigationData.analyzed_at}</span>
                            <span className="node-title">AI Analysis Executed</span>
                            <span className="node-desc">Pattern analysis, suspicious flags, and evidence correlation synthesized.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: AI Investigation Chatbox */}
            <div className="investigation-chat-column">
              <div className="ai-chat-card">
                {/* Chatbox Header */}
                <div className="chat-header">
                  <div className="chat-title-group">
                    <div className="chat-avatar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="chat-title">AI Investigation Assistant</h3>
                      <div className="chat-subtitle">
                        <span className="live-dot" />
                        <span>Interactive Case Analyst</span>
                      </div>
                    </div>
                  </div>

                  <div className="chat-case-indicator" title={`Active Case: ${activeCaseId}`}>
                    Case #{currentCase?.case_id || activeCaseId || 'None'}
                  </div>
                </div>

                {/* Chat Message Scroll Area */}
                <div className="chat-messages-container">
                  {!activeCaseId ? (
                    <div className="chat-empty-state">
                      <svg className="chat-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <h4>Select a case to begin the AI investigation.</h4>
                      <p>Pick a case from the top selector to inspect records and ask questions.</p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="chat-empty-state">
                      <svg className="chat-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <h4>Ask the AI about this investigation.</h4>
                      <p>Query specific transactions, suspicious patterns, evidence links, or report drafting.</p>

                      <div className="suggested-prompts-tray">
                        <span className="tray-label">Quick Inquiries:</span>
                        {suggestedQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="prompt-chip"
                            onClick={() => handleSendMessage(q)}
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="chat-stream">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`chat-bubble-row ${msg.sender === 'user' ? 'row-user' : 'row-ai'}`}>
                          {msg.sender === 'ai' && (
                            <div className="bubble-avatar" title="AI Analyst">
                              AI
                            </div>
                          )}
                          <div className={`chat-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-ai'} ${msg.isError ? 'bubble-error' : ''}`}>
                            {/* Render attached files chips on user message */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="bubble-attachments-container">
                                {msg.attachments.map((att, attIdx) => (
                                  <div key={attIdx} className="bubble-attachment-pill">
                                    <span className="pill-icon">
                                      {att.type === 'Image' ? '🖼️' : att.type === 'PDF' ? '📄' : att.type === 'Data' ? '📊' : '📑'}
                                    </span>
                                    <span className="pill-name" title={att.name}>{att.name}</span>
                                    {att.size ? <span className="pill-size">({formatBytes(att.size)})</span> : null}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="bubble-content">{msg.text}</div>
                            <span className="bubble-time">{msg.time}</span>

                            {msg.isReportTrigger && (
                              <button
                                type="button"
                                className="chat-action-link"
                                onClick={() => onNavigate('reports')}
                              >
                                Open Generated Report in Dossier →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="chat-bubble-row row-ai">
                          <div className="bubble-avatar">AI</div>
                          <div className="chat-bubble bubble-ai bubble-typing">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                          </div>
                        </div>
                      )}

                      <div ref={chatBottomRef} />
                    </div>
                  )}
                </div>

                {/* Quick Prompts Bar if chat has messages */}
                {activeCaseId && chatMessages.length > 0 && (
                  <div className="chat-quick-bar">
                    <button
                      type="button"
                      className="quick-bar-chip"
                      onClick={() => handleSendMessage('Summarize this case.')}
                    >
                      Summarize
                    </button>
                    <button
                      type="button"
                      className="quick-bar-chip"
                      onClick={() => handleSendMessage('What suspicious activity was identified?')}
                    >
                      Suspicious Activity
                    </button>
                    <button
                      type="button"
                      className="quick-bar-chip"
                      onClick={() => handleSendMessage('Prepare a final investigation report.')}
                    >
                      Prepare Report
                    </button>
                  </div>
                )}

                {/* Attachment Preview Tray (Displayed above chat input when files are attached) */}
                {attachments.length > 0 && (
                  <div className="chat-attachments-tray">
                    <div className="attachments-tray-header">
                      <span className="tray-title">Evidence Staged for AI Analysis ({attachments.length}):</span>
                      <button
                        type="button"
                        className="tray-clear-all"
                        onClick={() => setAttachments([])}
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="attachments-cards-list">
                      {attachments.map((att) => (
                        <div key={att.id} className={`attachment-card card-${att.status}`}>
                          <div className="attachment-media">
                            {att.previewUrl ? (
                              <img src={att.previewUrl} alt={att.name} className="attachment-thumb" />
                            ) : (
                              <div className="attachment-icon-badge">
                                {att.type === 'PDF' ? '📄' : att.type === 'Image' ? '🖼️' : att.type === 'Data' ? '📊' : '📑'}
                              </div>
                            )}
                          </div>
                          <div className="attachment-details">
                            <div className="attachment-filename" title={att.name}>{att.name}</div>
                            <div className="attachment-metadata">
                              <span className="att-type-tag">{att.type}</span>
                              {att.size ? <span className="att-size-tag">• {formatBytes(att.size)}</span> : null}
                              <span className={`att-status-tag status-${att.status}`}>• {att.statusText}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="attachment-delete-btn"
                            onClick={() => handleRemoveAttachment(att.id)}
                            title="Remove attachment"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat Input Bar */}
                <div className="chat-input-area">
                  <div className="chat-input-wrapper">
                    {/* Attachment "+" Button with Dropdown Menu */}
                    <div className="attachment-menu-container" ref={attachmentMenuRef}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        multiple
                        accept={fileInputAccept}
                      />
                      <button
                        type="button"
                        className={`chat-plus-btn ${isAttachmentMenuOpen ? 'menu-active' : ''}`}
                        onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                        title="Add investigation evidence files (Images, PDF, Documents, Data)"
                        disabled={!activeCaseId || chatLoading}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>

                      {/* Dropdown Menu */}
                      {isAttachmentMenuOpen && (
                        <div className="attachment-popup-menu">
                          <div className="popup-menu-header">Attach Evidence</div>
                          <button
                            type="button"
                            className="popup-menu-item"
                            onClick={() => triggerFileInput('*')}
                          >
                            <span className="menu-icon">📁</span>
                            <div className="menu-text-block">
                              <span className="menu-title">Add Files</span>
                              <span className="menu-sub">Any evidence format</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="popup-menu-item"
                            onClick={() => triggerFileInput('image/png,image/jpeg,image/webp')}
                          >
                            <span className="menu-icon">🖼️</span>
                            <div className="menu-text-block">
                              <span className="menu-title">Add Images</span>
                              <span className="menu-sub">PNG, JPG, WEBP screenshots</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="popup-menu-item"
                            onClick={() => triggerFileInput('application/pdf')}
                          >
                            <span className="menu-icon">📄</span>
                            <div className="menu-text-block">
                              <span className="menu-title">Add PDF</span>
                              <span className="menu-sub">Bank statements, warrants</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            className="popup-menu-item"
                            onClick={() => triggerFileInput('.doc,.docx,.txt,.csv,.xlsx')}
                          >
                            <span className="menu-icon">📑</span>
                            <div className="menu-text-block">
                              <span className="menu-title">Add Documents</span>
                              <span className="menu-sub">DOCX, TXT, CSV, Excel data</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chat Text Input */}
                    <textarea
                      className="chat-textarea"
                      placeholder={
                        !activeCaseId
                          ? 'Select a case first...'
                          : attachments.length > 0
                          ? 'Ask the AI about these files (or press Send)...'
                          : 'Ask the AI about this investigation...'
                      }
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      onKeyDown={handleKeyPress}
                      rows={1}
                      disabled={!activeCaseId || chatLoading}
                    />

                    {/* Send Button */}
                    <button
                      type="button"
                      className="chat-send-btn"
                      disabled={!activeCaseId || !hasSendableContent || chatLoading}
                      onClick={() => handleSendMessage()}
                      title="Send message to AI assistant"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
