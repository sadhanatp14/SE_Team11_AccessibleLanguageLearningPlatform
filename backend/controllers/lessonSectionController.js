/**
 * lessonSectionController.js
 *
 * Serves ordered lesson sections for step-by-step lesson flows.
 *
 * A lesson is divided into multiple LessonSection documents, each containing
 * title, textContent, highlights, visuals, and an `interactions[]` sub-array.
 * Sections are always returned sorted by their `order` field so the frontend
 * can render them sequentially without any client-side sorting.
 *
 * Localisation pipeline (applied to every user-facing string in each section):
 *  1. `pickI18nString`               – select the right language variant.
 *  2. `replaceQuotedSegments`        – inject content-language text into quoted spans.
 *  3. `buildOptionTokenReplacements` – build a token→translation map from option arrays.
 *  4. `applyTokenReplacements`       – substitute tokens with their localised equivalents.
 *
 * Exposes:
 *  - GET /api/lessons/:lessonId/sections  → exports.getLessonSections
 */

// Mongoose – used to validate the lessonId route parameter as a MongoDB ObjectId
const mongoose = require('mongoose');
// LessonSection Mongoose model
const LessonSection = require('../models/LessonSection');
// i18n utilities for language normalisation and string localisation
const {
  normalizeUiLanguage,
  pickI18nString,
  applyTokenReplacements,
  replaceQuotedSegments,
  buildOptionTokenReplacements,
} = require('../utils/i18n');

/**
 * GET /api/lessons/:lessonId/sections[?lang=<uiLang>][&contentLang=<contentLang>]
 *
 * Return all LessonSection documents for the given lesson, sorted by `order`,
 * with every user-facing string localised to the requested language.
 *
 * Query parameters:
 *  - lang        : UI language (e.g. 'english', 'tamil', 'hindi'). Defaults to 'english'.
 *  - contentLang : Language for lesson body / interaction content. Falls back to `lang`
 *                  when omitted, allowing bilingual layouts (UI in English, content in Tamil).
 *
 * Response: { success: true, sections: LessonSection[], count: number }
 *
 * @param {import('express').Request}  req - Route param: lessonId; query: lang, contentLang.
 * @param {import('express').Response} res - JSON response.
 */
exports.getLessonSections = async (req, res) => {
  const { lessonId } = req.params;
  // Normalise language strings to lowercase (e.g. 'English' -> 'english')
  const uiLanguage = normalizeUiLanguage(req.query.lang);
  // contentLang allows the lesson body to be in a different language than the UI chrome
  const contentLanguage = normalizeUiLanguage(req.query.contentLang || uiLanguage);

  // Validate the lessonId before querying MongoDB to return a clear 400 instead of a cast error
  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    // Step 1: Fetch sections from MongoDB sorted by `order` ascending.
    // `lean()` returns plain JS objects (faster + smaller) since we don't mutate documents here.
    const sections = await LessonSection.find({ lessonId })
      .sort({ order: 1 })
      .lean();

    // Step 2: Localise every section's user-facing strings to the requested languages.
    const localized = (sections || []).map((section) => {
      // Step 2a: Build a global token-replacement map from all interaction options in this
      // section so that content-language tokens inside title/textContent are also resolved.
      const globalReplacements = Array.isArray(section.interactions)
        ? section.interactions.flatMap((interaction) => {
            const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
            const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
            return buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
          })
        : [];

      // Step 2b: Localise every field of every interaction in this section.
      const interactions = Array.isArray(section.interactions)
        ? section.interactions.map((interaction) => {
            const options = Array.isArray(interaction.options) ? interaction.options : undefined;
            const optionsI18n = Array.isArray(interaction.optionsI18n) ? interaction.optionsI18n : undefined;
            // Per-interaction token map (built from this interaction's own options)
            const tokenReplacements = buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
            // Resolve each option string to the content language
            const localizedOptions = options
              ? options.map((opt, idx) => pickI18nString(contentLanguage, opt, optionsI18n?.[idx]))
              : options;

            return {
              ...interaction,
              // Each string field goes through: pick language variant → inject quoted
              // content-language segments → substitute option tokens.
              question: applyTokenReplacements(
                replaceQuotedSegments(
                  pickI18nString(uiLanguage, interaction.question, interaction.questionI18n),
                  pickI18nString(contentLanguage, interaction.question, interaction.questionI18n)
                ),
                tokenReplacements
              ),
              // Options are resolved directly to content language (no token substitution needed)
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
              // Feedback is a sub-object with `correct` and `incorrect` variants;
              // preserve the full object shape when feedback is absent (null/undefined)
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
        : section.interactions; // preserve null/undefined as-is when no interactions exist

      // Step 2c: Assemble the localised section, overwriting only the text fields;
      // all other section fields (id, order, highlights, visuals, etc.) pass through unchanged.
      return {
        ...section,
        title: applyTokenReplacements(pickI18nString(uiLanguage, section.title, section.titleI18n), globalReplacements),
        textContent: applyTokenReplacements(pickI18nString(uiLanguage, section.textContent, section.textContentI18n), globalReplacements),
        interactions,
      };
    });

    // Step 3: Respond with the localised sections array and a convenience count field
    return res.json({
      success: true,
      sections: localized,
      count: localized.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching lesson sections',
      error: error.message,
    });
  }
};
