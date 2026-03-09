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
import { useI18n } from '../../utils/i18n';
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
  variant,
}) => {
  const { t } = useI18n();
  const variantClass = variant ? ` next-lesson-card--${variant}` : '';

  // All lessons completed – show a celebratory message
  if (allCompleted) {
    return (
      <div className={`next-lesson-card next-lesson-card--completed${variantClass}`} role="region" aria-label={t('learning.nextLesson.allCompletedAria')}>
        <div className="nlc-icon nlc-icon--done">
          <CheckCircle2 size={32} aria-hidden="true" />
        </div>
        <div className="nlc-body">
          <h3 className="nlc-title">🎉 {completionMsg || t('learning.nextLesson.allCompletedTitle')}</h3>
          <p className="nlc-subtitle">
            {t('learning.nextLesson.allCompletedSubtitle', { total: totalLessons })}
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

  const progressText = t('learning.nextLesson.progress', { position: recommendation.position, total: totalLessons });

  return (
    <div className={`next-lesson-card${variantClass}`} role="region" aria-label={t('learning.nextLesson.recommendedAria')}>
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
          aria-label={t('learning.nextLesson.startAria', { title: recommendation.title })}
        >
          <span>{t('learning.nextLesson.startThisLesson')}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="nlc-btn nlc-btn--skip"
          onClick={() => onSkip(recommendation)}
          aria-label={t('learning.nextLesson.skipAria')}
        >
          <SkipForward size={16} aria-hidden="true" />
          <span>{t('learning.nextLesson.skip')}</span>
        </button>
      </div>
    </div>
  );
};

export default NextLessonCard;
