import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../utils/i18n';
import PatternLockInput from './PatternLockInput';
import { isWebAuthnSupported } from '../utils/webauthn';
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
  const { login, loginWithFingerprint } = useAuth();
  const { t } = useI18n();
  const fingerprintAvailable = isWebAuthnSupported();

  const [formData, setFormData] = useState({
    email: '',
    authMethod: 'password',
    password: '',
    pattern: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    // Controlled inputs: update only the changed field.
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear any prior submit errors as the user edits the form.
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      email: formData.email,
      authMethod: formData.authMethod,
      ...(formData.authMethod === 'pattern'
        ? { pattern: formData.pattern }
        : { password: formData.password }),
    };

    // EPIC 1.2.1: Authenticate user via backend and start session
    const result = formData.authMethod === 'fingerprint'
      ? await loginWithFingerprint(formData.email)
      : await login(payload);

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
              <label htmlFor="authMethod">Authentication Method</label>
              <select
                id="authMethod"
                name="authMethod"
                value={formData.authMethod}
                onChange={handleChange}
              >
                <option value="password">Password</option>
                <option value="pattern">Pattern</option>
                {fingerprintAvailable && <option value="fingerprint">Fingerprint</option>}
              </select>
            </div>

            {formData.authMethod === 'password' ? (
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
            ) : (
              formData.authMethod === 'pattern' ? (
                <div className="form-group">
                  <label>Pattern</label>
                  <PatternLockInput
                    id="pattern"
                    value={formData.pattern}
                    onChange={(pattern) => {
                      setFormData((prev) => ({ ...prev, pattern }));
                      setError('');
                    }}
                    disabled={loading}
                    showHint={false}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Fingerprint</label>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                    We will use your device biometric prompt. If it fails, switch to Password or Pattern.
                  </p>
                </div>
              )
            )}

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
