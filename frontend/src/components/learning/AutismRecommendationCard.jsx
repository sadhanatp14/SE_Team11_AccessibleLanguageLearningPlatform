/**
 * AutismRecommendationCard Component
 * 
 * AI-powered lesson recommendation interface for autism learners,
 * implementing EPIC 4.2 (Personalized Next Lesson Recommendation).
 * 
 * Core Features:
 * 
 * 1. Intelligent Recommendations (EPIC 4.2):
 *    - AI-analyzed next lesson suggestions
 *    - Performance-based recommendations
 *    - Personalized learning path guidance
 *    - Review recommendations for mastery
 * 
 * 2. Recommendation Display:
 *    - Lesson title and language
 *    - Reason for recommendation (AI-generated)
 *    - Visual indicators (star for review, book for new)
 *    - Completion status
 *    - Clear call-to-action buttons
 * 
 * 3. User Actions:
 *    - Start recommended lesson
 *    - Skip to explore other options
 *    - Review completed lessons
 *    - Custom lesson selection
 * 
 * 4. Completion State:
 *    - Special UI for all lessons completed
 *    - Congratulatory message
 *    - Encouragement to review
 *    - Celebration emoji
 * 
 * 5. Visual Design:
 *    - Predictable layout for autism support
 *    - Clear visual hierarchy
 *    - Consistent icon usage
 *    - High-contrast elements
 *    - Minimal distractions
 * 
 * Recommendation Types:
 * - Next lesson: Based on sequential progression
 * - Review: Reinforcement of previous material
 * - Challenge: Slightly above current level
 * - Foundation: Strengthen weak areas
 * 
 * Related EPICs:
 * - EPIC 4: Personalized Learning Engine
 * - EPIC 4.2: AI-powered lesson recommendations
 * - EPIC 4.4: Performance analytics
 * 
 * @component
 * @param {Object} props
 * @param {Object|null} props.recommendation - Recommendation data from AI engine
 * @param {string} props.recommendation.lessonId - ID of recommended lesson
 * @param {string} props.recommendation.title - Lesson title
 * @param {string} props.recommendation.language - Lesson language
 * @param {string} props.recommendation.reason - AI-generated explanation
 * @param {boolean} props.recommendation.isCompleted - If lesson was completed before
 * @param {Function} props.onStart - Callback to start recommended lesson
 * @param {Function} props.onSkip - Callback to skip recommendation
 * @author SE_Team11
 * @version 1.0.0
 */

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
