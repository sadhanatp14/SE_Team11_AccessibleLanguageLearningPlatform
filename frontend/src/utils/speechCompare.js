import { inferTtsLanguageKeyFromText, normalizePreferredLanguage } from './languagePrefs';

const stripDiacritics = (value) => {
  try {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
  } catch {
    return String(value ?? '');
  }
};

export const normalizeSpeechText = (value) => {
  const raw = stripDiacritics(String(value ?? '')).trim().toLowerCase();
  if (!raw) return '';

  return raw
    .replace(/[.,!?;:()"'{}[\]<>\\/|@#$%^&*_+=~`]/g, ' ')
    .replace(/[\u201C\u201D\u2018\u2019\u2013\u2014]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const DEVANAGARI = /[\u0900-\u097F]/;
const TAMIL = /[\u0B80-\u0BFF]/;

const DEV_CONSONANTS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l',
};

const DEV_INDEPENDENT_VOWELS = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ii', 'उ': 'u', 'ऊ': 'uu',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'ऋ': 'ri', 'ॠ': 'rri',
};

const DEV_VOWEL_SIGNS = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ii', 'ु': 'u', 'ू': 'uu',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ृ': 'ri', 'ॄ': 'rri',
};

const DEV_MISC = {
  'ं': 'n',
  'ँ': 'n',
  'ः': 'h',
  '़': '', // nukta (ignored in our rough mapping)
};

const DEV_VIRAMA = '्';

export const transliterateDevanagariToLatin = (input) => {
  const text = String(input ?? '');
  if (!DEVANAGARI.test(text)) return text;

  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (DEV_MISC[ch] !== undefined) {
      out += DEV_MISC[ch];
      continue;
    }

    if (DEV_INDEPENDENT_VOWELS[ch]) {
      out += DEV_INDEPENDENT_VOWELS[ch];
      continue;
    }

    if (DEV_CONSONANTS[ch]) {
      const base = DEV_CONSONANTS[ch];
      const next = text[i + 1];

      if (next === DEV_VIRAMA) {
        out += base;
        i += 1;
        continue;
      }

      if (next && DEV_VOWEL_SIGNS[next]) {
        out += base + DEV_VOWEL_SIGNS[next];
        i += 1;
        continue;
      }

      out += base + 'a';
      continue;
    }

    out += ch;
  }

  return out;
};

const TA_INDEPENDENT_VOWELS = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ii', 'உ': 'u', 'ஊ': 'uu',
  'எ': 'e', 'ஏ': 'ee', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
};

const TA_CONSONANTS = {
  'க': 'k', 'ங': 'ng', 'ச': 's', 'ஞ': 'ny', 'ட': 't', 'ண': 'n',
  'த': 't', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
  'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
  'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
};

const TA_VOWEL_SIGNS = {
  'ா': 'aa', 'ி': 'i', 'ீ': 'ii', 'ு': 'u', 'ூ': 'uu',
  'ெ': 'e', 'ே': 'ee', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au',
};

const TA_PULLI = '்';

export const transliterateTamilToLatin = (input) => {
  const text = String(input ?? '');
  if (!TAMIL.test(text)) return text;

  let out = '';
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (TA_INDEPENDENT_VOWELS[ch]) {
      out += TA_INDEPENDENT_VOWELS[ch];
      continue;
    }

    if (TA_CONSONANTS[ch]) {
      const base = TA_CONSONANTS[ch];
      const next = text[i + 1];

      if (next === TA_PULLI) {
        out += base;
        i += 1;
        continue;
      }

      if (next && TA_VOWEL_SIGNS[next]) {
        out += base + TA_VOWEL_SIGNS[next];
        i += 1;
        continue;
      }

      out += base + 'a';
      continue;
    }

    out += ch;
  }

  return out;
};

export const toLatinApprox = (value) => {
  const raw = String(value ?? '');
  if (DEVANAGARI.test(raw)) return transliterateDevanagariToLatin(raw);
  if (TAMIL.test(raw)) return transliterateTamilToLatin(raw);
  return raw;
};

export const makeSpeechCompareForms = (value) => {
  const forms = new Set();

  const base = normalizeSpeechText(value);
  if (base) {
    forms.add(base);
    forms.add(base.replace(/\s+/g, ''));
  }

  const latin = normalizeSpeechText(toLatinApprox(value));
  if (latin) {
    forms.add(latin);
    forms.add(latin.replace(/\s+/g, ''));
  }

  return Array.from(forms);
};

export const speechTextsMatch = (heard, expected) => {
  const heardForms = makeSpeechCompareForms(heard);
  const expectedForms = makeSpeechCompareForms(expected);

  if (!heardForms.length || !expectedForms.length) return false;

  for (const h of heardForms) {
    for (const e of expectedForms) {
      if (h === e) return true;

      const minLen = Math.min(h.length, e.length);
      if (minLen < 3) continue;

      if (h.includes(e) || e.includes(h)) return true;
    }
  }

  return false;
};

export const normalizeLanguageKeyFromLocale = (localeOrKey) => {
  const raw = String(localeOrKey ?? '').trim().toLowerCase();
  if (!raw) return 'english';
  if (raw === 'ta' || raw.startsWith('ta-') || raw === 'tamil') return 'tamil';
  if (raw === 'hi' || raw.startsWith('hi-') || raw === 'hindi') return 'hindi';
  return normalizePreferredLanguage(raw);
};

export const inferSpeechLanguageKeyFromText = (text, fallbackLanguage = 'english') => {
  const fallback = normalizePreferredLanguage(fallbackLanguage);
  return inferTtsLanguageKeyFromText(text, fallback);
};
