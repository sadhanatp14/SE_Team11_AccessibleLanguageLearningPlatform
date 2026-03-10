import { getLessonHistory } from './difficultyAdjustmentService';

const DEFAULT_HISTORY_LIMIT = 12;

const average = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((sum, n) => sum + n, 0) / arr.length;
};

export const getSimplePerformanceTrend = (history = []) => {
  if (!Array.isArray(history) || history.length < 3) {
    return {
      trend: 'insufficient-data',
      recentAverage: 0,
      previousAverage: 0,
      delta: 0,
      label: 'Need a few more lessons to detect trend.',
    };
  }

  const scores = history.map((h) => Number(h?.score || 0));
  const recent = scores.slice(-3);
  const previous = scores.slice(-6, -3);

  const recentAverage = average(recent);
  const previousAverage = previous.length > 0 ? average(previous) : recentAverage;
  const delta = recentAverage - previousAverage;

  if (recentAverage < 60 || delta <= -8) {
    return {
      trend: 'struggling',
      recentAverage,
      previousAverage,
      delta,
      label: 'Recent performance dipped. A short review can help.',
    };
  }

  if (recentAverage >= 80 && delta >= 5) {
    return {
      trend: 'improving',
      recentAverage,
      previousAverage,
      delta,
      label: 'Great momentum. Ready to move forward.',
    };
  }

  return {
    trend: 'steady',
    recentAverage,
    previousAverage,
    delta,
    label: 'Steady progress. Continue with the next lesson.',
  };
};

/**
 * Build a single clear recommendation from completion + review trend.
 * Returns only one recommendation at a time.
 */
export const getReviewBasedRecommendation = ({
  user,
  module,
  lessons = [],
  completedLessonIds = [],
}) => {
  const ordered = [...lessons].sort((a, b) => Number(a.id) - Number(b.id));
  if (ordered.length === 0) return null;

  const completedSet = new Set((completedLessonIds || []).map((id) => Number(id)));
  const completedCount = ordered.filter((l) => completedSet.has(Number(l.id))).length;

  const nextLesson = ordered.find((l) => !completedSet.has(Number(l.id))) || null;
  const lastCompleted = [...ordered].reverse().find((l) => completedSet.has(Number(l.id))) || null;

  if (!nextLesson) {
    return {
      allCompleted: true,
      reason: 'Great work! You completed all available lessons.',
      completedCount,
      totalLessons: ordered.length,
      trend: 'completed',
      recommendation: null,
      recommendationKey: 'completed',
    };
  }

  // 4.7.1 Store + read past performance data from lesson history.
  const history = getLessonHistory(user, DEFAULT_HISTORY_LIMIT)
    .filter((entry) => {
      if (!entry) return false;
      if (entry.module) return String(entry.module) === String(module);
      // Backward compatibility: infer module from lesson key prefix.
      return String(entry.lessonId || '').startsWith(`${module}-lesson-`);
    });

  // 4.7.2 Identify simple trends.
  const trendInfo = getSimplePerformanceTrend(history);

  // Select one lesson recommendation only.
  let recommendedLesson = nextLesson;
  let recommendationType = 'next';
  let reason = lastCompleted
    ? `You finished "${lastCompleted.title}". Up next:`
    : 'Start your learning journey:';

  if (trendInfo.trend === 'struggling' && lastCompleted) {
    // 4.7.3 Follow-up recommendation: review recent lesson when trend dips.
    recommendedLesson = lastCompleted;
    recommendationType = 'review';
    reason = `Let's reinforce "${lastCompleted.title}" before moving ahead.`;
  } else if (trendInfo.trend === 'improving') {
    reason = `Excellent progress (${Math.round(trendInfo.recentAverage)}% recent avg). Keep going:`;
  } else if (trendInfo.trend === 'steady') {
    reason = `Nice steady progress. Recommended next lesson:`;
  }

  const position = ordered.findIndex((l) => Number(l.id) === Number(recommendedLesson.id)) + 1;

  return {
    allCompleted: false,
    trend: trendInfo.trend,
    trendLabel: trendInfo.label,
    reason,
    lesson: recommendedLesson,
    recommendationType,
    recommendationKey: `${recommendationType}:${recommendedLesson.id}`,
    completedCount,
    totalLessons: ordered.length,
    position,
  };
};
