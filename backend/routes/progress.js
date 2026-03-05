const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { getProgress, updateProgress } = require('../controllers/progressController');
const { getNextLesson } = require('../controllers/recommendationController');

const router = express.Router();

const validateUpdate = [
  body('lessonId').isMongoId().withMessage('Valid lessonId is required'),
  body('currentSectionId').optional().isString(),
  body('completedSections').optional().isArray(),
  body('interactionStates').optional(),
  body('isReplay').optional().isBoolean(),
];

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

// @route   GET /api/progress/next-lesson
// @desc    Get the recommended next lesson for the current user
// @access  Private
router.get('/next-lesson', protect, getNextLesson);

// @route   GET /api/progress/summary
// @desc    Get progress summary for user
// @access  Private
// EPIC 6.1.2, 6.6.1-6.6.2: Summary endpoint supports percentage + remaining display.
router.get('/summary', protect, require('../controllers/progressController').getSummary);

// @route   GET /api/progress/:lessonId
// @desc    Get progress for lesson
// @access  Private
// EPIC 6.4.2: Restore user progress state when a lesson is resumed.
router.get('/:lessonId', protect, getProgress);

// @route   POST /api/progress/update
// @desc    Update progress when moving forward
// @access  Private
// EPIC 6.4.1: Auto-save progress as the learner advances through sections.
router.post('/update', protect, validateUpdate, handleValidation, updateProgress);

module.exports = router;
