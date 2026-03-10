/**
 * LessonPage.js
 *
 * Responsible for loading and displaying a single lesson based on the URL
 * parameter `:lessonId`. It supports two data sources:
 *   1. Backend API – fetches lesson data via `getLessonById`
 *   2. Local sample lessons – used as a fallback when the backend is
 *      unreachable or when the lessonId is not a valid MongoDB ObjectId
 *
 * The component manages loading / error / retry states and delegates
 * the actual step-by-step lesson UI to the <LessonReplay> child component.
 * User preferences (font size, colour theme, motion, etc.) are applied
 * to the container on every render via the PreferencesContext.
 *
 * Related EPICs:
 *  - EPIC 6.5.1: Load lesson content from backend correctly
 *  - EPIC 6.5.2: Show a loading state while the lesson loads
 *  - EPIC 6.5.3: Friendly error message when lesson fails to load
 *  - EPIC 6.5.4: Provide a retry action to re-attempt loading
 *  - EPIC 2.7.1-2.7.4: Preference-driven lesson container layout
 *  - EPIC 2.2.1-2.2.4, 2.6.1-2.6.4: Step-by-step flow + replay
 */

// React core and hooks
import React, { useEffect, useMemo, useState } from 'react';
// useParams extracts the :lessonId from the URL; useNavigate for programmatic routing
import { useNavigate, useParams } from 'react-router-dom';
// Service function that calls the backend GET /api/lessons/:id endpoint
import { getLessonById, getLessonByIdWithContentLang } from '../../services/lessonService';
import { useAuth } from '../../context/AuthContext';
// Preferences context – provides user preferences and a function to apply them to the DOM
import { usePreferences } from '../../context/PreferencesContext';
// Child component that renders the interactive, step-by-step lesson replay UI
import LessonReplay from './LessonReplay';
// Static sample lesson data used as a reliable fallback when the backend is unavailable
import lessonSamples from './lessonSamples';
// Component-specific styles
import './LessonPage.css';
// Dyslexia utilities: get syllable-split lesson title and context hook
import { getDyslexiaLessonTitle, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';
import { useI18n } from '../../utils/i18n';
import { resolveUiLanguageFromPreferences } from '../../utils/languagePrefs';
import { localizeLessonPayload } from '../../utils/lessonI18n';

/**
 * Estimate reading time (in minutes) from raw text content.
 * Uses a conservative rate of 160 words-per-minute, which accounts for
 * learners who may need extra time. Returns a minimum of 1 minute.
 *
 * @param {string|null} text - The plain-text content of the lesson.
 * @returns {number} Estimated reading time in minutes (≥ 1).
 */
const estimateReadingTime = (text) => {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 160));
};

/**
 * LessonPage – Functional component that orchestrates loading, error handling,
 * preference application, and rendering of a single lesson.
 */
const LessonPage = () => {
  // Extract the :lessonId route parameter (e.g. "lesson-greetings" or a MongoDB ObjectId)
  const { lessonId } = useParams();

  // React Router hook for programmatic navigation (back, dashboard, progress)
  const navigate = useNavigate();

  // Current authenticated user from AuthContext
  const { user } = useAuth();

  // User display/accessibility preferences and the function to apply them to the DOM
  const { preferences, applyPreferences } = usePreferences();
  const { t } = useI18n();
  const uiLanguage = resolveUiLanguageFromPreferences(preferences);
  const contentLanguage = useMemo(() => {
    const condition = String(user?.learningCondition || '').toLowerCase();
    if (condition === 'dyslexia' || condition === 'adhd') return 'english';
    return uiLanguage;
  }, [uiLanguage, user?.learningCondition]);
  // ----- Component State -----
  // The fully loaded lesson object (from API or local samples)
  const [lesson, setLesson] = useState(null);
  // True while the lesson data is being fetched
  const [isLoading, setIsLoading] = useState(true);
  // Holds a user-facing error/notice string when loading fails
  const [error, setError] = useState('');
  // Used to trigger reloads
  const [retryKey, setRetryKey] = useState(0);

  /**
   * A MongoDB ObjectId is a 24-character hex string. If the lessonId does NOT
   * match that pattern, it is treated as a "local" lesson (e.g. "lesson-greetings")
   * which can be resolved from the static lessonSamples dictionary.
   */
  const isLocalLessonId = useMemo(() => {
    return lessonId ? !/^[a-fA-F0-9]{24}$/.test(lessonId) : false;
  }, [lessonId]);

  // Boolean flag: true when the lesson can be fully served from local sample data
  const isSample = Boolean(isLocalLessonId && lessonSamples[lessonId]);

  /**
   * Primary data-loading effect.
   * Runs whenever the lessonId changes, when we determine whether it's local,
   * or when the user clicks "Retry" (which increments retryKey).
   *
   * Flow:
   *  1. If the lesson matches a local sample → use it immediately (no network call).
   *  2. Otherwise call the backend API via getLessonById().
   *  3. On API failure, fall back to a local sample if one exists, or show an error.
   *
   * The `isMounted` flag prevents state updates after the component unmounts
   * (e.g. if the user navigates away while the fetch is in progress).
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isMounted = true;

    const loadLesson = async () => {
      // EPIC 6.5.2: Reset state and show spinner while loading
      setIsLoading(true);
      setError('');
      try {
        // --- Path A: Local/sample lesson (no network required) ---
        if (isLocalLessonId && lessonSamples[lessonId]) {
          if (isMounted) {
            setLesson(localizeLessonPayload(lessonSamples[lessonId], uiLanguage, contentLanguage));
            setIsLoading(false);
          }
          return;
        }

        // --- Path B: Fetch lesson from backend API ---
        // EPIC 6.5.1: Load lesson content from backend correctly.
        const data = contentLanguage && contentLanguage !== uiLanguage
          ? await getLessonByIdWithContentLang(lessonId, uiLanguage, contentLanguage)
          : await getLessonById(lessonId, uiLanguage);
        if (isMounted) {
          setLesson(data);
        }
      } catch (loadError) {
        if (isMounted) {
          // Graceful degradation: fall back to a sample if available
          if (lessonSamples[lessonId]) {
            setLesson(localizeLessonPayload(lessonSamples[lessonId], uiLanguage, contentLanguage));
            setError(t('lessons.liveUnavailableSample'));
          } else {
            // EPIC 6.5.3: Friendly, non-technical error message for the user.
            setError(t('lessons.unableToLoad'));
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLesson();

    // Cleanup: mark as unmounted to prevent stale state updates
    return () => {
      isMounted = false;
    };
  }, [lessonId, isLocalLessonId, retryKey, t, uiLanguage, contentLanguage]);

  /**
   * EPIC 6.5.4: Retry handler – increments retryKey which is listed as a
   * dependency of the loadLesson effect, causing it to re-execute.
   */
  const retryLoadLesson = () => setRetryKey((k) => k + 1);

  /**
   * Navigate the user back to the previous page in the browser history.
   * If there is no history (e.g. the page was opened via a direct link),
   * fall back to the main dashboard route.
   */
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };


  /**
   * Apply user preferences (font size, colour scheme, motion settings, etc.)
   * to the lesson container element whenever preferences change.
   * EPIC 2.7.1-2.7.4: Consistent, preference-driven layout.
   */
  useEffect(() => {
    if (!preferences) return;
    applyPreferences(preferences, {
      containerId: 'learning-container',
      baseClass: 'lesson-page motion-enabled',
    });
  }, [preferences, applyPreferences]);

  // ----- Derived display values -----
  // Estimated reading time shown in the lesson subtitle
  const readingTime = estimateReadingTime(lesson?.textContent);
  // Number of interactive steps (quizzes, fill-in-the-blank, etc.) in the lesson
  const interactionCount = lesson?.interactions?.length || 0;
  // The user's learning condition string (e.g. "dyslexia", "adhd", "autism")
  const condition = user?.learningCondition || '';
  // Dyslexia context hook – determines whether syllable mode should be applied
  const dyslexia = useDyslexiaContext({ condition, lessonId, defaultSyllableMode: true });
  // Resolve the lesson title – use syllable-split version for dyslexic users
  const baseTitle = lesson?.title || (isLoading ? t('lessons.loadingLesson') : t('lessons.lesson'));
  const resolvedTitle = dyslexia.applySyllables ? getDyslexiaLessonTitle(lessonId, baseTitle) : baseTitle;
  // Build a human-readable subtitle with reading time and interaction count
  const resolvedSubtitle = isLoading
    ? t('lessons.preparingSteps')
    : `About ${readingTime} min • ${interactionCount} interactions`;

  /**
   * Called by LessonReplay when the user finishes all sessions in a lesson.
   * Redirects the user to the progress page so they can see their
   * updated scores, streaks, and overall progress.
   */
  const handleLessonComplete = () => {
    navigate('/progress');
  };

  return (
    <div
      className="lesson-page"
      id="learning-container"
      /* data attribute used by CSS and analytics to scope condition-specific styles */
      data-user-condition={user?.learningCondition || ''}
    >
      {/*
        LessonReplay handles the interactive lesson flow:
        - step-by-step interactions (EPIC 2.2.1-2.2.4)
        - replay capability (EPIC 2.6.1-2.6.4)
        - consistent layout and navigation (EPIC 2.7.1-2.7.4)
      */}
      <LessonReplay
        lessonId={lessonId}       /* Unique lesson identifier */
        isSample={isSample}       /* Whether this is a local sample lesson */
        lessonTitle={resolvedTitle}
        lessonSubtitle={resolvedSubtitle}
        notice={error}            /* Error/fallback notice banner text */
        onRetry={retryLoadLesson} /* Retry callback wired to retryKey */
        onExit={handleBack}       /* Back/exit navigation handler */
        onComplete={handleLessonComplete} /* Post-completion redirect */
      />
    </div>
  );
};

// Export LessonPage as the default export for use in the router
export default LessonPage;
