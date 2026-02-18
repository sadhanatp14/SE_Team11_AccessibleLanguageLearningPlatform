import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
      // EPIC 1.3.1: After registration, route learner into accessibility setup wizard
      navigate('/accessibility-setup');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
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
          <h1 className="app-name">LinguaEase</h1>
          <p className="app-tagline">Language and Learning made easy for every mind</p>
        </div>

        <div className="register-card">
          <h2 className="register-title">Create Your Account</h2>
          <p className="register-subtitle">
            Join our accessible learning community
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                aria-required="true"
                autoComplete="name"
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                aria-required="true"
                autoComplete="email"
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password * <span className="help-text">(Minimum 6 characters)</span>
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
                placeholder="Create a password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
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
                placeholder="Confirm your password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="learningCondition">
                Learning Condition * <span className="help-text">(This helps us customize your experience)</span>
              </label>
              <select
                id="learningCondition"
                name="learningCondition"
                value={formData.learningCondition}
                onChange={handleChange}
                required
                aria-required="true"
              >
                <option value="none">Select your learning condition</option>
                <option value="dyslexia">Dyslexia</option>
                <option value="adhd">ADHD</option>
                <option value="autism">Autism Spectrum</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="age">Age (optional)</label>
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
                <span>I am under 13 years old (requires parental approval)</span>
              </label>
            </div>

            {formData.isMinor && (
              <div className="form-group">
                <label htmlFor="parentEmail">Parent/Guardian Email *</label>
                <input
                  type="email"
                  id="parentEmail"
                  name="parentEmail"
                  value={formData.parentEmail}
                  onChange={handleChange}
                  required={formData.isMinor}
                  autoComplete="email"
                  placeholder="Parent's email"
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-animate"
              disabled={loading}
            >
              {loading ? <span className="spinner"></span> : 'Create Account'}
            </button>
          </form>

          <div className="register-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="link-primary">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
