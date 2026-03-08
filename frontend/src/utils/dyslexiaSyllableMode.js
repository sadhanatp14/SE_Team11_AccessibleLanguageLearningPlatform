import { useEffect, useMemo, useState } from 'react';

export const SYLLABLE_MODE_STORAGE_KEY = 'dyslexiaSyllableMode';
export const DYSLEXIA_LESSON_IDS = new Set([
  'lesson-greetings',
  'lesson-vocabulary',
  'lesson-numbers',
  'lesson-tamil-essentials',
  'lesson-hindi-essentials',
]);

export const isDyslexiaLessonId = (lessonId) => {
  if (!lessonId) return false;
  return DYSLEXIA_LESSON_IDS.has(String(lessonId));
};

export const getDyslexiaSyllableMode = (defaultValue = true) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(SYLLABLE_MODE_STORAGE_KEY);
    if (raw === null) return defaultValue;
    return raw === 'true';
  } catch (error) {
    return defaultValue;
  }
};

export const setDyslexiaSyllableMode = (enabled) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SYLLABLE_MODE_STORAGE_KEY, String(Boolean(enabled)));
  } catch (error) {
    // ignore
  }

  try {
    window.dispatchEvent(new CustomEvent('dyslexia:syllableMode', { detail: { enabled: Boolean(enabled) } }));
  } catch (error) {
    // ignore
  }
};

export const useDyslexiaSyllableMode = (defaultValue = true) => {
  const [enabled, setEnabled] = useState(() => getDyslexiaSyllableMode(defaultValue));

  useEffect(() => {
    const onCustom = (event) => {
      const next = event?.detail?.enabled;
      if (typeof next === 'boolean') setEnabled(next);
      else setEnabled(getDyslexiaSyllableMode(defaultValue));
    };

    const onStorage = (event) => {
      if (event?.key && event.key !== SYLLABLE_MODE_STORAGE_KEY) return;
      setEnabled(getDyslexiaSyllableMode(defaultValue));
    };

    window.addEventListener('dyslexia:syllableMode', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('dyslexia:syllableMode', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [defaultValue]);

  const setAndPersist = (next) => {
    const resolved = typeof next === 'function' ? next(enabled) : next;
    const booleanValue = Boolean(resolved);
    setEnabled(booleanValue);
    setDyslexiaSyllableMode(booleanValue);
  };

  return [enabled, setAndPersist];
};

const WORD_HINTS = {
  hello: 'Hel-lo',
  greetings: 'Greet-ings',
  welcome: 'Wel-come',
  learning: 'Learn-ing',
  practice: 'Prac-tice',
  fantastic: 'fan–tas–tic',
  basic: 'Ba-sic',
  numbers: 'Num-bers',
  apple: 'ap-ple',
};

export const getSyllableHint = (token) => {
  if (!token) return '';
  return WORD_HINTS[String(token).trim().toLowerCase()] || '';
};

export const decorateDyslexiaText = (text) => {
  if (!text) return '';
  const raw = String(text);

  // Avoid double-decoration if it already contains the hint.
  const decorateWord = (match) => {
    const hint = getSyllableHint(match);
    if (!hint) return match;
    if (raw.toLowerCase().includes(hint.toLowerCase())) return match;
    return `${match} (${hint})`;
  };

  // Only decorate a small, safe set of whole words.
  return raw
    .replace(/\bHello\b/g, decorateWord)
    .replace(/\bGreetings\b/g, decorateWord)
    .replace(/\bWelcome\b/g, decorateWord)
    .replace(/\bLearning\b/g, decorateWord)
    .replace(/\bPractice\b/g, decorateWord)
    .replace(/\bfantastic\b/gi, decorateWord)
    .replace(/\bBasic\b/g, decorateWord)
    .replace(/\bNumbers\b/g, decorateWord)
    .replace(/\bApple\b/g, decorateWord);
};

export const getDyslexiaLessonTitle = (lessonId, fallbackTitle = '') => {
  const id = String(lessonId || '');
  const map = {
    'lesson-greetings': 'Greet-ings',
    'lesson-vocabulary': 'Ba-sic Words',
    'lesson-numbers': 'Num-bers',
    'lesson-tamil-essentials': 'Ta-mil Es-sen-tials',
    'lesson-hindi-essentials': 'Hin-di Es-sen-tials',
  };
  return map[id] || fallbackTitle || id;
};

export const useDyslexiaContext = ({ condition, lessonId, defaultSyllableMode = true }) => {
  const [syllableMode] = useDyslexiaSyllableMode(defaultSyllableMode);
  const isDyslexia = condition === 'dyslexia';
  const isDyslexiaLesson = isDyslexia && isDyslexiaLessonId(lessonId);

  return useMemo(
    () => ({
      isDyslexia,
      isDyslexiaLesson,
      syllableMode: Boolean(syllableMode),
      applySyllables: Boolean(syllableMode) && isDyslexiaLesson,
    }),
    [isDyslexia, isDyslexiaLesson, syllableMode]
  );
};
