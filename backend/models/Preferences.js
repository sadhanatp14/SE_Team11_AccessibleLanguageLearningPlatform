const mongoose = require('mongoose'); // MongoDB ODM

/**
 * Preferences Model
 * -----------------
 * Stores per-user accessibility and learning experience preferences.
 * These preferences are primarily applied by the frontend as CSS classes
 * scoped to the learning container.
 *
 * One-to-one relationship:
 * - Each user has a single Preferences document (unique `user` field).
 */

const PreferencesSchema = new mongoose.Schema(
  {
    /** ObjectId reference to the owning User. `unique: true` enforces the one-to-one relationship. */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    
    // --- General Accessibility Settings (EPIC 1.3) ---
    /** Text size class applied to the lesson container ('small'|'medium'|'large'|'extra-large'). */
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large', 'extra-large'],
      default: 'medium',
    },
    /** Font family; 'opendyslexic' is the primary dyslexia-friendly typeface option. */
    fontFamily: {
      type: String,
      enum: ['default', 'opendyslexic', 'arial', 'comic-sans'],
      default: 'default',
    },
    /** Colour theme applied to the UI ('high-contrast' and 'yellow-black' aid low-vision users). */
    contrastTheme: {
      type: String,
      enum: ['default', 'high-contrast', 'dark', 'light', 'yellow-black'],
      default: 'default',
    },
    
    // --- Dyslexia Support (EPIC 1.4) ---
    /** CSS letter-spacing class to improve character separation for dyslexic readers. */
    letterSpacing: {
      type: String,
      enum: ['normal', 'wide', 'extra-wide'],
      default: 'normal',
    },
    /** CSS word-spacing class to increase space between words. */
    wordSpacing: {
      type: String,
      enum: ['normal', 'wide', 'extra-wide'],
      default: 'normal',
    },
    /** CSS line-height class; 'relaxed'/'loose' reduce crowding between lines. */
    lineHeight: {
      type: String,
      enum: ['normal', 'relaxed', 'loose'],
      default: 'normal',
    },
    /** Semi-transparent tinted overlay applied over lesson text (Irlen-lens style). */
    colorOverlay: {
      type: String,
      enum: ['none', 'blue', 'green', 'yellow', 'pink'],
      default: 'none',
    },
    
    // --- ADHD Support (EPIC 1.5) ---
    /** Controls how quickly lesson content advances ('slow'|'normal'|'fast'). */
    learningPace: {
      type: String,
      enum: ['slow', 'normal', 'fast'],
      default: 'normal',
    },
    /** Target session length in minutes before a break is suggested (range: 5–60). */
    sessionDuration: {
      type: Number, // in minutes
      default: 20,
      min: 5,
      max: 60,
    },
    /** Whether the UI displays timed break-reminder prompts during long sessions. */
    breakReminders: {
      type: Boolean,
      default: true,
    },
    
    // --- Autism Support (EPIC 1.6) ---
    /** Hides non-essential navigation and decorative UI elements to reduce sensory overload. */
    distractionFreeMode: {
      type: Boolean,
      default: false,
    },
    /** Disables CSS transitions and animated elements throughout the UI. */
    reduceAnimations: {
      type: Boolean,
      default: false,
    },
    /** Applies a stripped-down page layout with fewer visible UI regions. */
    simplifiedLayout: {
      type: Boolean,
      default: false,
    },
    /** Whether audio feedback / reward sounds are played on user interactions. */
    soundEffects: {
      type: Boolean,
      default: true,
    },
    
    // --- Text-to-Speech / Speech-to-Text (future EPIC — not yet in current scope) ---
    /** Enables automatic TTS narration of lesson text content. */
    enableTextToSpeech: {
      type: Boolean,
      default: false,
    },
    /** TTS playback speed multiplier (0.5 = half-speed, 2.0 = double-speed). */
    speechRate: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0,
    },
    /** TTS voice pitch multiplier; values outside 0.5–2.0 may sound unnatural. */
    speechPitch: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0,
    },
    /** Enables microphone-based speech input for answer submission. */
    enableSpeechToText: {
      type: Boolean,
      default: false,
    },
    
    // --- Language Settings (EPIC 5) ---
    /**
     * Legacy language field; also acts as a bilingual-mode fallback when
     * `bilingualTextMode` is not yet set on older user documents.
     */
    preferredLanguage: {
      type: String,
      enum: ['english', 'hindi', 'tamil', 'english_tamil', 'english_hindi', 'malayalam', 'telugu', 'kannada'],
      default: 'english',
    },

    /**
     * Global UI language for labels, dashboards, and settings screens (EPIC 5).
     * Locked by the routes while `bilingualTextMode` is active — changes are
     * silently dropped to prevent UI/lesson-language mismatch.
     */
    uiLanguage: {
      type: String,
      enum: ['english', 'tamil', 'hindi'],
      default: 'english',
    },
    /**
     * Controls dual-language display within lesson and question screens (EPIC 5).
     * 'off' = English only; 'english_tamil' / 'english_hindi' = side-by-side text.
     */
    bilingualTextMode: {
      type: String,
      enum: ['off', 'english_tamil', 'english_hindi'],
      default: 'off',
    },
    
    // --- Gamification ---
    /** Shows the lesson progress bar in the header during lesson playback. */
    showProgressBar: {
      type: Boolean,
      default: true,
    },
    /** Enables badge/reward pop-ups and XP feedback on lesson completion. */
    enableRewards: {
      type: Boolean,
      default: true,
    },
    
    // --- Metadata ---
    /**
     * Manual "last touched" timestamp; updated by the pre-save hook and explicitly
     * set via `{ lastModified: Date.now() }` in every route update call.
     */
    lastModified: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Update lastModified on save
/**
 * Pre-save hook: keep a simple "last touched" timestamp for preferences.
 */
PreferencesSchema.pre('save', function (next) {
  this.lastModified = Date.now();
  next();
});

// Export the compiled Mongoose model; Mongoose caches it internally by the name 'Preferences'.
module.exports = mongoose.model('Preferences', PreferencesSchema);
