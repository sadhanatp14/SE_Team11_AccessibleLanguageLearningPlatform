import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import './AccessibilitySetup.css';

/**
 * AccessibilitySetup
 * ------------------
 * Condition-aware onboarding wizard that collects accessibility preferences
 * (visual settings for everyone + ADHD/Autism add-on steps) and persists them
 * via `PreferencesContext.updatePreferences()`.
 *
 * Notes:
 * - UI state lives locally in `settings` while the user navigates steps.
 * - On submit we build a minimal payload (only fields relevant to the condition)
 *   so we don't accidentally overwrite unrelated preference fields server-side.
 */
const AccessibilitySetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updatePreferences } = usePreferences();

  const activeCondition = user?.learningCondition;

  const steps = useMemo(() => {
    // EPIC 1.3.1: Wizard steps are condition-aware (base visual + condition add-ons)
    const baseSteps = [{ key: 'visual', title: 'Visual Settings' }];

    if (activeCondition === 'adhd') {
      baseSteps.push({ key: 'learning', title: 'Learning Preferences' });
    }

    if (activeCondition === 'autism') {
      baseSteps.push({ key: 'focus', title: 'Focus & Environment' });
    }

    return baseSteps;
  }, [activeCondition]);

  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState({
    // EPIC 1.3.3: Condition-specific default preferences for a good first-run experience
    fontSize: 'medium',
    contrastTheme: 'default',
    fontFamily: user?.learningCondition === 'dyslexia' ? 'opendyslexic' : 'default',
    letterSpacing: user?.learningCondition === 'dyslexia' ? 'wide' : 'normal',
    wordSpacing: 'normal',
    lineHeight: user?.learningCondition === 'dyslexia' ? 'relaxed' : 'normal',
    learningPace: 'normal',
    sessionDuration: 20,
    breakReminders: false,
    distractionFreeMode: user?.learningCondition === 'autism',
    reduceAnimations: user?.learningCondition === 'autism',
    simplifiedLayout: user?.learningCondition === 'autism',
  });

  /**
   * Generic state updater for button/checkbox controls.
   * Keeping it centralized makes it easy to add new settings.
   */
  const handleChange = (name, value) => {
    setSettings({ ...settings, [name]: value });
  };

  /** Advance within the wizard step list (1-indexed). */
  const nextStep = () => {
    if (step < steps.length) {
      setStep(step + 1);
    }
  };

  /** Go back within the wizard step list (1-indexed). */
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  /**
   * Persist preferences and then route into the main learning dashboard.
   * The payload is condition-scoped to avoid overwriting fields that the
   * current user never configured in this wizard.
   */
  const handleSubmit = async () => {
    // EPIC 1.3.2: Persist wizard selections to backend preferences
    const payload = {
      fontSize: settings.fontSize,
      contrastTheme: settings.contrastTheme,
      wordSpacing: settings.wordSpacing,
      lineHeight: settings.lineHeight,
    };

    if (activeCondition === 'dyslexia') {
      payload.fontFamily = settings.fontFamily;
      payload.letterSpacing = settings.letterSpacing;
    }

    if (activeCondition === 'adhd') {
      payload.learningPace = settings.learningPace;
      payload.sessionDuration = 20;
      payload.breakReminders = true;
    }

    if (activeCondition === 'autism') {
      payload.distractionFreeMode = settings.distractionFreeMode;
      payload.reduceAnimations = settings.reduceAnimations;
      payload.simplifiedLayout = settings.simplifiedLayout;
    }

    const result = await updatePreferences(payload);
    if (result.success) {
      // EPIC 1.3.4: Continue into the learning dashboard after setup
      navigate('/dashboard');
    }
  };

  /**
   * Skip keeps onboarding optional; users can revisit settings later.
   * (We intentionally do not persist anything here.)
   */
  const skipSetup = () => {
    // EPIC 1.3.4: Setup wizard can be skipped
    navigate('/dashboard');
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1 className="setup-title">Customize Your Experience</h1>
        <p className="setup-subtitle">
          Let's set up your accessibility preferences for the best learning experience
        </p>

        <div className="progress-bar">
          {steps.map((_, index) => (
            <React.Fragment key={steps[index].key}>
              <div className="progress-step" data-active={step >= index + 1}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className="progress-line" data-active={step >= index + 2}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="setup-content">
          {steps[step - 1]?.key === 'visual' && (
            <div className="step-content">
              <h2>Visual Settings</h2>
              <p className="step-description">
                Adjust how text and content appear on your screen
              </p>

              <div className="setting-group">
                <label>Text Size</label>
                <div className="button-group">
                  {['small', 'medium', 'large', 'extra-large'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`option-btn ${settings.fontSize === size ? 'active' : ''}`}
                      onClick={() => handleChange('fontSize', size)}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <label>Color Theme</label>
                <div className="button-group">
                  {[
                    { value: 'default', label: 'Default' },
                    { value: 'high-contrast', label: 'High Contrast' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'yellow-black', label: 'Yellow on Black' },
                  ].map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      className={`option-btn ${settings.contrastTheme === theme.value ? 'active' : ''}`}
                      onClick={() => handleChange('contrastTheme', theme.value)}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {user?.learningCondition === 'dyslexia' && (
                <>
                  <div className="setting-group">
                    <label>Font Style</label>
                    <div className="button-group">
                      {[
                        { value: 'opendyslexic', label: 'OpenDyslexic' },
                        { value: 'arial', label: 'Arial' },
                        { value: 'comic-sans', label: 'Comic Sans' },
                      ].map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          className={`option-btn ${settings.fontFamily === font.value ? 'active' : ''}`}
                          onClick={() => handleChange('fontFamily', font.value)}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Letter Spacing</label>
                    <div className="button-group">
                      {['normal', 'wide', 'extra-wide'].map((spacing) => (
                        <button
                          key={spacing}
                          type="button"
                          className={`option-btn ${settings.letterSpacing === spacing ? 'active' : ''}`}
                          onClick={() => handleChange('letterSpacing', spacing)}
                        >
                          {spacing.charAt(0).toUpperCase() + spacing.slice(1).replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {steps[step - 1]?.key === 'learning' && (
            <div className="step-content">
              <h2>Learning Preferences</h2>
              <p className="step-description">
                Set your preferences for learning sessions
              </p>

              {user?.learningCondition === 'adhd' && (
                <div className="setting-group">
                  <label>Learning Pace</label>
                  <div className="button-group">
                    {['slow', 'normal', 'fast'].map((pace) => (
                      <button
                        key={pace}
                        type="button"
                        className={`option-btn ${settings.learningPace === pace ? 'active' : ''}`}
                        onClick={() => handleChange('learningPace', pace)}
                      >
                        {pace.charAt(0).toUpperCase() + pace.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {steps[step - 1]?.key === 'focus' && (
            <div className="step-content">
              <h2>Focus & Environment</h2>
              <p className="step-description">
                Optimize your learning environment to your needs
              </p>

              {user?.learningCondition === 'autism' && (
                <div className="setting-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.distractionFreeMode}
                      onChange={(e) => handleChange('distractionFreeMode', e.target.checked)}
                    />
                    <span>Enable distraction-free mode</span>
                  </label>
                  <p className="help-text">Removes unnecessary UI elements</p>
                </div>
              )}

              {(user?.learningCondition === 'autism') && (
                <>
                  <div className="setting-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.reduceAnimations}
                        onChange={(e) => handleChange('reduceAnimations', e.target.checked)}
                      />
                      <span>Reduce animations</span>
                    </label>
                    <p className="help-text">Minimizes moving elements</p>
                  </div>

                  <div className="setting-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.simplifiedLayout}
                        onChange={(e) => handleChange('simplifiedLayout', e.target.checked)}
                      />
                      <span>Use simplified layout</span>
                    </label>
                    <p className="help-text">Cleaner, more predictable interface</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="setup-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={skipSetup}
          >
            Skip for Now
          </button>

          <div className="action-buttons">
            {step > 1 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={prevStep}
              >
                Back
              </button>
            )}

            {step < steps.length ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                Save & Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilitySetup;
