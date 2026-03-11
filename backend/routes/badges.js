const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { getBadges } = require('../controllers/badgesController');

// @route   GET /api/badges
// @desc    Get computed badges for the current user
// @access  Private
router.get('/', protect, getBadges);

module.exports = router;
