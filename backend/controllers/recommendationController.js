/**
 * recommendationController.js
 *
 * Provides a lightweight "next lesson" recommendation engine.
 *
 * Exported route handler:
 *  - GET /api/progress/next-lesson  →  exports.getNextLesson
 *
 * Recommendation strategy (linear progression):
 *  1. Retrieve all lessons ordered by creation time (_id ascending) as the
 *     canonical sequence — avoids requiring a dedicated `order` field on Lesson.
 *  2. Load the user's completed lesson IDs from UserProgress.
 *  3. Walk the ordered list and return the first lesson not yet completed.
 *
 * Edge cases:
 *  - No lessons in the system       → { recommendation: null, reason }
 *  - All lessons already completed  → { recommendation: null, allCompleted: true }
 *  - User hasn't started anything   → first lesson is recommended
 *  - Invalid / unauthenticated user → 401 handled by `protect` middleware upstream
 */

// Mongoose — used for ObjectId safety in sub-queries (via imported models)
const mongoose = require('mongoose');
// Lesson model — source of truth for available lessons and their metadata
const Lesson = require('../models/Lesson');
// UserProgress model — tracks which lessons a user has completed
const UserProgress = require('../models/UserProgress');

/**
 * GET /api/progress/next-lesson
 *
 * Return the single recommended next lesson for the current user.
 *
 * The recommendation is purely sequential: the first lesson in creation order
 * that the user has not yet completed.  When every lesson is done, the response
 * includes `allCompleted: true` so the UI can display a congratulatory message
 * instead of a lesson card.
 *
 * @param {import('express').Request}  req - req.user.id from `protect` middleware.
 * @param {import('express').Response} res - JSON:
 *   On success (lesson found):    { success, recommendation: { lessonId, title, description, position, totalLessons }, lastCompleted, completedCount }
 *   On all-complete:              { success, recommendation: null, allCompleted: true, lastCompleted, reason }
 *   On no lessons in system:      { success, recommendation: null, reason }
 *   On error:                     { success: false, message, error }
 */
exports.getNextLesson = async (req, res) => {
  try {
    // Extract the authenticated user's ID (injected by the `protect` middleware)
    const userId = req.user.id;

    // 1. Fetch all lessons sorted by creation order (ascending _id).
    const allLessons = await Lesson.find({})
      .sort({ _id: 1 })
      .select('_id title textContent audioUrl')
      .lean();

    if (!allLessons || allLessons.length === 0) {
      return res.json({
        success: true,
        recommendation: null,
        reason: 'No lessons are available in the system.',
      });
    }

    // Step 2: Fetch completed lesson IDs for this user from UserProgress.
    // Only select `lessonId` to keep the query lightweight — we only need IDs.
    const completedRecords = await UserProgress.find({
      userId,
      completed: true,
    })
      .select('lessonId')
      .lean();

    // Convert to a Set of strings for O(1) membership checks in the loop below
    const completedIds = new Set(
      completedRecords.map((r) => r.lessonId.toString())
    );

    // Step 3: Walk the ordered lesson list to find the last completed lesson
    // and the first incomplete one in a single pass.
    let lastCompleted = null; // most recently completed lesson (by position order)
    let nextLesson    = null; // first lesson the user has NOT yet completed

    for (let i = 0; i < allLessons.length; i++) {
      const lessonId = allLessons[i]._id.toString();
      if (completedIds.has(lessonId)) {
        // Keep updating so we end up with the last completed lesson in sequence
        lastCompleted = allLessons[i];
      } else if (!nextLesson) {
        // Lock in the first incomplete lesson and stop overwriting it
        nextLesson = allLessons[i];
      }
    }

    // Step 4: All lessons completed — return a congratulatory response with no next-lesson card
    if (!nextLesson) {
      return res.json({
        success: true,
        recommendation: null,
        allCompleted: true,
        lastCompleted: lastCompleted
          ? { lessonId: lastCompleted._id, title: lastCompleted.title }
          : null,
        reason: 'Congratulations! You have completed all available lessons.',
      });
    }

    // Step 5: Build the recommendation response.
    // Compute 1-based position so the UI can display "Lesson 3 of 10" etc.
    const currentIndex = allLessons.findIndex(
      (l) => l._id.toString() === nextLesson._id.toString()
    );

    return res.json({
      success: true,
      recommendation: {
        lessonId: nextLesson._id,
        title: nextLesson.title,
        description: (nextLesson.textContent || '').slice(0, 160),
        position: currentIndex + 1,
        totalLessons: allLessons.length,
      },
      lastCompleted: lastCompleted
        ? { lessonId: lastCompleted._id, title: lastCompleted.title }
        : null,
      completedCount: completedIds.size,
    });
  } catch (error) {
    // Unexpected DB or runtime error — log server-side and return a safe 500
    console.error('Error computing next-lesson recommendation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error computing lesson recommendation',
      error: error.message,
    });
  }
};
