/**
 * @module routes/preferences
 * @description Express router for user accessibility and learning preferences.
 *
 * All routes are protected (require a valid JWT via the `protect` middleware).
 * Preferences are stored as a single document per user in the `Preferences`
 * collection and control accessibility, dyslexia, ADHD, autism, language, and
 * gamification settings that the frontend applies as CSS classes and UI flags.
 *
 * Mounted routes:
 *   GET    /api/preferences                — Retrieve user preferences (EPIC 1.7.1)
 *   PUT    /api/preferences                — Create or update all preferences (EPIC 1.3–1.6)
 *   PATCH  /api/preferences/accessibility  — Targeted accessibility update (EPIC 1.3)
 *   PATCH  /api/preferences/dyslexia       — Dyslexia-specific update (EPIC 1.4)
 *   PATCH  /api/preferences/adhd           — ADHD pacing update (EPIC 1.5)
 *   PATCH  /api/preferences/autism         — Autism environment update (EPIC 1.6)
 *   DELETE /api/preferences/reset          — Reset to condition defaults (EPIC 1.3.3 / 1.7)
 *   DELETE /api/preferences/language       — Reset language settings (EPIC 5.7)
 *
 * @note Route ordering matters: all named paths (/accessibility, /dyslexia, /adhd,
 *       /autism, /reset, /language) are registered before any dynamic `/:param`
 *       routes to prevent Express treating the path segment as an ID.
 */
const express = require('express');                              // Express framework
const router = express.Router();                                 // Preferences sub-router
const { body, validationResult } = require('express-validator'); // Input validation helpers
const Preferences = require('../models/Preferences');            // Preferences Mongoose model
const User = require('../models/User');                          // User model (for reset defaults)
const { protect } = require('../middleware/auth');               // JWT authentication middleware

/**
 * Normalise a raw `bilingualTextMode` value to one of the three valid states.
 * Coerces any unrecognised value (including undefined/null/empty) to `'off'`.
 *
 * @param {*} value - Raw value from `req.body` or a stored preferences document.
 * @returns {'english_tamil'|'english_hindi'|'off'} Normalised bilingual mode.
 */
const normalizeBilingualTextMode = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'english_tamil' || raw === 'english_hindi') return raw;
  return 'off';
};

/**
 * Returns `true` when bilingual text mode is actively enabled (i.e. not `'off'`).
 * Used to decide whether a `uiLanguage` change should be blocked or silently dropped.
 *
 * @param {*} value - Raw bilingual text mode value.
 * @returns {boolean} Whether bilingual mode is currently active.
 */
const isBilingualEnabled = (value) => {
  const mode = normalizeBilingualTextMode(value);
  return mode !== 'off';
};

/**
 * @route   GET /api/preferences
 * @desc    Retrieve the authenticated user's stored preferences document.
 *          Returns 404 if no preferences document exists yet (the user has not
 *          completed the initial AccessibilitySetup flow).
 * @access  Private — requires valid JWT (EPIC 1.7.1)
 *
 * @returns {200} { success: true, preferences: PreferencesDocument }
 * @returns {404} No preferences document found for this user.
 * @returns {500} Database read error.
 */
router.get('/', protect, async (req, res) => {
  // EPIC 1.7.1: Persisted preference retrieval (DB-backed)
  try {
    const preferences = await Preferences.findOne({ user: req.user.id });

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Preferences not found',
      });
    }

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching preferences',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/preferences
 * @desc    Create or update the authenticated user's preferences document.
 *          If no document exists it is created from `req.body`; otherwise it
 *          is updated with `findOneAndUpdate` (patch semantics — only supplied
 *          fields are overwritten).
 *
 *          Bilingual-lock rule: when `bilingualTextMode` is active (not 'off'),
 *          a `uiLanguage` value in the body that differs from the stored value
 *          is silently removed before the update so the rest of the payload
 *          still succeeds.
 *
 * @access  Private — requires valid JWT (EPIC 1.3.2 / 1.4.2 / 1.5.1 / 1.6.1)
 *
 * @returns {200} { success: true, message, preferences }
 * @returns {500} Validation or database error.
 */
router.put('/', protect, async (req, res) => {
  // EPIC 1.3.2 / 1.4.2 / 1.5.1 / 1.6.1: Save preference updates from the client
  try {
    let preferences = await Preferences.findOne({ user: req.user.id });

    // Enforce: when bilingual text is enabled, uiLanguage is locked.
    // We only block *changes* (sending the same value is fine).
    if (preferences && req.body && Object.prototype.hasOwnProperty.call(req.body, 'uiLanguage')) {
      const effectiveBilingual =
        req.body?.bilingualTextMode ??
        preferences?.bilingualTextMode ??
        preferences?.preferredLanguage ??
        'off';

      if (isBilingualEnabled(effectiveBilingual)) {
        const requested = String(req.body.uiLanguage || '').trim().toLowerCase();
        const current = String(preferences.uiLanguage || '').trim().toLowerCase();
        if (requested && current && requested !== current) {
          // Ignore the change rather than failing the whole update.
          delete req.body.uiLanguage;
        }
      }
    }

    if (!preferences) {
      // Create preferences if they don't exist
      preferences = await Preferences.create({
        user: req.user.id,
        ...req.body,
      });
    } else {
      // Update existing preferences
      preferences = await Preferences.findOneAndUpdate(
        { user: req.user.id },
        { ...req.body, lastModified: Date.now() },
        {
          new: true,
          runValidators: true,
        }
      );
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/preferences/accessibility
 * @desc    Update only the general accessibility fields: fontSize, contrastTheme,
 *          learningPace, fontFamily, letterSpacing, distractionFreeMode,
 *          preferredLanguage, uiLanguage, bilingualTextMode, simplifiedLayout.
 *          Any field absent from `req.body` is left unchanged.
 *
 *          Applies the same bilingual-lock rule as PUT /: if bilingual mode is
 *          active, a `uiLanguage` change is accepted only when it matches the
 *          currently stored value (a no-op); otherwise it is silently dropped.
 *
 * @access  Private — requires valid JWT (EPIC 1.3.2)
 *
 * @returns {200} { success: true, message, preferences }
 * @returns {404} Preferences document not found.
 * @returns {500} Validation or database error.
 */
router.patch('/accessibility', protect, async (req, res) => {
  // EPIC 1.3.2: Targeted updates for core accessibility controls (font/theme/etc)
  const {
    fontSize,
    contrastTheme,
    learningPace,
    fontFamily,
    letterSpacing,
    distractionFreeMode,
    preferredLanguage,
    uiLanguage,
    bilingualTextMode,
    simplifiedLayout
  } = req.body;

  try {
    const existing = await Preferences.findOne({ user: req.user.id });

    const updateData = {};
    if (fontSize !== undefined) updateData.fontSize = fontSize;
    if (contrastTheme !== undefined) updateData.contrastTheme = contrastTheme;
    if (learningPace !== undefined) updateData.learningPace = learningPace;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;
    if (letterSpacing !== undefined) updateData.letterSpacing = letterSpacing;
    if (distractionFreeMode !== undefined) updateData.distractionFreeMode = distractionFreeMode;
    if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;
    if (bilingualTextMode !== undefined) updateData.bilingualTextMode = bilingualTextMode;
    if (simplifiedLayout !== undefined) updateData.simplifiedLayout = simplifiedLayout;

    // Enforce: when bilingual text is enabled, uiLanguage is locked.
    // Allow changing uiLanguage only when the *effective* bilingual mode is Off.
    const effectiveBilingual =
      updateData.bilingualTextMode ??
      existing?.bilingualTextMode ??
      existing?.preferredLanguage ??
      'off';

    if (uiLanguage !== undefined) {
      if (isBilingualEnabled(effectiveBilingual)) {
        const requested = String(uiLanguage || '').trim().toLowerCase();
        const current = String(existing?.uiLanguage || '').trim().toLowerCase();
        // If it's a no-op (same value), keep it; if it's a change, ignore.
        if (!current || requested === current) {
          updateData.uiLanguage = uiLanguage;
        }
      } else {
        updateData.uiLanguage = uiLanguage;
      }
    }

    // Keep metadata aligned with other update paths.
    updateData.lastModified = Date.now();

    const preferences = await Preferences.findOneAndUpdate(
      { user: req.user.id },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Preferences not found',
      });
    }

    res.json({
      success: true,
      message: 'Accessibility settings updated',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating accessibility settings',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/preferences/dyslexia
 * @desc    Update dyslexia-specific reading comfort settings:
 *          fontFamily, letterSpacing, wordSpacing, lineHeight, colorOverlay.
 *          Uses a truthy-conditional spread, so falsy values (e.g. empty string)
 *          are not written — only positively-set values are persisted.
 *
 * @access  Private — requires valid JWT (EPIC 1.4.2)
 *
 * @returns {200} { success: true, message, preferences }
 * @returns {500} Database error.
 */
router.patch('/dyslexia', protect, async (req, res) => {
  // EPIC 1.4.2: Persist dyslexia-friendly reading preferences (spacing/font)
  const { fontFamily, letterSpacing, wordSpacing, lineHeight, colorOverlay } =
    req.body;

  try {
    const preferences = await Preferences.findOneAndUpdate(
      { user: req.user.id },
      {
        ...(fontFamily && { fontFamily }),
        ...(letterSpacing && { letterSpacing }),
        ...(wordSpacing && { wordSpacing }),
        ...(lineHeight && { lineHeight }),
        ...(colorOverlay && { colorOverlay }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: 'Dyslexia settings updated',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating dyslexia settings',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/preferences/adhd
 * @desc    Update ADHD learning-pace and session-structure settings:
 *          learningPace, sessionDuration, breakReminders.
 *          `breakReminders` uses `!== undefined` guard (boolean false is valid),
 *          while string fields use truthy guards.
 *
 * @access  Private — requires valid JWT (EPIC 1.5.1 / 1.5.2)
 *
 * @returns {200} { success: true, message, preferences }
 * @returns {500} Database error.
 */
router.patch('/adhd', protect, async (req, res) => {
  // EPIC 1.5.1 / 1.5.2: Persist ADHD pacing and break-reminder preferences
  const { learningPace, sessionDuration, breakReminders } = req.body;

  try {
    const preferences = await Preferences.findOneAndUpdate(
      { user: req.user.id },
      {
        ...(learningPace && { learningPace }),
        ...(sessionDuration && { sessionDuration }),
        ...(breakReminders !== undefined && { breakReminders }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: 'ADHD settings updated',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating ADHD settings',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/preferences/autism
 * @desc    Update autism focus-environment settings:
 *          distractionFreeMode, reduceAnimations, simplifiedLayout, soundEffects.
 *          All four are booleans so the spread guard uses `!== undefined` to
 *          allow explicit `false` values to be persisted.
 *
 * @access  Private — requires valid JWT (EPIC 1.6.1)
 *
 * @returns {200} { success: true, message, preferences }
 * @returns {500} Database error.
 */
router.patch('/autism', protect, async (req, res) => {
  // EPIC 1.6.1: Persist focus environment settings (distraction-free, reduce motion)
  const {
    distractionFreeMode,
    reduceAnimations,
    simplifiedLayout,
    soundEffects,
  } = req.body;

  try {
    const preferences = await Preferences.findOneAndUpdate(
      { user: req.user.id },
      {
        ...(distractionFreeMode !== undefined && { distractionFreeMode }),
        ...(reduceAnimations !== undefined && { reduceAnimations }),
        ...(simplifiedLayout !== undefined && { simplifiedLayout }),
        ...(soundEffects !== undefined && { soundEffects }),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: 'Autism settings updated',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating autism settings',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/preferences/reset
 * @desc    Reset the user's preferences to condition-appropriate defaults derived
 *          from `user.learningCondition`:
 *            - 'dyslexia' → opendyslexic font, wide letter-spacing, relaxed line-height
 *            - 'adhd'     → distraction-free mode, normal pace, break reminders on
 *            - 'autism'   → distraction-free, simplified layout, reduced animations
 *          Fields not overridden by the condition spread retain their current values.
 *
 * @access  Private — requires valid JWT (EPIC 1.3.3 / 1.7)
 *
 * @returns {200} { success: true, message, preferences }
 * @returns {500} User-lookup or database error.
 */
router.delete('/reset', protect, async (req, res) => {
  // EPIC 1.3.3 / 1.7: Restore condition-specific defaults from the backend
  try {
    const user = await User.findById(req.user.id);

    // Default preferences based on condition
    const defaults = {
      user: user._id,
      ...(user.learningCondition === 'dyslexia' && {
        fontFamily: 'opendyslexic',
        letterSpacing: 'wide',
        lineHeight: 'relaxed',
      }),
      ...(user.learningCondition === 'adhd' && {
        distractionFreeMode: true,
        learningPace: 'normal',
        breakReminders: true,
      }),
      ...(user.learningCondition === 'autism' && {
        distractionFreeMode: true,
        simplifiedLayout: true,
        reduceAnimations: true,
      }),
    };

    const preferences = await Preferences.findOneAndUpdate(
      { user: req.user.id },
      defaults,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      message: 'Preferences reset to defaults',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resetting preferences',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/preferences/language
 * @desc    Reset all three language-related preference fields to their safe defaults:
 *            uiLanguage        → 'english'
 *            preferredLanguage → 'english'
 *            bilingualTextMode → 'off'
 *          Useful when a learner gets confused by bilingual or non-English UI modes.
 *
 * @access  Private — requires valid JWT (EPIC 5.7)
 *
 * @returns {200} { success: true, message, preferences }
 * @returns {404} Preferences document not found.
 * @returns {500} Database error.
 */
router.delete('/language', protect, async (req, res) => {
  // EPIC 5.7: Reset language settings to allow learner to recover from confusion
  try {
    const preferences = await Preferences.findOneAndUpdate(
      { user: req.user.id },
      {
        uiLanguage: 'english',
        preferredLanguage: 'english',
        bilingualTextMode: 'off',
        lastModified: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'Preferences not found',
      });
    }

    res.json({
      success: true,
      message: 'Language preferences reset to default',
      preferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resetting language preferences',
      error: error.message,
    });
  }
});

// Export the preferences router to be mounted at /api/preferences in server.js
module.exports = router;
