/**
 * progressController.js
 *
 * Stores and retrieves per-user lesson progress for database-backed lessons.
 *
 * Exported route handlers:
 *  - GET  /api/progress/:lessonId  → exports.getProgress
 *  - POST /api/progress/update     → exports.updateProgress
 *  - GET  /api/progress/summary    → exports.getSummary
 *
 * Exported helper (used by badgesController):
 *  - computeSummary(userId)        → exports.computeSummary
 *
 * Key design decisions:
 *  - First GET for a (user, lesson) pair auto-creates a default progress record
 *    so the frontend always receives a valid object (EPIC 6.4.2).
 *  - `updateProgress` treats replay requests as read-only so browsing history
 *    never overwrites real forward progress (EPIC 6.3.4, 6.6.4).
 *  - `computeSummary` merges two completion sources: UserProgress (DB-backed
 *    lessons) and User.completedLessons (which may hold non-DB keys such as
 *    'autism-lesson-1'), so the summary is always accurate regardless of
 *    how a lesson was completed (EPIC 6.6.1-6.6.4).
 */

// Mongoose – used for ObjectId validation before issuing DB queries
const mongoose = require('mongoose');
// LessonSection model – used to find the first section and count total sections
const LessonSection = require('../models/LessonSection');
// UserProgress model – stores per-(user, lesson) progress state
const UserProgress = require('../models/UserProgress');
// User model – used to sync User.completedLessons after completion
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
 * Returns the `_id` string of the first section in a lesson (lowest `order` value).
 * Used when creating a default progress record so `currentSectionId` is always valid.
 *
 * @param {string} lessonId - MongoDB ObjectId string of the parent lesson.
 * @returns {Promise<string>} The first section's `_id` as a string, or '' when none exist.
 */
const getFirstSectionId = async (lessonId) => {
  const first = await LessonSection.findOne({ lessonId }).sort({ order: 1 }).lean();
  return first ? first._id.toString() : '';
};

/**
 * Counts the total number of sections in a lesson.
 * Used by `updateProgress` to determine whether all sections have been completed.
 *
 * @param {string} lessonId - MongoDB ObjectId string of the parent lesson.
 * @returns {Promise<number>} Total section count (0 when no sections exist).
 */
const countSections = async (lessonId) => {
  return LessonSection.countDocuments({ lessonId });
};

/**
 * GET /api/progress/:lessonId
 *
 * Fetch (or auto-initialise) a user's progress record for a lesson.
 *
 * When no existing record is found, a default document is created with:
 *  - currentSectionId: the first section in the lesson (by order)
 *  - completedSections: []
 *  - completed: false
 *
 * This ensures the frontend always receives a valid progress object and
 * never has to handle a missing-record case (EPIC 6.4.2).
 *
 * @param {import('express').Request}  req - Route param: lessonId; req.user from auth middleware.
 * @param {import('express').Response} res - JSON: { success, progress }.
 */
exports.getProgress = async (req, res) => {
  const { lessonId } = req.params;

  // Validate lessonId before querying to prevent Mongoose cast errors (EPIC 6.7.1-6.7.2)
  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    // EPIC 6.7.1-6.7.2: Proper status codes + input validation to avoid crashes on invalid data.
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    // Step 1: Confirm the lesson exists before touching progress data
    const lessonExists = await require('../models/Lesson').exists({ _id: lessonId });
    if (!lessonExists) {
      // EPIC 6.7.1: Friendly 404 when lesson does not exist.
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // Step 2: Look up the existing progress record for this (user, lesson) pair
    let progress = await UserProgress.findOne({
      userId: req.user.id,
      lessonId,
    });

    if (!progress) {
      // Step 3: No record found – auto-create a default so the UI always has a valid starting state
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

/**
 * POST /api/progress/update
 *
 * Persist a forward-progress snapshot for the current user and lesson.
 *
 * Body fields:
 *  - lessonId          {string}   Required. MongoDB ObjectId of the lesson.
 *  - currentSectionId  {string}   Optional. The section the learner is now on.
 *  - completedSections {string[]} Optional. Full list of completed section IDs.
 *  - interactionStates {object}   Optional. Map of interactionId → state.
 *  - isReplay          {boolean}  Optional. When true the request is read-only;
 *                                 no mutations are made (EPIC 6.3.4, 6.6.4).
 *
 * Completion logic:
 *  A lesson is marked `completed = true` when the number of unique completed
 *  sections equals the total section count for that lesson (EPIC 6.1.1).
 *  On completion the lessonId is also appended to User.completedLessons to
 *  keep the two sources in sync (EPIC 6.4.1).
 *
 * @param {import('express').Request}  req - Body fields above; req.user from auth middleware.
 * @param {import('express').Response} res - JSON: { success, progress }.
 */
exports.updateProgress = async (req, res) => {
  const { lessonId, currentSectionId, completedSections, interactionStates, isReplay } = req.body;

  // Validate lessonId before any DB work (EPIC 6.7.1-6.7.2)
  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    // EPIC 6.7.1-6.7.2: Input validation prevents crashes and returns correct status codes.
    return res.status(400).json({
      success: false,
      message: 'Invalid lesson ID',
    });
  }

  try {
    // Step 1: Confirm the lesson exists
    const lessonExists = await require('../models/Lesson').exists({ _id: lessonId });
    if (!lessonExists) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // Step 2: Load the existing progress record (may be null for first update)
    const existing = await UserProgress.findOne({
      userId: req.user.id,
      lessonId,
    });

    if (isReplay) {
      // Step 3 (replay path): Return existing progress unchanged – browsing history
      // must never overwrite real forward progress (EPIC 6.3.4, 6.6.4).
      // EPIC 6.3.4, 6.6.4: Replay/history is read-only and must not mutate saved progress.
      return res.json({
        success: true,
        progress: existing,
      });
    }

    // Step 3 (forward path): Build the update payload
    // De-dupe completed section IDs to keep the stored array small + stable.
    const nextCompleted = Array.isArray(completedSections)
      ? Array.from(new Set(completedSections))
      : existing?.completedSections || [];

    // Always bump lastAccessedAt on every forward-progress write
    const payload = {
      lastAccessedAt: new Date(),
    };

    // Only overwrite currentSectionId when one is explicitly provided
    if (typeof currentSectionId === 'string') {
      payload.currentSectionId = currentSectionId;
    }

    if (nextCompleted) {
      payload.completedSections = nextCompleted;
    }

    // Merge interaction states when provided (partial updates are intentional)
    if (interactionStates) {
      payload.interactionStates = interactionStates;
    }

    // Step 4: Determine lesson completion – completed when every section is done
    // Determine completion based on "sections completed" vs "sections total".
    const totalSections = await countSections(lessonId);
    if (Array.isArray(nextCompleted) && totalSections > 0 && nextCompleted.length >= totalSections) {
      // EPIC 6.1.1: Store completion state as a simple true/false flag.
      payload.completed = true;
      payload.completedAt = new Date();
      console.log(`User ${req.user.id} completed lesson ${lessonId} at ${payload.completedAt.toISOString()}`);
    } else {
      // Not yet complete – clear any stale completion timestamp
      payload.completed = false;
      payload.completedAt = null;
    }

    // Step 5: Persist the progress document (upsert creates it if missing)
    const progress = await UserProgress.findOneAndUpdate(
      { userId: req.user.id, lessonId },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Step 6: If the lesson is now complete, sync User.completedLessons.
    // If lesson became completed, ensure the User.completedLessons array is in sync.
    // We store lessonId as a string key to match other completion key formats used elsewhere.
    if (progress && progress.completed) {
      // EPIC 6.4.1: Save progress automatically after lesson completion.
      try {
        // $addToSet is idempotent – safe to call even if the key already exists
        await User.findByIdAndUpdate(req.user.id, { $addToSet: { completedLessons: lessonId } });
      } catch (e) {
        // Non-fatal: log a warning but do not fail the whole request
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

// Lesson model – required here (after exports) to avoid a circular-require issue at module load
const Lesson = require('../models/Lesson');

/**
 * Aggregate lesson completion data for a single user.
 *
 * Merges two independent completion sources:
 *  1. UserProgress documents where `completed === true` (DB-backed lessons).
 *  2. User.completedLessons array which may contain non-DB string keys
 *     (e.g. 'autism-lesson-1', 'sample-lesson-greetings').
 *
 * When a User.completedLessons entry contains a 24-hex ObjectId substring it is
 * treated as a DB lesson and its title is resolved from the Lesson collection.
 * Entries that contain no ObjectId are kept as-is (best-effort).
 *
 * The `totalLessons` value is adjusted upward when the number of completed
 * lessons exceeds the DB count, so the UI never shows "3 of 0" (EPIC 6.6.1).
 *
 * @param {string} userId - MongoDB ObjectId string of the target user.
 * @returns {Promise<{
 *   success: boolean,
 *   totalLessons: number,
 *   completedCount: number,
 *   remaining: number,
 *   completedLessons: Array<{ lessonId: string, title: string, completedAt: Date|null }>
 * }>}
 */
const computeSummary = async (userId) => {
  // EPIC 6.6.1-6.6.4: Keep performance insight simple (completed/remaining) and avoid complex analytics.
  // EPIC 6.7.3: Prefer simple queries (counts + small lists) to keep responses fast.

  // Step 1: Count every lesson in the system (denominator for the completion ratio)
  // Total lessons available in the system
  const totalLessons = await Lesson.countDocuments();

  // Step 2: Fetch DB-backed completed lessons from UserProgress
  // Completed via UserProgress (DB-backed lessons)
  const completedProgress = await UserProgress.find({ userId, completed: true })
    .populate('lessonId', 'title')
    .sort({ completedAt: -1 })
    .lean();

  // Build a map of lessonId → completedAt for quick timestamp lookup
  const dbCompletedMap = new Map(); // lessonId -> completedAt
  completedProgress.forEach((p) => {
    const lid = p.lessonId?._id?.toString() || (p.lessonId && p.lessonId.toString());
    if (lid) dbCompletedMap.set(lid, p.completedAt || p.updatedAt || p.createdAt);
  });

  // Step 3: Fetch non-DB completion keys from the User document
  // Completed via User.completedLessons and metadata (may contain non-DB keys like 'autism-lesson-1')
  const user = await User.findById(userId).select('completedLessons completedLessonsMeta').lean();
  const userKeys = (user && Array.isArray(user.completedLessons)) ? user.completedLessons : [];
  const userMeta = (user && Array.isArray(user.completedLessonsMeta)) ? user.completedLessonsMeta : [];

  const nonDbKeys = [];       // Keys with no ObjectId – kept as best-effort entries
  const extraDbIds = new Set(); // ObjectId strings found inside User.completedLessons keys
  const metaByKey = new Map(userMeta.map((m) => [m.key, m.completedAt]));

  // Step 4: Classify each User.completedLessons key as either a DB ObjectId or a plain string
  for (const key of userKeys) {
    // try to extract a 24-hex ObjectId portion
    const match = (key || '').match(/([a-fA-F0-9]{24})/);
    if (match && match[1]) {
      // Contains a valid ObjectId – can be resolved to a Lesson document
      extraDbIds.add(match[1]);
    } else {
      // No ObjectId – store as a raw key (e.g. 'autism-lesson-1')
      nonDbKeys.push(key);
    }
  }

  // Step 5: Merge DB IDs from both sources into a single de-duplicated set
  // Merge DB IDs from both sources
  const allDbIds = new Set([...dbCompletedMap.keys(), ...Array.from(extraDbIds)]);

  // Step 6: Fetch lesson titles for all DB-backed completed lessons in one query
  // Fetch titles for DB lessons
  const dbLessons = allDbIds.size > 0 ? await Lesson.find({ _id: { $in: Array.from(allDbIds) } }).lean() : [];
  const dbLessonMap = new Map(dbLessons.map((l) => [l._id.toString(), l]));

  // Step 7: Build the completedLessons output array
  // Build completedLessons array
  const completedLessons = [];

  // Add DB-backed completed lessons (resolve title from Lesson collection)
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
      title: key,   // No Lesson document to look up; use key itself as display title
      completedAt: metaByKey.get(key) || null,
    });
  }

  // Step 8: Compute summary metrics
  // Ensure we produce a sensible total: include non-DB keys so display isn't misleading (e.g. "2 of 0").
  const totalLessonsAdjusted = Math.max(totalLessons, allDbIds.size + nonDbKeys.length);
  const completedCount = completedLessons.length;
  const remaining = Math.max(0, totalLessonsAdjusted - completedCount);

  // EPIC 6.1.2: Summary supports percentage display (completedCount / totalLessonsAdjusted).

  // Step 9: Sort completed lessons by completedAt ascending so UI shows them in completion order
  // EPIC 6.3.3: Show completed lessons in order (completion order) for easier revision.
  completedLessons.sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0));

  return { success: true, totalLessons: totalLessonsAdjusted, completedCount, remaining, completedLessons };
};

/**
 * GET /api/progress/summary
 *
 * Return a completion summary for the currently authenticated user.
 * Delegates all computation to `computeSummary` and wraps any errors in a
 * consistent 500 response.
 *
 * Response: { success, totalLessons, completedCount, remaining, completedLessons[] }
 *
 * @param {import('express').Request}  req - req.user.id from auth middleware.
 * @param {import('express').Response} res - JSON summary object.
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

// Export computeSummary so badgesController can reuse the same aggregation logic
exports.computeSummary = computeSummary;
