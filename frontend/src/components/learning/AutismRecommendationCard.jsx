import React from 'react';
import { ChevronRight, Star, BookOpen } from 'lucide-react';
import './AutismRecommendationCard.css';

/**
 * AutismRecommendationCard
 * ------------------------
 * EPIC 4.2: Next Lesson Recommendation
 * Displays personalized next lesson recommendation for autism learners
 */

const AutismRecommendationCard = ({ recommendation, onStart, onSkip }) => {
  if (!recommendation) {
    return (
      <div className="autism-recommendation-card completed">
        <div className="recommendation-icon">🎉</div>
        <h3>Congratulations!</h3>
        <p>You have mastered all available lessons!</p>
        <p className="recommendation-subtitle">Keep practicing to maintain your skills</p>
      </div>
    );
  }

  const { lessonId, title, language, reason, isCompleted } = recommendation;

  return (
    <div className="autism-recommendation-card">
      <div className="recommendation-header">
        <div className="recommendation-icon">
          {isCompleted ? <Star size={24} /> : <BookOpen size={24} />}
        </div>
        <div className="recommendation-title-section">
          <h3>
            {isCompleted ? 'Review Recommended' : 'Next Lesson'}
          </h3>
          <p className="recommendation-reason">{reason}</p>
        </div>
      </div>

      <div className="recommendation-content">
        <div className="lesson-details">
          <h4>{title}</h4>
          <p className="lesson-language">{language}</p>
          {isCompleted && (
            <span className="lesson-badge">Previously Completed</span>
          )}
        </div>
      </div>

      <div className="recommendation-actions">
        <button 
          onClick={() => onStart(lessonId)} 
          className="btn-start-recommended"
        >
          <span>{isCompleted ? 'Review Lesson' : 'Start Lesson'}</span>
          <ChevronRight size={18} />
        </button>
        <button 
          onClick={onSkip} 
          className="btn-skip-recommended"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

export default AutismRecommendationCard;
