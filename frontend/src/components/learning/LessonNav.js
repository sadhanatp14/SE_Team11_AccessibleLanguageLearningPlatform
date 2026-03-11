/**
 * LessonNav Component
 * 
 * Navigation control bar for lesson section navigation, implementing
 * EPIC 2.6 (Lesson Navigation) and EPIC 2.7.2 (Fixed Navigation Positions).
 * 
 * Core Features (EPIC 2.6.1-2.6.4):
 * 
 * 1. Section Navigation:
 *    - Previous/Back button with chevron icon
 *    - Next/Forward button with chevron icon
 *    - Replay/Review button with rotate icon
 *    - Consistent fixed positioning
 * 
 * 2. Navigation States:
 *    - canGoBack: Disables back on first section
 *    - canGoNext: Disables next when interactions incomplete
 *    - canReplay: Enables replay of completed sections
 *    - isReplay: Visual indicator for replay mode
 * 
 * 3. Accessibility:
 *    - role="navigation" for semantic HTML
 *    - ARIA labels for screen readers
 *    - Disabled state styling
 *    - Keyboard accessible buttons
 *    - Localized button labels
 * 
 * 4. Visual Design:
 *    - Icon + text button combination
 *    - Active state highlighting for replay
 *    - Pressable and focus visual effects
 *    - Responsive button sizing
 * 
 * Button Layout:
 * [← Previous] [↻ Replay] [Next →]
 * 
 * @component
 * @param {Object} props
 * @param {Function} props.onBack - Navigate to previous section
 * @param {Function} props.onNext - Navigate to next section
 * @param {Function} props.onReplay - Toggle replay mode
 * @param {boolean} props.canGoBack - Whether back navigation available
 * @param {boolean} props.canGoNext - Whether forward navigation available
 * @param {boolean} props.canReplay - Whether replay is available
 * @param {boolean} props.isReplay - Whether currently in replay mode
 * @param {string} [props.nextLabel] - Custom label for next button
 * @author SE_Team11
 * @version 1.0.0
 */

import React from 'react';
import './LessonNav.css';

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useI18n } from '../../utils/i18n';

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
