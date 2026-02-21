
// LessonPage: Loads and displays a single lesson, handling loading state, errors, and sample fallback.
// Integrates with backend and local lesson samples for reliability.
// Shows lesson content using LessonReplay and applies user preferences.
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLessonById, getLessonByIdWithContentLang } from '../../services/lessonService';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import LessonReplay from './LessonReplay';
import lessonSamples from './lessonSamples';
import './LessonPage.css';
import { getDyslexiaLessonTitle, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';
import { useI18n } from '../../utils/i18n';
import { resolveUiLanguageFromPreferences } from '../../utils/languagePrefs';
import { localizeLessonPayload } from '../../utils/lessonI18n';


// Helper to estimate reading time for a lesson based on word count
const estimateReadingTime = (text) => {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 160));
};


const LessonPage = () => {
  // Get lessonId from URL params
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, applyPreferences } = usePreferences();
  const { t } = useI18n();
  const uiLanguage = resolveUiLanguageFromPreferences(preferences);
  const contentLanguage = useMemo(() => {
    const condition = String(user?.learningCondition || '').toLowerCase();
    if (condition === 'dyslexia' || condition === 'adhd') return 'english';
    return uiLanguage;
  }, [uiLanguage, user?.learningCondition]);
  // Lesson state
  const [lesson, setLesson] = useState(null); // Loaded lesson object
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [error, setError] = useState(''); // Error message
  // Used to trigger reloads
  const [retryKey, setRetryKey] = useState(0);

  // Determine if lessonId is a local/sample lesson (not a MongoDB ObjectId)
  const isLocalLessonId = useMemo(() => {
    return lessonId ? !/^[a-fA-F0-9]{24}$/.test(lessonId) : false;
  }, [lessonId]);

  // Is this a sample lesson?
  const isSample = Boolean(isLocalLessonId && lessonSamples[lessonId]);

  // Load lesson data from backend or local samples
  // Allow retryKey to re-trigger loading; listed in deps intentionally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isMounted = true;

    const loadLesson = async () => {
      // EPIC 6.5.2: Show a loading state while the lesson loads.
      setIsLoading(true);
      setError('');
      try {
        // If local/sample lesson, use local data
        if (isLocalLessonId && lessonSamples[lessonId]) {
          if (isMounted) {
            setLesson(localizeLessonPayload(lessonSamples[lessonId], uiLanguage, contentLanguage));
            setIsLoading(false);
          }
          return;
        }

        // Otherwise, load lesson from backend
        // EPIC 6.5.1: Load lesson content from backend correctly.
        const data = contentLanguage && contentLanguage !== uiLanguage
          ? await getLessonByIdWithContentLang(lessonId, uiLanguage, contentLanguage)
          : await getLessonById(lessonId, uiLanguage);
        if (isMounted) {
          setLesson(data);
        }
      } catch (loadError) {
        if (isMounted) {
          // If backend fails, fallback to sample if available
          if (lessonSamples[lessonId]) {
            setLesson(localizeLessonPayload(lessonSamples[lessonId], uiLanguage, contentLanguage));
            setError(t('lessons.liveUnavailableSample'));
          } else {
            // EPIC 6.5.3: Friendly error message when lesson fails to load.
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

    return () => {
      isMounted = false;
    };
  }, [lessonId, isLocalLessonId, retryKey, t, uiLanguage, contentLanguage]);

  // EPIC 6.5.4: Provide a retry action to re-attempt loading.
  const retryLoadLesson = () => setRetryKey((k) => k + 1);

  const handleBack = () => {
    // Prefer returning to wherever the user came from (dashboard/progress).
    // If the lesson page is opened directly (no history), go to dashboard.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };


  useEffect(() => {
    if (!preferences) return;
    // EPIC 2.7.1-2.7.4: Apply a consistent, preference-driven lesson container layout (stable classes, predictable transitions).
    applyPreferences(preferences, {
      containerId: 'learning-container',
      baseClass: 'lesson-page motion-enabled',
    });
  }, [preferences, applyPreferences]);

  const readingTime = estimateReadingTime(lesson?.textContent);
  const interactionCount = lesson?.interactions?.length || 0;
  const condition = user?.learningCondition || '';
  const dyslexia = useDyslexiaContext({ condition, lessonId, defaultSyllableMode: true });
  const baseTitle = lesson?.title || (isLoading ? t('lessons.loadingLesson') : t('lessons.lesson'));
  const resolvedTitle = dyslexia.applySyllables ? getDyslexiaLessonTitle(lessonId, baseTitle) : baseTitle;
  const resolvedSubtitle = isLoading
    ? t('lessons.preparingSteps')
    : `About ${readingTime} min • ${interactionCount} interactions`;

  return (
    <div
      className="lesson-page"
      id="learning-container"
      data-user-condition={user?.learningCondition || ''}
    >
      {/* EPIC 2.2.1-2.2.4, 2.6.1-2.6.4, 2.7.1-2.7.4: Step-by-step flow + replay + consistent layout/navigation. */}
      <LessonReplay
        lessonId={lessonId}
        isSample={isSample}
        lessonTitle={resolvedTitle}
        lessonSubtitle={resolvedSubtitle}
        notice={error}
        onRetry={retryLoadLesson}
        onExit={handleBack}
      />
    </div>
  );
};

export default LessonPage;
