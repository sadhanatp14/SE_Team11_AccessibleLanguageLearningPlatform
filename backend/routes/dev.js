/**
 * Dev Routes
 *
 * Development-only helper endpoints for seeding and testing data.
 * These routes are intended for use in local development and CI environments
 * ONLY — they should never be mounted in production, as they create database
 * records without any authentication or authorisation checks.
 *
 * Base path: /api/dev
 *
 * Usage: mount conditionally in server.js, e.g.
 *   if (process.env.NODE_ENV !== 'production') app.use('/api/dev', devRouter);
 */

const express = require('express');
const router = express.Router();

// Lesson & LessonSection models used to seed test data directly into MongoDB
const Lesson = require('../models/Lesson');
const LessonSection = require('../models/LessonSection');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/dev/create-test-lesson
//
// Creates a Lesson document and one or more associated LessonSection documents
// in a single request. All fields have sensible defaults so callers can send
// an empty body and still get a valid lesson back.
//
// Body (all fields optional):
//   title          {string}   – Lesson title. Defaults to 'EPIC6 Test Lesson'.
//   titleI18n      {object}   – Localised title map  e.g. { es: 'Lección' }.
//   textContent    {string}   – Lesson body text. Defaults to title when absent.
//   textContentI18n {object}  – Localised body text map.
//   sections       {Array}    – Array of section descriptors. Each supports:
//                                 title, titleI18n, text/textContent,
//                                 textContentI18n, interactions.
//                               Defaults to two placeholder sections.
//
// Response: { success, lesson, sections }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-test-lesson', async (req, res) => {
  try {
    // Destructure body with defaults so every field is always defined
    const {
      title = 'EPIC6 Test Lesson',
      titleI18n,
      textContent,
      textContentI18n,
      sections = [{ title: 'Part 1', text: 'P1' }, { title: 'Part 2', text: 'P2' }],
    } = req.body;

    // Create the parent Lesson document first so we have its _id for sections
    const lesson = await Lesson.create({
      title,
      titleI18n,
      // Fall back to title when no explicit body text is provided
      textContent: textContent || title,
      textContentI18n,
    });

    // Create all sections in one bulk insert, preserving the caller's ordering
    // via the `order` field derived from the array index
    const created = await LessonSection.create(
      sections.map((s, i) => ({
        lessonId: lesson._id,
        title: s.title,
        titleI18n: s.titleI18n,
        // Support both `text` (shorthand) and `textContent` (canonical) keys
        textContent: s.text || s.textContent || '',
        textContentI18n: s.textContentI18n,
        interactions: s.interactions || [],
        order: i,
      }))
    );

    return res.json({ success: true, lesson, sections: created });
  } catch (error) {
    console.error('Dev create-test-lesson error:', error);
    return res.status(500).json({ success: false, message: 'Error creating test lesson', error: error.message });
  }
});

module.exports = router;
