const mongoose = require('mongoose');
const LessonSection = require('../models/LessonSection');
const UserProgress = require('../models/UserProgress');
const User = require('../models/User');

/**
 * Progress Controller
 * -------------------
 * Stores and retrieves lesson progress for DB-backed lessons.
 *
 * Key behaviors:
 * - If no progress exists for a (user, lesson), create a default record on first GET.
 * - `updateProgress` is careful to treat replay/history as read-only.
 * - `getSummary` aggregates completion across UserProgress (DB) and User.completedLessons
 *   (which may contain non-DB keys like `autism-lesson-1`).
 */

/**
 * Returns the first section id for a lesson (by `order`).
 * @param {string} lessonId
 * @returns {Promise<string>}
 */
const getFirstSectionId = async (lessonId) => {
  const first = await LessonSection.findOne({ lessonId }).sort({ order: 1 }).lean();
  return first ? first._id.toString() : '';
};

/**
 * Counts the total number of sections in a lesson.
 * @param {string} lessonId
 * @returns {Promise<number>}
 */
const countSections = async (lessonId) => {
  return LessonSection.countDocuments({ lessonId });
};

// @route   GET /api/progress/:lessonId
// @desc    Get progress for a lesson
// @access  Private
/**
 * Fetches (or initializes) a user's progress record for a lesson.
 * Route params: { lessonId }
 */
exports.getProgress = async (req, res) => {
  const { lessonId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    // EPIC 6.7.1-6.7.2: Proper status codes + input validation to avoid crashes on invalid data.
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    const lessonExists = await require('../models/Lesson').exists({ _id: lessonId });
    if (!lessonExists) {
      // EPIC 6.7.1: Friendly 404 when lesson does not exist.
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    let progress = await UserProgress.findOne({
      userId: req.user.id,
      lessonId,
    });

    if (!progress) {
      // EPIC 6.4.2: Restore progress state by creating a default progress document when absent.
      const firstSectionId = await getFirstSectionId(lessonId);
      progress = await UserProgress.create({
        userId: req.user.id,
        lessonId,
        currentSectionId: firstSectionId,
        completedSections: [],
        interactionStates: {},
        completed: false,
        lastAccessedAt: new Date(),
      });
    }

    return res.json({
      success: true,
      progress,
    });
  } catch (error) {
    // EPIC 6.7.1: Consistent 500 responses on unexpected backend errors.
    return res.status(500).json({
      success: false,
      message: 'Error fetching progress',
      error: error.message,
    });
  }
};

// @route   POST /api/progress/update
// @desc    Update lesson progress (only when moving forward)
// @access  Private
/**
 * Updates a user's progress snapshot.
 * Expected body:
 * - lessonId (required)
 * - currentSectionId (optional)
 * - completedSections (optional array)
 * - interactionStates (optional object)
 * - isReplay (optional boolean; when true, do not mutate)
 */
exports.updateProgress = async (req, res) => {
  const { lessonId, currentSectionId, completedSections, interactionStates, isReplay } = req.body;

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    // EPIC 6.7.1-6.7.2: Input validation prevents crashes and returns correct status codes.
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    const lessonExists = await require('../models/Lesson').exists({ _id: lessonId });
    if (!lessonExists) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const existing = await UserProgress.findOne({
      userId: req.user.id,
      lessonId,
    });

    if (isReplay) {
      // EPIC 6.3.4, 6.6.4: Replay/history is read-only and must not mutate saved progress.
      return res.json({
        success: true,
        progress: existing,
      });
    }

    // De-dupe completed section IDs to keep the stored array small + stable.
    const nextCompleted = Array.isArray(completedSections)
      ? Array.from(new Set(completedSections))
      : existing?.completedSections || [];

    const payload = {
      lastAccessedAt: new Date(),
    };

    if (typeof currentSectionId === 'string') {
      payload.currentSectionId = currentSectionId;
    }

    if (nextCompleted) {
      payload.completedSections = nextCompleted;
    }

    if (interactionStates) {
      payload.interactionStates = interactionStates;
    }

    // Determine completion based on "sections completed" vs "sections total".
    const totalSections = await countSections(lessonId);
    if (Array.isArray(nextCompleted) && totalSections > 0 && nextCompleted.length >= totalSections) {
      // EPIC 6.1.1: Store completion state as a simple true/false flag.
      payload.completed = true;
      payload.completedAt = new Date();
      console.log(`User ${req.user.id} completed lesson ${lessonId} at ${payload.completedAt.toISOString()}`);
    } else {
      payload.completed = false;
      payload.completedAt = null;
    }

    const progress = await UserProgress.findOneAndUpdate(
      { userId: req.user.id, lessonId },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // If lesson became completed, ensure the User.completedLessons array is in sync.
    // We store lessonId as a string key to match other completion key formats used elsewhere.
    if (progress && progress.completed) {
      // EPIC 6.4.1: Save progress automatically after lesson completion.
      try {
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { completedLessons: lessonId } });
      } catch (e) {
        console.warn('Failed to sync User.completedLessons for user', req.user.id, e && e.message);
      }
    }

    return res.json({
      success: true,
      progress,
    });
  } catch (error) {
    // EPIC 6.7.1: Reliable error handling with proper status codes.
    return res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message,
    });
  }
};

// Helper: compute user's progress summary (includes UserProgress completed and User.completedLessons)
const Lesson = require('../models/Lesson');

/**
 * Aggregates lesson completion for a user.
 * Output is shaped for the Progress UI: total, completedCount, remaining, completedLessons[].
 *
 * @param {string} userId
 * @returns {Promise<{success: boolean, totalLessons: number, completedCount: number, remaining: number, completedLessons: Array<{lessonId: string, title: string, completedAt: (Date|null)}>} >}
 */
const computeSummary = async (userId) => {
  // EPIC 6.6.1-6.6.4: Keep performance insight simple (completed/remaining) and avoid complex analytics.
  // EPIC 6.7.3: Prefer simple queries (counts + small lists) to keep responses fast.
  // Total lessons available in the system
  const totalLessons = await Lesson.countDocuments();

  // Completed via UserProgress (DB-backed lessons)
  const completedProgress = await UserProgress.find({ userId, completed: true })
    .populate('lessonId', 'title')
    .sort({ completedAt: -1 })
    .lean();

  const dbCompletedMap = new Map(); // lessonId -> completedAt
  completedProgress.forEach((p) => {
    const lid = p.lessonId?._id?.toString() || (p.lessonId && p.lessonId.toString());
    if (lid) dbCompletedMap.set(lid, p.completedAt || p.updatedAt || p.createdAt);
  });

  // Completed via User.completedLessons and metadata (may contain non-DB keys like 'autism-lesson-1')
  const user = await User.findById(userId).select('completedLessons completedLessonsMeta').lean();
  const userKeys = (user && Array.isArray(user.completedLessons)) ? user.completedLessons : [];
  const userMeta = (user && Array.isArray(user.completedLessonsMeta)) ? user.completedLessonsMeta : [];

  const nonDbKeys = [];
  const extraDbIds = new Set();
  const metaByKey = new Map(userMeta.map((m) => [m.key, m.completedAt]));

  for (const key of userKeys) {
    // try to extract a 24-hex ObjectId portion
    const match = (key || '').match(/([a-fA-F0-9]{24})/);
    if (match && match[1]) {
      extraDbIds.add(match[1]);
    } else {
      nonDbKeys.push(key);
    }
  }

  // Merge DB IDs from both sources
  const allDbIds = new Set([...dbCompletedMap.keys(), ...Array.from(extraDbIds)]);

  // Fetch titles for DB lessons
  const dbLessons = allDbIds.size > 0 ? await Lesson.find({ _id: { $in: Array.from(allDbIds) } }).lean() : [];
  const dbLessonMap = new Map(dbLessons.map((l) => [l._id.toString(), l]));

  // Build completedLessons array
  const completedLessons = [];

  // Add DB-backed completed lessons
  for (const lid of allDbIds) {
    const lesson = dbLessonMap.get(lid);
    completedLessons.push({
      lessonId: lid,
      title: lesson ? lesson.title : 'Untitled',
      completedAt: dbCompletedMap.get(lid) || null,
    });
  }

  // Add non-DB keys as best-effort entries (use metadata timestamp when available)
  for (const key of nonDbKeys) {
    completedLessons.push({
      lessonId: key,
      title: key,
      completedAt: metaByKey.get(key) || null,
    });
  }

  // Ensure we produce a sensible total: include non-DB keys so display isn't misleading (e.g. "2 of 0").
  const totalLessonsAdjusted = Math.max(totalLessons, allDbIds.size + nonDbKeys.length);
  const completedCount = completedLessons.length;
  const remaining = Math.max(0, totalLessonsAdjusted - completedCount);

  // EPIC 6.1.2: Summary supports percentage display (completedCount / totalLessonsAdjusted).

  // EPIC 6.3.3: Show completed lessons in order (completion order) for easier revision.
  completedLessons.sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));

  return { success: true, totalLessons: totalLessonsAdjusted, completedCount, remaining, completedLessons };
};

// @route   GET /api/progress/summary
// @desc    Get summary of user progress across lessons
// @access  Private
/**
 * Returns the computed summary for the current authenticated user.
 */
exports.getSummary = async (req, res) => {
  try {
    // EPIC 6.1.2, 6.6.1-6.6.2: Provide total/completed/remaining for a simple progress display.
    const summary = await computeSummary(req.user.id);
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching progress summary',
      error: error.message,
    });
  }
};

// Export helper for reuse
exports.computeSummary = computeSummary;
