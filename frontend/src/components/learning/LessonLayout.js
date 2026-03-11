import React from 'react';
import './LessonLayout.css';
import { useI18n } from '../../utils/i18n';
import { useAuth } from '../../context/AuthContext';
import SyllableModeToggle from '../common/SyllableModeToggle';

const LessonLayout = ({ title, subtitle, children, guidance, footer, onBack, backLabel = 'Back' }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const condition = String(user?.learningCondition || '').toLowerCase();
  return (
    // EPIC 2.7.1-2.7.4: Consistent lesson shell supports stable layout, fixed regions, and predictable transitions.
    <div className="lesson-layout" role="region" aria-label={t('lessons.lessonLayoutAria')}>
      <header className="lesson-layout__header" role="banner">
        <div className="lesson-layout__header-inner">
          <div className="lesson-layout__header-top">
            <div className="lesson-layout__header-left">
              <p className="lesson-layout__eyebrow">{t('lessons.lesson')}</p>
            </div>
            <div className="lesson-layout__header-actions">
              {condition === 'dyslexia' ? <SyllableModeToggle /> : null}
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
