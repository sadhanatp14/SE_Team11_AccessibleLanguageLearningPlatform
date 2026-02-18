const mongoose = require('mongoose');
const LessonSection = require('../models/LessonSection');

/**
 * Lesson Section Controller
 * -------------------------
 * Provides sectioned lesson content for step-by-step lesson flows.
 * Sections are fetched by `lessonId` and sorted by `order`.
 */

// @route   GET /api/lessons/:lessonId/sections
// @desc    Get lesson sections for a lesson
// @access  Private
/**
 * Returns ordered sections for a given lesson.
 * Route params: { lessonId }
 */
exports.getLessonSections = async (req, res) => {
  const { lessonId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    // `lean()` returns plain JS objects (faster + smaller) since we don't mutate documents here.
    const sections = await LessonSection.find({ lessonId })
      .sort({ order: 1 })
      .lean();

    return res.json({
      success: true,
      sections,
      count: sections.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching lesson sections',
      error: error.message,
    });
  }
};
