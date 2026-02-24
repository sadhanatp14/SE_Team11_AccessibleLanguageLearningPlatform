const Lesson = require('../models/Lesson');
const UserInteraction = require('../models/UserInteraction');
const { normalizeUiLanguage, pickI18nString } = require('../utils/i18n');

/**
 * Interaction Controller
 * ----------------------
 * Handles per-interaction submissions and contextual help.
 * Data model notes:
 * - Lesson interactions live inside the Lesson document (`lesson.interactions[]`).
 * - Per-user attempts/answers are stored in `UserInteraction` keyed by
 *   (userId, lessonId, interactionId).
 *
 * Design goals:
 * - Normalize answers across types (boolean/number/string)
 * - Cap attempt counts to avoid unbounded growth
 * - Provide hints/explanations progressively based on attempts
 */

/**
 * Normalizes an answer into a lowercase string for safe comparison.
 * @param {any} value
 * @returns {string}
 */
const normalizeAnswer = (value) => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  return String(value ?? '').trim().toLowerCase();
};

/**
 * Coerces selected/correct answer into comparable representations.
 * This makes grading resilient when clients submit option index but DB stores option text (or vice versa).
 */
const coerceForComparison = (interaction, selectedAnswer) => {
  const options = Array.isArray(interaction?.options) ? interaction.options : null;
  const correctAnswer = interaction?.correctAnswer;

  // Multiple-choice often has options array.
  if (!options || options.length === 0) {
    return { selected: selectedAnswer, correct: correctAnswer };
  }

  // If DB stores correct answer as string but client sends index, map index -> option text.
  if (typeof correctAnswer === 'string' && typeof selectedAnswer === 'number') {
    const mapped = options[selectedAnswer];
    return { selected: typeof mapped === 'string' ? mapped : selectedAnswer, correct: correctAnswer };
  }

  // If DB stores correct answer as index but client sends text, map text -> index.
  if (typeof correctAnswer === 'number' && typeof selectedAnswer === 'string') {
    const idx = options.findIndex(
      (opt) => normalizeAnswer(opt) === normalizeAnswer(selectedAnswer)
    );
    return { selected: idx >= 0 ? idx : selectedAnswer, correct: correctAnswer };
  }

  return { selected: selectedAnswer, correct: correctAnswer };
};

const localizeInteractionText = (interaction, uiLanguage) => {
  const feedback = interaction?.feedback;
  return {
    feedback: feedback
      ? {
          correct: pickI18nString(uiLanguage, feedback.correct, interaction?.feedbackI18n?.correct),
          incorrect: pickI18nString(uiLanguage, feedback.incorrect, interaction?.feedbackI18n?.incorrect),
        }
      : undefined,
    hint: pickI18nString(uiLanguage, interaction?.hint || '', interaction?.hintI18n),
    explanation: pickI18nString(uiLanguage, interaction?.explanation || '', interaction?.explanationI18n),
  };
};

const encouragementMessages = [
  "You're getting closer!",
  "Nice try — let's look at this together.",
  'Learning takes practice. Keep going!',
  'Good effort! Try once more.',
  'You are making progress. Keep it up!',
];

/**
 * Picks a randomized encouragement message for incorrect submissions / help.
 * @returns {string}
 */
const pickEncouragement = () => {
  return encouragementMessages[
    Math.floor(Math.random() * encouragementMessages.length)
  ];
};

/**
 * Reads the attempt threshold after which hints can be returned.
 * Uses `HINT_TRIGGER_ATTEMPTS` env var with a safe default.
 * @returns {number}
 */
const getHintTriggerAttempts = () => {
  const value = Number(process.env.HINT_TRIGGER_ATTEMPTS || 2);
  return Number.isNaN(value) ? 2 : Math.max(1, value);
};

// @route   POST /api/interactions/submit
// @desc    Submit a lesson interaction response
// @access  Private
/**
 * Submit a response to an interaction.
 * Expected body: { lessonId, interactionId, selectedAnswer }
 * Response: { isCorrect, feedback, hint?, explanation?, encouragement? }
 */
exports.submitInteraction = async (req, res) => {
  const { lessonId, interactionId, selectedAnswer, uiLanguage: uiLanguageRaw } = req.body;
  const uiLanguage = normalizeUiLanguage(uiLanguageRaw);

  try {
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const interaction = lesson.interactions.find(
      (item) => item.id === interactionId
    );

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found in lesson',
      });
    }

    const coerced = coerceForComparison(interaction, selectedAnswer);
    // Compare after normalization so type differences (e.g. true vs "true") don't break grading.
    const isCorrect =
      normalizeAnswer(coerced.selected) ===
      normalizeAnswer(coerced.correct);

    const localized = localizeInteractionText(interaction, uiLanguage);
    const feedback = isCorrect ? localized.feedback?.correct : localized.feedback?.incorrect;

    const existing = await UserInteraction.findOne({
      userId: req.user.id,
      lessonId,
      interactionId,
    });

    // Attempts are tracked per (user, lesson, interaction).
    const nextAttempts = (existing?.attempts || 0) + 1;
    const maxAttempts = interaction.maxAttempts || 3;
    const cappedAttempts = Math.min(nextAttempts, maxAttempts);

    await UserInteraction.findOneAndUpdate(
      { userId: req.user.id, lessonId, interactionId },
      {
        attempts: cappedAttempts,
        lastAnswer: selectedAnswer,
        isCorrect,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const response = {
      isCorrect,
      feedback,
    };

    if (!isCorrect) {
      if (localized.explanation) response.explanation = localized.explanation;

      const hintTriggerAttempts = getHintTriggerAttempts();
      if (localized.hint && nextAttempts >= hintTriggerAttempts) response.hint = localized.hint;

      response.encouragement = pickEncouragement();
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error submitting interaction',
      error: error.message,
    });
  }
};

// @route   POST /api/interactions/help
// @desc    Get contextual help (hint or explanation)
// @access  Private
/**
 * Request contextual help for an interaction.
 * Expected body: { lessonId, interactionId }
 * Behavior:
 * - Prefer hint after N attempts
 * - Otherwise return explanation when available
 */
exports.requestHelp = async (req, res) => {
  const { lessonId, interactionId, uiLanguage: uiLanguageRaw } = req.body;
  const uiLanguage = normalizeUiLanguage(uiLanguageRaw);

  try {
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const interaction = lesson.interactions.find(
      (item) => item.id === interactionId
    );

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found in lesson',
      });
    }

    const existing = await UserInteraction.findOne({
      userId: req.user.id,
      lessonId,
      interactionId,
    });

    const attempts = existing?.attempts || 0;
    const hintTriggerAttempts = getHintTriggerAttempts();

    const response = {};

    const localized = localizeInteractionText(interaction, uiLanguage);

    if (localized.hint && attempts >= hintTriggerAttempts) {
      response.hint = localized.hint;
    } else if (localized.explanation) {
      response.explanation = localized.explanation;
    } else if (localized.hint) {
      response.hint = localized.hint;
    }

    response.encouragement = pickEncouragement();

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching help',
      error: error.message,
    });
  }
};
