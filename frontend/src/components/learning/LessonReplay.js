import React, { useEffect, useMemo, useState } from 'react';
import LessonLayout from './LessonLayout';
import LessonNav from './LessonNav';
import LessonSectionView from './LessonSectionView';
import { getLessonSections } from '../../services/lessonSectionService';
import { getProgress, updateProgress, getSummary } from '../../services/progressService';
import lessonSectionSamples from './lessonSectionSamples';
import { useAuth } from '../../context/AuthContext';
import { decorateDyslexiaText, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';
import './LessonReplay.css';

const LessonReplay = ({ lessonId, isSample, lessonTitle, lessonSubtitle, notice, onRetry, onExit, onComplete }) => {
  const { user } = useAuth();
  const [sections, setSections] = useState([]);
  const [progress, setProgress] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState('');
  const [replaySectionId, setReplaySectionId] = useState('');
  const [currentInteractionSectionId, setCurrentInteractionSectionId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      // EPIC 2.2.1, 2.2.4: Load ordered lesson sections + resume progress for a consistent step structure.
      setIsLoading(true);
      setError('');
      try {
        if (isSample && lessonSectionSamples[lessonId]) {
          const sampleSections = lessonSectionSamples[lessonId].sort((a, b) => a.order - b.order);
          if (isMounted) {
            setSections(sampleSections);
            setActiveSectionId(sampleSections[0]?.id || '');
            setProgress({
              currentSectionId: sampleSections[0]?.id || '',
              completedSections: [],
            });
          }
          return;
        }

        const [sectionsData, progressData] = await Promise.all([
          // EPIC 6.5.1: Load lesson content from backend correctly.
          getLessonSections(lessonId),
          // EPIC 6.4.2: Restore saved progress when a user resumes a lesson.
          getProgress(lessonId),
        ]);

        if (isMounted) {
          setSections(sectionsData);
          setProgress(progressData);
          setActiveSectionId(progressData?.currentSectionId || sectionsData[0]?._id || '');

          // EPIC 6.4.4: Confirm progress is loaded (simple, non-intrusive message) when resuming.
          const firstId = sectionsData[0]?._id || '';
          const resumeDetected = Boolean(
            (progressData?.currentSectionId && firstId && progressData.currentSectionId !== firstId) ||
            (Array.isArray(progressData?.completedSections) && progressData.completedSections.length > 0)
          );
          if (resumeDetected && !progressData?.completed) {
            setSuccessMessage('Progress loaded. Continue where you left off.');
            setTimeout(() => isMounted && setSuccessMessage(''), 2200);
          }

          // If lesson already completed, show a friendly note
          if (progressData?.completed) {
            // EPIC 6.2.1-6.2.4: Encouraging feedback when a learner has completed a lesson.
            setSuccessMessage('Good job! Lesson completed! Keep going!');
            setTimeout(() => isMounted && setSuccessMessage(''), 4000);
          }
        }
      } catch (loadError) {
        if (isMounted) {
          // EPIC 6.5.3: Show friendly error message if lesson load fails.
          setError('Unable to load lesson sections.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [lessonId, isSample, reloadKey]);

  const handleRetryLoad = () => {
    setReloadKey((n) => n + 1);
  };


  const sectionList = useMemo(() => {
    return sections.map((section) => ({
      id: section._id || section.id,
      title: section.title,
      order: section.order || 0,
    }));
  }, [sections]);

  const condition = user?.learningCondition || '';
  const dyslexia = useDyslexiaContext({ condition, lessonId, defaultSyllableMode: true });
  const displaySectionList = useMemo(() => {
    if (!dyslexia.applySyllables) return sectionList;
    return sectionList.map((s) => ({ ...s, title: decorateDyslexiaText(s.title) }));
  }, [dyslexia.applySyllables, sectionList]);

  const sectionMap = useMemo(() => {
    const map = new Map();
    sections.forEach((section) => {
      map.set(section._id || section.id, section);
    });
    return map;
  }, [sections]);

  const displayedSectionId = replaySectionId || activeSectionId;
  const displayedSection = displayedSectionId ? sectionMap.get(displayedSectionId) : null;
  const completedSections = progress?.completedSections || [];
  const isReplay = Boolean(replaySectionId);
  const lastCompletedSectionId = completedSections[completedSections.length - 1] || '';

  const handleInteractionChange = (sectionId, interactionIndex) => {
    setCurrentInteractionSectionId(sectionId);
  };

  const handleSelectSection = (sectionId) => {
    if (!sectionId) return;
    if (sectionId === activeSectionId) {
      setReplaySectionId('');
      return;
    }

    // EPIC 2.6.1, 2.6.4: Allow replay of completed sections while preserving progress.
    if (completedSections.includes(sectionId)) {
      setReplaySectionId(sectionId);
    }
  };

  const exitReplay = () => {
    setReplaySectionId('');
  };

  const handleReplayToggle = () => {
    // EPIC 2.6.1-2.6.3: One-tap replay entry (last completed section) and easy access to prior steps.
    if (isReplay) {
      exitReplay();
      return;
    }
    if (lastCompletedSectionId) {
      setReplaySectionId(lastCompletedSectionId);
    }
  };

  const getSectionIndex = (sectionId) => displaySectionList.findIndex((section) => section.id === sectionId);

  const handleNavigate = async (direction) => {
    if (!displayedSectionId) return;
    const currentIndex = getSectionIndex(displayedSectionId);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    const nextSection = sectionList[nextIndex];

    // If trying to navigate past the last section -> treat as lesson completion
    if (!nextSection && direction > 0) {
      // EPIC 2.2.3: Manual forward navigation completes the final step.
      const nextCompleted = Array.from(new Set([...completedSections, displayedSectionId]));

      if (!isSample) {
        try {
          // EPIC 6.4.1: Auto-save completion state to backend at the end of the lesson.
          const updated = await updateProgress({
            lessonId,
            currentSectionId: displayedSectionId,
            completedSections: nextCompleted,
            isReplay: false,
          });

            // EPIC 6.4.3: No manual save button; progress is saved automatically via updateProgress().

          setProgress(updated);

          if (updated?.completed) {
            const msgs = ['Good job!', 'Lesson completed!', 'Keep going!'];
            // EPIC 6.2.2: Encourage with positive words (no harsh feedback).
            // EPIC 6.2.3: Avoid negative or harsh messages.
            // EPIC 6.2.4: Encourage next lesson.
            const msg = `${msgs[Math.floor(Math.random() * msgs.length)]} You completed this lesson. Try the next lesson!`;
            setSuccessMessage(msg);
            // Notify other parts of app (Progress page, Dashboard) to refresh progress summary
            try {
              let summary = null;
              try { summary = await getSummary(); } catch (e) { /* ignore */ }

              // EPIC 6.4.1: Broadcast completion so Progress UI updates without manual refresh.
              // EPIC 6.1.3: Update progress after each lesson completion.
              window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId, summary } }));
              // dispatch again after a short delay to guard against race / eventual consistency
              setTimeout(async () => {
                try {
                  const summary2 = await getSummary().catch(() => null);
                  window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId, summary: summary2 } }));
                } catch (e) {}
              }, 500);
            } catch (e) {}
            // Redirect to progress page after showing success message (if onComplete provided)
            if (onComplete) {
              setTimeout(() => onComplete(), 2000);
            } else {
              setTimeout(() => setSuccessMessage(''), 4000);
            }
          }
        } catch (e) {
          // EPIC 6.7.1: Friendly client error when backend save fails.
          setError('Unable to save progress. Please try again.');
        }
      } else {
        setProgress((prev) => ({
          ...(prev || {}),
          currentSectionId: displayedSectionId,
          completedSections: nextCompleted,
          completed: true,
        }));

        setSuccessMessage('Good job! Lesson completed! Keep going!');

        // Persist sample lesson completion server-side so Dashboard/summaries reflect it
        try {
          const api = await import('../../utils/api');
          const lessonKey = `sample-${lessonId}`;
          // EPIC 6.4.1: Save completion marker for sample lesson as well.
          const res = await api.default.post('/users/complete-lesson', { lessonKey });
          const summary = res?.data?.summary;
          if (summary) {
            window.dispatchEvent(new CustomEvent('progress:updated', { detail: { summary } }));
          } else {
            window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId } }));
            setTimeout(() => {
              try { window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId } })); } catch (e) {}
            }, 500);
          }
        } catch (e) {
          // EPIC 6.7.1-6.7.2: Degrade gracefully if completion write fails; keep the lesson flow unblocked.
          // If server call fails, still fire the event for UI to refresh
          try { window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId } })); } catch (e) {}
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId } })); } catch (e) {}
          }, 500);
        }

        // Redirect to progress page after showing success message (if onComplete provided)
        if (onComplete) {
          setTimeout(() => onComplete(), 2000);
        } else {
          setTimeout(() => setSuccessMessage(''), 4000);
        }
      }

      return;
    }

    if (isReplay) {
      // EPIC 2.6.3-2.6.4: Replay navigation is limited to completed steps and does not affect progress.
      if (completedSections.includes(nextSection.id)) {
        setReplaySectionId(nextSection.id);
      }
      return;
    }

    if (direction < 0) {
      if (completedSections.includes(nextSection.id)) {
        setReplaySectionId(nextSection.id);
      }
      return;
    }

    const nextCompleted = Array.from(new Set([...completedSections, displayedSectionId]));
    setActiveSectionId(nextSection.id);

    if (!isSample) {
      try {
        const updated = await updateProgress({
          lessonId,
          currentSectionId: nextSection.id,
          completedSections: nextCompleted,
          isReplay: false,
        });
        setProgress(updated);

        // If the backend reports completion, show encouraging feedback
        if (updated?.completed) {
          const msgs = ['Good job!', 'Lesson completed!', 'Keep going!'];
          const msg = `${msgs[Math.floor(Math.random() * msgs.length)]} You completed this lesson.`;
          setSuccessMessage(msg);
          setTimeout(() => setSuccessMessage(''), 4000);
        }
      } catch (e) {
        setError('Unable to save progress. Please try again.');
      }
    } else {
      setProgress((prev) => ({
        ...(prev || {}),
        currentSectionId: nextSection.id,
        completedSections: nextCompleted,
      }));
    }
  };


  const prevSection = displayedSectionId ? displaySectionList[getSectionIndex(displayedSectionId) - 1] : null;
  const nextSection = displayedSectionId ? displaySectionList[getSectionIndex(displayedSectionId) + 1] : null;
  const isLastSection = !isReplay && Boolean(displayedSectionId) && getSectionIndex(displayedSectionId) === displaySectionList.length - 1;
  const canGoBack = Boolean(prevSection && completedSections.includes(prevSection.id));
  const canGoNext = Boolean(
    !isReplay && displayedSectionId && (nextSection || isLastSection)
  ) || Boolean(
    isReplay && nextSection && completedSections.includes(nextSection.id)
  );
  const canReplay = Boolean(lastCompletedSectionId) || isReplay;

  const guidanceText = successMessage
    ? successMessage
    : error
      ? error
      : notice
        ? notice
        : isReplay
          ? 'Replaying a completed section. Your progress remains saved.'
          : 'Select a completed section to replay at any time.';

  const resolvedTitle = lessonTitle || 'Lesson';
  const resolvedSubtitle = lessonSubtitle || 'Move through one section at a time for steady progress.';

  return (
    <LessonLayout
      // EPIC 2.7.1-2.7.4: Shared lesson shell (header/guidance/footer) for predictable layout and transitions.
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      onBack={onExit}
      backLabel="Go back"
      guidance={(
        <div className="lesson-guidance">
          <p className="lesson-guidance__label">Guidance</p>
          <p className={`lesson-guidance__text${error ? ' is-error' : ''}`}>{guidanceText}</p>
          {notice && onRetry && !isSample && (
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={onRetry}>Retry</button>
            </div>
          )}
        </div>
      )}
      footer={(
        <LessonNav
          // EPIC 2.2.3, 2.7.2: Manual navigation with buttons kept in fixed positions.
          onBack={() => handleNavigate(-1)}
          onNext={() => handleNavigate(1)}
          onReplay={handleReplayToggle}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          canReplay={canReplay}
          isReplay={isReplay}
          nextLabel={isLastSection ? 'Finish' : 'Next'}
        />
      )}
    >
      <div className="lesson-replay">
        <div className="lesson-replay-grid">
          <div className="lesson-replay-panel fx-card">
            <div className="lesson-replay-panel__header">
              <h2>Lesson timeline</h2>
              <p>Select a completed section to replay.</p>
            </div>
            {isLoading ? (
              // EPIC 6.5.2: Show “Loading…” while lesson loads.
              <p className="lesson-replay-loading">Loading sections…</p>
            ) : error ? (
              <div className="fx-card">
                {/* EPIC 6.5.3: Friendly error message if lesson fails to load. */}
                <p className="is-error">{error}</p>
                {/* EPIC 6.5.4: Provide a retry button. */}
                {!isSample && <button type="button" onClick={handleRetryLoad}>Retry</button>}
              </div>
            ) : (
              // EPIC 2.6.1, 2.6.3: Timeline provides easy access to previous completed steps for replay.
              <nav className="lesson-timeline" aria-label="Lesson sections">
                {displaySectionList.map((section, index) => {
                  const isCurrent = section.id === (currentInteractionSectionId || activeSectionId);
                  const isCompleted = completedSections.includes(section.id);
                  const isSelected = section.id === displayedSectionId;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`timeline-item fx-pressable fx-focus ${isSelected ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                      onClick={() => handleSelectSection(section.id)}
                      aria-current={isCurrent ? 'step' : undefined}
                      disabled={!isCompleted && section.id !== activeSectionId}
                    >
                      <span className="timeline-index">{index + 1}</span>
                      <span className="timeline-title">{section.title}</span>
                      {isCompleted && <span className="timeline-tag">Completed</span>}
                      {isCurrent && <span className="timeline-tag accent">Current</span>}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="lesson-section-panel">
            {isLoading ? (
              <div className="lesson-replay-loading fx-card">Preparing the lesson section…</div>
            ) : displayedSection ? (
              <div className="lesson-content-fade" key={displayedSectionId}>
                {isReplay && <div className="replay-banner">Replaying a completed section</div>}
                {/* EPIC 2.1.1-2.1.4, 2.3.1-2.3.4, 2.4.1-2.4.4, 2.5.1-2.5.4: Section delivers text/audio/visuals with interactions + guidance + highlights. */}
                <LessonSectionView 
                  section={displayedSection} 
                  isReplay={isReplay} 
                  useLocalSubmission={isSample}
                  lessonId={lessonId}
                  onInteractionChange={handleInteractionChange}
                />
              </div>
            ) : (
              <div className="lesson-replay-empty fx-card">Select a section to begin.</div>
            )}
          </div>
        </div>
      </div>
    </LessonLayout>
  );
};

export default LessonReplay;
