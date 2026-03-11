/**
 * Dashboard Component
 * 
 * Central hub for the personalized learning experience, implementing:
 * - EPIC 1.4: Condition-specific learning interfaces (Dyslexia/ADHD/Autism)
 * - EPIC 1.7.3: Accessibility preference application
 * - Deep-linking support for direct lesson access
 * 
 * The Dashboard acts as a router that:
 * 1. Determines user's learning condition from preferences/profile
 * 2. Renders appropriate specialized view (DyslexiaView/ADHDView/AutismView)
 * 3. Applies accessibility CSS classes to container (themes, font size, motion)
 * 4. Handles deep-link navigation from other pages
 * 
 * Accessibility Features Applied:
 * - Contrast themes (high-contrast, dark, light)
 * - Font size adjustments (default, large, x-large)
 * - Motion preferences (enabled/reduced)
 * - Text spacing adjustments
 * - Dyslexia-friendly fonts
 * 
 * Deep-Link Support:
 * - Can receive state via React Router to open specific lessons
 * - Format: { openCondition: 'dyslexia', openLessonId: 2 }
 * - Automatically clears deep-link state after processing
 * 
 * @component
 * @requires context/AuthContext - User authentication state
 * @requires context/PreferencesContext - User accessibility preferences
 * @requires learning/DyslexiaView - Dyslexia-specific interface
 * @requires learning/ADHDView - ADHD-specific interface
 * @requires learning/AutismView - Autism-specific interface
 * @author SE_Team11
 * @version 2.0.0
 */

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
      {/* quick admin link if the logged-in user is an admin */}
      {user?.role === 'admin' && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <button
            onClick={() => navigate('/admin/users')}
            style={{ padding: '6px 12px', fontSize: '14px' }}
          >
            Admin Panel
          </button>
        </div>
      )}

      {renderLearningView()}
    </div>
  );
};

export default Dashboard;
