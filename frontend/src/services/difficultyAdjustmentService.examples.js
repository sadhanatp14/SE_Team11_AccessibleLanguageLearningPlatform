/**
 * Example Usage and Test Cases for Difficulty Adjustment System
 * 
 * This file demonstrates how the difficulty adjustment system works
 * with various scenarios and edge cases.
 */

import {
  recordLessonScore,
  adjustDifficulty,
  getCurrentDifficulty,
  getPerformanceSummary,
  getLessonHistory,
  resetPerformanceData,
  DIFFICULTY_LEVELS,
  CONFIG,
} from '../src/services/difficultyAdjustmentService';

// Mock user object
const mockUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  learningCondition: 'dyslexia',
};

/**
 * Example 1: Starting from scratch
 * User completes first lesson with good performance
 */
console.log('=== Example 1: First Lesson ===');
resetPerformanceData(mockUser); // Start fresh

recordLessonScore(mockUser, 'lesson-greetings', 85, {
  totalInteractions: 8,
  correctInteractions: 7,
});

let difficulty = getCurrentDifficulty(mockUser);
console.log('Current difficulty:', difficulty); // "Beginner"

let result = adjustDifficulty(mockUser);
console.log('Adjustment result:', result);
// { adjusted: false, reason: "Insufficient data" }

/**
 * Example 2: Consistent high performance
 * After 3 lessons with high scores, difficulty increases
 */
console.log('\n=== Example 2: Consistent High Performance ===');
resetPerformanceData(mockUser);

// Complete 3 lessons with high scores (≥80%)
recordLessonScore(mockUser, 'lesson-greetings', 85);
recordLessonScore(mockUser, 'lesson-vocabulary', 90);
recordLessonScore(mockUser, 'lesson-numbers', 87);

result = adjustDifficulty(mockUser);
console.log('After 3 high-performing lessons:');
console.log('Adjusted:', result.adjusted); // true
console.log('New difficulty:', result.newDifficulty); // "Intermediate"
console.log('Reason:', result.analysis.reason);
// "Consistently high performance (87.3% average)"

/**
 * Example 3: Consistent low performance
 * After struggling, difficulty decreases
 */
console.log('\n=== Example 3: Consistent Low Performance ===');
resetPerformanceData(mockUser);

// Start at Intermediate level
recordLessonScore(mockUser, 'lesson-1', 70);
recordLessonScore(mockUser, 'lesson-2', 75);
recordLessonScore(mockUser, 'lesson-3', 72);
adjustDifficulty(mockUser); // Move to Intermediate

// Now struggle with 3 lessons (<50%)
recordLessonScore(mockUser, 'lesson-4', 45);
recordLessonScore(mockUser, 'lesson-5', 40);
recordLessonScore(mockUser, 'lesson-6', 48);

result = adjustDifficulty(mockUser);
console.log('After struggling:');
console.log('Adjusted:', result.adjusted); // true
console.log('New difficulty:', result.newDifficulty); // "Beginner"
console.log('Reason:', result.analysis.reason);
// "Consistently low performance (44.3% average)"

/**
 * Example 4: Inconsistent performance
 * High variance prevents adjustment
 */
console.log('\n=== Example 4: Inconsistent Performance ===');
resetPerformanceData(mockUser);

// Complete 3 lessons with widely varying scores
recordLessonScore(mockUser, 'lesson-1', 50);
recordLessonScore(mockUser, 'lesson-2', 95);
recordLessonScore(mockUser, 'lesson-3', 55);

result = adjustDifficulty(mockUser);
console.log('After inconsistent performance:');
console.log('Adjusted:', result.adjusted); // false
console.log('Current difficulty:', result.currentDifficulty); // "Beginner"
console.log('Reason:', result.analysis.reason);
// "Performance is inconsistent"
console.log('Standard deviation:', result.analysis.standardDeviation);

/**
 * Example 5: Average performance
 * Scores in 50-79% range keep difficulty unchanged
 */
console.log('\n=== Example 5: Average Performance ===');
resetPerformanceData(mockUser);

recordLessonScore(mockUser, 'lesson-1', 65);
recordLessonScore(mockUser, 'lesson-2', 70);
recordLessonScore(mockUser, 'lesson-3', 68);

result = adjustDifficulty(mockUser);
console.log('After average performance:');
console.log('Adjusted:', result.adjusted); // false
console.log('Current difficulty:', result.currentDifficulty); // "Beginner"
console.log('Reason:', result.analysis.reason);
// "Performance is average (67.7% average)"

/**
 * Example 6: Boundary conditions
 * Can't go below Beginner or above Expert
 */
console.log('\n=== Example 6: Boundary Conditions ===');

// Test minimum boundary
resetPerformanceData(mockUser);
recordLessonScore(mockUser, 'lesson-1', 30);
recordLessonScore(mockUser, 'lesson-2', 35);
recordLessonScore(mockUser, 'lesson-3', 32);

result = adjustDifficulty(mockUser);
console.log('At Beginner level with low scores:');
console.log('Adjusted:', result.adjusted); // false
console.log('At boundary:', result.atBoundary); // true
console.log('Stays at:', result.newDifficulty); // "Beginner"

// Test maximum boundary
resetPerformanceData(mockUser);
// Simulate progression to Expert
for (let i = 0; i < 12; i++) {
  recordLessonScore(mockUser, `lesson-${i}`, 85 + Math.random() * 10);
  adjustDifficulty(mockUser);
}

difficulty = getCurrentDifficulty(mockUser);
console.log('\nAfter many high-performing lessons:');
console.log('Current difficulty:', difficulty); // Should be "Expert"

recordLessonScore(mockUser, 'lesson-final-1', 92);
recordLessonScore(mockUser, 'lesson-final-2', 88);
recordLessonScore(mockUser, 'lesson-final-3', 90);

result = adjustDifficulty(mockUser);
console.log('At Expert level with high scores:');
console.log('Adjusted:', result.adjusted); // false
console.log('At boundary:', result.atBoundary); // true
console.log('Stays at:', result.newDifficulty); // "Expert"

/**
 * Example 7: Getting performance summary
 */
console.log('\n=== Example 7: Performance Summary ===');
resetPerformanceData(mockUser);

recordLessonScore(mockUser, 'lesson-1', 70);
recordLessonScore(mockUser, 'lesson-2', 75);
recordLessonScore(mockUser, 'lesson-3', 80);
recordLessonScore(mockUser, 'lesson-4', 85);
recordLessonScore(mockUser, 'lesson-5', 82);
adjustDifficulty(mockUser);

const summary = getPerformanceSummary(mockUser);
console.log('Performance Summary:');
console.log('- Current difficulty:', summary.currentDifficulty);
console.log('- Total lessons completed:', summary.totalLessons);
console.log('- Overall average score:', summary.averageScore.toFixed(1) + '%');
console.log('- Recent average (last 3):', summary.recentAverage.toFixed(1) + '%');
console.log('- Performance trend:', summary.trend);
console.log('- Last adjustment:', summary.lastAdjustment);

/**
 * Example 8: Lesson history
 */
console.log('\n=== Example 8: Lesson History ===');
const history = getLessonHistory(mockUser, 5);
console.log('Recent lesson history:');
history.forEach((lesson, index) => {
  console.log(`${index + 1}. ${lesson.lessonId}: ${lesson.score}% at ${lesson.difficulty}`);
});

/**
 * Example 9: Simulating realistic learning journey
 */
console.log('\n=== Example 9: Realistic Learning Journey ===');
resetPerformanceData(mockUser);

const learningJourney = [
  // Start with moderate scores (Beginner)
  { lesson: 'greetings-1', score: 65 },
  { lesson: 'greetings-2', score: 70 },
  { lesson: 'vocabulary-1', score: 68 },
  
  // Improve gradually
  { lesson: 'vocabulary-2', score: 75 },
  { lesson: 'numbers-1', score: 80 },
  { lesson: 'numbers-2', score: 85 },
  
  // Consistently high → move to Intermediate
  { lesson: 'grammar-1', score: 87 },
  { lesson: 'grammar-2', score: 82 },
  { lesson: 'phrases-1', score: 90 },
  
  // Struggle at new level
  { lesson: 'intermediate-1', score: 55 },
  { lesson: 'intermediate-2', score: 60 },
  { lesson: 'intermediate-3', score: 58 },
  
  // Adapt and improve
  { lesson: 'intermediate-4', score: 72 },
  { lesson: 'intermediate-5', score: 78 },
  { lesson: 'intermediate-6', score: 83 },
];

learningJourney.forEach((step, index) => {
  recordLessonScore(mockUser, step.lesson, step.score);
  const adjustmentResult = adjustDifficulty(mockUser);
  
  if (adjustmentResult.adjusted) {
    console.log(`Lesson ${index + 1} (${step.lesson}): ${step.score}%`);
    console.log(`  → Difficulty adjusted: ${adjustmentResult.currentDifficulty} → ${adjustmentResult.newDifficulty}`);
    console.log(`  → Reason: ${adjustmentResult.analysis.reason}`);
  }
});

const finalSummary = getPerformanceSummary(mockUser);
console.log('\nFinal Performance Summary:');
console.log('- Difficulty level:', finalSummary.currentDifficulty);
console.log('- Lessons completed:', finalSummary.totalLessons);
console.log('- Overall average:', finalSummary.averageScore.toFixed(1) + '%');
console.log('- Recent average:', finalSummary.recentAverage.toFixed(1) + '%');

/**
 * Example 10: Configuration info
 */
console.log('\n=== System Configuration ===');
console.log('Difficulty levels:', DIFFICULTY_LEVELS.join(' → '));
console.log('Analysis window:', CONFIG.HISTORY_WINDOW, 'lessons');
console.log('Min lessons for adjustment:', CONFIG.MIN_LESSONS_FOR_ADJUSTMENT);
console.log('High performance threshold:', CONFIG.HIGH_PERFORMANCE_THRESHOLD + '%');
console.log('Low performance threshold:', CONFIG.LOW_PERFORMANCE_THRESHOLD + '%');
console.log('Inconsistency threshold:', CONFIG.INCONSISTENCY_THRESHOLD);

/**
 * Summary of Key Behaviors:
 * 
 * ✅ Only adjusts after minimum 3 lessons
 * ✅ Requires consistent performance (low variance)
 * ✅ Changes difficulty by exactly 1 level at a time
 * ✅ Respects minimum (Beginner) and maximum (Expert) bounds
 * ✅ Provides clear feedback on adjustment reasons
 * ✅ Analyzes last 3 lessons for trends
 * ✅ Handles edge cases (missing data, boundaries, etc.)
 */
