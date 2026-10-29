import React, { useState } from 'react';
import api from '../api';

export default function Signup({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.auth.signup({
        email: email.trim(),
        password,
      });

      setSuccess('Admin account created successfully. Redirecting to sign in...');
      setTimeout(() => {
        onNavigate('login');
      }, 1200);
    } catch (err) {
      if (err.isConnectionError) {
        setError('Unable to connect to the investigation server. Please try again.');
      } else {
        setError(err.message || 'Unable to create the account. Please try again.');
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
          <h2 className="auth-title">Admin Account Setup</h2>
          <p className="auth-subtitle">
            Configure system administrator credentials for the investigation console
          </p>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}
        {success && <div className="form-success" role="alert">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">
              Admin Email Address
            </label>
            <input
              id="signup-email"
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
            <label className="form-label" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              className="form-input"
              placeholder="Choose a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirm-password">
              Confirm Password
            </label>
            <input
              id="signup-confirm-password"
              type="password"
              className="form-input"
              placeholder="Re-type your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register Admin Account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <button
            type="button"
            className="auth-link-btn"
            onClick={() => onNavigate('login')}
          >
            Sign In Here
          </button>
        </div>

        <div className="auth-notice">
          <span>Authentication is processed securely by Flask and stored in SQL</span>
        </div>
      </div>
    </div>
  );
}
