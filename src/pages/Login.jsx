import React, { useState } from 'react';
import api from '../api';

export default function Login({ onLoginSuccess, onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({
        email: email.trim(),
        password,
      });

      const user = (res && res.user) || { email: email.trim() };
      onLoginSuccess(user);
    } catch (err) {
      if (err.isConnectionError) {
        setError('Unable to connect to the investigation server. Please try again.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Auth Brand Header */}
        <div className="auth-header">
          <div className="auth-logo-row">
            <span className="auth-logo-badge">FCIS</span>
            <span className="auth-logo-text">Financial Crime Portal</span>
          </div>
          <h2 className="auth-title">Admin Sign In</h2>
          <p className="auth-subtitle">
            Enter credentials to access the Financial Crime Investigation System
          </p>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Admin Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="e.g. admin@fcis.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter secure password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Investigation Portal'}
          </button>
        </form>

        <div className="auth-footer">
          <span>First-time setup? </span>
          <button
            type="button"
            className="auth-link-btn"
            onClick={() => onNavigate('signup')}
          >
            Create Admin Account
          </button>
        </div>

        <div className="auth-notice">
          <span>Official Fraud & Financial Intelligence Console</span>
        </div>
      </div>
    </div>
  );
}
