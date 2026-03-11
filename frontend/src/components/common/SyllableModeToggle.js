import React from 'react';
import { Type } from 'lucide-react';
import { useI18n } from '../../utils/i18n';
import { setDyslexiaSyllableMode, useDyslexiaSyllableMode } from '../../utils/dyslexiaSyllableMode';

const SyllableModeToggle = ({ className = '' }) => {
  const { t } = useI18n();
  const [syllableMode] = useDyslexiaSyllableMode(true);

  const handleToggle = () => {
    setDyslexiaSyllableMode(!syllableMode);
  };

  return (
    <button
      type="button"
      className={`btn-settings btn-syllable-toggle ${className}`.trim()}
      onClick={handleToggle}
      aria-pressed={syllableMode ? 'true' : 'false'}
      title={t('learning.dyslexia.toggleSyllableTitle')}
    >
      <Type size={16} aria-hidden="true" />
      <span>{t('learning.dyslexia.syllableMode')}</span>
    </button>
  );
};

export default SyllableModeToggle;
