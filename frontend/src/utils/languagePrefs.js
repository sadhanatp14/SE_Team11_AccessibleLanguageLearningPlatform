/**
 * Language Preferences Utility Module
 * 
 * Lightweight language helpers for EPIC 5 (Multilingual Support), providing
 * normalized language preference handling across the application.
 * 
 * Core Features:
 * 
 * 1. Language Normalization:
 *    - Normalizes various input formats to canonical values
 *    - Handles bilingual mode strings (english_tamil, english+tamil, etc.)
 *    - Case-insensitive processing
 *    - Fallback to English for unknown values
 * 
 * 2. Bilingual Mode Support (EPIC 5.3):
 *    - Detects bilingual preference strings
 *    - Normalizes bilingual mode values
 *    - Extracts primary language from bilingual mode
 *    - Checks if bilingual mode is active
 * 
 * 3. TTS Language Mapping:
 *    - Maps UI languages to backend TTS language codes
 *    - Maps UI languages to browser Speech Synthesis codes
 *    - Consistent language code translation
 *    - Cross-system compatibility
 * 
 * 4. Preference Resolution:
 *    - Resolves UI language from preference objects
 *    - Resolves bilingual text mode from preferences
 *    - Handles multiple preference field names
 *    - Graceful fallback chain
 * 
 * Supported Languages:
 * - English (default)
 * - Tamil (தமிழ்)
 * - Hindi (हिन्दी)
 * 
 * Bilingual Modes:
 * - off: Single language only
 * - english_tamil: English + Tamil dual display
 * - english_hindi: English + Hindi dual display
 * 
 * Input Normalization Examples:
 * - 'english_tamil', 'english+tamil', 'en_ta' → 'tamil'
 * - 'english_hindi', 'english+hindi', 'en_hi' → 'hindi'
 * - 'tamil' → 'tamil'
 * - 'hindi' → 'hindi'
 * - anything else → 'english'
 * 
 * TTS Language Codes:
 * - Backend TTS: 'en', 'ta', 'hi'
 * - Browser Synthesis: 'en-US', 'ta-IN', 'hi-IN'
 * 
 * Related EPICs:
 * - EPIC 5: Multi-language Support
 * - EPIC 5.1: Language selection
 * - EPIC 5.2: UI localization
 * - EPIC 5.3: Bilingual text mode
 * 
 * @module utils/languagePrefs
 * @author SE_Team11
 * @version 1.0.0
 */

// Lightweight language helpers for EPIC 5 (Multilingual support).
// We intentionally keep scope small: pick UI strings based on `preferredLanguage`
// and map to backend/browser TTS language codes.

export const normalizePreferredLanguage = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  // Bilingual modes (English + local language)
  if (raw === 'english_tamil' || raw === 'english+tamil' || raw === 'english tamil' || raw === 'en_ta') return 'tamil';
  if (raw === 'english_hindi' || raw === 'english+hindi' || raw === 'english hindi' || raw === 'en_hi') return 'hindi';

  if (raw === 'tamil') return 'tamil';
  if (raw === 'hindi') return 'hindi';
  return 'english';
};

export const isBilingualPreferredLanguage = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  return (
    raw === 'english_tamil' ||
    raw === 'english+tamil' ||
    raw === 'english tamil' ||
    raw === 'en_ta' ||
    raw === 'english_hindi' ||
    raw === 'english+hindi' ||
    raw === 'english hindi' ||
    raw === 'en_hi'
  );
};

export const normalizeBilingualTextMode = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'off' || raw === 'none' || raw === 'false') return 'off';

  if (raw === 'english_tamil' || raw === 'english+tamil' || raw === 'english tamil' || raw === 'en_ta') return 'english_tamil';
  if (raw === 'english_hindi' || raw === 'english+hindi' || raw === 'english hindi' || raw === 'en_hi') return 'english_hindi';

  return 'off';
};

export const isBilingualTextMode = (value) => {
  const mode = normalizeBilingualTextMode(value);
  return mode === 'english_tamil' || mode === 'english_hindi';
};

export const bilingualPrimaryLanguageForMode = (value) => {
  const mode = normalizeBilingualTextMode(value);
  if (mode === 'english_tamil') return 'tamil';
  if (mode === 'english_hindi') return 'hindi';
  return null;
};

export const resolveUiLanguageFromPreferences = (preferences) => {
  return normalizePreferredLanguage(preferences?.uiLanguage ?? preferences?.preferredLanguage ?? 'english');
};

export const resolveBilingualTextModeFromPreferences = (preferences) => {
  // Back-compat: legacy `preferredLanguage` used to encode bilingual mode.
  return normalizeBilingualTextMode(preferences?.bilingualTextMode ?? preferences?.preferredLanguage ?? 'off');
};

export const bilingualSecondaryLanguage = (value) => {
  return isBilingualPreferredLanguage(value) ? 'english' : null;
};

export const bilingualTextFor = (preferredLanguage, dict) => {
  const primaryLang = normalizePreferredLanguage(preferredLanguage);
  const secondaryLang = bilingualSecondaryLanguage(preferredLanguage);

  const primaryText =
    (primaryLang === 'tamil' ? dict?.tamil : primaryLang === 'hindi' ? dict?.hindi : dict?.english) ??
    dict?.english ??
    '';

  const secondaryText = secondaryLang ? (dict?.english ?? '') : '';

  const showSecondary = Boolean(
    secondaryLang &&
    secondaryText &&
    String(secondaryText).trim() &&
    String(secondaryText).trim() !== String(primaryText).trim()
  );

  return {
    primaryLang,
    secondaryLang: showSecondary ? secondaryLang : null,
    primaryText,
    secondaryText: showSecondary ? secondaryText : '',
    isBilingual: showSecondary,
  };
};

export const pickByLanguage = (preferredLanguage, dict) => {
  const lang = normalizePreferredLanguage(preferredLanguage);
  if (lang === 'tamil' && dict.tamil) return dict.tamil;
  if (lang === 'hindi' && dict.hindi) return dict.hindi;
  return dict.english;
};

// Backend Python service accepts gTTS language codes (en/ta/hi) or BCP-47-like strings.
export const backendTtsLangFor = (preferredLanguage) => {
  const lang = normalizePreferredLanguage(preferredLanguage);
  if (lang === 'tamil') return 'ta';
  if (lang === 'hindi') return 'hi';
  return 'en';
};

export const speechSynthesisLangFor = (preferredLanguage) => {
  const lang = normalizePreferredLanguage(preferredLanguage);
  if (lang === 'tamil') return 'ta-IN';
  if (lang === 'hindi') return 'hi-IN';
  return 'en-US';
};
