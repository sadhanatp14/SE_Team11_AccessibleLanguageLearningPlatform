import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import DyslexiaView from './learning/DyslexiaView';
import ADHDView from './learning/ADHDView';
import AutismView from './learning/AutismView';

/**
 * Dashboard
 * ---------
 * Single entry point for the learning experience.
 * Responsibilities:
 * - Choose the correct learning center view (Dyslexia/ADHD/Autism)
 * - Apply accessibility preferences as CSS classes *scoped* to the container
 * - Optionally honor deep-links (e.g. "open ADHD lesson 2") coming from other pages
 */
const Dashboard = () => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const containerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const deepLink = useMemo(() => {
    // Deep-link state is passed via react-router `navigate('/dashboard', { state })`.
    // We normalize to safe primitives so components can rely on the shape.
    const state = location?.state || {};
    const openCondition = typeof state.openCondition === 'string' ? state.openCondition : '';
    const openLessonIdRaw = state.openLessonId;
    const openLessonId = Number(openLessonIdRaw);
    return {
      openCondition,
      openLessonId: Number.isFinite(openLessonId) ? openLessonId : null,
      hasDeepLink: Number.isFinite(openLessonId) && !!openLessonIdRaw,
    };
  }, [location?.state]);

  // Consume and clear dashboard deep-link state so it doesn't re-trigger.
  useEffect(() => {
    // Avoid leaving one-time state in history; otherwise it could re-open a lesson
    // if the user navigates away/back.
    if (!deepLink.hasDeepLink) return;
    navigate('/dashboard', { replace: true, state: {} });
  }, [deepLink.hasDeepLink, navigate]);

  // Apply preferences to the learning container whenever preferences change
  useEffect(() => {
    if (!preferences || !containerRef.current) return;

    // EPIC 1.7.3: Apply stored accessibility preferences as scoped container classes
    const container = containerRef.current;

    // Reset classes (default = motion enabled)
    container.className = 'dashboard motion-enabled';

    // Apply theme
    if (preferences.contrastTheme && preferences.contrastTheme !== 'default') {
      container.classList.add(`theme-${preferences.contrastTheme}`);
    }

    // Apply font family
    if (preferences.fontFamily && preferences.fontFamily !== 'default') {
      container.classList.add(`font-${preferences.fontFamily}`);
    }

    // Apply font size
    if (preferences.fontSize) {
      container.classList.add(`font-${preferences.fontSize}`);
    }

    // Apply letter spacing
    if (preferences.letterSpacing) {
      container.classList.add(`letter-spacing-${preferences.letterSpacing}`);
    }

    // Apply word spacing
    if (preferences.wordSpacing) {
      container.classList.add(`word-spacing-${preferences.wordSpacing}`);
    }

    // Apply line height
    if (preferences.lineHeight) {
      container.classList.add(`line-height-${preferences.lineHeight}`);
    }

    // Apply distraction-free mode (Autism + ADHD)
    const supportsDistractionFree = user?.learningCondition === 'autism' || user?.learningCondition === 'adhd';
    if (preferences.distractionFreeMode && supportsDistractionFree) {
      container.classList.add('distraction-free');
    }

    // Apply reduced animations (only meaningful when distraction-free is on)
    if (preferences.reduceAnimations && preferences.distractionFreeMode && supportsDistractionFree) {
      container.classList.add('reduce-animations');
    }
  }, [preferences, user?.learningCondition]);

  // Render the appropriate learning view based on user's condition
  const renderLearningView = () => {
    // EPIC 1.4 / 1.5 / 1.6: Route learners to condition-specific learning experiences
    switch (user?.learningCondition) {
      case 'dyslexia':
        return <DyslexiaView />;
      case 'adhd':
        return (
          <ADHDView
            // Only provide the deep-link when the condition matches; otherwise ignore.
            initialLessonId={deepLink.openCondition === 'adhd' ? deepLink.openLessonId : null}
          />
        );
      case 'autism':
        return (
          <AutismView
            // Only provide the deep-link when the condition matches; otherwise ignore.
            initialLessonId={deepLink.openCondition === 'autism' ? deepLink.openLessonId : null}
          />
        );
      default:
        return <DyslexiaView />; // Default view
    }
  };

  return (
    <div
      ref={containerRef}
      className="dashboard"
      id="learning-container"
      data-user-condition={user?.learningCondition || ''}
    >
      {renderLearningView()}
    </div>
  );
};

export default Dashboard;
