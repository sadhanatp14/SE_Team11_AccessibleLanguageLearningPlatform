/**
 * Lesson.js — Mongoose model for a complete lesson document
 *
 * A Lesson is the top-level unit of learning content used by dyslexia-style flows.
 * It contains:
 *  - Plain-text content + optional i18n translations (titleI18n, textContentI18n)
 *  - An optional audio URL for text-to-speech playback
 *  - Visual aids (image + alt-text pairs anchored to specific phrases)
 *  - Highlights (phrase-level emphasis markers for the reading view)
 *  - Embedded interactions (multiple-choice / true-false / click questions)
 *
 * Search:
 *  A MongoDB text index on (title, textContent) enables keyword fallback search
 *  when the vector-search service is unavailable.
 *
 * Related models:
 *  - LessonSection.js — ordered sub-sections that belong to a Lesson
 *  - UserProgress.js  — tracks per-(user, lesson) completion state
 */

// mongoose — ODM for schema definition and model registration
const mongoose = require('mongoose');

/**
 * Sub-schema for a single legacy visual item embedded directly on a Lesson.
 * Distinct from the richer `visualAids` array (which links images to specific phrases);
 * these visuals supply a URL + description without phrase anchoring.
 *
 * Fields:
 *  - iconUrl     {string}  Optional URL of the visual asset.
 *  - description {string}  Required accessible description of the visual.
 */
const LessonVisualSchema = new mongoose.Schema(
  {
    iconUrl: {
      type: String,
      trim: true,           // strip accidental whitespace from URLs
    },
    description: {
      type: String,
      trim: true,
      required: true,       // must always describe the visual for accessibility
    },
  },
  { _id: false }            // no separate ObjectId; embedded sub-document only
);

/**
 * Reusable sub-schema for an internationalised string.
 * Stores one translation per supported UI language so the controller can select
 * the correct value via `pickI18nString` without separate translation documents.
 *
 * All three fields default to '' so callers can always do `str.english` safely.
 *
 * Supported languages: english | tamil | hindi
 */
const I18nStringSchema = new mongoose.Schema(
  {
    english: { type: String, trim: true, default: '' },
    tamil:   { type: String, trim: true, default: '' },
    hindi:   { type: String, trim: true, default: '' },
  },
  { _id: false }  // no separate ObjectId; always embedded inside a parent document
);

/**
 * Main Lesson schema.
 *
 * Field groups:
 *  Core content  — title, textContent (+ I18n variants), audioUrl
 *  Layout aids   — visuals (legacy), highlights, visualAids
 *  Interactions  — embedded quiz items (multiple_choice / true_false / click)
 *  Search hook   — embeddingId (vector-search service ID)
 *  Timestamps    — createdAt / updatedAt via { timestamps: true }
 */
const LessonSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // Core content
    // ------------------------------------------------------------------

    /** Display title shown in the lesson library and headers. */
    title: {
      type: String,
      required: true,
      trim: true,
    },
    /** Optional i18n overrides for title; falls back to `title` when absent. */
    titleI18n: {
      type: I18nStringSchema,
      default: undefined,
    },
    /** Primary reading body of the lesson (English plain text). */
    textContent: {
      type: String,
      required: true,
      trim: true,
    },
    /** Optional i18n overrides for textContent; falls back to `textContent` when absent. */
    textContentI18n: {
      type: I18nStringSchema,
      default: undefined,
    },
    /** URL of a pre-generated audio file for text-to-speech playback. Empty string = no audio. */
    audioUrl: {
      type: String,
      trim: true,
      default: '',
    },

    // ------------------------------------------------------------------
    // Layout aids
    // ------------------------------------------------------------------

    /** Legacy visual items (icon + description) embedded directly on the lesson. */
    visuals: {
      type: [LessonVisualSchema],
      default: [],
    },
    /**
     * Vector-search embedding identifier.
     * Stores the ID returned by the external embedding service so the
     * vectorSearch utility can look up the lesson by semantic similarity.
     * Empty string means the lesson has not been indexed yet.
     */
    embeddingId: {
      type: String,
      trim: true,
      default: '',
    },
    /**
     * Phrase-level emphasis markers rendered in the reading view.
     * Each entry identifies a `phrase` within `textContent` and specifies
     * how it should be visually emphasised (bold / underline / background colour).
     */
    highlights: {
      type: [
        new mongoose.Schema(
          {
            /** Unique identifier for this highlight within the lesson. */
            id: {
              type: String,
              required: true,
              trim: true,
            },
            /** Exact phrase string to match inside textContent. */
            phrase: {
              type: String,
              required: true,
              trim: true,
            },
            /** Visual treatment applied to the phrase. */
            emphasisType: {
              type: String,
              required: true,
              enum: ['bold', 'underline', 'background'],
            },
            /** Optional CSS colour value used when emphasisType is 'background'. */
            color: {
              type: String,
              trim: true,
              default: '',
            },
            /** Character offset of the phrase in textContent (for deterministic ordering). */
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
    /**
     * Rich visual aids anchored to specific phrases in the lesson text.
     * Each entry pairs an image with an accessible description and the phrase
     * it illustrates, plus a placement hint for the rendering layer.
     */
    visualAids: {
      type: [
        new mongoose.Schema(
          {
            /** Unique identifier for this visual aid within the lesson. */
            id: {
              type: String,
              required: true,
              trim: true,
            },
            /** Absolute URL of the image asset. */
            imageUrl: {
              type: String,
              required: true,
              trim: true,
            },
            /** Screen-reader alt text for the image (accessibility requirement). */
            altText: {
              type: String,
              required: true,
              trim: true,
            },
            /** Phrase in textContent that this image illustrates. */
            relatedPhrase: {
              type: String,
              required: true,
              trim: true,
            },
            /** Layout hint: where the image should be rendered relative to text. */
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

    // ------------------------------------------------------------------
    // Embedded interactions (quiz items)
    // ------------------------------------------------------------------

    /**
     * Inline quiz / interaction items presented during lesson playback.
     * Supports three interaction types:
     *  - multiple_choice — one correct answer from a list of options
     *  - true_false       — binary true/false question
     *  - click            — learner clicks on the correct element
     *
     * All user-facing strings (question, options, hint, explanation, feedback)
     * have optional I18n variants so the UI can render the learner's language.
     */
    interactions: {
      type: [
        new mongoose.Schema(
          {
            /** Unique identifier for this interaction within the lesson. */
            id: {
              type: String,
              required: true,
              trim: true,
            },
            /** Interaction type determines the UI widget rendered. */
            type: {
              type: String,
              required: true,
              enum: ['multiple_choice', 'true_false', 'click'],
            },
            /** Question prompt shown to the learner (English). */
            question: {
              type: String,
              required: true,
              trim: true,
            },
            /** Optional i18n overrides for the question text. */
            questionI18n: {
              type: I18nStringSchema,
              default: undefined,
            },
            /** Answer options (used for multiple_choice; omit for true_false). */
            options: {
              type: [String],
              default: undefined,
            },
            /** Optional i18n overrides for each option string (parallel array to `options`). */
            optionsI18n: {
              type: [I18nStringSchema],
              default: undefined,
            },
            /**
             * The correct answer value.
             * Mixed type: string for multiple_choice, boolean for true_false.
             */
            correctAnswer: {
              type: mongoose.Schema.Types.Mixed,
              required: true,
            },
            /** Optional hint text shown after a failed attempt (English). */
            hint: {
              type: String,
              trim: true,
              default: '',
            },
            /** Optional i18n overrides for the hint text. */
            hintI18n: {
              type: I18nStringSchema,
              default: undefined,
            },
            /** Optional explanation text shown after the interaction is resolved (English). */
            explanation: {
              type: String,
              trim: true,
              default: '',
            },
            /** Optional i18n overrides for the explanation text. */
            explanationI18n: {
              type: I18nStringSchema,
              default: undefined,
            },
            /** Maximum number of attempts before the answer is revealed. Minimum 1. */
            maxAttempts: {
              type: Number,
              default: 3,
              min: 1,
            },
            /**
             * Feedback messages shown immediately after the learner answers.
             * `correct` is shown on a right answer; `incorrect` on a wrong answer.
             */
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
            /** Optional i18n overrides for feedback messages. */
            feedbackI18n: {
              correct:   { type: I18nStringSchema, default: undefined },
              incorrect: { type: I18nStringSchema, default: undefined },
            },
            /** Render position of this interaction within the lesson flow (0-based). */
            position: {
              type: Number,
              required: true,
              min: 0,
            },
          },
          { _id: false }  // interactions are identified by their own `id` string field
        ),
      ],
      default: [],
    },
  },
  { timestamps: true }  // adds createdAt and updatedAt fields automatically
);

// Compound text index enables MongoDB keyword search across title and body text.
// Used as a fallback when the vector-search service is unavailable.
LessonSchema.index({ title: 'text', textContent: 'text' });

// Register and export the model (safe to call multiple times due to Mongoose's model cache)
module.exports = mongoose.model('Lesson', LessonSchema);
