/**
 * AutismLearningPath Component
 * 
 * Visual learning path interface showing lesson progression for autism learners,
 * implementing EPIC 4.3 (Personalized Learning Path) and EPIC 4.6 (Adaptive Progression).
 * 
 * Core Features:
 * 
 * 1. Linear Path Visualization (EPIC 4.3):
 *    - Sequential lesson progression display
 *    - Clear visual timeline
 *    - Predictable structure for autism support
 *    - No overwhelming choices
 *    - Guided learning journey
 * 
 * 2. Progress Tracking (EPIC 4.6):
 *    - Overall completion percentage
 *    - Completed lesson count
 *    - Visual progress bar
 *    - Real-time progress updates
 * 
 * 3. Lesson States:
 *    - Completed (✓): Finished lessons with checkmark
 *    - Current (○): Active/available lessons
 *    - Locked (🔒): Future lessons requiring prerequisites
 *    - Visual state differentiation
 * 
 * 4. Progressive Unlocking:
 *    - Lessons unlock sequentially
 *    - Previous lesson must be completed
 *    - Prevents overwhelming choices
 *    - Maintains clear path
 * 
 * 5. Interactive Elements:
 *    - Click to select available lessons
 *    - Disabled state for locked lessons
 *    - Visual feedback on hover
 *    - Clear selection indicators
 * 
 * 6. Autism-Friendly Design:
 *    - Predictable vertical timeline
 *    - Consistent visual patterns
 *    - No unexpected animations
 *    - Clear status indicators
 *    - Minimal cognitive load
 * 
 * Path Display:
 * - Vertical timeline layout
 * - Lessons ordered sequentially
 * - Progress indicator at top
 * - Connection lines between lessons
 * - Status icons for each lesson
 * 
 * Lesson Information:
 * - Lesson title
 * - Language/difficulty
 * - Completion status
 * - Lock/unlock state
 * - Selection callback
 * 
 * Related EPICs:
 * - EPIC 4: Personalized Learning Engine
 * - EPIC 4.3: Personalized learning path visualization
 * - EPIC 4.6: Adaptive learning progression
 * - EPIC 6: Progress tracking integration
 * 
 * @component
 * @param {Object} props
 * @param {Array<Object>} props.learningPath - Ordered array of lesson objects
 * @param {string} props.learningPath[].lessonId - Unique lesson identifier
 * @param {string} props.learningPath[].title - Lesson title
 * @param {boolean} props.learningPath[].isCompleted - Completion status
 * @param {string} props.learningPath[].language - Lesson language
 * @param {Object} props.progress - Overall progress statistics
 * @param {number} props.progress.completed - Number of completed lessons
 * @param {number} props.progress.total - Total number of lessons
 * @param {number} props.progress.percentage - Completion percentage (0-100)
 * @param {Function} props.onSelectLesson - Callback when lesson selected
 * @author SE_Team11
 * @version 1.0.0
 */

import React from 'react';
import { Check, Circle, Lock } from 'lucide-react';
import './AutismLearningPath.css';

/**
 * AutismLearningPath
 * ------------------
 * EPIC 4.3: Personalized Learning Path
 * EPIC 4.6: Adaptive Learning Progression
 * Displays lesson progression in a linear, predictable format
 */

const AutismLearningPath = ({ learningPath, progress, onSelectLesson }) => {
  if (!learningPath || learningPath.length === 0) {
    return null;
  }

  return (
    <div className="autism-learning-path">
      <div className="learning-path-header">
        <h3>Your Learning Path</h3>
        <div className="progress-indicator">
          <div className="progress-text">
            {progress.completed} of {progress.total} completed
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="learning-path-timeline">
        {learningPath.map((lesson, index) => {
          const isLocked = index > 0 && !learningPath[index - 1].isCompleted;
          const canSelect = !isLocked;

          return (
            <div 
              key={lesson.id} 
              className={`lesson-step ${lesson.isCompleted ? 'completed' : ''} ${lesson.isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => canSelect && onSelectLesson(lesson.id)}
              style={{ cursor: canSelect ? 'pointer' : 'not-allowed' }}
            >
              <div className="lesson-step-icon">
                {lesson.isCompleted && <Check size={20} />}
                {lesson.isCurrent && !lesson.isCompleted && <Circle size={20} />}
                {isLocked && <Lock size={20} />}
              </div>

              <div className="lesson-step-content">
                <h4>{lesson.title}</h4>
                <p className="lesson-language">{lesson.language}</p>
                
                {lesson.isCompleted && lesson.score !== undefined && (
                  <div className="lesson-score">
                    Score: {lesson.score}%
                  </div>
                )}

                {lesson.difficultyLevel && lesson.isCompleted && (
                  <div className="lesson-difficulty">
                    Level: <span className={`difficulty-${lesson.difficultyLevel}`}>
                      {lesson.difficultyLevel}
                    </span>
                  </div>
                )}

                {lesson.needsPractice && (
                  <div className="lesson-needs-practice">
                    ⚠️ Needs practice
                  </div>
                )}

                {lesson.isCurrent && !lesson.isCompleted && (
                  <div className="lesson-current-badge">
                    ← Start here
                  </div>
                )}

                {isLocked && (
                  <div className="lesson-locked-message">
                    Complete previous lesson first
                  </div>
                )}
              </div>

              {index < learningPath.length - 1 && (
                <div className="lesson-connector"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AutismLearningPath;
