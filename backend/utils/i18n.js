/**
 * Backend i18n helpers
 *
 * NOTE: This is intentionally tiny and data-driven.
 * The DB remains the source of truth for translations.
 */

const SUPPORTED_UI_LANGUAGES = ['english', 'tamil', 'hindi'];

/**
 * @param {any} value
 * @returns {'english'|'tamil'|'hindi'}
 */
const normalizeUiLanguage = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.startsWith('ta')) return 'tamil';
  if (raw.startsWith('hi')) return 'hindi';
  if (SUPPORTED_UI_LANGUAGES.includes(raw)) return raw;
  return 'english';
};

/**
 * Pick a localized string, falling back to english/base.
 *
 * @param {'english'|'tamil'|'hindi'} uiLanguage
 * @param {string} base
 * @param {{english?: string, tamil?: string, hindi?: string}|undefined|null} i18n
 */
const pickI18nString = (uiLanguage, base, i18n) => {
  if (!i18n || typeof i18n !== 'object') return base;

  const candidate = i18n[uiLanguage];
  if (typeof candidate === 'string' && candidate.trim()) return candidate;

  const english = i18n.english;
  if (typeof english === 'string' && english.trim()) return english;

  return base;
};

const applyTokenReplacements = (text, replacements) => {
  if (typeof text !== 'string' || !text) return text;
  if (!Array.isArray(replacements) || replacements.length === 0) return text;
  let result = text;
  for (const [from, to] of replacements) {
    if (!from || !to || from === to) continue;
    if (typeof from !== 'string' || typeof to !== 'string') continue;
    result = result.split(from).join(to);
  }
  return result;
};

const replaceQuotedSegments = (uiText, contentText) => {
  if (typeof uiText !== 'string' || !uiText) return uiText;
  if (typeof contentText !== 'string' || !contentText) return uiText;

  const uiMatches = Array.from(uiText.matchAll(/"([^"]+)"/g));
  const contentMatches = Array.from(contentText.matchAll(/"([^"]+)"/g));
  if (uiMatches.length === 0 || contentMatches.length === 0) return uiText;

  const limit = Math.min(uiMatches.length, contentMatches.length);
  let result = uiText;
  for (let idx = 0; idx < limit; idx++) {
    const uiFull = uiMatches[idx][0];
    const contentFull = contentMatches[idx][0];
    if (uiFull && contentFull && uiFull !== contentFull) {
      result = result.replace(uiFull, contentFull);
    }
  }
  return result;
};

const buildOptionTokenReplacements = (uiLanguage, contentLanguage, options, optionsI18n) => {
  const uiLang = normalizeUiLanguage(uiLanguage);
  const contentLang = normalizeUiLanguage(contentLanguage || uiLanguage);
  if (uiLang === contentLang) return [];
  if (!Array.isArray(options) || options.length === 0) return [];
  if (!Array.isArray(optionsI18n) || optionsI18n.length === 0) return [];

  const replacements = [];
  for (let idx = 0; idx < options.length; idx++) {
    const baseOpt = options[idx];
    const optI18n = optionsI18n[idx];
    const uiOpt = pickI18nString(uiLang, baseOpt, optI18n);
    const contentOpt = pickI18nString(contentLang, baseOpt, optI18n);
    if (typeof uiOpt === 'string' && typeof contentOpt === 'string' && uiOpt && contentOpt && uiOpt !== contentOpt) {
      replacements.push([uiOpt, contentOpt]);
    }
  }

  const seen = new Set();
  return replacements.filter(([from, to]) => {
    const key = `${from}→${to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const restoreTeachingTokens = (uiLanguage, contentLanguage, text, options, optionsI18n) => {
  const replacements = buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
  return applyTokenReplacements(text, replacements);
};

module.exports = {
  normalizeUiLanguage,
  pickI18nString,
  applyTokenReplacements,
  replaceQuotedSegments,
  buildOptionTokenReplacements,
  restoreTeachingTokens,
};
