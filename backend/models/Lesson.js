const mongoose = require('mongoose');

/**
 * Lesson Model
 * -----------
 * Stores a complete lesson as a single document.
 * Used by dyslexia-style flows where a lesson contains `textContent`, `visualAids`,
 * and embedded `interactions`.
 *
 * Search:
 * - A text index exists over (title, textContent) for fallback searching.
 */

const LessonVisualSchema = new mongoose.Schema(
  {
    iconUrl: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
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

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleI18n: {
      type: I18nStringSchema,
      default: undefined,
    },
    textContent: {
      type: String,
      required: true,
      trim: true,
    },
    textContentI18n: {
      type: I18nStringSchema,
      default: undefined,
    },
    audioUrl: {
      type: String,
      trim: true,
      default: '',
    },
    visuals: {
      type: [LessonVisualSchema],
      default: [],
    },
    embeddingId: {
      type: String,
      trim: true,
      default: '',
    },
    highlights: {
      type: [
        new mongoose.Schema(
          {
            id: {
              type: String,
              required: true,
              trim: true,
            },
            phrase: {
              type: String,
              required: true,
              trim: true,
            },
            emphasisType: {
              type: String,
              required: true,
              enum: ['bold', 'underline', 'background'],
            },
            color: {
              type: String,
              trim: true,
              default: '',
            },
            position: {
              type: Number,
              min: 0,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    visualAids: {
      type: [
        new mongoose.Schema(
          {
            id: {
              type: String,
              required: true,
              trim: true,
            },
            imageUrl: {
              type: String,
              required: true,
              trim: true,
            },
            altText: {
              type: String,
              required: true,
              trim: true,
            },
            relatedPhrase: {
              type: String,
              required: true,
              trim: true,
            },
            placement: {
              type: String,
              required: true,
              enum: ['inline', 'below', 'side'],
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    interactions: {
      type: [
        new mongoose.Schema(
          {
            id: {
              type: String,
              required: true,
              trim: true,
            },
            type: {
              type: String,
              required: true,
              enum: ['multiple_choice', 'true_false', 'click'],
            },
            question: {
              type: String,
              required: true,
              trim: true,
            },
            questionI18n: {
              type: I18nStringSchema,
              default: undefined,
            },
            options: {
              type: [String],
              default: undefined,
            },
            optionsI18n: {
              type: [I18nStringSchema],
              default: undefined,
            },
            correctAnswer: {
              type: mongoose.Schema.Types.Mixed,
              required: true,
            },
            hint: {
              type: String,
              trim: true,
              default: '',
            },
            hintI18n: {
              type: I18nStringSchema,
              default: undefined,
            },
            explanation: {
              type: String,
              trim: true,
              default: '',
            },
            explanationI18n: {
              type: I18nStringSchema,
              default: undefined,
            },
            maxAttempts: {
              type: Number,
              default: 3,
              min: 1,
            },
            feedback: {
              correct: {
                type: String,
                required: true,
                trim: true,
              },
              incorrect: {
                type: String,
                required: true,
                trim: true,
              },
            },
            feedbackI18n: {
              correct: { type: I18nStringSchema, default: undefined },
              incorrect: { type: I18nStringSchema, default: undefined },
            },
            position: {
              type: Number,
              required: true,
              min: 0,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }
);

LessonSchema.index({ title: 'text', textContent: 'text' });

module.exports = mongoose.model('Lesson', LessonSchema);
