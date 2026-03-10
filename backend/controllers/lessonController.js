const Lesson = require('../models/Lesson');
const { searchLessonIdsByEmbedding } = require('../services/vectorSearch');
const {
  normalizeUiLanguage,
  pickI18nString,
  applyTokenReplacements,
  replaceQuotedSegments,
  buildOptionTokenReplacements,
} = require('../utils/i18n');

/**
 * Lesson Controller
 * -----------------
 * Read-only lesson APIs used by the learning UI.
 * Includes:
 * - ID-based lesson fetch with computed `highlights`/`visualAids`
 * - Search endpoint with vector-search first and text-search fallback
 */

/**
 * @typedef {Object} LessonVisual
 * @property {string} iconUrl
 * @property {string} description
 */

/**
 * @typedef {Object} LessonPayload
 * @property {string} _id
 * @property {string} title
 * @property {string} textContent
 * @property {string} audioUrl
 * @property {LessonVisual[]} visuals
 * @property {string} embeddingId
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} LessonResponse
 * @property {boolean} success
 * @property {LessonPayload} lesson
 */

/**
 * @typedef {Object} LessonSearchResponse
 * @property {boolean} success
 * @property {string} query
 * @property {LessonPayload[]} lessons
 * @property {number} count
 */

const searchLessons = async (req, res) => {
  const query = (req.query.q || '').trim();
  const uiLanguage = normalizeUiLanguage(req.query.lang);
  const contentLanguage = normalizeUiLanguage(req.query.contentLang || uiLanguage);

  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter "q" is required',
    });
  }

  try {
    let lessons = [];

    // Prefer semantic/vector search when configured; it returns embeddingIds ordered by relevance.
    const embeddingMatches = await searchLessonIdsByEmbedding(query);

    if (Array.isArray(embeddingMatches) && embeddingMatches.length > 0) {
      const lessonDocs = await Lesson.find({
        embeddingId: { $in: embeddingMatches },
      }).limit(20);

      const lessonMap = new Map(
        lessonDocs.map((lesson) => [lesson.embeddingId, lesson])
      );

      lessons = embeddingMatches
        .map((embeddingId) => lessonMap.get(embeddingId))
        .filter(Boolean)
        .slice(0, 20);
    } else {
      // Text search fallback when vector DB is not configured.
      lessons = await Lesson.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(20);
    }

    const localized = lessons.map((lesson) => {
      const obj = typeof lesson?.toObject === 'function' ? lesson.toObject() : lesson;

      const globalReplacements = Array.isArray(obj.interactions)
        ? obj.interactions.flatMap((interaction) => {
            const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
            const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
            return buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
          })
        : [];

      return {
        ...obj,
        title: applyTokenReplacements(pickI18nString(uiLanguage, obj.title, obj.titleI18n), globalReplacements),
        textContent: applyTokenReplacements(pickI18nString(uiLanguage, obj.textContent, obj.textContentI18n), globalReplacements),
        interactions: Array.isArray(obj.interactions)
          ? obj.interactions.map((interaction) => {
              const options = Array.isArray(interaction.options) ? interaction.options : undefined;
              const optionsI18n = Array.isArray(interaction.optionsI18n) ? interaction.optionsI18n : undefined;
              const tokenReplacements = buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
              const localizedOptions = options
                ? options.map((opt, idx) => pickI18nString(contentLanguage, opt, optionsI18n?.[idx]))
                : options;

              return {
                ...interaction,
                question: applyTokenReplacements(
                  replaceQuotedSegments(
                    pickI18nString(uiLanguage, interaction.question, interaction.questionI18n),
                    pickI18nString(contentLanguage, interaction.question, interaction.questionI18n)
                  ),
                  tokenReplacements
                ),
                options: localizedOptions,
                hint: applyTokenReplacements(
                  replaceQuotedSegments(
                    pickI18nString(uiLanguage, interaction.hint, interaction.hintI18n),
                    pickI18nString(contentLanguage, interaction.hint, interaction.hintI18n)
                  ),
                  tokenReplacements
                ),
                explanation: applyTokenReplacements(
                  replaceQuotedSegments(
                    pickI18nString(uiLanguage, interaction.explanation, interaction.explanationI18n),
                    pickI18nString(contentLanguage, interaction.explanation, interaction.explanationI18n)
                  ),
                  tokenReplacements
                ),
                feedback: interaction.feedback
                  ? {
                      ...interaction.feedback,
                      correct: applyTokenReplacements(
                        replaceQuotedSegments(
                          pickI18nString(uiLanguage, interaction.feedback.correct, interaction.feedbackI18n?.correct),
                          pickI18nString(contentLanguage, interaction.feedback.correct, interaction.feedbackI18n?.correct)
                        ),
                        tokenReplacements
                      ),
                      incorrect: applyTokenReplacements(
                        replaceQuotedSegments(
                          pickI18nString(uiLanguage, interaction.feedback.incorrect, interaction.feedbackI18n?.incorrect),
                          pickI18nString(contentLanguage, interaction.feedback.incorrect, interaction.feedbackI18n?.incorrect)
                        ),
                        tokenReplacements
                      ),
                    }
                  : interaction.feedback,
              };
            })
          : obj.interactions,
      };
    });

    return res.json({
      success: true,
      query,
      lessons: localized,
      count: localized.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error searching lessons',
      error: error.message,
    });
  }
};

const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const uiLanguage = normalizeUiLanguage(req.query.lang);
    const contentLanguage = normalizeUiLanguage(req.query.contentLang || uiLanguage);
    const lessonObjRaw = lesson.toObject();

    const globalReplacements = Array.isArray(lessonObjRaw.interactions)
      ? lessonObjRaw.interactions.flatMap((interaction) => {
          const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
          const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
          return buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
        })
      : [];

    const localizedInteractions = Array.isArray(lessonObjRaw.interactions)
      ? lessonObjRaw.interactions.map((interaction) => {
          const options = Array.isArray(interaction.options) ? interaction.options : undefined;
          const optionsI18n = Array.isArray(interaction.optionsI18n) ? interaction.optionsI18n : undefined;
          const tokenReplacements = buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
          const localizedOptions = options
            ? options.map((opt, idx) => pickI18nString(contentLanguage, opt, optionsI18n?.[idx]))
            : options;

          return {
            ...interaction,
            question: applyTokenReplacements(
              replaceQuotedSegments(
                pickI18nString(uiLanguage, interaction.question, interaction.questionI18n),
                pickI18nString(contentLanguage, interaction.question, interaction.questionI18n)
              ),
              tokenReplacements
            ),
            options: localizedOptions,
            hint: applyTokenReplacements(
              replaceQuotedSegments(
                pickI18nString(uiLanguage, interaction.hint, interaction.hintI18n),
                pickI18nString(contentLanguage, interaction.hint, interaction.hintI18n)
              ),
              tokenReplacements
            ),
            explanation: applyTokenReplacements(
              replaceQuotedSegments(
                pickI18nString(uiLanguage, interaction.explanation, interaction.explanationI18n),
                pickI18nString(contentLanguage, interaction.explanation, interaction.explanationI18n)
              ),
              tokenReplacements
            ),
            feedback: interaction.feedback
              ? {
                  ...interaction.feedback,
                  correct: applyTokenReplacements(
                    replaceQuotedSegments(
                      pickI18nString(uiLanguage, interaction.feedback.correct, interaction.feedbackI18n?.correct),
                      pickI18nString(contentLanguage, interaction.feedback.correct, interaction.feedbackI18n?.correct)
                    ),
                    tokenReplacements
                  ),
                  incorrect: applyTokenReplacements(
                    replaceQuotedSegments(
                      pickI18nString(uiLanguage, interaction.feedback.incorrect, interaction.feedbackI18n?.incorrect),
                      pickI18nString(contentLanguage, interaction.feedback.incorrect, interaction.feedbackI18n?.incorrect)
                    ),
                    tokenReplacements
                  ),
                }
              : interaction.feedback,
          };
        })
      : lessonObjRaw.interactions;

    const lessonObj = {
      ...lessonObjRaw,
      title: applyTokenReplacements(pickI18nString(uiLanguage, lessonObjRaw.title, lessonObjRaw.titleI18n), globalReplacements),
      textContent: applyTokenReplacements(pickI18nString(uiLanguage, lessonObjRaw.textContent, lessonObjRaw.textContentI18n), globalReplacements),
      interactions: localizedInteractions,
    };

    const textContent = lessonObj.textContent || '';
    const textLower = textContent.toLowerCase();

    // Normalize highlights by ensuring a safe `position` exists within text bounds.
    const highlights = (lessonObj.highlights || [])
      .map((item) => {
        if (!item.phrase) return null;
        const phraseLower = item.phrase.toLowerCase();
        const position =
          typeof item.position === 'number'
            ? item.position
            : textLower.indexOf(phraseLower);
        if (position < 0) return null;
        if (position + item.phrase.length > textContent.length) return null;
        return { ...item, position };
      })
      .filter(Boolean)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // Only return visual aids that actually match phrases in the content.
    const visualAids = (lessonObj.visualAids || [])
      .filter((item) => {
        if (!item.relatedPhrase) return false;
        return textLower.includes(item.relatedPhrase.toLowerCase());
      })
      .sort((a, b) => a.relatedPhrase.localeCompare(b.relatedPhrase));

    return res.json({
      success: true,
      lesson: {
        ...lessonObj,
        highlights,
        visualAids,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching lesson',
      error: error.message,
    });
  }
};

module.exports = {
  getLessonById,
  searchLessons,
};
