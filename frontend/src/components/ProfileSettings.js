/**
 * ProfileSettings Component
 * 
 * Modal settings panel providing user profile management and accessibility
 * preference configuration, implementing EPIC 1.7 (Preference Management).
 * 
 * Core Features:
 * 
 * 1. Two-Tab Interface:
 *    - Profile Tab: User information display and editing
 *    - Accessibility Tab: Preference configuration
 * 
 * 2. Profile Management:
 *    - Display user details (name, email, age, condition)
 *    - Edit mode for updating profile information
 *    - Read-only view by default for data integrity
 *    - Logout functionality
 *    - Placeholder for backend profile updates
 * 
 * 3. Accessibility Preferences (EPIC 1.7.2):
 *    - Font size adjustment (small, medium, large, x-large)
 *    - Contrast themes (default, high-contrast, dark, light)
 *    - Font family selection (default, OpenDyslexic, Comic Sans)
 *    - Letter spacing (normal, wide, wider)
 *    - Learning pace (slow, normal, fast)
 *    - UI language selection (English, Spanish, French)
 *    - Bilingual text mode (off, side-by-side, sequential)
 *    - Distraction-free mode (autism-specific)
 * 
 * 4. Preference Persistence (EPIC 1.7.3):
 *    - Real-time updates via PreferencesContext
 *    - Backend synchronization
 *    - Immediate application to UI
 *    - Cross-device preference sync
 * 
 * 5. Bilingual Mode Integration (EPIC 5.3):
 *    - Side-by-side text display option
 *    - Sequential text presentation
 *    - Locks UI language when bilingual mode active
 *    - Supports language learning workflows
 * 
 * 6. Condition-Specific Options:
 *    - Distraction-free mode for autism users
 *    - Pace controls for ADHD users
 *    - Font/spacing for dyslexia users
 *    - Conditional feature display
 * 
 * Modal Behavior:
 * - Overlay with centered positioning
 * - Keyboard-accessible (ESC to close)
 * - Click outside to dismiss
 * - Smooth transitions
 * - Visual feedback on saves
 * 
 * Related EPICs:
 * - EPIC 1.7: Preference persistence and management
 * - EPIC 1.7.2: Update accessibility settings
 * - EPIC 1.7.3: Apply preferences to UI
 * - EPIC 5: Multi-language support
 * - EPIC 5.3: Bilingual text mode
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onClose - Callback to close the settings modal
 * @requires context/AuthContext - User profile and logout
 * @requires context/PreferencesContext - Preference storage and updates
 * @requires utils/i18n - Localized UI text
 * @author SE_Team11
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { Accessibility, Check, LogOut, User, X } from 'lucide-react';
import { useI18n } from '../utils/i18n';
import { resolveBilingualTextModeFromPreferences, resolveUiLanguageFromPreferences } from '../utils/languagePrefs';
import './ProfileSettings.css';

/**
 * ProfileSettings
 * ---------------
 * Modal settings panel with two tabs:
 * - Profile: read-only details (plus a placeholder edit UI)
 * - Accessibility: updates persisted preferences via `PreferencesContext`
 *
 * The component intentionally keeps "profile update" as a stub (alert) unless
 * backend endpoints exist for profile mutation.
 */
const ProfileSettings = ({ onClose }) => {
  const { user, logout } = useAuth();
  const { preferences, updateAccessibilitySettings } = usePreferences();
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState('profile');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    age: user?.age || '',
  });

  const [accessibilitySettings, setAccessibilitySettings] = useState({
    fontSize: preferences?.fontSize || 'medium',
    contrastTheme: preferences?.contrastTheme || 'default',
    learningPace: preferences?.learningPace || 'normal',
    fontFamily: preferences?.fontFamily || 'default',
    letterSpacing: preferences?.letterSpacing || 'normal',
    uiLanguage: resolveUiLanguageFromPreferences(preferences),
    bilingualTextMode: resolveBilingualTextModeFromPreferences(preferences),
    distractionFreeMode: user?.learningCondition === 'autism' ? (preferences?.distractionFreeMode || false) : false,
  });

  const uiLanguageValue = accessibilitySettings?.uiLanguage || 'english';
  const bilingualMode = accessibilitySettings?.bilingualTextMode || 'off';
  const isLanguageSelectionLocked = bilingualMode !== 'off';

  // Sync local state with preferences when they change
  useEffect(() => {
    if (preferences) {
      // Keep the modal UI aligned with the latest persisted preferences.
      setAccessibilitySettings({
        fontSize: preferences.fontSize || 'medium',
        contrastTheme: preferences.contrastTheme || 'default',
        learningPace: preferences.learningPace || 'normal',
        fontFamily: preferences.fontFamily || 'default',
        letterSpacing: preferences.letterSpacing || 'normal',
        uiLanguage: resolveUiLanguageFromPreferences(preferences),
        bilingualTextMode: resolveBilingualTextModeFromPreferences(preferences),
        distractionFreeMode: user?.learningCondition === 'autism' ? (preferences.distractionFreeMode || false) : false,
      });
    }
  }, [preferences, user?.learningCondition]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    // Local-only editing for now; no backend update is performed.
    setProfileData({ ...profileData, [name]: value });
  };

  const handleAccessibilityChange = (name, value) => {
    // Local state first; persist only when user clicks "Save Settings".
    setAccessibilitySettings({ ...accessibilitySettings, [name]: value });
  };

  const saveAccessibilitySettings = async () => {
    // EPIC 1.3.2 / 1.7.3: Persist preference changes from in-app settings panel
    const payload = { ...accessibilitySettings };
    // If bilingual text is enabled, uiLanguage is intentionally locked.
    // Avoid sending accidental uiLanguage changes when locked.
    if ((payload?.bilingualTextMode || 'off') !== 'off') {
      delete payload.uiLanguage;
    }

    const result = await updateAccessibilitySettings(payload);
    if (result.success) {
      alert(t('settings.updatedOk'));
    } else {
      alert(`${t('settings.updatedErrPrefix')} ${result.error}`);
    }
  };

  const handleLogout = () => {
    // Confirm reduces accidental logouts from a modal.
    if (window.confirm(t('settings.logoutConfirm'))) {
      logout();
    }
  };

  return (
    <div className="profile-settings-modal">
      <div className="settings-overlay" onClick={onClose}></div>
      <div className="settings-card">
        <div className="settings-header">
          <h2>{t('settings.title')}</h2>
          <button className="close-btn" onClick={onClose} aria-label={t('settings.close')}><X size={18} aria-hidden="true" /></button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={16} aria-hidden="true" />
            <span>{t('settings.profileTab')}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'accessibility' ? 'active' : ''}`}
            onClick={() => setActiveTab('accessibility')}
          >
            <Accessibility size={16} aria-hidden="true" />
            <span>{t('settings.accessibilityTab')}</span>
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="settings-content">
            <h3>{t('settings.profileInfo')}</h3>
            {!profileEditing ? (
              <div className="profile-info">
                <div className="info-item">
                  <label>{t('settings.name')}</label>
                  <p>{user?.name}</p>
                </div>
                <div className="info-item">
                  <label>{t('settings.email')}</label>
                  <p>{user?.email}</p>
                </div>
                <div className="info-item">
                  <label>{t('settings.learningCondition')}</label>
                  <p>{user?.learningCondition?.charAt(0).toUpperCase() + user?.learningCondition?.slice(1)}</p>
                </div>
                {user?.age && (
                  <div className="info-item">
                    <label>{t('settings.age')}</label>
                    <p>{user?.age}</p>
                  </div>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => setProfileEditing(true)}
                >
                  {t('settings.editProfile')}
                </button>
              </div>
            ) : (
              <form className="profile-form">
                <div className="form-group">
                  <label htmlFor="name">{t('settings.name')}</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="age">{t('settings.age')}</label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={profileData.age}
                    onChange={handleProfileChange}
                    min="3"
                    max="100"
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setProfileEditing(false)}
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      alert(t('settings.comingSoon'));
                      setProfileEditing(false);
                    }}
                  >
                    {t('settings.saveChanges')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'accessibility' && (
          <div className="settings-content">
            <h3>{t('settings.accessibilityPrefs')}</h3>

            <div className="setting-group">
              <label>{t('settings.language')}</label>
              <div className="button-group" role="radiogroup" aria-label="Preferred language">
                {[
                  { value: 'english', label: 'English' },
                  { value: 'tamil', label: 'Tamil' },
                  { value: 'hindi', label: 'Hindi' },
                ].map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    className={`option-btn ${uiLanguageValue === lang.value ? 'active' : ''}`}
                    role="radio"
                    aria-checked={uiLanguageValue === lang.value}
                    disabled={isLanguageSelectionLocked}
                    aria-disabled={isLanguageSelectionLocked}
                    onClick={() => {
                      if (isLanguageSelectionLocked) return;
                      handleAccessibilityChange('uiLanguage', lang.value);
                    }}
                    title={
                      isLanguageSelectionLocked
                        ? t('settings.languageLockedByBilingual')
                        : `Switch language to ${lang.label}`
                    }
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <p className="setting-help" aria-live="polite">
                {t('settings.selected')}{' '}
                {(() => {
                  const map = {
                    english: 'English',
                    tamil: 'Tamil',
                    hindi: 'Hindi',
                  };
                  return map[uiLanguageValue] || String(uiLanguageValue || 'English');
                })()}
              </p>
              {isLanguageSelectionLocked ? (
                <p className="setting-help" role="note">
                  {t('settings.languageLockedByBilingual')}
                </p>
              ) : null}
            </div>

            <div className="setting-group">
              <label>{t('settings.bilingualText')}</label>
              <div className="button-group" role="radiogroup" aria-label="Bilingual text mode">
                {[
                  { value: 'off', label: t('settings.bilingualOff') },
                  { value: 'english_tamil', label: 'English + Tamil' },
                  { value: 'english_hindi', label: 'English + Hindi' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`option-btn ${bilingualMode === option.value ? 'active' : ''}`}
                    role="radio"
                    aria-checked={bilingualMode === option.value}
                    onClick={() => handleAccessibilityChange('bilingualTextMode', option.value)}
                    title={`Set bilingual mode to ${option.label}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="setting-help" aria-live="polite">
                {t('settings.selected')}{' '}
                {(() => {
                  const map = {
                    off: t('settings.bilingualOff'),
                    english_tamil: 'English + Tamil',
                    english_hindi: 'English + Hindi',
                  };
                  return map[bilingualMode] || t('settings.bilingualOff');
                })()}
              </p>
            </div>

            <div className="setting-group">
              <label>{t('settings.textSize')}</label>
              <div className="button-group">
                {['small', 'medium', 'large', 'extra-large'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={`option-btn ${accessibilitySettings.fontSize === size ? 'active' : ''}`}
                    onClick={() => handleAccessibilityChange('fontSize', size)}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label>{t('settings.colorTheme')}</label>
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
                    className={`option-btn ${accessibilitySettings.contrastTheme === theme.value ? 'active' : ''}`}
                    onClick={() => handleAccessibilityChange('contrastTheme', theme.value)}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {user?.learningCondition === 'adhd' && (
              <div className="setting-group">
                <label>{t('settings.pace')}</label>
                <div className="button-group">
                  {['slow', 'normal', 'fast'].map((pace) => (
                    <button
                      key={pace}
                      type="button"
                      className={`option-btn ${accessibilitySettings.learningPace === pace ? 'active' : ''}`}
                      onClick={() => handleAccessibilityChange('learningPace', pace)}
                    >
                      {pace.charAt(0).toUpperCase() + pace.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {user?.learningCondition === 'dyslexia' && (
              <>
                <div className="setting-group">
                  <label>{t('settings.fontStyle')}</label>
                  <div className="button-group">
                    {[
                      { value: 'opendyslexic', label: 'OpenDyslexic' },
                      { value: 'arial', label: 'Arial' },
                      { value: 'comic-sans', label: 'Comic Sans' },
                    ].map((font) => (
                      <button
                        key={font.value}
                        type="button"
                        className={`option-btn ${accessibilitySettings.fontFamily === font.value ? 'active' : ''}`}
                        onClick={() => handleAccessibilityChange('fontFamily', font.value)}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-group">
                  <label>{t('settings.letterSpacing')}</label>
                  <div className="button-group">
                    {['normal', 'wide', 'extra-wide'].map((spacing) => (
                      <button
                        key={spacing}
                        type="button"
                        className={`option-btn ${accessibilitySettings.letterSpacing === spacing ? 'active' : ''}`}
                        onClick={() => handleAccessibilityChange('letterSpacing', spacing)}
                      >
                        {spacing.charAt(0).toUpperCase() + spacing.slice(1).replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {user?.learningCondition === 'autism' && (
              <div className="setting-group">
                <label>{t('settings.distractionFree')}</label>
                <button
                  type="button"
                  className={`toggle-btn ${accessibilitySettings.distractionFreeMode ? 'active' : ''}`}
                  onClick={() =>
                    handleAccessibilityChange(
                      'distractionFreeMode',
                      !accessibilitySettings.distractionFreeMode
                    )
                  }
                >
                  <span className="toggle-icon">
                    {accessibilitySettings.distractionFreeMode ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={16} aria-hidden="true" />
                        <span>ON</span>
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <X size={16} aria-hidden="true" />
                        <span>OFF</span>
                      </span>
                    )}
                  </span>
                  <span className="toggle-label">
                    {accessibilitySettings.distractionFreeMode
                      ? 'Minimal distractions enabled'
                      : 'Normal mode'}
                  </span>
                </button>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                {t('settings.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveAccessibilitySettings}
              >
                {t('settings.saveChanges')}
              </button>
            </div>
          </div>
        )}

        <div className="settings-footer">
          <button
            className="btn btn-danger"
            onClick={handleLogout}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>{t('settings.logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
