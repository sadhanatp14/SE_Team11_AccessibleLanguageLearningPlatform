import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useI18n } from '../utils/i18n';
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
  const { t } = useI18n();

  const activeCondition = user?.learningCondition;

  const steps = useMemo(() => {
    // EPIC 1.3.1: Wizard steps are condition-aware (base visual + condition add-ons)
    const baseSteps = [{ key: 'visual', title: t('setup.visualTitle') }];

    if (activeCondition === 'adhd') {
      baseSteps.push({ key: 'learning', title: t('setup.learningTitle') });
    }

    if (activeCondition === 'autism') {
      baseSteps.push({ key: 'focus', title: t('setup.focusTitle') });
    }

    return baseSteps;
  }, [activeCondition, t]);

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
        <h1 className="setup-title">{t('setup.title')}</h1>
        <p className="setup-subtitle">
          {t('setup.subtitle')}
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
              <h2>{t('setup.visualTitle')}</h2>
              <p className="step-description">
                {t('setup.visualDesc')}
              </p>

              <div className="setting-group">
                <label>{t('setup.textSize')}</label>
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
                <label>{t('setup.colorTheme')}</label>
                <div className="button-group">
                  {[
                    { value: 'default', label: t('setup.defaultTheme') },
                    { value: 'high-contrast', label: t('setup.highContrast') },
                    { value: 'dark', label: t('setup.dark') },
                    { value: 'yellow-black', label: t('setup.yellowOnBlack') },
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
                    <label>{t('setup.fontStyle')}</label>
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
                    <label>{t('setup.letterSpacing')}</label>
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
              <h2>{t('setup.learningTitle')}</h2>
              <p className="step-description">
                {t('setup.learningDesc')}
              </p>

              {user?.learningCondition === 'adhd' && (
                <div className="setting-group">
                  <label>{t('setup.learningPace')}</label>
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
              <h2>{t('setup.focusTitle')}</h2>
              <p className="step-description">
                {t('setup.focusDesc')}
              </p>

              {user?.learningCondition === 'autism' && (
                <div className="setting-group checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={settings.distractionFreeMode}
                      onChange={(e) => handleChange('distractionFreeMode', e.target.checked)}
                    />
                    <span>{t('setup.distractionFreeEnable')}</span>
                  </label>
                  <p className="help-text">{t('setup.distractionFreeHelp')}</p>
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
                      <span>{t('setup.reduceAnimations')}</span>
                    </label>
                      <p className="help-text">{t('setup.reduceAnimationsHelp')}</p>
                  </div>

                  <div className="setting-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={settings.simplifiedLayout}
                        onChange={(e) => handleChange('simplifiedLayout', e.target.checked)}
                      />
                      <span>{t('setup.simplifiedLayout')}</span>
                    </label>
                      <p className="help-text">{t('setup.simplifiedLayoutHelp')}</p>
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
            {t('setup.skipSetup')}
          </button>

          <div className="action-buttons">
            {step > 1 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={prevStep}
              >
                {t('app.back')}
              </button>
            )}

            {step < steps.length ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
              >
                {t('setup.next')}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                {t('app.continue')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilitySetup;
