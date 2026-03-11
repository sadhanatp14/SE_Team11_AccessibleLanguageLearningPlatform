/**
 * BilingualText Component
 * 
 * Dual-language text display for lesson content, implementing EPIC 5.3
 * (Bilingual Text Mode) to support language learning through comparative text.
 * 
 * Core Features:
 * 
 * 1. Display Modes (EPIC 5.3):
 *    - Off: Shows content language text only
 *    - Side-by-side: Both languages displayed together
 *    - Sequential: Primary language then secondary
 * 
 * 2. Language Resolution:
 *    - Primary language determined by bilingual mode
 *    - Fallback to content language
 *    - i18n string resolution for localized text
 *    - Normalized text cleaning
 * 
 * 3. Visual Presentation:
 *    - Language labels (English, Tamil, Hindi)
 *    - Primary/secondary text sizing
 *    - Compact mode for smaller spaces
 *    - Clear visual separation
 * 
 * 4. Text Normalization:
 *    - Trims whitespace
 *    - Handles null/undefined values
 *    - String type coercion
 *    - Consistent output format
 * 
 * Display Logic:
 * - bilingualTextMode='off': Single language (contentLanguage)
 * - bilingualTextMode='side-by-side': Both languages, primary prominent
 * - bilingualTextMode='sequential': Primary first, then secondary below
 * 
 * @component
 * @param {Object} props
 * @param {string} props.bilingualTextMode - Display mode (off, side-by-side, sequential)
 * @param {string} props.contentLanguage - Content language code
 * @param {string} props.baseText - Fallback text content
 * @param {Object} props.i18n - Internationalized text object
 * @param {boolean} props.showLabels - Whether to show language labels
 * @param {boolean} props.compact - Whether to use compact layout
 * @requires utils/languagePrefs - Bilingual mode utilities
 * @requires utils/lessonI18n - i18n string resolution
 * @author SE_Team11
 * @version 1.0.0
 */

import React, { useMemo } from 'react';
import { bilingualPrimaryLanguageForMode, isBilingualTextMode } from '../../utils/languagePrefs';
import { pickI18nString } from '../../utils/lessonI18n';
import './BilingualText.css';

/**
 * Get human-readable label for a language code
 * @param {string} lang - Language code (english, tamil, hindi)
 * @returns {string} Display label
 */
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
