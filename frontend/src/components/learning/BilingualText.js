import React, { useMemo } from 'react';
import { bilingualPrimaryLanguageForMode, isBilingualTextMode } from '../../utils/languagePrefs';
import { pickI18nString } from '../../utils/lessonI18n';
import './BilingualText.css';

const labelForLang = (lang) => {
  const normalized = String(lang || '').trim().toLowerCase();
  if (normalized === 'tamil') return 'Tamil';
  if (normalized === 'hindi') return 'Hindi';
  return 'English';
};

const normalizeText = (value) => {
  const text = typeof value === 'string' ? value : String(value ?? '');
  const trimmed = text.trim();
  return trimmed;
};

/**
 * Renders bilingual lesson text (English + local language) for lesson/question screens.
 * - When bilingualTextMode is off: shows the contentLanguage string only.
 * - When enabled: shows primary local language prominently + English secondary.
 */
const BilingualText = ({
  bilingualTextMode = 'off',
  contentLanguage = 'english',
  baseText = '',
  i18n,
  showLabels = true,
  compact = false,
  className = '',
}) => {
  const enabled = isBilingualTextMode(bilingualTextMode);
  const primaryLang = enabled ? bilingualPrimaryLanguageForMode(bilingualTextMode) : null;

  const { single, primary, secondary } = useMemo(() => {
    const englishText = normalizeText(pickI18nString('english', baseText, i18n));
    const contentText = normalizeText(pickI18nString(contentLanguage, baseText, i18n));

    if (!enabled || !primaryLang) {
      return { single: contentText || englishText, primary: '', secondary: '' };
    }

    const primaryText = normalizeText(pickI18nString(primaryLang, baseText, i18n));
    const secondaryText = englishText;

    // If we don't have a meaningful translation, fall back to single text.
    if (!primaryText || !secondaryText || primaryText === secondaryText) {
      return { single: primaryText || secondaryText || contentText, primary: '', secondary: '' };
    }

    return { single: '', primary: primaryText, secondary: secondaryText };
  }, [baseText, contentLanguage, enabled, i18n, primaryLang]);

  if (single) {
    return <span className={`bilingual-text bilingual-single ${compact ? 'compact' : ''} ${className}`.trim()}>{single}</span>;
  }

  return (
    <span className={`bilingual-text ${compact ? 'compact' : ''} ${className}`.trim()}>
      <span className="bilingual-line bilingual-primary">
        {showLabels ? <span className="bilingual-label">{labelForLang(primaryLang)}</span> : null}
        <span className="bilingual-value">{primary}</span>
      </span>
      <span className="bilingual-break" aria-hidden="true" />
      <span className="bilingual-line bilingual-secondary">
        {showLabels ? <span className="bilingual-label">English</span> : null}
        <span className="bilingual-value">{secondary}</span>
      </span>
    </span>
  );
};

export default BilingualText;
