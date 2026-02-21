import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../utils/i18n';
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
  const { register } = useAuth();
  const { t } = useI18n();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    learningCondition: 'none',
    age: '',
    isMinor: false,
    parentEmail: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
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
    const { confirmPassword, ...registrationData } = formData;
    // Normalize age to number or omit it entirely.
    registrationData.age = parseInt(registrationData.age) || undefined;

    // Only send `parentEmail` when minor flow is enabled.
    if (!registrationData.isMinor) {
      delete registrationData.parentEmail;
    }

    const result = await register(registrationData);

    if (result.success) {
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

            <div className="form-group">
              <label htmlFor="learningCondition">
                {t('auth.learningCondition')} * <span className="help-text">{t('auth.learningConditionHelp')}</span>
              </label>
              <select
                id="learningCondition"
                name="learningCondition"
                value={formData.learningCondition}
                onChange={handleChange}
                required
                aria-required="true"
              >
                <option value="none">{t('auth.selectLearningCondition')}</option>
                <option value="dyslexia">Dyslexia</option>
                <option value="adhd">ADHD</option>
                <option value="autism">Autism Spectrum</option>
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
                min="3"
                max="100"
                placeholder="Age"
              />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isMinor"
                  checked={formData.isMinor}
                  onChange={handleChange}
                />
                <span>{t('auth.under13')}</span>
              </label>
            </div>

            {formData.isMinor && (
              <div className="form-group">
                <label htmlFor="parentEmail">{t('auth.parentEmail')} *</label>
                <input
                  type="email"
                  id="parentEmail"
                  name="parentEmail"
                  value={formData.parentEmail}
                  onChange={handleChange}
                  required={formData.isMinor}
                  autoComplete="email"
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
