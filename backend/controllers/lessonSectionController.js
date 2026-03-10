const mongoose = require('mongoose');
const LessonSection = require('../models/LessonSection');
const {
  normalizeUiLanguage,
  pickI18nString,
  applyTokenReplacements,
  replaceQuotedSegments,
  buildOptionTokenReplacements,
} = require('../utils/i18n');

/**
 * Lesson Section Controller
 * -------------------------
 * Provides sectioned lesson content for step-by-step lesson flows.
 * Sections are fetched by `lessonId` and sorted by `order`.
 */

// @route   GET /api/lessons/:lessonId/sections
// @desc    Get lesson sections for a lesson
// @access  Private
/**
 * Returns ordered sections for a given lesson.
 * Route params: { lessonId }
 */
exports.getLessonSections = async (req, res) => {
  const { lessonId } = req.params;
  const uiLanguage = normalizeUiLanguage(req.query.lang);
  const contentLanguage = normalizeUiLanguage(req.query.contentLang || uiLanguage);

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    // `lean()` returns plain JS objects (faster + smaller) since we don't mutate documents here.
    const sections = await LessonSection.find({ lessonId })
      .sort({ order: 1 })
      .lean();

    const localized = (sections || []).map((section) => {
      const globalReplacements = Array.isArray(section.interactions)
        ? section.interactions.flatMap((interaction) => {
            const options = Array.isArray(interaction?.options) ? interaction.options : undefined;
            const optionsI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : undefined;
            return buildOptionTokenReplacements(uiLanguage, contentLanguage, options, optionsI18n);
          })
        : [];

      const interactions = Array.isArray(section.interactions)
        ? section.interactions.map((interaction) => {
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
        : section.interactions;

      return {
        ...section,
        title: applyTokenReplacements(pickI18nString(uiLanguage, section.title, section.titleI18n), globalReplacements),
        textContent: applyTokenReplacements(pickI18nString(uiLanguage, section.textContent, section.textContentI18n), globalReplacements),
        interactions,
      };
    });

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
