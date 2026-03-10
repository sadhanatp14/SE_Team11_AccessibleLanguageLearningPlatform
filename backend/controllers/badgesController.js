const UserInteraction = require('../models/UserInteraction');
const { computeSummary } = require('./progressController');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const defineBadges = ({ completedCount, totalLessons, remaining, correctCount, attemptsSum }) => {
  const safeCompleted = Number.isFinite(completedCount) ? completedCount : 0;
  const safeTotal = Number.isFinite(totalLessons) ? totalLessons : 0;
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  const safeCorrect = Number.isFinite(correctCount) ? correctCount : 0;
  const safeAttempts = Number.isFinite(attemptsSum) ? attemptsSum : 0;

  const halfwayTarget = Math.max(1, Math.ceil(safeTotal / 2));

  const completionistEligible = safeTotal > 0 && safeRemaining === 0 && safeCompleted > 0;

  const badges = [
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

  return badges.map((b) => {
    const target = Number.isFinite(b.target) ? b.target : 1;
    const current = Number.isFinite(b.current) ? b.current : 0;
    const progress = target > 0 ? clamp(Math.round((current / target) * 100), 0, 100) : 0;
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

// @route   GET /api/badges
// @desc    Get computed badges for the current user
// @access  Private
exports.getBadges = async (req, res) => {
  try {
    const summary = await computeSummary(req.user.id);

    const correctCount = await UserInteraction.countDocuments({
      userId: req.user.id,
      isCorrect: true,
    });

    const attemptsAgg = await UserInteraction.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, attemptsSum: { $sum: '$attempts' } } },
    ]);

    const attemptsSum = attemptsAgg?.[0]?.attemptsSum || 0;

    const badges = defineBadges({
      completedCount: summary?.completedCount ?? 0,
      totalLessons: summary?.totalLessons ?? 0,
      remaining: summary?.remaining ?? 0,
      correctCount,
      attemptsSum,
    });

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
