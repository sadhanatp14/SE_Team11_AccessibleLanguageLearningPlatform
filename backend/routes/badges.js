/**
 * Badges Routes
 *
 * Exposes the badge-retrieval endpoint for authenticated users.
 * Badge data is computed on-the-fly from the user's lesson progress and
 * interaction history — nothing is persisted in the database.
 *
 * Base path: /api/badges
 */

const express = require('express');
const router = express.Router();

// protect – verifies the JWT and attaches req.user before the handler runs
const { protect } = require('../middleware/auth');

// getBadges – computes the full badge catalogue from live progress/interaction data
const { getBadges } = require('../controllers/badgesController');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/badges
// Returns the authenticated user's badge catalogue with earned status and
// progress percentages for each badge. Delegates all logic to getBadges.
// Access: Private – valid JWT required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', protect, getBadges);

module.exports = router;
