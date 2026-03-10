/**
 * @module routes/interactions
 * @description Express router for learner interaction submission and help requests.
 *
 * All routes are protected (require a valid JWT via the `protect` middleware).
 * Input is validated by shared `express-validator` chains before the request
 * reaches the controller, so the controller can assume clean data.
 *
 * Mounted routes:
 *   POST /api/interactions/submit  — Submit an answer for an interaction widget
 *   POST /api/interactions/help    — Request a contextual hint for an interaction
 *
 * Validation middleware pipeline:
 *   protect → validateSubmit/validateHelp → handleValidation → controller
 */
const express = require('express');                                                   // Express framework
const { body, validationResult } = require('express-validator');                      // Declarative input validation
const { protect } = require('../middleware/auth');                                    // JWT authentication middleware
const { submitInteraction, requestHelp } = require('../controllers/interactionController'); // Business-logic handlers

const router = express.Router(); // Interactions sub-router

/**
 * Validation chain for POST /submit.
 * Ensures all three required fields are present and correctly typed before
 * the request reaches the `submitInteraction` controller.
 *   - `lessonId`       must be a valid Mongo ObjectId string
 *   - `interactionId`  must be a non-empty trimmed string
 *   - `selectedAnswer` must be present (any truthy/falsy value is accepted;
 *                      the custom validator only blocks `undefined`)
 */
const validateSubmit = [
  body('lessonId').isMongoId().withMessage('Valid lessonId is required'),
  body('interactionId').trim().notEmpty().withMessage('interactionId is required'),
  body('selectedAnswer').custom((value) => value !== undefined).withMessage('selectedAnswer is required'),
];

/**
 * Validation chain for POST /help.
 * Requires the same lesson/interaction identifiers as `/submit` so the
 * controller can look up the existing attempt count to choose a hint tier.
 */
const validateHelp = [
  body('lessonId').isMongoId().withMessage('Valid lessonId is required'),
  body('interactionId').trim().notEmpty().withMessage('interactionId is required'),
];

/**
 * Middleware: check the accumulated express-validator result and short-circuit
 * with a 400 JSON response if any rule failed. Passes control to `next()` when
 * all rules pass, allowing the controller to run.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  return next();
};

/**
 * @route   POST /api/interactions/submit
 * @desc    Record the learner's answer for a specific interaction widget.
 *          The `submitInteraction` controller upserts a `UserInteraction` document
 *          keyed by `(userId, lessonId, interactionId)`, increments `attempts`,
 *          updates `lastAnswer`, and evaluates `isCorrect` against the stored
 *          `correctAnswer` on the matching `LessonSectionInteractionSchema`.
 * @access  Private — requires valid JWT
 *
 * @body    {string} lessonId       — ObjectId of the parent lesson
 * @body    {string} interactionId  — Identifier of the interaction widget
 * @body    {*}      selectedAnswer — The learner's submitted answer (any type)
 *
 * @returns {200} { success, isCorrect, attempts, feedback }
 * @returns {400} Validation error (missing/invalid fields)
 * @returns {401} Unauthenticated
 * @returns {404} Lesson or interaction not found
 * @returns {500} Server error
 */
router.post('/submit', protect, validateSubmit, handleValidation, submitInteraction);

/**
 * @route   POST /api/interactions/help
 * @desc    Return a contextual hint for the given interaction based on how many
 *          attempts the learner has already made.
 *          The `requestHelp` controller reads the `attempts` count from the
 *          existing `UserInteraction` document and selects the appropriate hint
 *          tier defined on the `LessonSectionInteractionSchema` (`hints` array).
 * @access  Private — requires valid JWT
 *
 * @body    {string} lessonId       — ObjectId of the parent lesson
 * @body    {string} interactionId  — Identifier of the interaction widget
 *
 * @returns {200} { success, hint: string }
 * @returns {400} Validation error (missing/invalid fields)
 * @returns {401} Unauthenticated
 * @returns {404} Lesson or interaction not found
 * @returns {500} Server error
 */
router.post('/help', protect, validateHelp, handleValidation, requestHelp);

// Export the interactions router to be mounted at /api/interactions in server.js
module.exports = router;
