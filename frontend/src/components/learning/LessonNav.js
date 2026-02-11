import React from 'react';
import './LessonNav.css';

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

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
  const resolvedNextLabel = nextLabel || 'Next';
  return (
    // EPIC 2.6.1-2.6.4, 2.7.2: Consistent navigation with explicit replay control and fixed button positions.
    <div className="lesson-nav" role="navigation" aria-label="Lesson navigation">
      <button
        type="button"
        className="lesson-nav__button lesson-nav__button--back fx-pressable fx-focus"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Previous step"
      >
        <ChevronLeft size={18} />
        <span>Prev</span>
      </button>
      <button
        type="button"
        className={`lesson-nav__button lesson-nav__button--replay fx-pressable fx-focus${isReplay ? ' is-active' : ''}`}
        onClick={onReplay}
        aria-pressed={isReplay}
        disabled={!canReplay && !isReplay}
        aria-label="Replay current section"
      >
        <RotateCcw size={18} />
        <span>Replay</span>
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
