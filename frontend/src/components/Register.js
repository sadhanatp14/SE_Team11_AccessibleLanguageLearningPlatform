import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../utils/i18n';
import PatternLockInput from './PatternLockInput';
import { isWebAuthnSupported } from '../utils/webauthn';
import './Register.css';

/**
 * Register
 * --------
 * Account creation form with client-side validation.
 * The backend still enforces the real constraints; these checks exist to:
 * - provide immediate feedback (password/age/parent-email)
 * - reduce round trips on obvious mistakes
 *
 * After a successful registration, users are routed into `AccessibilitySetup`
 * to select accessibility preferences before starting lessons.
 */
const Register = () => {
  const navigate = useNavigate();
  const { register, setupFingerprint } = useAuth();
  const { t } = useI18n();
  const fingerprintAvailable = isWebAuthnSupported();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    authMethod: 'password',
    password: '',
    confirmPassword: '',
    pattern: '',
    confirmPattern: '',
    learningCondition: 'none',
    age: '',
    isMinor: false,
    parentEmail: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enableFingerprint, setEnableFingerprint] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Controlled inputs: checkboxes use `checked`, everything else uses `value`.
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    // Clear any prior error as the user edits the form.
    setError('');
  };

  const validateForm = () => {
    // EPIC 1.1.1: Client-side registration validation for better UX (server still validates)
    const isPattern = formData.authMethod === 'pattern';
    const patternParts = String(formData.pattern || '').split('-').filter(Boolean);
    const uniquePatternParts = new Set(patternParts);

    if (isPattern) {
      if (patternParts.length < 4 || uniquePatternParts.size !== patternParts.length) {
        setError('Pattern must include at least 4 unique dots');
        return false;
      }
      if (formData.pattern !== formData.confirmPattern) {
        setError('Patterns do not match');
        return false;
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }
    }

    // Age is optional; when provided, enforce a reasonable range.
    const age = parseInt(formData.age);
    if (age && (age < 3 || age > 100)) {
      setError('Please enter a valid age (3-100)');
      return false;
    }

    if (age && age < 13 && !formData.isMinor) {
      setError('If you are under 13, please check the under 13 box (parental approval required)');
      return false;
    }

    if (formData.isMinor && !formData.parentEmail) {
      setError('Parent email is required for minor accounts');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    // Remove fields that the backend doesn't need.
    const { confirmPassword, confirmPattern, ...registrationData } = formData;
    // Normalize age to number or omit it entirely.
    registrationData.age = parseInt(registrationData.age) || undefined;

    // Only send `parentEmail` when minor flow is enabled.
    if (!registrationData.isMinor) {
      delete registrationData.parentEmail;
    }

    if (registrationData.authMethod === 'pattern') {
      delete registrationData.password;
      registrationData.pattern = registrationData.pattern || '';
    } else {
      delete registrationData.pattern;
    }

    const result = await register(registrationData);

    if (result.success) {
      if (enableFingerprint && fingerprintAvailable) {
        const fpResult = await setupFingerprint();
        if (!fpResult.success) {
          console.warn('Fingerprint setup skipped:', fpResult.error);
        }
      }
      // EPIC 5.1: Let the learner pick a preferred UI language before setup.
      navigate('/language', { state: { next: '/accessibility-setup' } });
    } else {
      setError(result.error || t('auth.registerFailed'));
    }

    setLoading(false);
  };

  return (
    <div className="register-container">
      {/* Animated Background Elements */}
      <div className="shape shape-1"></div>
      <div className="shape shape-2"></div>
      <div className="shape shape-3"></div>

      <div className="register-content">
        <div className="brand-header">
          <h1 className="app-name">{t('app.name')}</h1>
          <p className="app-tagline">{t('app.tagline')}</p>
        </div>

        <div className="register-card">
          <h2 className="register-title">{t('auth.createAccount')}</h2>
          <p className="register-subtitle">
            {t('auth.registerSubtitle')}
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="name">{t('auth.fullName')} *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                aria-required="true"
                autoComplete="name"
                placeholder={t('auth.namePlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">{t('auth.emailAddress')} *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                aria-required="true"
                autoComplete="email"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="authMethod">Authentication Method *</label>
              <select
                id="authMethod"
                name="authMethod"
                value={formData.authMethod}
                onChange={handleChange}
                required
                aria-required="true"
              >
                <option value="password">Password</option>
                <option value="pattern">Pattern</option>
              </select>
            </div>

            {formData.authMethod === 'password' ? (
              <>
                <div className="form-group">
                  <label htmlFor="password">
                    {t('auth.password')} * <span className="help-text">(Minimum 6 characters)</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    minLength={6}
                    autoComplete="new-password"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">{t('auth.confirmPassword')} *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    aria-required="true"
                    minLength={6}
                    autoComplete="new-password"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Pattern (connect at least 4 dots) *</label>
                  <PatternLockInput
                    id="pattern"
                    value={formData.pattern}
                    onChange={(pattern) => {
                      setFormData((prev) => ({ ...prev, pattern }));
                      setError('');
                    }}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label>Confirm Pattern *</label>
                  <PatternLockInput
                    id="confirmPattern"
                    value={formData.confirmPattern}
                    onChange={(confirmPattern) => {
                      setFormData((prev) => ({ ...prev, confirmPattern }));
                      setError('');
                    }}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            {fingerprintAvailable && (
              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="enableFingerprint"
                  checked={enableFingerprint}
                  onChange={(e) => setEnableFingerprint(e.target.checked)}
                />
                <label htmlFor="enableFingerprint">Set up fingerprint login (optional)</label>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="learningCondition">{t('auth.learningCondition')} *</label>
              <select
                id="learningCondition"
                name="learningCondition"
                value={formData.learningCondition}
                onChange={handleChange}
                required
                aria-required="true"
              >
                <option value="none">None</option>
                <option value="dyslexia">Dyslexia</option>
                <option value="adhd">ADHD</option>
                <option value="autism">Autism</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="age">{t('auth.ageOptional')}</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                min={3}
                max={100}
                placeholder={t('auth.ageOptional')}
              />
            </div>

            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="isMinor"
                name="isMinor"
                checked={formData.isMinor}
                onChange={handleChange}
              />
              <label htmlFor="isMinor">{t('auth.under13')}</label>
            </div>

            {formData.isMinor && (
              <div className="form-group">
                <label htmlFor="parentEmail">{t('auth.parentEmail')}</label>
                <input
                  type="email"
                  id="parentEmail"
                  name="parentEmail"
                  value={formData.parentEmail}
                  onChange={handleChange}
                  placeholder={t('auth.parentEmailPlaceholder')}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-animate"
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : t('auth.createAccount')}
            </button>
          </form>

          <div className="register-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="link-primary">
                {t('auth.logIn')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
