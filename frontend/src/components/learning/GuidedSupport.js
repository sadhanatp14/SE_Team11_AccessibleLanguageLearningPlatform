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
