/**
 * @module models/UserInteraction
 * @description Mongoose model for tracking a learner's per-interaction attempt history.
 *
 * Each document represents the running state of one learner's work on a single
 * interaction widget (e.g. a multiple-choice question or drag-and-drop exercise)
 * within a specific lesson. The compound key `(userId, lessonId, interactionId)`
 * is unique, so records are upserted rather than duplicated on each submission.
 *
 * Primary use-cases:
 *   - Progressive hint system: the server reads `attempts` to decide which level
 *     of hint to return when the learner requests help.
 *   - Answer history: `lastAnswer` stores the most recent submission for
 *     pre-filling form state when the learner revisits the interaction.
 *   - Correct/incorrect state: `isCorrect` enables the frontend to show
 *     persistent feedback without re-evaluating the answer.
 *
 * Related models: User, Lesson, LessonSection (interactionId matches a
 * `LessonSectionInteractionSchema` sub-document within a LessonSection).
 */
const mongoose = require('mongoose'); // MongoDB ODM

/**
 * UserInteraction Model
 * ---------------------
 * Tracks a user's attempts and last answer for a single interaction.
 * Keyed by (userId, lessonId, interactionId).
 *
 * This supports progressive hints/help by allowing the server to know
 * how many attempts have occurred so far.
 */

const UserInteractionSchema = new mongoose.Schema(
  {
    // --- Composite Key Fields ---
    /** ObjectId of the learner who submitted the interaction. */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** ObjectId of the parent lesson containing this interaction. */
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    /**
     * Logical identifier for the specific interaction widget within the lesson
     * (matches the `interactionId` field on a `LessonSectionInteractionSchema`
     * sub-document). Stored as a trimmed string rather than an ObjectId because
     * hard-coded lesson centres use semantic string IDs (e.g. 'q1', 'drag-1').
     */
    interactionId: {
      type: String,
      required: true,
      trim: true,
    },

    // --- State Fields ---
    /**
     * Running count of how many times the learner has submitted an answer.
     * Incremented by `interactionController.submitInteraction` on each call.
     * Read by `interactionController.requestHelp` to select the appropriate
     * hint tier (e.g. subtle hint on attempt 1, explicit hint on attempt 2+).
     */
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    /**
     * The learner's most recently submitted answer value.
     * Stored as `Mixed` because different interaction types produce different
     * answer shapes (string for MCQ, array for ordering, object for matching).
     * Defaults to `null` when no submission has been made yet.
     */
    lastAnswer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    /** Whether the learner's last submission was evaluated as correct. */
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // Adds createdAt + updatedAt automatically
);

/**
 * Compound index on the three composite-key fields.
 * Ensures O(log n) lookup performance when the interaction controller
 * calls `findOneAndUpdate({ userId, lessonId, interactionId }, ...)` and
 * prevents accidental duplicate documents for the same learner + interaction.
 */
UserInteractionSchema.index({ userId: 1, lessonId: 1, interactionId: 1 });

// Export the compiled Mongoose model; Mongoose caches it internally by the name 'UserInteraction'.
module.exports = mongoose.model('UserInteraction', UserInteractionSchema);
