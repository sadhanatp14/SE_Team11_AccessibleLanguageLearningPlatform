/**
 * @module routes/users
 * @description Express router for user profile and lesson-completion endpoints.
 *
 * All routes require a valid JWT (via the `protect` middleware).
 * This router complements the auth router by handling post-login user actions
 * that are not strictly authentication operations.
 *
 * Mounted routes:
 *   GET  /api/users/profile            — Retrieve the authenticated user's profile
 *   PUT  /api/users/profile            — Update name, age, or parentEmail
 *   POST /api/users/complete-lesson    — Mark a lesson as completed (EPIC 6.x)
 *   GET  /api/users/completed-lessons  — List all completed lesson keys (EPIC 6.3)
 *
 * Design notes:
 *   - `complete-lesson` is intentionally idempotent: re-submitting the same
 *     `lessonKey` refreshes the `completedAt` timestamp but does not duplicate
 *     the key in `completedLessons`.
 *   - Progress sync (UserProgress upsert) inside `complete-lesson` is best-effort;
 *     failures are caught and logged but do not prevent the 200 response.
 */
const express = require('express');                           // Express framework
const router = express.Router();                              // Users sub-router
const mongoose = require('mongoose');                         // ObjectId validation helper
const User = require('../models/User');                       // User Mongoose model
const Lesson = require('../models/Lesson');                   // Lesson model (progress sync)
const UserProgress = require('../models/UserProgress');       // Progress model (upsert on completion)
const { protect, authorize } = require('../middleware/auth'); // JWT auth middleware

/**
 * @route   GET /api/users/profile
 * @desc    Retrieve the authenticated user's full profile document, excluding
 *          the password hash. The `preferences` ObjectId is populated with the
 *          full Preferences sub-document so the frontend has settings in one call.
 * @access  Private — requires valid JWT
 *
 * @returns {200} { success: true, user: UserDocument }
 * @returns {500} Database error.
 */
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('preferences');

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update mutable profile fields: `name`, `age`, `parentEmail`.
 *          Uses a truthy-conditional spread so omitted or falsy values leave
 *          existing fields unchanged. `runValidators: true` enforces the schema
 *          constraints (e.g. age min/max) on the update path.
 * @access  Private — requires valid JWT
 *
 * @returns {200} { success: true, message, user: UpdatedUserDocument }
 * @returns {500} Validation or database error.
 */
router.put('/profile', protect, async (req, res) => {
  const { name, age, parentEmail } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(name && { name }),
        ...(age && { age }),
        ...(parentEmail && { parentEmail }),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/users/complete-lesson
 * @desc    Mark a lesson as completed for the authenticated user (EPIC 6.x).
 *
 *          Steps:
 *            1. Validate that `lessonKey` is a non-empty string.
 *            2. Append `lessonKey` to `user.completedLessons` (idempotent — no duplicates).
 *            3. Upsert a `completedLessonsMeta` entry with the current timestamp.
 *            4. Save the user document.
 *            5. If `lessonKey` contains a valid 24-char ObjectId, upsert a
 *               `UserProgress` record for the corresponding Lesson document.
 *            6. Build and return a progress summary via `computeSummary`
 *               (falls back to a manual count query if the helper is unavailable).
 *
 *          All progress-sync steps (5–6) are best-effort: failures are caught,
 *          logged as warnings, and do not cause the route to return an error.
 *
 * @access  Private — requires valid JWT
 *
 * @returns {200} { success: true, message, completedLessons, summary }
 * @returns {400} Missing or invalid `lessonKey`.
 * @returns {404} Authenticated user not found in DB.
 * @returns {500} Unexpected server error.
 */
router.post('/complete-lesson', protect, async (req, res) => {
  const { lessonKey } = req.body;

  // EPIC 6.7.1-6.7.2: Validate request payload and return proper status codes for invalid input.
  if (!lessonKey || typeof lessonKey !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'lessonKey is required',
    });
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      // EPIC 6.7.1: Return 404 when the user cannot be found.
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    const now = new Date();

    if (!user.completedLessons.includes(lessonKey)) {
      // EPIC 6.1.1: Store completion state (completed=true/false) by persisting a completed lesson key.
      user.completedLessons.push(lessonKey);
    }

    // Update or add metadata timestamp for this lessonKey
    if (!Array.isArray(user.completedLessonsMeta)) user.completedLessonsMeta = [];
    const metaIndex = user.completedLessonsMeta.findIndex((m) => m.key === lessonKey);
    if (metaIndex === -1) {
      // EPIC 6.3.1-6.3.4: Store completion metadata to support read-only learning history.
      user.completedLessonsMeta.push({ key: lessonKey, completedAt: now });
    } else {
      user.completedLessonsMeta[metaIndex].completedAt = now;
    }

    await user.save();

    // Try to sync with UserProgress when we can map a lesson id from lessonKey
    let summary = null;
    try {
      const oidMatch = lessonKey && lessonKey.match(/([a-fA-F0-9]{24})/);
      let lesson = null;
      if (oidMatch) {
        const lessonId = oidMatch[1];
        if (mongoose.Types.ObjectId.isValid(lessonId)) {
          lesson = await Lesson.findById(lessonId).lean();
        }
      }

      if (lesson) {
        // EPIC 6.4.1: Save progress automatically after a lesson is completed.
        await UserProgress.findOneAndUpdate(
          { userId: user._id, lessonId: lesson._id },
          { completed: true, completedAt: now, lastAccessedAt: now },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      }

      // Build a summary payload using the shared helper from progressController
      try {
        // EPIC 6.1.2, 6.6.1-6.6.2: Return completed/total/remaining to support percentage + simple progress UI.
        const { computeSummary } = require('../controllers/progressController');
        summary = await computeSummary(user._id);
      } catch (e) {
        // EPIC 6.7.1-6.7.2: Degrade gracefully if summary helper fails (best-effort fallback).
        // fallback: best-effort similar computation
        // EPIC 6.7.3: Keep fallback queries simple (counts + small list).
        const totalLessons = await Lesson.countDocuments();
        const completedProgress = await UserProgress.find({ userId: user._id, completed: true })
          .populate('lessonId', 'title')
          .sort({ completedAt: -1 })
          .lean();
        const completedLessons = completedProgress.map((p) => ({
          lessonId: p.lessonId?._id || p.lessonId,
          title: p.lessonId?.title || 'Untitled',
          completedAt: p.completedAt || p.updatedAt || p.createdAt,
        }));
        summary = { totalLessons, completedCount: completedLessons.length, remaining: Math.max(0, totalLessons - completedLessons.length), completedLessons };
      }
    } catch (err) {
      // EPIC 6.7.1-6.7.2: Completion should be best-effort; do not break UX if progress sync fails.
      // Not critical - we try to be best-effort here
      console.warn('Error syncing UserProgress for lessonKey', lessonKey, err && err.message);
    }

    res.json({
      success: true,
      message: 'Lesson marked as completed',
      completedLessons: user.completedLessons,
      // EPIC 6.1.3: Return updated progress immediately after lesson completion.
      summary,
    });
  } catch (error) {
    // EPIC 6.7.1: Consistent server error response.
    res.status(500).json({
      success: false,
      message: 'Error marking lesson as completed',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/users/completed-lessons
 * @desc    Return the array of completed lesson keys for the authenticated user
 *          (EPIC 6.3.1–6.3.4). Used by the frontend to highlight completed items
 *          in the lesson library and to gate lesson-replay entry points.
 *          Returns an empty array (not 404) when the array field is absent.
 * @access  Private — requires valid JWT
 *
 * @returns {200} { success: true, completedLessons: string[] }
 * @returns {404} Authenticated user not found in DB.
 * @returns {500} Database error.
 */
router.get('/completed-lessons', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('completedLessons');

    if (!user) {
      // EPIC 6.7.1: Return 404 when the user cannot be found.
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // EPIC 6.3.1-6.3.4: Provide read-only completion history to support reopening/replaying lessons.

    res.json({
      success: true,
      completedLessons: user.completedLessons || [],
    });
  } catch (error) {
    // EPIC 6.7.1: Consistent server error response.
    res.status(500).json({
      success: false,
      message: 'Error fetching completed lessons',
      error: error.message,
    });
  }
});

// Export the users router to be mounted at /api/users in server.js
module.exports = router;
