const mongoose = require('mongoose');

/**
 * LessonSection Model
 * -------------------
 * Normalized, step-by-step lesson content.
 * A Lesson has many sections (ordered by `order`). Each section can contain
 * its own visuals/visualAids and interactions.
 */

const LessonSectionVisualSchema = new mongoose.Schema(
  {
    iconUrl: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    description: { type: String, trim: true },
    altText: { type: String, trim: true },
    relatedPhrase: { type: String, trim: true },
    placement: {
      type: String,
      enum: ['inline', 'below', 'side'],
      default: 'inline',
    },
  },
  { _id: false }
);

const LessonSectionInteractionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['multiple_choice', 'true_false', 'click'],
    },
    question: { type: String, required: true, trim: true },
    options: { type: [String], default: undefined },
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    hint: { type: String, trim: true, default: '' },
    explanation: { type: String, trim: true, default: '' },
    maxAttempts: { type: Number, default: 3, min: 1 },
    feedback: {
      correct: { type: String, required: true, trim: true },
      incorrect: { type: String, required: true, trim: true },
    },
    position: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const LessonSectionSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    textContent: { type: String, required: true, trim: true },
    audioUrl: { type: String, trim: true, default: '' },
    visuals: { type: [LessonSectionVisualSchema], default: [] },
    visualAids: { type: [LessonSectionVisualSchema], default: [] },
    interactions: { type: [LessonSectionInteractionSchema], default: [] },
    order: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

LessonSectionSchema.index({ lessonId: 1, order: 1 });

module.exports = mongoose.model('LessonSection', LessonSectionSchema);
