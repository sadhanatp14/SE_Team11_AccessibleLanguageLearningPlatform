/**
 * @module routes/progress
 * @description Express router for lesson progress read, write, and summary endpoints.
 *
 * All routes are protected (require a valid JWT via the `protect` middleware).
 * The `POST /update` route validates its body through a shared `express-validator`
 * chain before the request reaches the controller.
 *
 * Mounted routes:
 *   GET  /api/progress/next-lesson  — Recommend the next lesson for the user
 *   GET  /api/progress/summary      — Aggregate progress summary (EPIC 6.1.2 / 6.6)
 *   GET  /api/progress/:lessonId    — Fetch saved progress for a specific lesson
 *   POST /api/progress/update       — Upsert progress as the learner advances
 *
 * Route ordering note: named paths (/next-lesson, /summary) are registered
 * before the dynamic `/:lessonId` segment so Express does not treat the
 * literal strings as lesson IDs.
 */
const express = require('express');                                                        // Express framework
const { body, validationResult } = require('express-validator');                           // Input validation helpers
const { protect } = require('../middleware/auth');                                         // JWT authentication middleware
const { getProgress, updateProgress } = require('../controllers/progressController');      // Progress read/write handlers
const { getNextLesson } = require('../controllers/recommendationController');              // Next-lesson recommendation handler

const router = express.Router(); // Progress sub-router

/**
 * Validation chain for POST /update.
 * `lessonId` is mandatory (must be a valid Mongo ObjectId); all other fields
 * are optional so the controller can perform partial upserts — only sending
 * the fields that have changed in the current save.
 *   - `currentSectionId`   optional string  — the section the learner is on
 *   - `completedSections`  optional array   — cumulative list of visited sections
 *   - `interactionStates`  optional any     — free-form interaction state blob
 *   - `isReplay`           optional boolean — true when the learner is replaying a
 *                                             completed lesson (prevents re-flagging
 *                                             completed=false)
 */
const validateUpdate = [
  body('lessonId').isMongoId().withMessage('Valid lessonId is required'),
  body('currentSectionId').optional().isString(),
  body('completedSections').optional().isArray(),
  body('interactionStates').optional(),
  body('isReplay').optional().isBoolean(),
];

/**
 * Middleware: check the accumulated express-validator result and short-circuit
 * with a 400 JSON response if any rule failed.
 * Passes control to `next()` only when all rules pass so the controller
 * can safely assume the request body is valid.
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // EPIC 6.7.1-6.7.2: Use proper status codes and reject invalid data early to prevent crashes.
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  return next();
};

/**
 * @route   GET /api/progress/next-lesson
 * @desc    Return the recommended next lesson for the authenticated user.
 *          Delegates entirely to `getNextLesson` in `recommendationController`,
 *          which walks the lesson list linearly after the last completed lesson.
 * @access  Private — requires valid JWT
 *
 * @returns {200} { success, lesson: LessonDocument | null }
 * @returns {500} Server error
 */
router.get('/next-lesson', protect, getNextLesson);

/**
 * @route   GET /api/progress/summary
 * @desc    Return an aggregated progress summary for the authenticated user:
 *          total lessons, completed count, remaining count, and a list of
 *          completed lesson titles with timestamps (EPIC 6.1.2 / 6.6.1–6.6.2).
 *          Uses the shared `computeSummary` helper exported from progressController
 *          so the same calculation is available to both this route and the
 *          `complete-lesson` route in the users router.
 * @access  Private — requires valid JWT
 *
 * @returns {200} { success, summary: { totalLessons, completedCount, remaining, completedLessons[] } }
 * @returns {500} Server error
 */
router.get('/summary', protect, require('../controllers/progressController').getSummary);

/**
 * @route   GET /api/progress/:lessonId
 * @desc    Fetch the saved `UserProgress` document for the given lesson.
 *          Used by the resume flow to restore `currentSectionId` and
 *          `interactionStates` when the learner re-opens an in-progress lesson
 *          (EPIC 6.4.2). Returns 404 when no progress document exists yet.
 * @access  Private — requires valid JWT
 *
 * @param   {string} lessonId — Mongo ObjectId of the target lesson
 *
 * @returns {200} { success, progress: UserProgressDocument | null }
 * @returns {500} Server error
 */
router.get('/:lessonId', protect, getProgress);

/**
 * @route   POST /api/progress/update
 * @desc    Create or update the `UserProgress` document for a lesson as the
 *          learner advances through sections (EPIC 6.4.1 auto-save).
 *          Uses `findOneAndUpdate` with `upsert: true` so the first save
 *          creates the record and subsequent saves patch only the changed fields.
 *          When `isReplay` is `true` the controller skips re-setting the
 *          `completed` flag so replay sessions don't overwrite completion data.
 * @access  Private — requires valid JWT
 *
 * @body    {string}   lessonId          — ObjectId of the lesson (required)
 * @body    {string}   [currentSectionId] — Section the learner is currently on
 * @body    {string[]} [completedSections] — Cumulative visited section IDs
 * @body    {object}   [interactionStates] — Free-form interaction state blob
 * @body    {boolean}  [isReplay]          — Suppress completion-flag reset
 *
 * @returns {200} { success, progress: UserProgressDocument }
 * @returns {400} Validation error
 * @returns {500} Server error
 */
router.post('/update', protect, validateUpdate, handleValidation, updateProgress);

// Export the progress router to be mounted at /api/progress in server.js
module.exports = router;
