/**
 * LessonSection.js — Mongoose model for a single step within a lesson
 *
 * A LessonSection is the primary unit of navigation inside a lesson player.
 * Sections are stored as separate documents (not embedded in the Lesson) so they
 * can be fetched individually, paginated, and updated independently.
 *
 * Relationship:
 *  - Many LessonSections belong to one Lesson via `lessonId` (ObjectId ref).
 *  - Sections are ordered by the `order` field (0-based ascending).
 *
 * Each section mirrors the content structure of a Lesson:
 *  - Core text (+ I18n) and audio URL
 *  - Visual items (legacy `visuals` + richer `visualAids`)
 *  - Embedded interactions (quiz items) with full I18n support
 *
 * Related models:
 *  - Lesson.js        — the parent document
 *  - UserProgress.js  — tracks which sections a user has completed
 */

// mongoose — ODM for schema definition and model registration
const mongoose = require('mongoose');

/**
 * Sub-schema for a visual item embedded within a section.
 *
 * Combines the fields from both the legacy `LessonVisualSchema` (iconUrl + description)
 * and the richer `visualAids` schema (imageUrl + altText + relatedPhrase + placement)
 * into a single reusable schema used for both the `visuals` and `visualAids` arrays.
 *
 * Fields:
 *  - iconUrl       {string}  Optional legacy icon asset URL.
 *  - imageUrl      {string}  Optional rich image asset URL.
 *  - description   {string}  Optional plain-text description (legacy visuals).
 *  - altText       {string}  Optional screen-reader alt text (accessibility).
 *  - relatedPhrase {string}  Optional phrase in textContent this image illustrates.
 *  - placement     {string}  Layout hint: 'inline' | 'below' | 'side'. Defaults to 'inline'.
 */
const LessonSectionVisualSchema = new mongoose.Schema(
  {
    iconUrl:       { type: String, trim: true },  // legacy icon URL
    imageUrl:      { type: String, trim: true },  // rich image URL
    description:   { type: String, trim: true },  // plain-text description (legacy)
    altText:       { type: String, trim: true },  // screen-reader alt text
    relatedPhrase: { type: String, trim: true },  // phrase in textContent this image illustrates
    placement: {
      type: String,
      enum: ['inline', 'below', 'side'],  // controls where the image is rendered relative to text
      default: 'inline',
    },
  },
  { _id: false }  // no separate ObjectId; always embedded inside a parent document
);

/**
 * Reusable sub-schema for an internationalised string.
 * Stores one translation per supported UI language so the controller can select
 * the correct value via `pickI18nString` without separate translation documents.
 *
 * All three fields default to '' so callers can always do `str.english` safely.
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
 * Sub-schema for an inline quiz / interaction item within a section.
 *
 * Mirrors the interaction sub-schema on the Lesson model so the lesson player
 * can handle interactions from both top-level Lessons and LessonSections uniformly.
 *
 * Interaction types:
 *  - multiple_choice — one correct answer selected from a list of options
 *  - true_false       — binary true/false question
 *  - click            — learner clicks the correct element on screen
 *
 * All user-visible strings (question, options, hint, explanation, feedback)
 * have optional I18n variants (xxxI18n) for multilingual rendering.
 */
const LessonSectionInteractionSchema = new mongoose.Schema(
  {
    /** Unique identifier for this interaction within the section. */
    id: { type: String, required: true, trim: true },
    /** Interaction type determines which UI widget is rendered. */
    type: {
      type: String,
      required: true,
      enum: ['multiple_choice', 'true_false', 'click'],
    },
    /** Question prompt shown to the learner (English). */
    question: { type: String, required: true, trim: true },
    /** Optional i18n overrides for the question text. */
    questionI18n: { type: I18nStringSchema, default: undefined },
    /** Answer option strings (used for multiple_choice; omit for true_false). */
    options: { type: [String], default: undefined },
    /** Optional i18n overrides for each option string (parallel array to `options`). */
    optionsI18n: { type: [I18nStringSchema], default: undefined },
    /**
     * The correct answer value.
     * Mixed type: string for multiple_choice, boolean for true_false.
     */
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    /** Optional hint text shown after a failed attempt (English). */
    hint: { type: String, trim: true, default: '' },
    /** Optional i18n overrides for the hint text. */
    hintI18n: { type: I18nStringSchema, default: undefined },
    /** Optional explanation text shown after the interaction is resolved (English). */
    explanation: { type: String, trim: true, default: '' },
    /** Optional i18n overrides for the explanation text. */
    explanationI18n: { type: I18nStringSchema, default: undefined },
    /** Maximum number of attempts before the answer is revealed. Minimum 1. */
    maxAttempts: { type: Number, default: 3, min: 1 },
    /**
     * Feedback messages shown immediately after the learner answers.
     * `correct` is shown on a right answer; `incorrect` on a wrong answer.
     */
    feedback: {
      correct:   { type: String, required: true, trim: true },
      incorrect: { type: String, required: true, trim: true },
    },
    /** Optional i18n overrides for feedback messages. */
    feedbackI18n: {
      correct:   { type: I18nStringSchema, default: undefined },
      incorrect: { type: I18nStringSchema, default: undefined },
    },
    /** Render position of this interaction within the section flow (0-based). */
    position: { type: Number, default: 0, min: 0 },
  },
  { _id: false }  // interactions are identified by their own `id` string field
);

/**
 * Main LessonSection schema.
 *
 * Field groups:
 *  Parent reference  — lessonId (ObjectId ref to Lesson)
 *  Core content      — title, textContent (+ I18n variants), audioUrl
 *  Layout aids       — visuals (legacy), visualAids (richer, phrase-anchored)
 *  Interactions      — embedded quiz items
 *  Ordering          — order (0-based position within the parent lesson)
 *  Timestamps        — createdAt / updatedAt via { timestamps: true }
 */
const LessonSectionSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------------------
    // Parent reference
    // ------------------------------------------------------------------

    /**
     * Reference to the parent Lesson document.
     * All sections belonging to the same lesson share this lessonId.
     */
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
    },

    // ------------------------------------------------------------------
    // Core content
    // ------------------------------------------------------------------

    /** Display title shown in the section header and navigation list. */
    title: { type: String, required: true, trim: true },
    /** Optional i18n overrides for title; falls back to `title` when absent. */
    titleI18n: { type: I18nStringSchema, default: undefined },
    /** Primary reading body of the section (English plain text). */
    textContent: { type: String, required: true, trim: true },
    /** Optional i18n overrides for textContent; falls back to `textContent` when absent. */
    textContentI18n: { type: I18nStringSchema, default: undefined },
    /** URL of a pre-generated audio file for text-to-speech playback. Empty string = no audio. */
    audioUrl: { type: String, trim: true, default: '' },

    // ------------------------------------------------------------------
    // Layout aids
    // ------------------------------------------------------------------

    /** Legacy visual items (icon + description) embedded directly on the section. */
    visuals: { type: [LessonSectionVisualSchema], default: [] },
    /**
     * Rich visual aids anchored to specific phrases in the section text.
     * Uses the same LessonSectionVisualSchema which includes imageUrl, altText,
     * relatedPhrase, and placement fields.
     */
    visualAids: { type: [LessonSectionVisualSchema], default: [] },

    // ------------------------------------------------------------------
    // Embedded interactions (quiz items)
    // ------------------------------------------------------------------

    /** Inline quiz / interaction items presented during section playback. */
    interactions: { type: [LessonSectionInteractionSchema], default: [] },

    // ------------------------------------------------------------------
    // Ordering
    // ------------------------------------------------------------------

    /**
     * 0-based position of this section within its parent lesson.
     * The lesson player sorts sections by this field to build the navigation list.
     */
    order: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }  // adds createdAt and updatedAt fields automatically
);

// Compound index on (lessonId, order) supports the common query pattern:
// "fetch all sections for lesson X in order" with a single efficient index scan.
LessonSectionSchema.index({ lessonId: 1, order: 1 });

// Register and export the model (safe to call multiple times due to Mongoose's model cache)
module.exports = mongoose.model('LessonSection', LessonSectionSchema);
