/**
 * Login Component
 * 
 * User authentication interface implementing EPIC 1.2.1 (User Authentication).
 * Provides a secure login form that:
 * - Validates user credentials via backend API
 * - Establishes authenticated session with JWT tokens
 * - Redirects to dashboard on successful authentication
 * - Displays localized error messages on failure
 * 
 * The component delegates authentication logic to AuthContext, which handles:
 * - Backend API communication
 * - JWT token storage (localStorage/sessionStorage)
 * - Global authentication state management
 * - User session persistence
 * 
 * Features:
 * - Controlled form inputs with validation
 * - Loading state during authentication
 * - Error handling with user-friendly messages
 * - Internationalization support via i18n
 * - Animated background for visual appeal
 * - Link to registration for new users
 * 
 * @component
 * @requires context/AuthContext - Authentication state and login method
 * @requires utils/i18n - Internationalization utilities
 * @author SE_Team11
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../utils/i18n';
import './Login.css';

/**
 * Login
 * -----
 * Minimal login form that delegates authentication to `AuthContext.login()`.
 * `AuthContext` is responsible for:
 * - calling the backend
 * - storing the JWT/user
 * - exposing `isAuthenticated` to the rest of the app
 */
const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle form input changes
   * Updates form state for controlled inputs and clears any previous errors
   * 
   * @param {Event} e - Input change event
   */
  const handleChange = (e) => {
    // Controlled inputs: update only the changed field.
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear any prior submit errors as the user edits the form.
    setError('');
  };

  /**
   * Handle login form submission
   * 
   * Authenticates user credentials via AuthContext and handles routing:
   * - On success: redirects to dashboard
   * - On failure: displays localized error message
   * 
   * Implements EPIC 1.2.1: User authentication and session initiation
   * 
   * @async
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // EPIC 1.2.1: Authenticate user via backend and start session
    const result = await login(formData);

    if (result.success) {
      // Successful session start -> route into the learning dashboard.
      navigate('/dashboard');
    } else {
      // Keep error messages user-friendly; fall back when backend doesn't provide one.
      setError(result.error || t('auth.loginFailed'));
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      {/* Animated Background Elements */}
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>
      <div className="shape shape-3"></div>

      <div className="login-content">
        <div className="brand-header">
          <h1 className="app-name">{t('app.name')}</h1>
          <p className="app-tagline">{t('app.tagline')}</p>
        </div>

        <div className="login-card">
          <h2 className="login-title">{t('auth.welcomeBack')}</h2>
          <p className="login-subtitle">{t('auth.loginSubtitle')}</p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">{t('auth.emailAddress')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                aria-required="true"
                aria-label="Email address"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                aria-required="true"
                aria-label="Password"
                autoComplete="current-password"
                minLength={6}
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-animate"
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : t('auth.logIn')}
            </button>
          </form>

          <div className="login-footer">
            <p>
              {t('auth.dontHaveAccount')}{' '}
              <Link to="/register" className="link-primary">
                {t('auth.signUp')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
