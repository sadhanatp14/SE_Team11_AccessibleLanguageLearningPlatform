/**
 * GuidedSupport Component
 * 
 * Contextual help and encouragement interface providing scaffolded learning
 * assistance, implementing EPIC 2.4 (Guided Support System).
 * 
 * Core Features:
 * 
 * 1. Help System (EPIC 2.4.1-2.4.4):
 *    - On-demand hint/explanation requests
 *    - Progressive hint revealing
 *    - Encouraging feedback messages
 *    - Context-aware help content
 * 
 * 2. Bilingual Support (EPIC 5):
 *    - i18n-aware message display
 *    - Bilingual text mode (off, side-by-side, sequential)
 *    - Language-specific message rendering
 *    - Fallback to English text
 * 
 * 3. Tone-Based Messaging:
 *    - Encouraging tone for struggling learners
 *    - Informational tone for neutral help
 *    - Celebratory tone for achievements
 *    - Adaptive message presentation
 * 
 * 4. Accessibility:
 *    - aria-live region for screen readers
 *    - Clear button labeling
 *    - Loading state indication
 *    - High contrast styling
 *    - Keyboard accessible
 * 
 * Message Resolution:
 * 1. Check i18n message object for language-specific text
 * 2. Fall back to English if available
 * 3. Fall back to raw message prop
 * 4. Display bilingual if mode active
 * 
 * @component
 * @param {Object} props
 * @param {string} props.message - Fallback help message text
 * @param {Object} props.messageI18n - i18n message object { english, spanish, ... }
 * @param {string} props.bilingualTextMode - Bilingual display mode (off, side-by-side, sequential)
 * @param {string} props.uiLanguage - Current UI language
 * @param {string} props.tone - Message tone (encouraging, informational, celebratory)
 * @param {Function} props.onHelp - Callback when help button clicked
 * @param {boolean} props.isLoading - Loading state during help fetch
 * @requires utils/i18n - Internationalization utilities
 * @requires learning/BilingualText - Dual-language text display
 * @author SE_Team11
 * @version 1.0.0
 */

import React from 'react';
import { useI18n } from '../../utils/i18n';
import BilingualText from './BilingualText';
import './GuidedSupport.css';

const GuidedSupport = ({
  message,
  messageI18n,
  bilingualTextMode = 'off',
  uiLanguage = 'english',
  tone,
  onHelp,
  isLoading,
}) => {
  const { t } = useI18n();

  const baseText =
    messageI18n && typeof messageI18n.english === 'string' && messageI18n.english.trim()
      ? messageI18n.english
      : message;

  return (
    // EPIC 2.4.1-2.4.4: Guided support surface for hints/explanations, manual help, and encouraging messages.
    <div className="guided-support" aria-live="polite">
      <button
        type="button"
        className="btn-help fx-pressable fx-focus"
        onClick={onHelp}
        disabled={isLoading}
      >
        {isLoading ? t('learning.guidedSupport.gettingHelp') : t('learning.guidedSupport.needHelp')}
      </button>
      {message && (
        <div className={`guided-message ${tone || ''}`} role="status">
          {messageI18n ? (
            <BilingualText
              bilingualTextMode={bilingualTextMode}
              contentLanguage={uiLanguage}
              baseText={baseText}
              i18n={messageI18n}
              showLabels={true}
              compact={false}
            />
          ) : (
            message
          )}
        </div>
      )}
    </div>
  );
};

export default GuidedSupport;
