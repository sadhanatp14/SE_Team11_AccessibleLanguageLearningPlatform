/**
 * lessonController.js
 *
 * Read-only lesson APIs consumed by the learning UI.
 *
 * Exposes two handlers:
 *  - searchLessons  – Full-text or semantic search across all lessons.
 *  - getLessonById  – Fetch a single lesson by MongoDB ObjectId.
 *
 * Both handlers perform i18n localisation on every user-facing string before
 * responding, so the client always receives content in the requested language.
 *
 * Localisation pipeline (applied to title, textContent, and each interaction field):
 *  1. `pickI18nString`          – select the right language variant from i18n maps.
 *  2. `replaceQuotedSegments`   – inject content-language text inside quoted spans.
 *  3. `buildOptionTokenReplacements` – build token→translation map from option arrays.
 *  4. `applyTokenReplacements`  – substitute tokens with their localised equivalents.
 */

// Lesson Mongoose model
const Lesson = require('../models/Lesson');
// Vector/semantic search service – returns lesson embeddingIds ordered by relevance
const { searchLessonIdsByEmbedding } = require('../services/vectorSearch');
// i18n utilities for language normalisation and string localisation
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

/**
 * GET /api/lessons/search?q=<query>[&lang=<uiLang>][&contentLang=<contentLang>]
 *
 * Search for lessons matching a natural-language query.
 *
 * Search strategy (in priority order):
 *  1. Vector/semantic search via `searchLessonIdsByEmbedding` when the vector
 *     service is configured – returns embeddingIds sorted by cosine similarity.
 *  2. MongoDB full-text search (`$text`) as a fallback, sorted by textScore.
 *
 * Results are localised to the requested `lang` / `contentLang` before being
 * returned so the client receives ready-to-render strings.
 *
 * @param {import('express').Request}  req - Query params: q, lang, contentLang.
 * @param {import('express').Response} res - JSON: { success, query, lessons[], count }.
 */
const searchLessons = async (req, res) => {
  const query = (req.query.q || '').trim();
  const uiLanguage = normalizeUiLanguage(req.query.lang);
  // contentLang allows requesting lesson body in a different language than the UI
  const contentLanguage = normalizeUiLanguage(req.query.contentLang || uiLanguage);

  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter "q" is required',
    });
  }

  try {
    let lessons = [];

    // Step 1: Attempt semantic/vector search (preferred – context-aware ranking)
    // Prefer semantic/vector search when configured; it returns embeddingIds ordered by relevance.
    const embeddingMatches = await searchLessonIdsByEmbedding(query);

    if (Array.isArray(embeddingMatches) && embeddingMatches.length > 0) {
      // Fetch the matched lesson documents from MongoDB using the returned embeddingIds
      const lessonDocs = await Lesson.find({
        embeddingId: { $in: embeddingMatches },
      }).limit(20);

      // Re-order results to match the vector-search ranking (most relevant first)
      const lessonMap = new Map(
        lessonDocs.map((lesson) => [lesson.embeddingId, lesson])
      );

      lessons = embeddingMatches
        .map((embeddingId) => lessonMap.get(embeddingId))
        .filter(Boolean)  // Drop any embeddingIds that didn't match a document
        .slice(0, 20);
    } else {
      // Step 2: Fall back to MongoDB full-text search when vector search is unavailable
      // Text search fallback when vector DB is not configured.
      lessons = await Lesson.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(20);
    }

    // Step 3: Localise every lesson's user-facing strings to the requested languages
    const localized = lessons.map((lesson) => {
      // Convert Mongoose document to a plain object (safe to spread/modify)
      const obj = typeof lesson?.toObject === 'function' ? lesson.toObject() : lesson;

      // Build a global token-replacement map from all interaction options so that
      // content-language tokens inside the title and textContent are also resolved
      const globalReplacements = Array.isArray(obj.interactions)
        ? obj.interactions.flatMap((interaction) => {
            const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
            const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
            return buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
          })
        : [];

      return {
        ...obj,
        // Localise top-level lesson fields
        title: applyTokenReplacements(pickI18nString(uiLanguage, obj.title, obj.titleI18n), globalReplacements),
        textContent: applyTokenReplacements(pickI18nString(uiLanguage, obj.textContent, obj.textContentI18n), globalReplacements),
        // Localise every field of every interaction in the lesson
        interactions: Array.isArray(obj.interactions)
          ? obj.interactions.map((interaction) => {
              const options = Array.isArray(interaction.options) ? interaction.options : undefined;
              const optionsI18n = Array.isArray(interaction.optionsI18n) ? interaction.optionsI18n : undefined;
              // Per-interaction token map (may differ from globalReplacements for multi-language lessons)
              const tokenReplacements = buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
              // Resolve each option to the content language
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

/**
 * GET /api/lessons/:id[?lang=<uiLang>][&contentLang=<contentLang>]
 *
 * Fetch a single lesson by its MongoDB ObjectId and return it fully localised.
 *
 * In addition to the standard lesson fields the response includes two computed
 * arrays derived from the lesson's stored metadata:
 *  - `highlights`  – phrases from `lesson.highlights[]` that exist in the text,
 *                    normalised with a resolved `position` index and sorted by
 *                    position. Entries that fall outside the text are dropped.
 *  - `visualAids`  – entries from `lesson.visualAids[]` whose `relatedPhrase`
 *                    actually appears in the textContent, sorted alphabetically.
 *
 * @param {import('express').Request}  req - Route param: id; query params: lang, contentLang.
 * @param {import('express').Response} res - JSON: { success, lesson }.
 */
const getLessonById = async (req, res) => {
  try {
    // Step 1: Fetch the lesson document by MongoDB ObjectId
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // Step 2: Resolve language parameters
    const uiLanguage = normalizeUiLanguage(req.query.lang);
    // contentLang allows lesson body to be in a different language than the UI chrome
    const contentLanguage = normalizeUiLanguage(req.query.contentLang || uiLanguage);
    // Convert to a plain JS object so we can freely spread/modify it
    const lessonObjRaw = lesson.toObject();

    // Step 3: Build global token-replacement map from all interaction options.
    // This ensures content-language tokens embedded in top-level fields (title,
    // textContent) are also resolved correctly.
    const globalReplacements = Array.isArray(lessonObjRaw.interactions)
      ? lessonObjRaw.interactions.flatMap((interaction) => {
          const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
          const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
          return buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
        })
      : [];

    // Step 4: Localise every field of every interaction
    const localizedInteractions = Array.isArray(lessonObjRaw.interactions)
      ? lessonObjRaw.interactions.map((interaction) => {
          const options = Array.isArray(interaction.options) ? interaction.options : undefined;
          const optionsI18n = Array.isArray(interaction.optionsI18n) ? interaction.optionsI18n : undefined;
          // Per-interaction token map built from this interaction's own options
          const tokenReplacements = buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
          // Resolve each option string to the content language
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

    // Step 5: Assemble the final localised lesson object
    const lessonObj = {
      ...lessonObjRaw,
      // Localise top-level text fields using the global replacement map
      title: applyTokenReplacements(pickI18nString(uiLanguage, lessonObjRaw.title, lessonObjRaw.titleI18n), globalReplacements),
      textContent: applyTokenReplacements(pickI18nString(uiLanguage, lessonObjRaw.textContent, lessonObjRaw.textContentI18n), globalReplacements),
      interactions: localizedInteractions,
    };

    const textContent = lessonObj.textContent || '';
    const textLower = textContent.toLowerCase();

    // Step 6: Compute `highlights` – filter and sort phrase highlights by their
    // position in the localised textContent. Entries with no matching position or
    // that extend beyond the text boundary are dropped to keep the data valid.
    // Normalize highlights by ensuring a safe `position` exists within text bounds.
    const highlights = (lessonObj.highlights || [])
      .map((item) => {
        if (!item.phrase) return null;
        const phraseLower = item.phrase.toLowerCase();
        // Use stored position when available; otherwise search for the phrase in text
        const position =
          typeof item.position === 'number'
            ? item.position
            : textLower.indexOf(phraseLower);
        if (position < 0) return null;                              // phrase not found in text
        if (position + item.phrase.length > textContent.length) return null; // out of bounds
        return { ...item, position };
      })
      .filter(Boolean)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)); // ascending order of appearance

    // Step 7: Compute `visualAids` – only include entries whose relatedPhrase
    // appears in the localised textContent so the client never receives orphaned aids.
    // Only return visual aids that actually match phrases in the content.
    const visualAids = (lessonObj.visualAids || [])
      .filter((item) => {
        if (!item.relatedPhrase) return false;
        return textLower.includes(item.relatedPhrase.toLowerCase());
      })
      .sort((a, b) => a.relatedPhrase.localeCompare(b.relatedPhrase)); // alphabetical order

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
