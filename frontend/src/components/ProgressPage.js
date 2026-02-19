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
  const applyDyslexiaSyllables = condition === 'dyslexia' && Boolean(syllableMode);
  const uiText = React.useCallback(
    (normalText, syllableText) => (applyDyslexiaSyllables ? syllableText : normalText),
    [applyDyslexiaSyllables]
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
        return {
          id: l.id,
          title: l.title,
          status: entry.status || 'Not Started',
          percent,
          onOpen: () => navigate(l.route),
          openLabel: (entry.status === 'Completed') ? 'Review Lesson' : 'Continue',
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
        percent: completed ? 100 : 0,
        onOpen: () => navigate('/dashboard', { state: { openLessonId: lessonId, openCondition: condition } }),
        openLabel: completed ? 'Review in Learning Center' : 'Start in Learning Center',
      };
    });
  }, [applyDyslexiaSyllables, condition, completedLessonKeys, localProgress, navigate, remoteLessonPrefix]);

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
          setSummaryError('Unable to load progress summary.');
        }
      } catch (e) {
        if (!mounted) return;
        setSummaryError('Unable to load progress summary.');
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
  }, [refreshLocalProgress, refreshCompletedLessonKeys]);

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
            <span>Language Learning</span>
          </h1>
        </div>
        <div className="nav-menu">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-settings"
            title="Home"
            aria-label="Home"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BookOpen size={18} aria-hidden="true" />
            <span>Home</span>
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="welcome-section">
          <h2>{uiText('Progress', 'Pro-gress')}</h2>
          <p className="subtitle">
            {uiText(
              'See your finished lessons and keep learning.',
              'See your finished lessons and keep learning.'
            )}
          </p>
        </div>

        <div className="progress-card">
          <div className="card-header">
            <h3>Progress</h3>
          </div>

          <div className="card-body">
            {summaryLoading ? (
              // EPIC 6.5.2: Loading indicator during summary fetch.
              <p>{uiText('Loading progress…', 'Load-ing pro-gress…')}</p>
            ) : summaryError ? (
              <div>
                <p className="is-error">{summaryError}</p>
                {/* EPIC 6.5.4: Retry action on summary fetch failure. */}
                <button type="button" onClick={() => window.location.reload()}>Retry</button>
              </div>
            ) : (
              <>
                {/* EPIC 6.6.1-6.6.2: Simple progress metrics (completed, total, percent) without complex analytics. */}
                <p className="dashboard-progress__headline">
                  <strong>{mergedCompletedCount}</strong> of <strong>{displayTotalLessons}</strong>{' '}
                  {uiText('lessons completed', 'les-sons com-plet-ed')} ({mergedPercentage}%)
                </p>

                {/* EPIC 6.1.4: Keep progress display simple (bar + text). */}
                <div className="dashboard-progress__bar" aria-label="Overall lesson progress">
                  <div className="dashboard-progress__barFill" style={{ width: `${mergedPercentage}%` }} />
                </div>

                <p className="dashboard-progress__meta">
                  <strong>{uiText('Completed:', 'Com-plet-ed:')}</strong> {mergedCompletedCount} •{' '}
                  <strong>{uiText('Remaining:', 'Re-main-ing:')}</strong> {Math.max(0, displayTotalLessons - mergedCompletedCount)}
                </p>

                {showLearningHistory && summary?.completedLessons && summary.completedLessons.length > 0 ? (
                  // EPIC 6.3.1-6.3.4: Read-only learning history list supports reopening/reviewing completed lessons.
                  <div className="completed-lessons">
                    <p className="section-label">{uiText('Learning history', 'Learn-ing his-to-ry')}</p>
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
                    {uiText('No lessons completed yet. Keep going!', 'No les-sons com-plet-ed yet. Keep go-ing!')}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="progress-card">
          <div className="card-header">
            <h3>{uiText('Lesson status', 'Les-son sta-tus')}</h3>
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
                      <span className={`status-pill status-${statusClass}`}>{l.status}</span>
                    </div>
                    <div className="lesson-progress">
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${l.percent}%` }} />
                      </div>
                      <span className="progress-text">
                        {l.percent}% {uiText('Complete', 'Com-plete')}
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
