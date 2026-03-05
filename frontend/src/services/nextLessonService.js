/**
 * nextLessonService.js
 *
 * Determines the single recommended next lesson for the learner.
 *
 * Architecture decision:
 * ---------------------
 * DyslexiaView uses a **hardcoded** lesson array with localStorage-based progress
 * (via dyslexiaProgressService), not the backend UserProgress model. So we resolve
 * the recommendation entirely client-side against the predefined lesson order.
 *
 * For backend-backed views (ADHD, Autism), a companion API endpoint exists at
 * GET /api/progress/next-lesson.
 *
 * Edge cases:
 * - No lessons completed → recommend lesson 1
 * - All lessons completed → return null with `allCompleted: true`
 * - Skipped recommendation → stored in sessionStorage so it doesn't re-appear
 *   until the next session or until progress changes
 */

import { getAllLessonProgress, normalizeUserId } from './dyslexiaProgressService';

// Session-scoped storage key for tracking skips
const SKIP_KEY = 'nextLessonSkipped';

/**
 * Canonical lesson order for dyslexia-mode.
 * This must match the `lessons` array in DyslexiaView.js exactly.
 * Centralised here so the recommendation engine and the UI share the same source of truth.
 */
export const LESSON_ORDER = [
  {
    id: 1,
    apiId: 'lesson-greetings',
    title: 'Greetings',
    titleSyllables: 'Greet-ings',
    description: 'Learn "Hello", "Hi", and friendly phrases',
    descriptionSyllables: 'Learn "Hello" (Hel-lo), "Hi", and friend-ly phrases',
    totalInteractions: 8,
  },
  {
    id: 2,
    apiId: 'lesson-vocabulary',
    title: 'Basic Words',
    titleSyllables: 'Ba-sic Words',
    description: 'Everyday objects, people, and actions',
    descriptionSyllables: 'E-ve-ry-day words like ap-ple, chair, book',
    totalInteractions: 11,
  },
  {
    id: 3,
    apiId: 'lesson-numbers',
    title: 'Numbers',
    titleSyllables: 'Num-bers',
    description: 'Count, match, and order numbers',
    descriptionSyllables: 'Count, match, and or-der num-bers',
    totalInteractions: 11,
  },
];

/**
 * Determine whether a lesson is "completed" based on localStorage progress.
 * A lesson is considered complete when its status is exactly 'Completed'.
 *
 * @param {Object} progressMap - The full { apiId → { status, correctCount, … } } map
 * @param {string} apiId       - The lesson identifier to check
 * @returns {boolean}
 */
const isLessonCompleted = (progressMap, apiId) => {
  const entry = progressMap[apiId];
  return entry && entry.status === 'Completed';
};

/**
 * Compute the next-lesson recommendation for a given user.
 *
 * @param {Object} user - The authenticated user object (from AuthContext)
 * @returns {{
 *   recommendation: Object|null,
 *   lastCompleted: Object|null,
 *   allCompleted: boolean,
 *   completedCount: number,
 *   totalLessons: number,
 *   reason: string
 * }}
 */
export const getNextLessonRecommendation = (user) => {
  const userKey = normalizeUserId(user);
  const progressMap = getAllLessonProgress(userKey);

  let lastCompleted = null;
  let nextLesson = null;
  let completedCount = 0;

  for (const lesson of LESSON_ORDER) {
    if (isLessonCompleted(progressMap, lesson.apiId)) {
      lastCompleted = lesson;
      completedCount++;
    } else if (!nextLesson) {
      nextLesson = lesson;
    }
  }

  // All lessons completed
  if (!nextLesson) {
    return {
      recommendation: null,
      lastCompleted,
      allCompleted: true,
      completedCount,
      totalLessons: LESSON_ORDER.length,
      reason: 'Congratulations! You have completed all available lessons.',
    };
  }

  // Build recommendation
  const position = LESSON_ORDER.findIndex((l) => l.apiId === nextLesson.apiId) + 1;

  return {
    recommendation: {
      ...nextLesson,
      position,
    },
    lastCompleted,
    allCompleted: false,
    completedCount,
    totalLessons: LESSON_ORDER.length,
    reason: lastCompleted
      ? `You finished "${lastCompleted.title}". Up next:`
      : 'Start your learning journey:',
  };
};

/**
 * Mark the current recommendation as "skipped" for this browser session.
 * The skip is keyed by the lesson apiId so it auto-clears if progress changes.
 *
 * @param {string} apiId - The lesson apiId being skipped
 */
export const skipRecommendation = (apiId) => {
  if (!apiId) return;
  try {
    sessionStorage.setItem(SKIP_KEY, apiId);
  } catch {
    // sessionStorage unavailable — degrade gracefully
  }
};

/**
 * Check whether the recommendation for a specific lesson was already skipped.
 *
 * @param {string} apiId - The lesson apiId to check
 * @returns {boolean}
 */
export const isRecommendationSkipped = (apiId) => {
  if (!apiId) return false;
  try {
    return sessionStorage.getItem(SKIP_KEY) === apiId;
  } catch {
    return false;
  }
};

/**
 * Clear any stored skip state (e.g. when progress changes or a new session starts).
 */
export const clearSkipState = () => {
  try {
    sessionStorage.removeItem(SKIP_KEY);
  } catch {
    // ignore
  }
};
