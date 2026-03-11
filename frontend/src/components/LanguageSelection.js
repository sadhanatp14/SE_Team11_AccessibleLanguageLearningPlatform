/**
 * LanguageSelection Component
 * 
 * Language preference selection interface implementing EPIC 5.1 (Language Selection).
 * Provides a user-friendly interface for choosing UI and content languages.
 * 
 * Core Features:
 * 
 * 1. Language Options (EPIC 5.1.1):
 *    - Multiple language choices (English, Tamil, Hindi)
 *    - Native language labels for clarity
 *    - Visual language indicators
 *    - Radio button selection interface
 * 
 * 2. Preference Persistence:
 *    - Saves selection via PreferencesContext
 *    - Backend synchronization
 *    - Loads existing preference on mount
 *    - Default to English if no preference set
 * 
 * 3. State Management:
 *    - Loading state during fetch
 *    - Saving state during updates
 *    - Success confirmation
 *    - Error handling with messages
 * 
 * 4. Navigation Integration:
 *    - Accepts 'next' route via location state
 *    - Redirects after successful save
 *    - Can route to dashboard or specified destination
 *    - Prevents navigation before save
 * 
 * 5. Visual Feedback:
 *    - Selection highlighting
 *    - Save button state changes
 *    - Success checkmark display
 *    - Error message display
 *    - Loading indicators
 * 
 * 6. Accessibility:
 *    - Icon-supported options
 *    - Clear visual states
 *    - Keyboard navigation
 *    - Screen reader labels
 *    - High contrast support
 * 
 * Workflow:
 * 1. Component loads existing language preference
 * 2. User selects desired language
 * 3. User confirms selection
 * 4. Preference saved to backend
 * 5. Success message displayed
 * 6. Auto-redirect to next route
 * 
 * Bilingual Mode Integration:
 * - Checks bilingual text mode status
 * - May lock certain language options
 * - Coordinates with content language settings
 * 
 * Related EPICs:
 * - EPIC 5: Multi-language Support
 * - EPIC 5.1: Language selection interface
 * - EPIC 5.1.1: Multiple language options
 * - EPIC 5.2: UI language localization
 * 
 * @component
 * @requires context/PreferencesContext - Preference storage and updates
 * @requires utils/i18n - Internationalization utilities
 * @requires utils/languagePrefs - Language preference helpers
 * @author SE_Team11
 * @version 1.0.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Globe, Languages } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';
import { useI18n } from '../utils/i18n';
import { resolveBilingualTextModeFromPreferences } from '../utils/languagePrefs';
import './LanguageSelection.css';

/**
 * LanguageSelection Component
 * Main interface for selecting UI language preference
 */
const LanguageSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences, loading, updatePreferences } = usePreferences();

  const nextRoute = typeof location?.state?.next === 'string' ? location.state.next : '/dashboard';

  const languageOptions = useMemo(
    () => [
      { value: 'english', label: 'English', nativeLabel: 'English' },
      { value: 'tamil', label: 'Tamil', nativeLabel: 'தமிழ்' },
      { value: 'hindi', label: 'Hindi', nativeLabel: 'हिन्दी' },
    ],
    []
  );

  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (loading) return;
    const pref = preferences?.uiLanguage ?? preferences?.preferredLanguage;
    if (typeof pref === 'string' && pref.trim()) {
      setSelected(pref);
    } else {
      setSelected('english');
    }
  }, [loading, preferences?.uiLanguage, preferences?.preferredLanguage]);

  const selectedOption = languageOptions.find((l) => l.value === selected) || null;
  const { t } = useI18n(selectedOption?.value || preferences?.uiLanguage || preferences?.preferredLanguage);

  const bilingualMode = resolveBilingualTextModeFromPreferences(preferences);
  const isLanguageSelectionLocked = bilingualMode !== 'off';

  const handleContinue = async () => {
    setSaveError('');
    setSaved(false);

    // When Bilingual Text is enabled, language selection is locked.
    // User can still proceed without changing UI language.
    if (isLanguageSelectionLocked) {
      navigate(nextRoute);
      return;
    }

    if (!selectedOption) {
      setSaveError(t('language.chooseError'));
      return;
    }

    setSaving(true);
    try {
      const result = await updatePreferences({ uiLanguage: selectedOption.value });
      if (!result?.success) {
        throw new Error(result?.error || 'Failed to save language');
      }
      setSaved(true);
      navigate(nextRoute);
    } catch (e) {
      setSaveError(e?.message || t('language.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="language-selection">
        <div className="language-card" role="status" aria-live="polite">
          <div className="language-header">
            <Globe size={22} aria-hidden="true" />
            <h1>{t('language.chooseTitle')}</h1>
          </div>
          <p>{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="language-selection">
      <div className="language-card">
        <div className="language-header">
          <div className="language-title">
            <Globe size={22} aria-hidden="true" />
            <h1>{t('language.chooseTitle')}</h1>
          </div>
          <p className="language-subtitle">{t('language.subtitle')}</p>
        </div>

        {isLanguageSelectionLocked ? (
          <div className="language-locked" role="note">
            {t('language.lockedByBilingual')}
          </div>
        ) : null}

        <div className="language-options" role="radiogroup" aria-label={t('language.optionsLabel')}>
          {languageOptions.map((opt) => {
            const isSelected = opt.value === selected;
            return (
              <button
                key={opt.value}
                type="button"
                className={`language-option${isSelected ? ' selected' : ''}`}
                role="radio"
                aria-checked={isSelected}
                disabled={isLanguageSelectionLocked}
                aria-disabled={isLanguageSelectionLocked}
                onClick={() => {
                  if (isLanguageSelectionLocked) return;
                  setSelected(opt.value);
                  setSaved(false);
                  setSaveError('');
                }}
              >
                <div className="language-option__left">
                  <Languages size={18} aria-hidden="true" />
                  <div className="language-option__text">
                    <span className="language-option__label">{opt.label}</span>
                    <span className="language-option__native">{opt.nativeLabel}</span>
                  </div>
                </div>
                {isSelected ? <CheckCircle2 size={18} aria-hidden="true" /> : <span className="language-option__dot" />}
              </button>
            );
          })}
        </div>

        <div className="language-confirm" aria-live="polite">
          {selectedOption ? (
            <div className="language-confirm__ok">
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>
                {t('language.selectedPrefix')} <strong>{selectedOption.label}</strong> ({selectedOption.nativeLabel})
              </span>
              {saved ? <span className="language-confirm__saved">{t('language.saved')}</span> : null}
            </div>
          ) : (
            <div className="language-confirm__hint">{t('language.chooseToContinue')}</div>
          )}

          {saveError ? (
            <div className="language-error" role="alert">
              {saveError}
            </div>
          ) : null}
        </div>

        <div className="language-actions">
          <button
            type="button"
            className="language-btn primary"
            data-testid="language-continue"
            onClick={handleContinue}
            disabled={saving}
          >
            {saving ? t('app.saving') : t('app.continue')}
          </button>
          <button
            type="button"
            className="language-btn secondary"
            data-testid="language-skip"
            onClick={() => navigate(nextRoute)}
            disabled={saving}
            title={t('language.continueWithoutChanging')}
          >
            {t('app.skip')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;
