/**
 * @module models/UserProgress
 * @description Mongoose model for tracking a learner's per-lesson progress state.
 *
 * Each document is a progress snapshot for one (user, lesson) pair and is
 * upserted by the progress controller whenever the learner advances through
 * sections or completes the lesson.
 *
 * Relationship to other models:
 *   - `UserInteraction` stores per-question attempt history (finer grain).
 *   - `User.completedLessons` holds a flat key array for quick membership
 *     checks; `UserProgress` holds the richer structured state used by resume
 *     and replay flows.
 *
 * Design notes:
 *   - `interactionStates` is `Mixed` so the frontend can persist any shape of
 *     answer state without requiring a schema change.
 *   - The unique compound index on `(userId, lessonId)` ensures `findOneAndUpdate`
 *     with `upsert: true` never creates duplicate progress records.
 *   - `completedAt` remains `null` until the lesson is explicitly completed;
 *     `lastAccessedAt` is updated on every progress save for recency sorting.
 */
const mongoose = require('mongoose'); // MongoDB ODM

/**
 * UserProgress Model
 * ------------------
 * Progress snapshot for DB-backed lessons.
 * Unique per (userId, lessonId).
 * Stores:
 * - currentSectionId
 * - completed section ids
 * - interactionStates (shape controlled by frontend)
 * - completion flags and timestamps
 */

const UserProgressSchema = new mongoose.Schema(
  {
    // --- Composite Key Fields ---
    /** ObjectId of the learner whose progress this document tracks. */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** ObjectId of the lesson this progress record belongs to. */
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },

    // --- Navigation State ---
    /**
     * The `_id` (as a string) of the `LessonSection` the learner was viewing
     * when progress was last saved. Used by the resume flow to re-navigate
     * the learner directly to the correct section rather than restarting.
     * Empty string indicates the lesson has not been started yet.
     */
    currentSectionId: {
      type: String,
      default: '',
    },
    /**
     * Array of `LessonSection` `_id` strings the learner has already passed.
     * Used by the frontend to mark sections as visited and to determine
     * how far through the lesson the learner has progressed.
     */
    completedSections: {
      type: [String],
      default: [],
    },
    /**
     * Free-form map of interaction widget states keyed by `interactionId`.
     * Stored as `Mixed` because different interaction types (MCQ, drag-and-drop,
     * fill-in-the-blank) produce different state shapes. The frontend writes
     * and reads this blob directly without server-side parsing.
     */
    interactionStates: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // --- Completion Fields ---
    /** Whether the learner has finished the lesson (EPIC 6.1.1). */
    completed: {
      type: Boolean,
      default: false,
    },
    /**
     * UTC timestamp of when the lesson was marked complete.
     * Remains `null` until the completion route sets it; used by the learning
     * history view and the progress summary aggregation.
     */
    completedAt: {
      type: Date,
      default: null,
    },
    /**
     * UTC timestamp updated on every progress save (resume, section advance, or
     * completion). Used to sort "recently accessed" lessons on the dashboard
     * and to drive the recency dimension of the recommendation engine.
     */
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // Adds createdAt + updatedAt managed by Mongoose
);

/**
 * Unique compound index on (userId, lessonId).
 * Guarantees that `findOneAndUpdate({ userId, lessonId }, ..., { upsert: true })`
 * never produces duplicate records and provides O(log n) lookup performance
 * for all progress read/write operations.
 */
UserProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

// Export the compiled Mongoose model; Mongoose caches it internally by the name 'UserProgress'.
module.exports = mongoose.model('UserProgress', UserProgressSchema);
