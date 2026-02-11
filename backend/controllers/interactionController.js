const Lesson = require('../models/Lesson');
const UserInteraction = require('../models/UserInteraction');

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
  const { lessonId, interactionId, selectedAnswer } = req.body;

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

    // Compare after normalization so type differences (e.g. true vs "true") don't break grading.
    const isCorrect =
      normalizeAnswer(selectedAnswer) ===
      normalizeAnswer(interaction.correctAnswer);
    const feedback = isCorrect
      ? interaction.feedback.correct
      : interaction.feedback.incorrect;

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
      if (interaction.explanation) {
        response.explanation = interaction.explanation;
      }

      const hintTriggerAttempts = getHintTriggerAttempts();
      if (interaction.hint && nextAttempts >= hintTriggerAttempts) {
        response.hint = interaction.hint;
      }

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
  const { lessonId, interactionId } = req.body;

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

    if (interaction.hint && attempts >= hintTriggerAttempts) {
      response.hint = interaction.hint;
    } else if (interaction.explanation) {
      response.explanation = interaction.explanation;
    } else if (interaction.hint) {
      response.hint = interaction.hint;
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
