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

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    textContent: {
      type: String,
      required: true,
      trim: true,
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
            options: {
              type: [String],
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
            explanation: {
              type: String,
              trim: true,
              default: '',
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
