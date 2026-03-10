/**
 * badgesController.js
 *
 * Computes and returns achievement badges for the authenticated user.
 *
 * Badges are derived entirely from runtime statistics — they are never stored
 * in the database. Each request recalculates the user's progress summary
 * (via progressController.computeSummary) and their interaction counts
 * (via UserInteraction aggregations), then maps the results onto a fixed
 * badge catalogue.
 *
 * @route   GET /api/badges
 * @access  Private (JWT required)
 */

// UserInteraction model – used to count correct answers and total attempt sums
const UserInteraction = require('../models/UserInteraction');
// computeSummary derives completedCount, totalLessons, and remaining from UserProgress
const { computeSummary } = require('./progressController');

/**
 * Clamp a numeric value to the range [min, max].
 *
 * @param {number} value - The value to clamp.
 * @param {number} min   - Lower bound (inclusive).
 * @param {number} max   - Upper bound (inclusive).
 * @returns {number} The clamped value.
 */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Build the full badge catalogue with live progress values injected.
 *
 * Each badge entry is enriched with:
 *  - earned   : boolean – whether current >= target (or forceEarned is true).
 *  - progress : integer 0–100 – percentage towards the target (clamped).
 *
 * @param {object} params
 * @param {number} params.completedCount - Number of lessons the user has completed.
 * @param {number} params.totalLessons   - Total lessons available to the user.
 * @param {number} params.remaining      - Lessons not yet completed.
 * @param {number} params.correctCount   - Total correct interaction answers.
 * @param {number} params.attemptsSum    - Total interaction attempts (correct + incorrect).
 * @returns {Array<object>} Array of enriched badge objects.
 */
const defineBadges = ({ completedCount, totalLessons, remaining, correctCount, attemptsSum }) => {
  // Guard against NaN / undefined inputs so badge maths is always safe
  const safeCompleted = Number.isFinite(completedCount) ? completedCount : 0;
  const safeTotal = Number.isFinite(totalLessons) ? totalLessons : 0;
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  const safeCorrect = Number.isFinite(correctCount) ? correctCount : 0;
  const safeAttempts = Number.isFinite(attemptsSum) ? attemptsSum : 0;

  // Halfway badge target: ceiling of half the available lessons (minimum 1)
  const halfwayTarget = Math.max(1, Math.ceil(safeTotal / 2));

  // Completionist is only achievable when there are lessons to complete and none remain
  const completionistEligible = safeTotal > 0 && safeRemaining === 0 && safeCompleted > 0;

  // ── Badge catalogue ─────────────────────────────────────────────────────────
  const badges = [
    // Lesson-completion milestones
    {
      id: 'first_lesson',
      icon: 'award',
      name: 'First Lesson',
      description: 'Complete your first lesson.',
      target: 1,
      current: safeCompleted,
    },
    {
      id: 'three_lessons',
      icon: 'star',
      name: 'On a Roll',
      description: 'Complete 3 lessons.',
      target: 3,
      current: safeCompleted,
    },
    {
      id: 'five_lessons',
      icon: 'sparkles',
      name: 'Consistent Learner',
      description: 'Complete 5 lessons.',
      target: 5,
      current: safeCompleted,
    },
    {
      id: 'halfway',
      icon: 'target',
      name: 'Halfway There',
      description: 'Complete half of the available lessons.',
      target: halfwayTarget,
      current: safeCompleted,
    },
    // Interaction accuracy milestones
    {
      id: 'first_correct',
      icon: 'check',
      name: 'First Correct Answer',
      description: 'Get a correct answer in a practice interaction.',
      target: 1,
      current: safeCorrect,
    },
    {
      id: 'ten_correct',
      icon: 'target',
      name: 'Quiz Master',
      description: 'Get 10 correct answers in practice interactions.',
      target: 10,
      current: safeCorrect,
    },
    // Persistence / attempt milestones
    {
      id: 'practice_starter',
      icon: 'rocket',
      name: 'Practice Starter',
      description: 'Make 5 total attempts in practice interactions.',
      target: 5,
      current: safeAttempts,
    },
    {
      id: 'persistent',
      icon: 'repeat',
      name: 'Persistent',
      description: 'Make 20 total attempts (keeps trying even when it’s hard).',
      target: 20,
      current: safeAttempts,
    },
    // Special badge: earned only when every available lesson is finished
    {
      id: 'completionist',
      icon: 'medal',
      name: 'Completionist',
      description: 'Complete everything currently available to you.',
      target: completionistEligible ? 1 : 1,
      current: completionistEligible ? 1 : 0,
      forceEarned: completionistEligible,
    },
  ];

  // Enrich each badge definition with computed `earned` and `progress` fields
  return badges.map((b) => {
    const target = Number.isFinite(b.target) ? b.target : 1;
    const current = Number.isFinite(b.current) ? b.current : 0;
    // Progress percentage clamped to 0–100 so the UI progress bar never overflows
    const progress = target > 0 ? clamp(Math.round((current / target) * 100), 0, 100) : 0;
    // forceEarned overrides the threshold check (used by the Completionist badge)
    const earned = b.forceEarned ? true : current >= target;

    return {
      id: b.id,
      icon: b.icon,
      name: b.name,
      description: b.description,
      earned,
      progress,
      current,
      target,
    };
  });
};

/**
 * GET /api/badges
 *
 * Returns the authenticated user's badge catalogue with live progress values.
 *
 * Steps:
 *  1. Call computeSummary() to get lesson completion counts.
 *  2. Count correct UserInteraction documents for the accuracy badges.
 *  3. Aggregate total attempt sums from UserInteraction for the persistence badges.
 *  4. Pass all inputs to defineBadges() to produce the enriched catalogue.
 *  5. Return the catalogue alongside the raw summary stats for convenience.
 *
 * @param {import('express').Request}  req - Express request (req.user populated by auth middleware).
 * @param {import('express').Response} res - Express response.
 */
exports.getBadges = async (req, res) => {
  try {
    // Step 1: Fetch lesson completion summary (completedCount, totalLessons, remaining)
    const summary = await computeSummary(req.user.id);

    // Step 2: Count interactions where the user answered correctly
    const correctCount = await UserInteraction.countDocuments({
      userId: req.user.id,
      isCorrect: true,
    });

    // Step 3: Sum all attempt counts across the user's interactions.
    // Uses req.user._id (ObjectId) for the $match stage since aggregate requires
    // the raw ObjectId rather than the string form used by countDocuments.
    const attemptsAgg = await UserInteraction.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, attemptsSum: { $sum: '$attempts' } } },
    ]);

    // attemptsAgg is empty when the user has no interactions yet
    const attemptsSum = attemptsAgg?.[0]?.attemptsSum || 0;

    // Step 4: Build the enriched badge catalogue
    const badges = defineBadges({
      completedCount: summary?.completedCount ?? 0,
      totalLessons: summary?.totalLessons ?? 0,
      remaining: summary?.remaining ?? 0,
      correctCount,
      attemptsSum,
    });

    // Step 5: Respond with badges + the raw stats (useful for frontend summary cards)
    return res.json({
      success: true,
      summary: {
        completedCount: summary?.completedCount ?? 0,
        totalLessons: summary?.totalLessons ?? 0,
        remaining: summary?.remaining ?? 0,
        correctCount,
        attemptsSum,
      },
      badges,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching badges',
      error: error.message,
    });
  }
};
