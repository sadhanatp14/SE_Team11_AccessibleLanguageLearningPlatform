const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');
const UserProgress = require('../models/UserProgress');

/**
 * Recommendation Controller
 * -------------------------
 * Determines the single best "next lesson" for a learner based on their
 * completion history.
 *
 * Strategy:
 * 1. Fetch all lessons in creation order (_id ascending) as the canonical
 *    sequence. This avoids requiring a dedicated `order` field on the Lesson
 *    model while still producing a stable, deterministic ordering.
 * 2. Load the set of lessons the user has already completed.
 * 3. Walk the ordered list and return the **first incomplete** lesson.
 *
 * Edge cases handled:
 * - No lessons exist in the system → { recommendation: null, reason }
 * - User has completed every lesson → { recommendation: null, allCompleted: true }
 * - User has not started any lessons → first lesson is recommended
 * - Invalid / missing user → 401 handled by auth middleware upstream
 */

/**
 * GET /api/progress/next-lesson
 * @desc   Return the single recommended next lesson for the current user.
 * @access Private (requires `protect` middleware)
 */
exports.getNextLesson = async (req, res) => {
  try {
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

    // 2. Fetch completed lesson IDs for this user.
    const completedRecords = await UserProgress.find({
      userId,
      completed: true,
    })
      .select('lessonId')
      .lean();

    const completedIds = new Set(
      completedRecords.map((r) => r.lessonId.toString())
    );

    // 3. Find the last completed lesson and the next incomplete one.
    let lastCompleted = null;
    let nextLesson = null;

    for (let i = 0; i < allLessons.length; i++) {
      const lessonId = allLessons[i]._id.toString();
      if (completedIds.has(lessonId)) {
        lastCompleted = allLessons[i];
      } else if (!nextLesson) {
        nextLesson = allLessons[i];
      }
    }

    // 4. All lessons completed
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

    // 5. Build the recommendation response.
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
    console.error('Error computing next-lesson recommendation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error computing lesson recommendation',
      error: error.message,
    });
  }
};
