/**
 * LessonLayout Component
 * 
 * Consistent lesson shell providing a stable, predictable layout for all
 * lesson views, implementing EPIC 2.7 (Lesson Container Layout).
 * 
 * Core Features (EPIC 2.7.1-2.7.4):
 * 
 * 1. Stable Layout Structure:
 *    - Fixed header with title and navigation
 *    - Scrollable main content area
 *    - Guidance section with live updates
 *    - Fixed footer for actions/progress
 * 
 * 2. Header Region:
 *    - Lesson eyebrow label
 *    - Main title display
 *    - Optional subtitle
 *    - Back navigation button
 *    - Consistent positioning
 * 
 * 3. Content Area:
 *    - Flexible main content slot
 *    - Accepts any child components
 *    - Role="main" for accessibility
 *    - Scrollable for long content
 * 
 * 4. Guidance Section:
 *    - aria-live region for dynamic hints
 *    - Screen reader accessible updates
 *    - Positioned for easy reference
 *    - Non-intrusive help area
 * 
 * 5. Footer Region:
 *    - Action buttons
 *    - Progress indicators
 *    - Navigation controls
 *    - Fixed position for consistency
 * 
 * 6. Accessibility:
 *    - Semantic HTML roles (region, banner, main)
 *    - ARIA labels for regions
 *    - aria-live for dynamic content
 *    - Keyboard navigation support
 *    - Localized text via i18n
 * 
 * Layout Rationale:
 * - Predictable structure reduces cognitive load
 * - Fixed regions prevent layout shifts
 * - Consistent navigation placement
 * - Supports all learning conditions
 * 
 * @component
 * @param {Object} props
 * @param {string} props.title - Lesson title
 * @param {string} [props.subtitle] - Optional subtitle
 * @param {React.ReactNode} props.children - Main content
 * @param {React.ReactNode} [props.guidance] - Guidance/hint content
 * @param {React.ReactNode} [props.footer] - Footer content
 * @param {Function} [props.onBack] - Back navigation callback
 * @param {string} [props.backLabel='Back'] - Back button label
 * @author SE_Team11
 * @version 1.0.0
 */

import React from 'react';
import './LessonLayout.css';
import { useI18n } from '../../utils/i18n';

const LessonLayout = ({ title, subtitle, children, guidance, footer, onBack, backLabel = 'Back' }) => {
  const { t } = useI18n();
  return (
    // EPIC 2.7.1-2.7.4: Consistent lesson shell supports stable layout, fixed regions, and predictable transitions.
    <div className="lesson-layout" role="region" aria-label={t('lessons.lessonLayoutAria')}>
      <header className="lesson-layout__header" role="banner">
        <div className="lesson-layout__header-inner">
          <div className="lesson-layout__header-top">
            <div className="lesson-layout__header-left">
              <p className="lesson-layout__eyebrow">{t('lessons.lesson')}</p>
            </div>
            {onBack && (
              <button
                type="button"
                className="lesson-layout__back fx-pressable fx-focus"
                onClick={onBack}
              >
                ← {backLabel}
              </button>
            )}
          </div>
          <h1 className="lesson-layout__title">{title}</h1>
          {subtitle && <p className="lesson-layout__subtitle">{subtitle}</p>}
        </div>
      </header>

      <main className="lesson-layout__main" role="main">
        {children}
      </main>

      <section className="lesson-layout__guidance" aria-live="polite">
        {guidance}
      </section>

      <footer className="lesson-layout__footer" role="contentinfo">
        {footer}
      </footer>
    </div>
  );
};

export default LessonLayout;
