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
