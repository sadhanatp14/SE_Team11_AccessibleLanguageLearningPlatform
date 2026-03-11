/**
 * NextLessonCard Component
 * 
 * Prominent recommendation interface that displays the optimal next lesson
 * for learners, implementing intelligent recommendation UX patterns.
 * 
 * Core Features:
 * 
 * 1. Single Lesson Recommendation:
 *    - Displays one recommended lesson at a time
 *    - Reduces decision fatigue
 *    - Guides learning progression
 *    - Positioned prominently above lesson grid
 * 
 * 2. Recommendation Context:
 *    - Human-readable reason for suggestion
 *    - Progress context (X of Y completed)
 *    - Visual progress indicators
 *    - Clear next-step guidance
 * 
 * 3. Syllable Mode Support (Dyslexia):
 *    - Conditional syllable-split text display
 *    - Toggles between normal and split text
 *    - Maintains readability for dyslexic learners
 * 
 * 4. User Actions:
 *    - Accept: Navigate to recommended lesson immediately
 *    - Skip: Hide recommendation for session, keep manual selection
 *    - No pressure decision-making
 *    - Preserves user autonomy
 * 
 * 5. Completion State:
 *    - Special display when all lessons completed
 *    - Celebratory message
 *    - Encouragement messaging
 *    - Achievement acknowledgment
 * 
 * 6. Visual Design:
 *    - Card-based layout
 *    - High visibility positioning
 *    - Icon-supported actions
 *    - Progress visualization
 *    - Clear call-to-action buttons
 * 
 * Design Rationale:
 * - Single card (not list) simplifies decision-making
 * - Accept button provides immediate action
 * - Skip option respects user choice
 * - Lessons grid remains available for manual selection
 * - Session-scoped skip (doesn't affect progress)
 * 
 * Props Structure:
 * - recommendation: { title, titleSyllables, description, id, ... }
 * - reason: Context string ("You finished X. Up next:")
 * - completedCount/totalLessons: Progress tracking
 * - syllableMode: Boolean for text splitting
 * - onAccept/onSkip: Action callbacks
 * - allCompleted: Boolean for completion state
 * - completionMsg: Message when all done
 * 
 * Related Features:
 * - Next lesson service
 * - Progress tracking
 * - Dyslexia support
 * - Intelligent recommendations
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.recommendation - Recommended lesson object
 * @param {string} props.reason - Human-readable recommendation context
 * @param {number} props.completedCount - Number of completed lessons
 * @param {number} props.totalLessons - Total available lessons
 * @param {boolean} props.syllableMode - Whether to show syllable-split text
 * @param {Function} props.onAccept - Callback when "Start This Lesson" clicked
 * @param {Function} props.onSkip - Callback when "Skip" clicked
 * @param {boolean} props.allCompleted - True when all lessons completed
 * @param {string} props.completionMsg - Message shown on full completion
 * @author SE_Team11
 * @version 1.0.0
 */

/**
 * NextLessonCard.js
 *
 * Prominent recommendation card that displays the single best next lesson
 * for the learner. Placed above the lessons grid so it's the first thing
 * the user sees.
 *
 * Props:
 *   recommendation  – lesson object ({ title, titleSyllables, description, … })
 *   reason          – human-readable context string ("You finished X. Up next:")
 *   completedCount  – number of lessons already completed
 *   totalLessons    – total available lessons
 *   syllableMode    – whether to show syllable-split text
 *   onAccept        – callback when user clicks "Start This Lesson"
 *   onSkip          – callback when user clicks "Skip"
 *   allCompleted    – true when every lesson has been completed
 *   completionMsg   – message shown when all lessons are done
 *
 * Design rationale:
 * - Single prominent card (not a list) keeps the decision simple.
 * - Accept = navigate to the lesson page immediately.
 * - Skip = hide the card for the session; the lessons grid remains
 *   available for manual selection without affecting progress.
 */

import React from 'react';
import { ArrowRight, CheckCircle2, SkipForward, Sparkles } from 'lucide-react';
import './NextLessonCard.css';

const NextLessonCard = ({
  recommendation,
  reason,
  completedCount,
  totalLessons,
  syllableMode,
  onAccept,
  onSkip,
  allCompleted,
  completionMsg,
}) => {
  // All lessons completed – show a celebratory message
  if (allCompleted) {
    return (
      <div className="next-lesson-card next-lesson-card--completed" role="region" aria-label="All lessons completed">
        <div className="nlc-icon nlc-icon--done">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
        <div className="nlc-body">
          <h3 className="nlc-title">🎉 {completionMsg || 'All Lessons Completed!'}</h3>
          <p className="nlc-subtitle">
            You've finished all {totalLessons} lessons. Revisit any lesson below to practise.
          </p>
        </div>
      </div>
    );
  }

  // No recommendation available (e.g. no lessons in the system)
  if (!recommendation) return null;

  const title = syllableMode && recommendation.titleSyllables
    ? recommendation.titleSyllables
    : recommendation.title;

  const description = syllableMode && recommendation.descriptionSyllables
    ? recommendation.descriptionSyllables
    : recommendation.description;

  const progressText = `Lesson ${recommendation.position} of ${totalLessons}`;

  return (
    <div className="next-lesson-card" role="region" aria-label="Recommended next lesson">
      <div className="nlc-icon">
        <Sparkles size={28} aria-hidden="true" />
      </div>

      <div className="nlc-body">
        <p className="nlc-reason">{reason}</p>
        <h3 className="nlc-title">{title}</h3>
        <p className="nlc-description">{description}</p>

        <div className="nlc-meta">
          <span className="nlc-progress-pill">{progressText}</span>
          <span className="nlc-completed-count">
            {completedCount} of {totalLessons} completed
          </span>
        </div>
      </div>

      <div className="nlc-actions">
        <button
          type="button"
          className="nlc-btn nlc-btn--accept"
          onClick={() => onAccept(recommendation)}
          aria-label={`Start lesson: ${recommendation.title}`}
        >
          <span>Start This Lesson</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="nlc-btn nlc-btn--skip"
          onClick={() => onSkip(recommendation)}
          aria-label="Skip recommendation and choose manually"
        >
          <SkipForward size={16} aria-hidden="true" />
          <span>Skip</span>
        </button>
      </div>
    </div>
  );
};

export default NextLessonCard;
