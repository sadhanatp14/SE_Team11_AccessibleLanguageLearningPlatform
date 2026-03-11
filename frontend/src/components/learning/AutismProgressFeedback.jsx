/**
 * AutismProgressFeedback Component
 * 
 * Motivational feedback and practice suggestion interface for autism learners,
 * implementing EPIC 4.4 (Practice Suggestions) and EPIC 4.5 (Motivational Reinforcement).
 * 
 * Core Features:
 * 
 * 1. Motivational Reinforcement (EPIC 4.5):
 *    - Positive achievement messages
 *    - Progress acknowledgment
 *    - Effort recognition
 *    - Visual achievement badges (⭐ 📈 💪)
 *    - Streak tracking and celebration
 * 
 * 2. Practice Suggestions (EPIC 4.4):
 *    - AI-identified areas needing reinforcement
 *    - Specific topics for extra practice
 *    - Reasoning for practice recommendations
 *    - Actionable practice buttons
 * 
 * 3. Achievement Badges:
 *    - Star (⭐): Outstanding performance
 *    - Progress (📈): Improvement shown
 *    - Effort (💪): Persistence acknowledged
 *    - Visual emotional feedback
 * 
 * 4. Streak System:
 *    - Daily learning streak counter
 *    - Fire emoji visual (🔥)
 *    - Encouragement for consistency
 *    - Habit-building support
 * 
 * 5. User Actions:
 *    - Start extra practice immediately
 *    - Continue to next recommended lesson
 *    - Acknowledge motivation
 *    - Skip practice (optional)
 * 
 * 6. Predictable Design (Autism-Specific):
 *    - Clear visual sections
 *    - Consistent layout structure
 *    - No unexpected animations
 *    - High-contrast text
 *    - Simple, direct language
 * 
 * Motivation Types:
 * - Achievement: Task completion success
 * - Progress: Improvement over time
 * - Effort: Recognition of attempts
 * - Streak: Consistency reward
 * 
 * Practice Suggestion Logic:
 * - Triggered by below-threshold performance
 * - Focuses on specific topics
 * - Provides reasoning
 * - Optional but encouraged
 * 
 * Related EPICs:
 * - EPIC 4: Personalized Learning Engine
 * - EPIC 4.4: Extra practice suggestions
 * - EPIC 4.5: Motivation through reinforcement
 * - EPIC 4.6: Progress tracking insights
 * 
 * @component
 * @param {Object} props
 * @param {Object|null} props.motivation - Motivational message data
 * @param {string} props.motivation.message - Encouraging message text
 * @param {string} props.motivation.achievementBadge - Badge type (star, progress, effort)
 * @param {number} props.motivation.streak - Consecutive learning days
 * @param {Object|null} props.practiceSuggestion - Practice recommendation data
 * @param {boolean} props.practiceSuggestion.shouldPractice - Whether practice recommended
 * @param {string} props.practiceSuggestion.topic - Area needing practice
 * @param {string} props.practiceSuggestion.reason - Why practice is suggested
 * @param {Function} props.onPractice - Callback to start practice session
 * @param {Function} props.onContinue - Callback to skip and continue
 * @author SE_Team11
 * @version 1.0.0
 */

import React from 'react';
import { RotateCcw, CheckCircle } from 'lucide-react';
import './AutismProgressFeedback.css';

/**
 * AutismProgressFeedback
 * ----------------------
 * EPIC 4.4: Extra Practice Suggestions
 * EPIC 4.5: Motivation Through Reinforcement
 * Displays practice suggestions and motivational messages
 */

const AutismProgressFeedback = ({ 
  motivation, 
  practiceSuggestion, 
  onPractice, 
  onContinue 
}) => {
  if (!motivation && !practiceSuggestion) {
    return null;
  }

  const showPractice = practiceSuggestion?.shouldPractice;

  return (
    <div className="autism-progress-feedback">
      {/* EPIC 4.5: Motivational Message */}
      {motivation && (
        <div className="motivation-section">
          <div className="motivation-badge">
            {motivation.achievementBadge === 'star' && '⭐'}
            {motivation.achievementBadge === 'progress' && '📈'}
            {motivation.achievementBadge === 'effort' && '💪'}
          </div>
          <h3 className="motivation-message">{motivation.message}</h3>
          {motivation.streak > 0 && (
            <p className="motivation-stats">
              🔥 {motivation.streak} day streak!
            </p>
          )}
          {motivation.averageScore > 0 && (
            <p className="motivation-stats">
              Average Score: {motivation.averageScore}%
            </p>
          )}
        </div>
      )}

      {/* EPIC 4.4: Practice Suggestion */}
      {showPractice && (
        <div className="practice-suggestion">
          <div className="practice-icon">
            <RotateCcw size={24} />
          </div>
          <div className="practice-content">
            <h4>{practiceSuggestion.message}</h4>
            {practiceSuggestion.practice && (
              <>
                <h5>{practiceSuggestion.practice.title}</h5>
                <p className="practice-description">
                  {practiceSuggestion.practice.description}
                </p>
                <ul className="practice-steps">
                  {practiceSuggestion.practice.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </>
            )}
            {practiceSuggestion.score !== undefined && (
              <p className="practice-score">
                Recent Score: {practiceSuggestion.score}%
              </p>
            )}
          </div>
          <div className="practice-actions">
            <button onClick={onPractice} className="btn-practice">
              <RotateCcw size={18} />
              <span>Practice Again</span>
            </button>
            <button onClick={onContinue} className="btn-continue">
              <CheckCircle size={18} />
              <span>Continue</span>
            </button>
          </div>
        </div>
      )}

      {/* No practice needed - positive reinforcement */}
      {!showPractice && practiceSuggestion && (
        <div className="no-practice-needed">
          <CheckCircle size={32} color="#4CAF50" />
          <p>{practiceSuggestion.message}</p>
        </div>
      )}
    </div>
  );
};

export default AutismProgressFeedback;
