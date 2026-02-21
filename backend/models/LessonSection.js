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

const I18nStringSchema = new mongoose.Schema(
  {
    english: { type: String, trim: true, default: '' },
    tamil: { type: String, trim: true, default: '' },
    hindi: { type: String, trim: true, default: '' },
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
    questionI18n: { type: I18nStringSchema, default: undefined },
    options: { type: [String], default: undefined },
    optionsI18n: { type: [I18nStringSchema], default: undefined },
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    hint: { type: String, trim: true, default: '' },
    hintI18n: { type: I18nStringSchema, default: undefined },
    explanation: { type: String, trim: true, default: '' },
    explanationI18n: { type: I18nStringSchema, default: undefined },
    maxAttempts: { type: Number, default: 3, min: 1 },
    feedback: {
      correct: { type: String, required: true, trim: true },
      incorrect: { type: String, required: true, trim: true },
    },
    feedbackI18n: {
      correct: { type: I18nStringSchema, default: undefined },
      incorrect: { type: I18nStringSchema, default: undefined },
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
    titleI18n: { type: I18nStringSchema, default: undefined },
    textContent: { type: String, required: true, trim: true },
    textContentI18n: { type: I18nStringSchema, default: undefined },
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
