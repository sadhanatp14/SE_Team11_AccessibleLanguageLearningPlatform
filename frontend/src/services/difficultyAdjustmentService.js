/**
 * Difficulty Adjustment Service Module
 * 
 * Implements intelligent performance-based difficulty adjustment for the adaptive
 * learning system, enabling personalized learning experiences that match learner capabilities.
 * 
 * Core Responsibilities:
 * 
 * 1. Performance Tracking:
 *    - Records learner scores after each lesson completion
 *    - Maintains performance history in localStorage per user
 *    - Tracks recent lesson performance (configurable window size)
 *    - Persists data across sessions
 * 
 * 2. Difficulty Adjustment Algorithm:
 *    - Analyzes recent performance trends (last 3-5 lessons)
 *    - Adjusts difficulty based on consistent performance patterns
 *    - Ensures gradual difficulty changes (one level at a time)
 *    - Maintains difficulty within defined bounds (Beginner to Expert)
 *    - Prevents rapid difficulty swings with consistency checks
 * 
 * 3. Performance Rules:
 *    - High performance (≥80% average): Increase difficulty by 1 level
 *    - Low performance (<50% average): Decrease difficulty by 1 level
 *    - Average performance (50-79%): Maintain current difficulty
 *    - Inconsistent performance: Maintain current difficulty for stability
 * 
 * 4. Statistical Analysis:
 *    - Calculates average performance over window
 *    - Computes standard deviation to detect inconsistency
 *    - Uses variance threshold to filter erratic performance
 *    - Requires minimum lesson count before adjustments
 * 
 * 5. Difficulty Levels:
 *    - Beginner: Introductory content
 *    - Intermediate: Building on basics
 *    - Advanced: Complex concepts
 *    - Expert: Mastery-level content
 * 
 * Configuration:
 * - HISTORY_WINDOW: 3 (recent lessons to consider)
 * - MIN_LESSONS_FOR_ADJUSTMENT: 3 (minimum before adjusting)
 * - HIGH_PERFORMANCE_THRESHOLD: 80% (trigger for increase)
 * - LOW_PERFORMANCE_THRESHOLD: 50% (trigger for decrease)
 * - INCONSISTENCY_THRESHOLD: 20 (standard deviation limit)
 * 
 * Storage:
 * - Uses localStorage for client-side persistence
 * - Key: 'learnerPerformanceData'
 * - Structure: { userId: { scores: [], currentDifficulty: '' } }
 * 
 * Related EPICs:
 * - EPIC 3: Adaptive Difficulty Adjustment
 * - EPIC 3.1: Performance-based difficulty scaling
 * - EPIC 3.2: Consistent difficulty progression
 * - EPIC 4: Personalized Learning Engine (for Autism support)
 * 
 * @module services/difficultyAdjustmentService
 * @author SE_Team11
 * @version 1.0.0
 */

/**
 * Difficulty Adjustment Service
 * 
 * Implements performance-based difficulty adjustment for the adaptive learning system.
 * 
 * Key Features:
 * - Records learner scores after each lesson completion
 * - Tracks recent lesson performance (last 3-5 lessons)
 * - Adjusts difficulty based on consistent performance patterns
 * - Ensures gradual difficulty changes (one level at a time)
 * - Maintains difficulty within defined bounds
 * 
 * Performance Rules:
 * - High performance (≥80% average): Increase difficulty by 1 level
 * - Low performance (<50% average): Decrease difficulty by 1 level
 * - Average performance (50-79%): Keep difficulty unchanged
 * - Inconsistent performance: Keep difficulty unchanged
 * 
 * Storage: Uses localStorage to persist performance history per user
 */

// Storage key for performance data
const PERFORMANCE_STORAGE_KEY = 'learnerPerformanceData';

// Difficulty levels (ordered from easiest to hardest)
const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

// Configuration constants
const CONFIG = {
  // Number of recent lessons to consider for performance trend
  HISTORY_WINDOW: 3,
  
  // Minimum lessons required before adjusting difficulty
  MIN_LESSONS_FOR_ADJUSTMENT: 3,
  
  // Performance thresholds (percentage)
  HIGH_PERFORMANCE_THRESHOLD: 80,  // ≥80% → increase difficulty
  LOW_PERFORMANCE_THRESHOLD: 50,   // <50% → decrease difficulty
  
  // Variance threshold to detect inconsistent performance
  // If standard deviation > this value, performance is considered inconsistent
  INCONSISTENCY_THRESHOLD: 20,

  // Smooth progression controls
  MIN_LESSONS_BETWEEN_ADJUSTMENTS: 2,
  MAX_HISTORY_LENGTH: 20,

  // Pace adaptation thresholds
  FAST_PACE_THRESHOLD: 85,
  SLOW_PACE_THRESHOLD: 55,
};

const PACE_LEVELS = ['slow', 'standard', 'fast'];

/**
 * Read performance data from localStorage
 * @returns {Object} Performance data store
 */
const readStore = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error('Failed to read performance data:', error);
    return {};
  }
};

/**
 * Write performance data to localStorage
 * @param {Object} data - Performance data to store
 */
const writeStore = (data) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to write performance data:', error);
  }
};

/**
 * Normalize user identifier for consistent storage keys
 * @param {Object|string} user - User object or ID
 * @returns {string} Normalized user key
 */
const normalizeUserKey = (user) => {
  if (!user) return 'anonymous';
  if (typeof user === 'string') return user;
  return user.id || user._id || user.email || user.username || 'anonymous';
};

/**
 * Get the index of a difficulty level
 * @param {string} level - Difficulty level
 * @returns {number} Index in DIFFICULTY_LEVELS array, or 0 if not found
 */
const getDifficultyIndex = (level) => {
  const index = DIFFICULTY_LEVELS.indexOf(level);
  return index >= 0 ? index : 0;
};

/**
 * Get difficulty level by index with bounds checking
 * @param {number} index - Desired index
 * @returns {string} Difficulty level
 */
const getDifficultyByIndex = (index) => {
  const boundedIndex = Math.max(0, Math.min(index, DIFFICULTY_LEVELS.length - 1));
  return DIFFICULTY_LEVELS[boundedIndex];
};

/**
 * Calculate average score from an array of lesson scores
 * @param {Array<number>} scores - Array of scores (0-100)
 * @returns {number} Average score
 */
const calculateAverage = (scores) => {
  if (!Array.isArray(scores) || scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return sum / scores.length;
};

/**
 * Calculate standard deviation of scores to detect inconsistency
 * @param {Array<number>} scores - Array of scores (0-100)
 * @returns {number} Standard deviation
 */
const calculateStandardDeviation = (scores) => {
  if (!Array.isArray(scores) || scores.length < 2) return 0;
  const avg = calculateAverage(scores);
  const squaredDiffs = scores.map(score => Math.pow(score - avg, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / scores.length;
  return Math.sqrt(variance);
};

/**
 * Record a lesson score for a user
 * @param {Object|string} user - User object or ID
 * @param {string} lessonId - Lesson identifier
 * @param {number} score - Score as percentage (0-100)
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Object} Updated performance data for the user
 */
export const recordLessonScore = (user, lessonId, score, metadata = {}) => {
  const userKey = normalizeUserKey(user);
  const store = readStore();
  
  // Initialize user data if not exists
  if (!store[userKey]) {
    store[userKey] = {
      currentDifficulty: 'Beginner',
      lessonHistory: [],
      difficultyHistory: [],
      lessonCompletionStatus: {},
      progressionState: {
        pace: 'standard',
        consecutiveHigh: 0,
        consecutiveLow: 0,
        lastAdjustmentAtLessonCount: 0,
      },
    };
  }
  
  const userData = store[userKey];
  
  // Add new lesson record
  const lessonRecord = {
    lessonId,
    score: Math.max(0, Math.min(100, score)), // Clamp between 0-100
    difficulty: userData.currentDifficulty,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  
  userData.lessonHistory.push(lessonRecord);

  // 4.6.1 Track lesson completion status
  userData.lessonCompletionStatus = userData.lessonCompletionStatus || {};
  const previousStatus = userData.lessonCompletionStatus[lessonId] || {
    attempts: 0,
    completed: false,
    bestScore: 0,
  };
  userData.lessonCompletionStatus[lessonId] = {
    lessonId,
    completed: metadata.completed ?? true,
    lastScore: lessonRecord.score,
    bestScore: Math.max(previousStatus.bestScore || 0, lessonRecord.score),
    attempts: (previousStatus.attempts || 0) + 1,
    lastAttemptAt: lessonRecord.timestamp,
  };
  
  // Keep only recent history (last 10 lessons max to prevent unbounded growth)
  if (userData.lessonHistory.length > CONFIG.MAX_HISTORY_LENGTH) {
    userData.lessonHistory = userData.lessonHistory.slice(-CONFIG.MAX_HISTORY_LENGTH);
  }
  
  store[userKey] = userData;
  writeStore(store);
  
  return userData;
};

/**
 * Analyze recent performance and determine if difficulty should change
 * @param {Array<Object>} lessonHistory - Recent lesson records
 * @returns {Object} Analysis result with recommendation
 */
const analyzePerformance = (lessonHistory) => {
  // Not enough data for analysis
  if (!lessonHistory || lessonHistory.length < CONFIG.MIN_LESSONS_FOR_ADJUSTMENT) {
    return {
      shouldAdjust: false,
      reason: 'Insufficient data',
      recentAverage: 0,
      consistency: 'unknown',
    };
  }
  
  // Get recent scores (last N lessons)
  const recentLessons = lessonHistory.slice(-CONFIG.HISTORY_WINDOW);
  const recentScores = recentLessons.map(lesson => lesson.score);
  
  // Calculate performance metrics
  const average = calculateAverage(recentScores);
  const stdDev = calculateStandardDeviation(recentScores);
  
  // Check for inconsistent performance
  const isInconsistent = stdDev > CONFIG.INCONSISTENCY_THRESHOLD;
  
  if (isInconsistent) {
    return {
      shouldAdjust: false,
      reason: 'Performance is inconsistent',
      recentAverage: average,
      consistency: 'inconsistent',
      standardDeviation: stdDev,
    };
  }
  
  // Determine adjustment based on consistent performance
  if (average >= CONFIG.HIGH_PERFORMANCE_THRESHOLD) {
    return {
      shouldAdjust: true,
      direction: 'increase',
      reason: `Consistently high performance (${average.toFixed(1)}% average)`,
      recentAverage: average,
      consistency: 'high',
      standardDeviation: stdDev,
    };
  }
  
  if (average < CONFIG.LOW_PERFORMANCE_THRESHOLD) {
    return {
      shouldAdjust: true,
      direction: 'decrease',
      reason: `Consistently low performance (${average.toFixed(1)}% average)`,
      recentAverage: average,
      consistency: 'low',
      standardDeviation: stdDev,
    };
  }
  
  // Average performance - no adjustment
  return {
    shouldAdjust: false,
    reason: `Performance is average (${average.toFixed(1)}% average)`,
    recentAverage: average,
    consistency: 'average',
    standardDeviation: stdDev,
  };
};

/**
 * Determine adaptive progression pace from recent performance.
 * 4.6.2 Adjust progression speed based on recent performance.
 */
const analyzeProgressionPace = (lessonHistory) => {
  if (!Array.isArray(lessonHistory) || lessonHistory.length < 2) {
    return {
      paceRecommendation: 'standard',
      recentAverage: 0,
      trendDelta: 0,
      reason: 'Insufficient data for pace adaptation',
    };
  }

  const recentWindow = lessonHistory.slice(-Math.min(4, lessonHistory.length));
  const previousWindow = lessonHistory.slice(-Math.min(8, lessonHistory.length), -Math.min(4, lessonHistory.length));

  const recentAverage = calculateAverage(recentWindow.map((l) => l.score));
  const previousAverage = previousWindow.length > 0
    ? calculateAverage(previousWindow.map((l) => l.score))
    : recentAverage;
  const trendDelta = recentAverage - previousAverage;

  if (recentAverage >= CONFIG.FAST_PACE_THRESHOLD && trendDelta >= 0) {
    return {
      paceRecommendation: 'fast',
      recentAverage,
      trendDelta,
      reason: 'Strong and stable recent performance',
    };
  }

  if (recentAverage <= CONFIG.SLOW_PACE_THRESHOLD || trendDelta <= -10) {
    return {
      paceRecommendation: 'slow',
      recentAverage,
      trendDelta,
      reason: 'Recent performance indicates a gentler pace',
    };
  }

  return {
    paceRecommendation: 'standard',
    recentAverage,
    trendDelta,
    reason: 'Balanced performance trend',
  };
};

/**
 * Adjust difficulty level based on recent performance
 * Only adjusts by one level at a time (no skipping)
 * Respects minimum and maximum difficulty bounds
 * 
 * @param {Object|string} user - User object or ID
 * @returns {Object} Result containing new difficulty and analysis
 */
export const adjustDifficulty = (user) => {
  const userKey = normalizeUserKey(user);
  const store = readStore();
  
  // Get user data
  const userData = store[userKey];
  if (!userData) {
    return {
      adjusted: false,
      currentDifficulty: 'Beginner',
      reason: 'No performance data available',
    };
  }
  
  const currentDifficulty = userData.currentDifficulty || 'Beginner';
  userData.progressionState = userData.progressionState || {
    pace: 'standard',
    consecutiveHigh: 0,
    consecutiveLow: 0,
    lastAdjustmentAtLessonCount: 0,
  };
  const currentIndex = getDifficultyIndex(currentDifficulty);
  const lessonsCount = Array.isArray(userData.lessonHistory) ? userData.lessonHistory.length : 0;
  
  // Analyze performance and progression pace
  const analysis = analyzePerformance(userData.lessonHistory);
  const paceAnalysis = analyzeProgressionPace(userData.lessonHistory);

  // Smoothly adapt pace: change only after repeated signals
  if (paceAnalysis.paceRecommendation === 'fast') {
    userData.progressionState.consecutiveHigh = (userData.progressionState.consecutiveHigh || 0) + 1;
    userData.progressionState.consecutiveLow = 0;
  } else if (paceAnalysis.paceRecommendation === 'slow') {
    userData.progressionState.consecutiveLow = (userData.progressionState.consecutiveLow || 0) + 1;
    userData.progressionState.consecutiveHigh = 0;
  } else {
    userData.progressionState.consecutiveHigh = 0;
    userData.progressionState.consecutiveLow = 0;
  }

  if (userData.progressionState.consecutiveHigh >= 2) {
    userData.progressionState.pace = 'fast';
  } else if (userData.progressionState.consecutiveLow >= 2) {
    userData.progressionState.pace = 'slow';
  } else {
    userData.progressionState.pace = 'standard';
  }

  // 4.6.3 Prevent sudden jumps in difficulty level with cooldown
  const lessonsSinceLastAdjustment = lessonsCount - (userData.progressionState.lastAdjustmentAtLessonCount || 0);
  const inCooldown = lessonsSinceLastAdjustment < CONFIG.MIN_LESSONS_BETWEEN_ADJUSTMENTS;
  
  // No adjustment needed
  if (!analysis.shouldAdjust || inCooldown) {
    store[userKey] = userData;
    writeStore(store);
    return {
      adjusted: false,
      currentDifficulty,
      newDifficulty: currentDifficulty,
      analysis,
      pace: userData.progressionState.pace,
      paceAnalysis,
      inCooldown,
    };
  }
  
  // Calculate new difficulty index (increment/decrement by 1 only)
  let newIndex = currentIndex;
  if (analysis.direction === 'increase') {
    newIndex = Math.min(currentIndex + 1, DIFFICULTY_LEVELS.length - 1);
  } else if (analysis.direction === 'decrease') {
    newIndex = Math.max(currentIndex - 1, 0);
  }
  
  // Check if difficulty actually changed (might be at boundary)
  const newDifficulty = getDifficultyByIndex(newIndex);
  const adjusted = newDifficulty !== currentDifficulty;
  
  // Update stored difficulty if changed
  if (adjusted) {
    userData.currentDifficulty = newDifficulty;
    userData.difficultyHistory = userData.difficultyHistory || [];
    userData.progressionState.lastAdjustmentAtLessonCount = lessonsCount;
    userData.difficultyHistory.push({
      from: currentDifficulty,
      to: newDifficulty,
      reason: analysis.reason,
      timestamp: new Date().toISOString(),
    });
    
    store[userKey] = userData;
    writeStore(store);
  }
  
  return {
    adjusted,
    currentDifficulty,
    newDifficulty,
    analysis,
    pace: userData.progressionState.pace,
    paceAnalysis,
    inCooldown: false,
    atBoundary: !adjusted && analysis.shouldAdjust,
  };
};

/**
 * Get current difficulty for a user
 * @param {Object|string} user - User object or ID
 * @returns {string} Current difficulty level
 */
export const getCurrentDifficulty = (user) => {
  const userKey = normalizeUserKey(user);
  const store = readStore();
  const userData = store[userKey];
  return userData?.currentDifficulty || 'Beginner';
};

/**
 * Get performance summary for a user
 * @param {Object|string} user - User object or ID
 * @returns {Object} Performance summary
 */
export const getPerformanceSummary = (user) => {
  const userKey = normalizeUserKey(user);
  const store = readStore();
  const userData = store[userKey];
  
  if (!userData || !userData.lessonHistory || userData.lessonHistory.length === 0) {
    return {
      currentDifficulty: 'Beginner',
      totalLessons: 0,
      averageScore: 0,
      recentAverage: 0,
      trend: 'insufficient-data',
      pace: 'standard',
      completionRate: 0,
    };
  }
  
  const allScores = userData.lessonHistory.map(l => l.score);
  const recentScores = userData.lessonHistory.slice(-CONFIG.HISTORY_WINDOW).map(l => l.score);
  
  const completionEntries = Object.values(userData.lessonCompletionStatus || {});
  const completedLessons = completionEntries.filter((entry) => entry?.completed).length;
  const completionRate = completionEntries.length > 0
    ? Math.round((completedLessons / completionEntries.length) * 100)
    : 0;

  return {
    currentDifficulty: userData.currentDifficulty || 'Beginner',
    totalLessons: userData.lessonHistory.length,
    averageScore: calculateAverage(allScores),
    recentAverage: calculateAverage(recentScores),
    trend: analyzePerformance(userData.lessonHistory).consistency || 'unknown',
    pace: userData.progressionState?.pace || 'standard',
    completionRate,
    lastAdjustment: userData.difficultyHistory?.slice(-1)[0] || null,
  };
};

/**
 * Get adaptive progression state for UI flows.
 * 4.6.4 Maintain a smooth and predictable learning flow.
 */
export const getAdaptiveProgressionState = (user) => {
  const userKey = normalizeUserKey(user);
  const store = readStore();
  const userData = store[userKey];

  if (!userData) {
    return {
      currentDifficulty: 'Beginner',
      pace: 'standard',
      lessonsCompleted: 0,
      recommendedStepSize: 1,
      flowMode: 'steady',
    };
  }

  const pace = userData.progressionState?.pace || 'standard';
  const completionEntries = Object.values(userData.lessonCompletionStatus || {});
  const lessonsCompleted = completionEntries.filter((entry) => entry?.completed).length;

  return {
    currentDifficulty: userData.currentDifficulty || 'Beginner',
    pace,
    lessonsCompleted,
    // Step size intentionally constrained to avoid jumps in UI sequencing.
    recommendedStepSize: 1,
    flowMode: pace === 'slow' ? 'gentle' : pace === 'fast' ? 'accelerated' : 'steady',
  };
};

/**
 * Reset difficulty and performance data for a user
 * @param {Object|string} user - User object or ID
 */
export const resetPerformanceData = (user) => {
  const userKey = normalizeUserKey(user);
  const store = readStore();
  delete store[userKey];
  writeStore(store);
};

/**
 * Get lesson history for a user
 * @param {Object|string} user - User object or ID
 * @param {number} limit - Maximum number of recent lessons to return
 * @returns {Array<Object>} Array of lesson records
 */
export const getLessonHistory = (user, limit = 10) => {
  const userKey = normalizeUserKey(user);
  const store = readStore();
  const userData = store[userKey];
  
  if (!userData || !userData.lessonHistory) {
    return [];
  }
  
  return userData.lessonHistory.slice(-limit);
};

// Export difficulty levels for reference
export { DIFFICULTY_LEVELS, PACE_LEVELS, CONFIG };
