/**
 * interactionController.js
 *
 * Handles two routes in the interactions API:
 *  - POST /api/interactions/submit  – Grade a learner's answer and return feedback.
 *  - POST /api/interactions/help    – Return a contextual hint or explanation.
 *
 * Architecture:
 *  - Interaction definitions (question text, options, correct answer, hints) live
 *    inside the parent Lesson document (`lesson.interactions[]`).
 *  - Per-user attempt history is stored in the UserInteraction collection,
 *    keyed by (userId, lessonId, interactionId).
 *
 * Key design decisions:
 *  - Answers are normalised to lowercase strings before comparison so type
 *    mismatches (boolean vs string, index vs text) never cause false failures.
 *  - Attempt counts are capped at `interaction.maxAttempts` (default 3) to
 *    prevent unbounded document growth.
 *  - Hints are withheld until the learner has made at least N attempts
 *    (configurable via the HINT_TRIGGER_ATTEMPTS environment variable).
 */

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
 *
 * @param {object} interaction    - Interaction document from the Lesson (contains options[], correctAnswer).
 * @param {any}    selectedAnswer - The raw answer value submitted by the learner.
 * @returns {{ selected: any, correct: any }} Both values normalised to the same type for safe comparison.
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

/**
 * Resolve all user-facing strings on an interaction to the requested UI language.
 *
 * Applies `pickI18nString` to feedback, hint, and explanation so that learners
 * always receive text in their preferred language when i18n variants exist.
 * Raw i18n objects are also forwarded so bilingual clients can render both
 * languages simultaneously without making a second request.
 *
 * @param {object} interaction - Interaction document from the Lesson.
 * @param {string} uiLanguage  - Normalised UI language string (e.g. 'english', 'tamil', 'hindi').
 * @returns {{
 *   feedback:        { correct: string, incorrect: string } | undefined,
 *   hint:            string,
 *   explanation:     string,
 *   hintI18n:        object | undefined,
 *   explanationI18n: object | undefined,
 * }}
 */
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
    // Pass through i18n objects (if present) so clients can render bilingual help text.
    // Keeping `hint` / `explanation` as strings preserves backward compatibility.
    hintI18n: interaction?.hintI18n,
    explanationI18n: interaction?.explanationI18n,
  };
};

// Pool of encouraging messages randomly shown to learners on incorrect submissions
// or when they explicitly request help. Randomisation avoids a repetitive feel.
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

/**
 * POST /api/interactions/submit
 *
 * Grade a learner's answer to a lesson interaction.
 *
 * Request body: { lessonId, interactionId, selectedAnswer, uiLanguage? }
 * Response:     { isCorrect, feedback, hint?, hintI18n?, explanation?, explanationI18n?, encouragement? }
 *
 * Steps:
 *  1. Load the parent Lesson and locate the target interaction.
 *  2. Coerce and normalise both answers, then compare.
 *  3. Fetch/upsert the UserInteraction document to track attempt history.
 *  4. On failure, attach explanation, hint (after N attempts), and encouragement.
 *
 * @param {import('express').Request}  req - req.user.id from auth middleware.
 * @param {import('express').Response} res
 */
exports.submitInteraction = async (req, res) => {
  const { lessonId, interactionId, selectedAnswer, uiLanguage: uiLanguageRaw } = req.body;
  const uiLanguage = normalizeUiLanguage(uiLanguageRaw);

  try {
    // Step 1a: Load the lesson – 404 if it does not exist
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // Step 1b: Locate the specific interaction within the lesson's interactions array
    const interaction = lesson.interactions.find(
      (item) => item.id === interactionId
    );

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found in lesson',
      });
    }

    // Step 2: Coerce answer types, then normalise to lowercase strings for comparison
    const coerced = coerceForComparison(interaction, selectedAnswer);
    // Compare after normalization so type differences (e.g. true vs "true") don't break grading.
    const isCorrect =
      normalizeAnswer(coerced.selected) ===
      normalizeAnswer(coerced.correct);

    // Resolve feedback/hint/explanation to the learner's UI language
    const localized = localizeInteractionText(interaction, uiLanguage);
    const feedback = isCorrect ? localized.feedback?.correct : localized.feedback?.incorrect;

    // Step 3: Upsert the UserInteraction record to track attempts and last answer
    const existing = await UserInteraction.findOne({
      userId: req.user.id,
      lessonId,
      interactionId,
    });

    // Attempts are tracked per (user, lesson, interaction).
    const nextAttempts = (existing?.attempts || 0) + 1;
    const maxAttempts = interaction.maxAttempts || 3;
    // Cap at maxAttempts to prevent unbounded document growth
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

    // Step 4: Build the response – hints and encouragement only appear on incorrect answers
    const response = {
      isCorrect,
      feedback,
    };

    if (!isCorrect) {
      // Always include explanation when available so learners understand the correct reasoning
      if (localized.explanation) {
        response.explanation = localized.explanation;
        if (localized.explanationI18n) response.explanationI18n = localized.explanationI18n;
      }

      // Reveal the hint only after the learner has made the minimum number of attempts
      const hintTriggerAttempts = getHintTriggerAttempts();
      if (localized.hint && nextAttempts >= hintTriggerAttempts) {
        response.hint = localized.hint;
        if (localized.hintI18n) response.hintI18n = localized.hintI18n;
      }

      // Always attach an encouraging message to soften the failure feedback
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

/**
 * POST /api/interactions/help
 *
 * Return contextual help (hint or explanation) for a lesson interaction
 * without requiring the learner to submit an answer.
 *
 * Request body: { lessonId, interactionId, uiLanguage? }
 * Response:     { hint?, hintI18n?, explanation?, explanationI18n?, encouragement }
 *
 * Help priority (first match wins):
 *  1. Hint  – when the learner has reached the attempt threshold (HINT_TRIGGER_ATTEMPTS).
 *  2. Explanation – when no hint threshold is met but an explanation exists.
 *  3. Hint  – fallback when explanation is absent but hint is available.
 *
 * @param {import('express').Request}  req - req.user.id from auth middleware.
 * @param {import('express').Response} res
 */
exports.requestHelp = async (req, res) => {
  const { lessonId, interactionId, uiLanguage: uiLanguageRaw } = req.body;
  const uiLanguage = normalizeUiLanguage(uiLanguageRaw);

  try {
    // Step 1a: Load the lesson – 404 if it does not exist
    const lesson = await Lesson.findById(lessonId);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    // Step 1b: Locate the interaction within the lesson
    const interaction = lesson.interactions.find(
      (item) => item.id === interactionId
    );

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Interaction not found in lesson',
      });
    }

    // Step 2: Look up the learner's existing attempt count for this interaction
    const existing = await UserInteraction.findOne({
      userId: req.user.id,
      lessonId,
      interactionId,
    });

    // Default to 0 when no record exists yet (learner has never attempted this interaction)
    const attempts = existing?.attempts || 0;
    const hintTriggerAttempts = getHintTriggerAttempts();

    // Step 3: Build the help response using the priority order described above
    const response = {};

    // Resolve all text fields to the learner's UI language
    const localized = localizeInteractionText(interaction, uiLanguage);

    if (localized.hint && attempts >= hintTriggerAttempts) {
      // Priority 1: Hint revealed once the learner has struggled enough
      response.hint = localized.hint;
      if (localized.hintI18n) response.hintI18n = localized.hintI18n;
    } else if (localized.explanation) {
      // Priority 2: Explanation when hint threshold not yet reached
      response.explanation = localized.explanation;
      if (localized.explanationI18n) response.explanationI18n = localized.explanationI18n;
    } else if (localized.hint) {
      // Priority 3: Hint as final fallback when no explanation exists
      response.hint = localized.hint;
      if (localized.hintI18n) response.hintI18n = localized.hintI18n;
    }

    // Always include an encouragement message so the help response feels supportive
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
