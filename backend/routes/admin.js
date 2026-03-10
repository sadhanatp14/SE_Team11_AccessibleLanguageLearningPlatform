/**
 * Admin Routes
 *
 * Provides admin-only endpoints for managing and inspecting user data.
 * All routes in this file are protected and require the caller to be
 * authenticated and hold the 'admin' role.
 *
 * Base path: /api/admin
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Models
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const UserInteraction = require('../models/UserInteraction');

// Middleware – protect requires a valid JWT; authorize restricts to the given role
const { protect, authorize } = require('../middleware/auth');

// Reuse the shared progress summary helper from the progress controller
const { computeSummary } = require('../controllers/progressController');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users
// Returns a lightweight list of every registered user (no passwords or
// sensitive fields). Useful for the admin dashboard overview.
// Access: Private – admin only
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        // Only pull the fields the admin overview actually needs
        const users = await User.find()
            .select('name learningCondition role')
            .lean();

        // Re-shape each document into a minimal DTO to avoid leaking internal fields
        const trimmed = users.map((u) => ({
            id: u._id,
            name: u.name,
            learningCondition: u.learningCondition,
            role: u.role,
        }));

        res.json({ success: true, users: trimmed });
    } catch (error) {
        // Return a 500 if the database query fails for any reason
        return res.status(500).json({
            success: false,
            message: 'Error fetching user list',
            error: error.message,
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/users/:id
// Returns full details for a single user, including their aggregated progress
// summary and raw interaction history. Used by the admin user-detail view.
// Access: Private – admin only
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users/:id', protect, authorize('admin'), async (req, res) => {
    const { id } = req.params;

    // Validate that the supplied ID is a well-formed MongoDB ObjectId before
    // hitting the database, to return a clear 400 instead of a Mongo cast error
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    try {
        // Fetch the user document; strip the password hash before sending
        const user = await User.findById(id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Aggregate lesson completion stats, streaks, etc. via the shared helper
        const summary = await computeSummary(id);

        // Retrieve every interaction event recorded for this user (clicks,
        // answers, accessibility toggles, etc.)
        const interactions = await UserInteraction.find({ userId: id }).lean();

        res.json({ success: true, user, summary, interactions });
    } catch (error) {
        // Generic server error – log details in the response for easier debugging
        return res.status(500).json({
            success: false,
            message: 'Error fetching user details',
            error: error.message,
        });
    }
});

module.exports = router;