import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLessonById } from '../../services/lessonService';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import LessonReplay from './LessonReplay';
import lessonSamples from './lessonSamples';
import './LessonPage.css';
import { getDyslexiaLessonTitle, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';

const estimateReadingTime = (text) => {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 160));
};

const LessonPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, applyPreferences } = usePreferences();
  const [lesson, setLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // Trigger to retry loading the lesson
  const [retryKey, setRetryKey] = useState(0);

  const isLocalLessonId = useMemo(() => {
    return lessonId ? !/^[a-fA-F0-9]{24}$/.test(lessonId) : false;
  }, [lessonId]);

  const isSample = Boolean(isLocalLessonId && lessonSamples[lessonId]);

  // Allow retryKey to re-trigger loading; listed in deps intentionally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isMounted = true;

    const loadLesson = async () => {
      // EPIC 6.5.2: Show a loading state while the lesson loads.
      setIsLoading(true);
      setError('');
      try {
        if (isLocalLessonId && lessonSamples[lessonId]) {
          if (isMounted) {
            setLesson(lessonSamples[lessonId]);
            setIsLoading(false);
          }
          return;
        }

        // EPIC 6.5.1: Load lesson content from backend correctly.
        const data = await getLessonById(lessonId);
        if (isMounted) {
          setLesson(data);
        }
      } catch (loadError) {
        if (isMounted) {
          if (lessonSamples[lessonId]) {
            setLesson(lessonSamples[lessonId]);
            setError('Live lesson data is unavailable. Showing a sample lesson instead.');
          } else {
            // EPIC 6.5.3: Friendly error message when lesson fails to load.
            setError('Unable to load this lesson. Please try again.');
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
  }, [lessonId, isLocalLessonId, retryKey]);

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
  const baseTitle = lesson?.title || (isLoading ? 'Loading lesson…' : 'Lesson');
  const resolvedTitle = dyslexia.applySyllables ? getDyslexiaLessonTitle(lessonId, baseTitle) : baseTitle;
  const resolvedSubtitle = isLoading
    ? 'Preparing your lesson steps…'
    : `About ${readingTime} min • ${interactionCount} interactions`;

  // Redirect dyslexia users to progress page after completing a lesson
  const handleLessonComplete = () => {
    if (condition.toLowerCase() === 'dyslexia') {
      navigate('/progress');
    }
  };

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
        onComplete={handleLessonComplete}
      />
    </div>
  );
};

export default LessonPage;
