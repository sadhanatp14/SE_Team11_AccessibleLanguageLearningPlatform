/**
 * LessonNav.js
 *
 * Three-button navigation bar rendered in the footer of every lesson step.
 * Provides Back, Replay, and Next (or "Finish") controls in fixed positions.
 *
 * Related EPICs:
 *  - EPIC 2.2.3: Manual step navigation via next/back buttons.
 *  - EPIC 2.6.1-2.6.4: One-tap replay entry and replay navigation.
 *  - EPIC 2.7.2: Buttons kept in fixed, predictable positions for consistency.
 */
import React from 'react';
import './LessonNav.css';

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useI18n } from '../../utils/i18n';

/**
 * LessonNav – Lesson footer navigation bar.
 *
 * @param {Function} onBack    - Navigate to the previous section.
 * @param {Function} onNext    - Navigate to the next section or finish the lesson.
 * @param {Function} onReplay  - Toggle replay mode for the current section.
 * @param {boolean}  canGoBack - Whether the Back button should be enabled.
 * @param {boolean}  canGoNext - Whether the Next/Finish button should be enabled.
 * @param {boolean}  canReplay - Whether the Replay button should be enabled.
 * @param {boolean}  isReplay  - True when the user is in replay mode (styles button as active).
 * @param {string}   nextLabel - Label override for the Next button (e.g. "Finish").
 */
const LessonNav = ({
  onBack,
  onNext,
  onReplay,
  canGoBack,
  canGoNext,
  canReplay,
  isReplay,
  nextLabel,
}) => {
  const { t } = useI18n();
  const resolvedNextLabel = nextLabel || t('lessons.next');
  return (
    // EPIC 2.6.1-2.6.4, 2.7.2: Consistent navigation with explicit replay control and fixed button positions.
    <div className="lesson-nav" role="navigation" aria-label={t('lessons.lessonNavigationAria')}>
      <button
        type="button"
        className="lesson-nav__button lesson-nav__button--back fx-pressable fx-focus"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label={t('lessons.previousStepAria')}
      >
        <ChevronLeft size={18} />
        <span>{t('lessons.prev')}</span>
      </button>
      <button
        type="button"
        className={`lesson-nav__button lesson-nav__button--replay fx-pressable fx-focus${isReplay ? ' is-active' : ''}`}
        onClick={onReplay}
        aria-pressed={isReplay}
        disabled={!canReplay && !isReplay}
        aria-label={t('lessons.replayCurrentSectionAria')}
      >
        <RotateCcw size={18} />
        <span>{t('lessons.replay')}</span>
      </button>
      <button
        type="button"
        className="lesson-nav__button lesson-nav__button--next fx-pressable fx-focus"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label={resolvedNextLabel}
      >
        <span>{resolvedNextLabel}</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default LessonNav;
