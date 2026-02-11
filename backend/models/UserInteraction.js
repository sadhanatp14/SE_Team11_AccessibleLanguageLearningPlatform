const mongoose = require('mongoose');

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
    interactionId: {
      type: String,
      required: true,
      trim: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAnswer: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

UserInteractionSchema.index({ userId: 1, lessonId: 1, interactionId: 1 });

module.exports = mongoose.model('UserInteraction', UserInteractionSchema);
