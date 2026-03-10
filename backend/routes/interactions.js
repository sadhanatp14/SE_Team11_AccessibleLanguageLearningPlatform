const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const { submitInteraction, requestHelp } = require('../controllers/interactionController');

const router = express.Router();

const validateSubmit = [
  body('lessonId').isMongoId().withMessage('Valid lessonId is required'),
  body('interactionId').trim().notEmpty().withMessage('interactionId is required'),
  body('selectedAnswer').custom((value) => value !== undefined).withMessage('selectedAnswer is required'),
];

const validateHelp = [
  body('lessonId').isMongoId().withMessage('Valid lessonId is required'),
  body('interactionId').trim().notEmpty().withMessage('interactionId is required'),
];

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

// @route   POST /api/interactions/submit
// @desc    Submit an interaction response
// @access  Private
router.post('/submit', protect, validateSubmit, handleValidation, submitInteraction);

// @route   POST /api/interactions/help
// @desc    Request contextual help for an interaction
// @access  Private
router.post('/help', protect, validateHelp, handleValidation, requestHelp);

module.exports = router;
