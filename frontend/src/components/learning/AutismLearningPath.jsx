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
