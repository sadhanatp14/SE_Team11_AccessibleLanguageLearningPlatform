const mongoose = require('mongoose');

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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    currentSectionId: {
      type: String,
      default: '',
    },
    completedSections: {
      type: [String],
      default: [],
    },
    interactionStates: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Whether the user has completed the lesson
    completed: {
      type: Boolean,
      default: false,
    },
    // Timestamp when lesson was completed (if any)
    completedAt: {
      type: Date,
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

UserProgressSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

module.exports = mongoose.model('UserProgress', UserProgressSchema);
