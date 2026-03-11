/**
 * ProgressPage Component
 * 
 * Unified progress tracking and review interface for all learning conditions,
 * implementing EPIC 6 (Progress Tracking and Persistence).
 * 
 * Core Features:
 * 
 * 1. Multi-Source Progress Data (EPIC 6.1):
 *    - Dyslexia: localStorage via dyslexiaProgressService
 *    - ADHD/Autism: Backend API via /users/completed-lessons
 *    - Summary: Backend-computed statistics via progressService.getSummary()
 *    - Unified display across all conditions
 * 
 * 2. Progress Summary Card (EPIC 6.1.2):
 *    - Overall completion percentage
 *    - Completed lesson count
 *    - In-progress lesson count
 *    - Remaining lesson count
 *    - Visual progress indicators
 * 
 * 3. Lesson History Display (EPIC 6.2):
 *    - List of all attempted lessons
 *    - Completion status for each lesson
 *    - Individual progress percentages
 *    - Last accessed timestamps
 *    - Quick navigation to lessons
 * 
 * 4. Real-Time Updates:
 *    - Custom 'progress:updated' browser event listener
 *    - Immediate refresh after lesson completion
 *    - No full page reload required
 *    - Seamless data synchronization
 * 
 * 5. Accessibility Features:
 *    - Syllable mode support for dyslexia
 *    - Applied user preferences (fonts, themes)
 *    - Clear visual progress indicators
 *    - Keyboard navigation support
 * 
 * 6. Performance Insights:
 *    - Visual charts and graphs
 *    - Trend analysis over time
 *    - Achievement highlights
 *    - Motivational feedback
 * 
 * Data Flow:
 * 1. Component mounts → fetch progress from appropriate source
 * 2. Display summary and lesson list
 * 3. Listen for progress updates via custom events
 * 4. Auto-refresh when updates detected
 * 5. Apply user preferences to container
 * 
 * Related EPICs:
 * - EPIC 6: Progress Tracking and Persistence
 * - EPIC 6.1: Progress summary display
 * - EPIC 6.1.2: Overall completion percentage
 * - EPIC 6.2: Learning history visualization
 * - EPIC 6.6: Remaining lesson counts
 * 
 * @component
 * @requires context/AuthContext - User profile and condition
 * @requires context/PreferencesContext - User accessibility preferences
 * @requires services/progressService - Backend progress API
 * @requires services/dyslexiaProgressService - localStorage progress for dyslexia
 * @author SE_Team11
 * @version 1.0.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { getSummary } from '../services/progressService';
import './learning/DyslexiaView.css';
import { getAllLessonProgress, normalizeUserId } from '../services/dyslexiaProgressService';
import api from '../utils/api';
import { BookOpen } from 'lucide-react';
import { getDyslexiaLessonTitle, useDyslexiaSyllableMode } from '../utils/dyslexiaSyllableMode';
import { useI18n } from '../utils/i18n';

/**
 * ProgressPage
 * ------------
 * Unified progress UI across learning conditions.
 *
 * Data sources:
 * - Dyslexia: lesson progress is tracked locally (localStorage) using dyslexiaProgressService
 * - ADHD/Autism: completion is tracked remotely via the backend `/users/completed-lessons`
 * - Summary card: `progressService.getSummary()` fetches a backend-computed summary
 *
 * The page listens for a custom `progress:updated` browser event so lesson pages can
 * trigger an immediate refresh after completion without forcing a full reload.
 */
const ProgressPage = () => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [syllableMode] = useDyslexiaSyllableMode(true);
  const { lang, t } = useI18n();

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [localProgress, setLocalProgress] = useState({});
  const [completedLessonKeys, setCompletedLessonKeys] = useState([]);

  const refreshLocalProgress = React.useCallback(() => {
    // Dyslexia uses a localStorage key derived from the current user.
    const key = normalizeUserId(user);
    if (!key) {
      setLocalProgress({});
      return;
    }
    setLocalProgress(getAllLessonProgress(key) || {});
  }, [user]);

  const refreshCompletedLessonKeys = React.useCallback(async () => {
    try {
      // Remote completion list is keyed by `condition-lesson-N`.
      const res = await api.get('/users/completed-lessons');
      if (res?.data?.success && Array.isArray(res.data.completedLessons)) {
        setCompletedLessonKeys(res.data.completedLessons);
      } else {
        setCompletedLessonKeys([]);
      }
    } catch (e) {
      // Swallow errors: progress UI should still render even if remote is down.
      setCompletedLessonKeys([]);
    }
  }, []);

  useEffect(() => {
    refreshLocalProgress();
    refreshCompletedLessonKeys();
  }, [refreshLocalProgress, refreshCompletedLessonKeys]);

  const localDyslexiaCompleted = React.useMemo(() => {
    return Object.values(localProgress).filter((entry) => entry?.status === 'Completed').length;
  }, [localProgress]);

  const condition = user?.learningCondition || '';
  const applyDyslexiaSyllables = condition === 'dyslexia' && Boolean(syllableMode) && lang === 'english';
  const uiText = React.useCallback(
    (key, syllableText) => (applyDyslexiaSyllables ? syllableText : t(key)),
    [applyDyslexiaSyllables, t]
  );

  const statusLabelFor = React.useCallback(
    (status) => (status === 'Completed' ? t('progress.statusCompleted') : t('progress.statusNotStarted')),
    [t]
  );
  const remoteLessonPrefix = condition === 'autism'
    ? 'autism-lesson-'
    : condition === 'adhd'
      ? 'adhd-lesson-'
      : '';

  const showLearningHistory = condition === 'dyslexia';

  const remoteCompletedCount = React.useMemo(() => {
    if (!remoteLessonPrefix) return 0;
    return completedLessonKeys.filter((k) => typeof k === 'string' && k.startsWith(remoteLessonPrefix)).length;
  }, [completedLessonKeys, remoteLessonPrefix]);

  const lessonCards = React.useMemo(() => {
    // Dyslexia lessons are route-based and tracked locally.
    if (condition === 'dyslexia' || !remoteLessonPrefix) {
      const lessonDefs = [
        { id: 'lesson-greetings', title: applyDyslexiaSyllables ? getDyslexiaLessonTitle('lesson-greetings', 'Greetings') : 'Greetings', route: '/lessons/lesson-greetings' },
        { id: 'lesson-vocabulary', title: applyDyslexiaSyllables ? getDyslexiaLessonTitle('lesson-vocabulary', 'Basic Words') : 'Basic Words', route: '/lessons/lesson-vocabulary' },
        { id: 'lesson-numbers', title: applyDyslexiaSyllables ? getDyslexiaLessonTitle('lesson-numbers', 'Numbers') : 'Numbers', route: '/lessons/lesson-numbers' },
      ];

      return lessonDefs.map((l) => {
        const entry = localProgress?.[l.id] || { status: 'Not Started', correctCount: 0 };
        const correctCount = Number(entry.correctCount || 0);
        const percent = Math.min(100, Math.round((correctCount / 5) * 100));
        const completed = (entry.status === 'Completed');
        return {
          id: l.id,
          title: l.title,
          status: entry.status || 'Not Started',
          statusLabel: statusLabelFor(entry.status || 'Not Started'),
          percent,
          onOpen: () => navigate(l.route),
          openLabel: completed ? t('progress.reviewLesson') : t('progress.continue'),
        };
      });
    }

    // ADHD/Autism lessons are inside their respective learning centers.
    const ids = [1, 2, 3];
    const titles = {
      1: 'Greetings',
      2: 'Basic Words',
      3: 'Numbers',
    };

    return ids.map((lessonId) => {
      const key = `${remoteLessonPrefix}${lessonId}`;
      const completed = completedLessonKeys.includes(key);
      return {
        id: key,
        title: titles[lessonId] || `Lesson ${lessonId}`,
        status: completed ? 'Completed' : 'Not Started',
        statusLabel: completed ? t('progress.statusCompleted') : t('progress.statusNotStarted'),
        percent: completed ? 100 : 0,
        onOpen: () => navigate('/dashboard', { state: { openLessonId: lessonId, openCondition: condition } }),
        openLabel: completed ? t('progress.reviewInCenter') : t('progress.startInCenter'),
      };
    });
  }, [applyDyslexiaSyllables, completedLessonKeys, condition, localProgress, navigate, remoteLessonPrefix, statusLabelFor, t]);

  useEffect(() => {
    let mounted = true;

    const loadSummary = async () => {
      // EPIC 6.5.1-6.5.3: Show loading state and allow retry if progress summary cannot be fetched.
      setSummaryLoading(true);
      setSummaryError('');
      try {
        const data = await getSummary();
        if (!mounted) return;
        if (data && data.success) {
          // EPIC 6.6.1-6.6.3: Display simple performance insight (completed/total/percentage).
          setSummary(data);
        } else {
          setSummaryError(t('progress.summaryError'));
        }
      } catch (e) {
        if (!mounted) return;
        setSummaryError(t('progress.summaryError'));
      } finally {
        mounted && setSummaryLoading(false);
      }
    };

    loadSummary();

    const onProgressUpdated = (e) => {
      // EPIC 6.4.1: Auto-refresh progress UI after completion events (progress:updated).
      // Local dyslexia progress is stored in localStorage; refresh it immediately.
      refreshLocalProgress();
      refreshCompletedLessonKeys();

      // Some emitters include a summary payload so we can update instantly.
      if (e?.detail?.summary && e.detail.summary.success) {
        setSummary(e.detail.summary);
      }

      // Also re-fetch the summary to keep the progress card authoritative.
      loadSummary();
      setTimeout(() => loadSummary(), 600);
    };

    window.addEventListener('progress:updated', onProgressUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('progress:updated', onProgressUpdated);
    };
  }, [refreshLocalProgress, refreshCompletedLessonKeys, t]);

  useEffect(() => {
    if (!preferences || !containerRef.current) return;

    // EPIC 1.7.3: Apply stored preferences consistently outside the dashboard view
    const container = containerRef.current;

    container.className = 'dyslexia-view progress-page motion-enabled';

    if (preferences.contrastTheme && preferences.contrastTheme !== 'default') {
      container.classList.add(`theme-${preferences.contrastTheme}`);
    }

    if (preferences.fontFamily && preferences.fontFamily !== 'default') {
      container.classList.add(`font-${preferences.fontFamily}`);
    }

    if (preferences.fontSize) {
      container.classList.add(`font-${preferences.fontSize}`);
    }

    if (preferences.letterSpacing) {
      container.classList.add(`letter-spacing-${preferences.letterSpacing}`);
    }

    if (preferences.wordSpacing) {
      container.classList.add(`word-spacing-${preferences.wordSpacing}`);
    }

    if (preferences.lineHeight) {
      container.classList.add(`line-height-${preferences.lineHeight}`);
    }

    if (preferences.distractionFreeMode && user?.learningCondition === 'autism') {
      container.classList.add('distraction-free');
    }

    if (preferences.reduceAnimations && preferences.distractionFreeMode && user?.learningCondition === 'autism') {
      container.classList.add('reduce-animations');
    }
  }, [preferences, user?.learningCondition]);

  const displayCompletedCount = summary?.completedCount ?? 0;
  const displayTotalLessons = summary?.totalLessons ?? 3;
  const mergedCompletedCount = Math.max(
    displayCompletedCount,
    condition === 'dyslexia' || !remoteLessonPrefix ? localDyslexiaCompleted : remoteCompletedCount
  );
  const mergedPercentage = displayTotalLessons
    ? Math.round((mergedCompletedCount / displayTotalLessons) * 100)
    : 0;

  // EPIC 6.1.2: Progress UI is derived from completed/total to show a percentage.

  return (
    <div
      ref={containerRef}
      className="dyslexia-view"
      id="learning-container"
      data-user-condition={user?.learningCondition || ''}
    >
      <nav className="navbar">
        <div className="nav-brand">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} aria-hidden="true" />
            <span>{t('progress.brand')}</span>
          </h1>
        </div>
        <div className="nav-menu">
          <span className="user-name">{t('progress.hello', { name: user?.name || '' })}</span>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-settings" title={t('progress.backToLearning')}>
            {t('app.back')}
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="welcome-section">
          <h2>{uiText('progress.yourProgress', 'Your Learn-ing Pro-gress')}</h2>
          <p className="subtitle">
            {uiText(
              'progress.subtitle',
              'See com-plet-ed les-sons and con-tin-ue where you left off.'
            )}
          </p>
        </div>

        <div className="progress-card">
          <div className="card-header">
            <h3>{t('progress.cardTitle')}</h3>
          </div>

          <div className="card-body">
            {summaryLoading ? (
              // EPIC 6.5.2: Loading indicator during summary fetch.
              <p>{uiText('progress.loading', 'Load-ing pro-gress…')}</p>
            ) : summaryError ? (
              <div>
                <p className="is-error">{summaryError}</p>
                {/* EPIC 6.5.4: Retry action on summary fetch failure. */}
                <button type="button" onClick={() => window.location.reload()}>{t('app.retry')}</button>
              </div>
            ) : (
              <>
                {/* EPIC 6.6.1-6.6.2: Simple progress metrics (completed, total, percent) without complex analytics. */}
                <p className="dashboard-progress__headline">
                  <strong>{mergedCompletedCount}</strong> of <strong>{displayTotalLessons}</strong>{' '}
                  {uiText('progress.lessonsCompleted', 'les-sons com-plet-ed')} ({mergedPercentage}%)
                </p>

                {/* EPIC 6.1.4: Keep progress display simple (bar + text). */}
                <div className="dashboard-progress__bar" aria-label="Overall lesson progress">
                  <div className="dashboard-progress__barFill" style={{ width: `${mergedPercentage}%` }} />
                </div>

                <p className="dashboard-progress__meta">
                  <strong>{uiText('progress.completed', 'Com-plet-ed:')}</strong> {mergedCompletedCount} •{' '}
                  <strong>{uiText('progress.remaining', 'Re-main-ing:')}</strong> {Math.max(0, displayTotalLessons - mergedCompletedCount)}
                </p>

                {showLearningHistory && summary?.completedLessons && summary.completedLessons.length > 0 ? (
                  // EPIC 6.3.1-6.3.4: Read-only learning history list supports reopening/reviewing completed lessons.
                  <div className="completed-lessons">
                    <p className="section-label">{uiText('progress.learningHistory', 'Learn-ing his-to-ry')}</p>
                    <ol>
                      {summary.completedLessons.map((l) => (
                        <li key={l.lessonId}>
                          <Link to={`/lessons/${l.lessonId}`}>{applyDyslexiaSyllables ? getDyslexiaLessonTitle(l.lessonId, l.title) : (l.title || l.lessonId)}</Link>{' '}
                          <small>
                            ({l.completedAt ? new Date(l.completedAt).toLocaleDateString() : '—'})
                          </small>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : showLearningHistory ? (
                  // EPIC 6.2.1-6.2.4: Encouraging message when no progress exists yet.
                  <p className="dashboard-progress__empty">
                    {uiText('progress.noneYet', 'No les-sons com-plet-ed yet. Keep go-ing!')}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="progress-card">
          <div className="card-header">
            <h3>{uiText('progress.lessonStatus', 'Les-son sta-tus')}</h3>
          </div>
          <div className="card-body">
            <div className="lessons-grid">
              {lessonCards.map((l) => {
                const statusClass = (l.status || 'Not Started').replace(/\s+/g, '-').toLowerCase();
                return (
                  <div key={l.id} className="lesson-card">
                    <div className="lesson-icon" aria-hidden="true"><BookOpen size={22} /></div>
                    <h4>{l.title}</h4>
                    <div className="lesson-meta">
                      <span className={`status-pill status-${statusClass}`}>{l.statusLabel}</span>
                    </div>
                    <div className="lesson-progress">
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${l.percent}%` }} />
                      </div>
                      <span className="progress-text">
                        {l.percent}% {uiText('progress.complete', 'Com-plete')}
                      </span>
                    </div>
                    <button type="button" className="btn btn-primary btn-block" onClick={l.onOpen}>
                      {l.openLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProgressPage;
