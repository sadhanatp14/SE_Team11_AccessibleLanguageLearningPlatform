/**
 * routes/lessons.js
 *
 * Lesson router — mounted at /api/lessons.
 *
 * All routes are private (require a valid Bearer token via the `protect` middleware).
 *
 * Routes:
 *  GET /api/lessons/search?q=<query>    — Search lessons by keyword or semantic query
 *  GET /api/lessons/:lessonId/sections  — Retrieve the ordered sections of a lesson
 *  GET /api/lessons/:id                 — Retrieve a single lesson document by ID
 *
 * Route ordering is intentional:
 *  `/search` and `/:lessonId/sections` must be registered BEFORE `/:id` so that
 *  Express does not mistakenly treat the literal strings 'search' or '<id>/sections'
 *  as dynamic `:id` segments.
 */

// express + Router — standard route definition scaffolding
const express = require('express');
// protect middleware — JWT verification; rejects unauthenticated requests with 401
const { protect } = require('../middleware/auth');
// lessonController — handles search and single-lesson retrieval
const { getLessonById, searchLessons } = require('../controllers/lessonController');
// lessonSectionController — handles retrieval of a lesson's ordered sections
const { getLessonSections } = require('../controllers/lessonSectionController');

const router = express.Router();

/**
 * GET /api/lessons/search?q=<query>
 *
 * Search lessons using a two-strategy approach:
 *  1. Semantic (vector) search via the embedding service when available.
 *  2. MongoDB text-index keyword search as a fallback.
 *
 * Query params:
 *  q {string} - The search query string.
 *
 * @access Private
 */
router.get('/search', protect, searchLessons);

/**
 * GET /api/lessons/:lessonId/sections
 *
 * Retrieve all sections belonging to a lesson, ordered by their `order` field.
 * Used by the lesson player to build the section navigation list.
 *
 * Route params:
 *  lessonId {string} - MongoDB ObjectId of the parent lesson.
 *
 * @access Private
 */
router.get('/:lessonId/sections', protect, getLessonSections);

/**
 * GET /api/lessons/:id
 *
 * Retrieve a single lesson document by its MongoDB ObjectId.
 * Returns the full lesson including highlights, visualAids, and interactions
 * (computed/enriched by the controller before sending).
 *
 * Route params:
 *  id {string} - MongoDB ObjectId of the lesson.
 *
 * @access Private
 */
router.get('/:id', protect, getLessonById);

module.exports = router;
