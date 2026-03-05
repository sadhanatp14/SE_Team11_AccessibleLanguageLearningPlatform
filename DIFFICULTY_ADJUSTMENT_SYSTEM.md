# Performance-Based Difficulty Adjustment System

## Overview

This document describes the adaptive learning system that automatically adjusts lesson difficulty based on learner performance. The system ensures a gradual, personalized learning experience by monitoring performance trends and making incremental difficulty adjustments.

## Architecture

### Core Components

1. **difficultyAdjustmentService.js** - Main service handling performance tracking and difficulty logic
2. **DyslexiaView.js** - Dashboard displaying current difficulty level
3. **LessonReplay.js** - Records lesson scores and triggers difficulty adjustments
4. **LessonSectionView.js** - Tracks individual interaction results

## How It Works

### 1. Performance Tracking

**Recording Scores:**
- After each lesson completion, the system calculates a score (0-100%)
- Score = (Correct Interactions / Total Interactions) × 100
- Scores are stored in localStorage with metadata (timestamp, difficulty level)

**Example:**
```javascript
// Lesson completed with 8 out of 10 interactions correct
recordLessonScore(user, 'lesson-greetings', 80, {
  totalInteractions: 10,
  correctInteractions: 8,
  completionDate: '2026-02-18T10:30:00.000Z'
});
```

### 2. Performance Analysis

**Recent Performance Window:**
- Analyzes the last 3 lessons (configurable via `CONFIG.HISTORY_WINDOW`)
- Calculates average score and standard deviation
- Minimum 3 lessons required before making adjustments

**Performance Categories:**
- **High Performance**: ≥80% average score → Increase difficulty
- **Low Performance**: <50% average score → Decrease difficulty  
- **Average Performance**: 50-79% average → Keep difficulty unchanged
- **Inconsistent Performance**: High standard deviation (>20%) → No change

### 3. Difficulty Adjustment Rules

**Gradual Progression:**
```
Beginner → Intermediate → Advanced → Expert
```

**Key Rules:**
1. ✅ Only adjust by ONE level at a time (no skipping)
2. ✅ Respect minimum (Beginner) and maximum (Expert) bounds
3. ✅ Require consistent performance (low variance)
4. ✅ Need minimum 3 lessons before adjustment
5. ❌ Never make sudden jumps or skip levels

**Example Scenarios:**

| Current Level | Recent Scores | Average | Action | New Level |
|--------------|---------------|---------|--------|-----------|
| Beginner | [85, 90, 87] | 87.3% | Increase +1 | Intermediate |
| Intermediate | [45, 40, 48] | 44.3% | Decrease -1 | Beginner |
| Advanced | [65, 70, 68] | 67.7% | No change | Advanced |
| Intermediate | [50, 85, 60] | 65% (high variance) | No change | Intermediate |
| Expert | [90, 92, 88] | 90% | No change (at max) | Expert |

### 4. User Interface Integration

**DyslexiaView Dashboard:**
- Displays current difficulty level with trending indicator
- Shows recent average performance percentage
- Updates automatically after lesson completion

**Lesson Completion:**
- Provides feedback on difficulty adjustment
- Example: "Your difficulty level has been adjusted to Intermediate based on your performance!"

## Code Examples

### Recording a Lesson Score

```javascript
import { recordLessonScore, adjustDifficulty } from './services/difficultyAdjustmentService';

// After lesson completion
const score = (correctInteractions / totalInteractions) * 100;

recordLessonScore(user, lessonId, score, {
  totalInteractions,
  correctInteractions,
  completionDate: new Date().toISOString()
});

// Check for difficulty adjustment
const result = adjustDifficulty(user);

if (result.adjusted) {
  console.log(`Difficulty changed: ${result.currentDifficulty} → ${result.newDifficulty}`);
  console.log(`Reason: ${result.analysis.reason}`);
}
```

### Getting Current Difficulty

```javascript
import { getCurrentDifficulty, getPerformanceSummary } from './services/difficultyAdjustmentService';

// Get current difficulty level
const difficulty = getCurrentDifficulty(user); // "Beginner", "Intermediate", etc.

// Get detailed performance summary
const summary = getPerformanceSummary(user);
/*
{
  currentDifficulty: "Intermediate",
  totalLessons: 5,
  averageScore: 72.5,
  recentAverage: 75.0,
  trend: "average",
  lastAdjustment: { from: "Beginner", to: "Intermediate", ... }
}
*/
```

## Configuration

The system behavior can be customized via `CONFIG` constants in `difficultyAdjustmentService.js`:

```javascript
const CONFIG = {
  // Number of recent lessons to analyze
  HISTORY_WINDOW: 3,
  
  // Minimum lessons before adjustment
  MIN_LESSONS_FOR_ADJUSTMENT: 3,
  
  // Performance thresholds (percentage)
  HIGH_PERFORMANCE_THRESHOLD: 80,  // ≥80% → increase
  LOW_PERFORMANCE_THRESHOLD: 50,   // <50% → decrease
  
  // Inconsistency detection (standard deviation)
  INCONSISTENCY_THRESHOLD: 20,
};
```

## Data Storage

**localStorage Structure:**
```javascript
{
  "learnerPerformanceData": {
    "user_12345": {
      "currentDifficulty": "Intermediate",
      "lessonHistory": [
        {
          "lessonId": "lesson-greetings",
          "score": 85,
          "difficulty": "Beginner",
          "timestamp": "2026-02-18T10:00:00.000Z",
          "totalInteractions": 8,
          "correctInteractions": 7
        }
      ],
      "difficultyHistory": [
        {
          "from": "Beginner",
          "to": "Intermediate",
          "reason": "Consistently high performance (87.3% average)",
          "timestamp": "2026-02-18T11:00:00.000Z"
        }
      ]
    }
  }
}
```

## Edge Cases Handled

1. **Not Enough Data:** No adjustment if < 3 lessons completed
2. **Inconsistent Performance:** No adjustment if standard deviation > 20%
3. **Boundary Conditions:** 
   - Can't decrease below "Beginner"
   - Can't increase above "Expert"
4. **Missing User:** Defaults to "anonymous" user key
5. **Invalid Scores:** Clamped to 0-100 range

## Benefits

✅ **Personalized Learning:** Each learner progresses at their own pace
✅ **Gradual Progression:** Prevents overwhelming learners with sudden difficulty spikes
✅ **Consistent Experience:** Requires proven performance before advancement
✅ **Adaptive Support:** Reduces difficulty when learners struggle
✅ **Transparent Feedback:** Users know why difficulty changed
✅ **Data-Driven:** Uses statistical analysis (mean, standard deviation)

## Future Enhancements

- [ ] Per-lesson-type difficulty (separate for dyslexia, ADHD, autism)
- [ ] Time-based performance metrics (faster completion = higher score boost)
- [ ] Skill-specific difficulty (vocabulary vs. numbers vs. grammar)
- [ ] Machine learning-based predictions
- [ ] A/B testing different thresholds
- [ ] Analytics dashboard for educators

## Testing

The system can be tested by:

1. Completing lessons with varying scores
2. Checking localStorage for performance data
3. Verifying difficulty badges update on dashboard
4. Confirming gradual level changes
5. Testing boundary conditions (min/max levels)

## Related Files

- `frontend/src/services/difficultyAdjustmentService.js` - Core service
- `frontend/src/components/learning/DyslexiaView.js` - Dashboard integration
- `frontend/src/components/learning/LessonReplay.js` - Score recording
- `frontend/src/components/learning/LessonSectionView.js` - Interaction tracking
- `DIFFICULTY_ADJUSTMENT_SYSTEM.md` - This documentation
