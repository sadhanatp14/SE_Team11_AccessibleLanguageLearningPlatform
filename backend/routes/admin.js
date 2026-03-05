const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const UserInteraction = require('../models/UserInteraction');
const { protect, authorize } = require('../middleware/auth');
const { computeSummary } = require('../controllers/progressController');

// @route   GET /api/admin/users
// @desc    List all registered users (basic info)
// @access  Private, admin only
router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find()
            .select('name learningCondition role')
            .lean();

        // map to lighter objects
        const trimmed = users.map((u) => ({
            id: u._id,
            name: u.name,
            learningCondition: u.learningCondition,
            role: u.role,
        }));

        res.json({ success: true, users: trimmed });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching user list',
            error: error.message,
        });
    }
});

// @route   GET /api/admin/users/:id
// @desc    Get detailed info for a specific user together with progress/interaction data
// @access  Private, admin only
router.get('/users/:id', protect, authorize('admin'), async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    try {
        const user = await User.findById(id).select('-password').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // compute progress summary
        const summary = await computeSummary(id);

        // fetch interactions
        const interactions = await UserInteraction.find({ userId: id }).lean();

        res.json({ success: true, user, summary, interactions });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching user details',
            error: error.message,
        });
    }
});

module.exports = router;