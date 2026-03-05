import { resolveUiLanguageFromPreferences } from './languagePrefs';

const normalizeUiLanguage = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.startsWith('ta')) return 'tamil';
  if (raw.startsWith('hi')) return 'hindi';
  if (raw === 'tamil' || raw === 'hindi' || raw === 'english') return raw;
  return 'english';
};

export const pickI18nString = (uiLanguage, base, i18n) => {
  const lang = normalizeUiLanguage(uiLanguage);
  if (!i18n || typeof i18n !== 'object') return base;
  const candidate = i18n[lang];
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

  // Deduplicate (keep stable order).
  const seen = new Set();
  return replacements.filter(([from, to]) => {
    const key = `${from}→${to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const replaceQuotedSegments = (uiText, contentText) => {
  if (typeof uiText !== 'string' || !uiText) return uiText;
  if (typeof contentText !== 'string' || !contentText) return uiText;

  // Replace each "..." segment in uiText with the corresponding one from contentText.
  // This is a best-effort heuristic used to preserve taught words like "Hello".
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

const localizeInteraction = (interaction, uiLanguage, contentLanguage) => {
  const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
  const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
  const resolvedContentLanguage = normalizeUiLanguage(contentLanguage || uiLanguage);
  const tokenReplacements = buildOptionTokenReplacements(uiLanguage, resolvedContentLanguage, options, optionsI18n);

  const contentQuestion = pickI18nString(resolvedContentLanguage, interaction?.question, interaction?.questionI18n);
  const localizedQuestion = replaceQuotedSegments(
    pickI18nString(uiLanguage, interaction?.question, interaction?.questionI18n),
    contentQuestion
  );
  const localizedHint = pickI18nString(uiLanguage, interaction?.hint || '', interaction?.hintI18n);
  const localizedExplanation = pickI18nString(uiLanguage, interaction?.explanation || '', interaction?.explanationI18n);
  const localizedFeedback = interaction?.feedback
    ? {
        ...interaction.feedback,
        correct: pickI18nString(uiLanguage, interaction.feedback.correct, interaction?.feedbackI18n?.correct),
        incorrect: pickI18nString(uiLanguage, interaction.feedback.incorrect, interaction?.feedbackI18n?.incorrect),
      }
    : interaction?.feedback;

  return {
    ...interaction,
    question: applyTokenReplacements(localizedQuestion, tokenReplacements),
    options: options
      ? options.map((opt, idx) => pickI18nString(resolvedContentLanguage, opt, optionsI18n?.[idx]))
      : options,
    hint: applyTokenReplacements(replaceQuotedSegments(localizedHint, pickI18nString(resolvedContentLanguage, interaction?.hint || '', interaction?.hintI18n)), tokenReplacements),
    explanation: applyTokenReplacements(replaceQuotedSegments(localizedExplanation, pickI18nString(resolvedContentLanguage, interaction?.explanation || '', interaction?.explanationI18n)), tokenReplacements),
    feedback: localizedFeedback
      ? {
          ...localizedFeedback,
          correct: applyTokenReplacements(replaceQuotedSegments(localizedFeedback.correct, pickI18nString(resolvedContentLanguage, interaction?.feedback?.correct || '', interaction?.feedbackI18n?.correct)), tokenReplacements),
          incorrect: applyTokenReplacements(replaceQuotedSegments(localizedFeedback.incorrect, pickI18nString(resolvedContentLanguage, interaction?.feedback?.incorrect || '', interaction?.feedbackI18n?.incorrect)), tokenReplacements),
        }
      : localizedFeedback,
  };
};

export const localizeLessonPayload = (lesson, uiLanguage, contentLanguage) => {
  if (!lesson) return lesson;
  const resolvedContentLanguage = normalizeUiLanguage(contentLanguage || uiLanguage);
  const interactions = Array.isArray(lesson.interactions)
    ? lesson.interactions.map((i) => localizeInteraction(i, uiLanguage, resolvedContentLanguage))
    : lesson.interactions;

  const replacements = Array.isArray(lesson.interactions)
    ? lesson.interactions.flatMap((interaction) => {
        const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
        const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
        return buildOptionTokenReplacements(uiLanguage, resolvedContentLanguage, options, optionsI18n);
      })
    : [];

  return {
    ...lesson,
    title: applyTokenReplacements(pickI18nString(uiLanguage, lesson.title, lesson.titleI18n), replacements),
    textContent: applyTokenReplacements(pickI18nString(uiLanguage, lesson.textContent, lesson.textContentI18n), replacements),
    interactions,
  };
};

export const localizeLessonSectionsPayload = (sections, uiLanguage, contentLanguage) => {
  if (!Array.isArray(sections)) return sections;
  const resolvedContentLanguage = normalizeUiLanguage(contentLanguage || uiLanguage);
  return sections.map((section) => ({
    ...section,
    title: applyTokenReplacements(pickI18nString(uiLanguage, section.title, section.titleI18n),
      Array.isArray(section?.interactions)
        ? section.interactions.flatMap((interaction) => {
            const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
            const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
            return buildOptionTokenReplacements(uiLanguage, resolvedContentLanguage, options, optionsI18n);
          })
        : []
    ),
    textContent: applyTokenReplacements(pickI18nString(uiLanguage, section.textContent, section.textContentI18n),
      Array.isArray(section?.interactions)
        ? section.interactions.flatMap((interaction) => {
            const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
            const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
            return buildOptionTokenReplacements(uiLanguage, resolvedContentLanguage, options, optionsI18n);
          })
        : []
    ),
    interactions: Array.isArray(section.interactions)
      ? section.interactions.map((i) => localizeInteraction(i, uiLanguage, resolvedContentLanguage))
      : section.interactions,
  }));
};

export const resolveUiLanguageForLesson = (preferences) => {
  return resolveUiLanguageFromPreferences(preferences);
};
