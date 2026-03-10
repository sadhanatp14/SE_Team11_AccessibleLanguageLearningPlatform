/**
 * LessonReplay.js
 *
 * Core lesson player component. Given a lessonId it:
 *  1. Loads ordered lesson sections from the backend (or local sample data).
 *  2. Restores saved progress so learners can resume where they left off.
 *  3. Drives step-by-step navigation through sections (EPIC 2.2.1-2.2.4).
 *  4. Supports one-tap replay of any previously completed section (EPIC 2.6.1-2.6.4).
 *  5. Records per-interaction results, calculates a percentage score, and
 *     persists completion to the backend with adaptive-difficulty scoring (EPIC 4.1).
 *  6. Gates lesson completion behind pronunciation practice when highlights exist (EPIC 3.3).
 *
 * Props received from LessonPage:
 *  lessonId        – Unique lesson slug or MongoDB ObjectId
 *  isSample        – True when using local fallback data (no API calls)
 *  lessonTitle     – Pre-resolved display title (syllable-decorated for dyslexia)
 *  lessonSubtitle  – Short reading-time + interaction-count summary
 *  notice          – Error / fallback notice string from LessonPage
 *  onRetry         – Callback to retry loading the lesson
 *  onExit          – Callback to navigate back (history or dashboard)
 *  onComplete      – Callback invoked after lesson completion redirect
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LessonLayout from './LessonLayout';
import LessonNav from './LessonNav';
import LessonSectionView from './LessonSectionView';
import PronunciationPractice from './PronunciationPractice';
import { getLessonSections, getLessonSectionsWithContentLang } from '../../services/lessonSectionService';
import { getProgress, updateProgress, getSummary } from '../../services/progressService';
import { recordLessonScore, adjustDifficulty } from '../../services/difficultyAdjustmentService';
import lessonSectionSamples from './lessonSectionSamples';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { decorateDyslexiaText, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';
import { useI18n } from '../../utils/i18n';
import './LessonReplay.css';
import { resolveUiLanguageFromPreferences } from '../../utils/languagePrefs';
import { localizeLessonSectionsPayload } from '../../utils/lessonI18n';

/**
 * LessonReplay – Stateful lesson player.
 *
 * @param {string}   lessonId        - Unique lesson identifier from the URL.
 * @param {boolean}  isSample        - Whether to use local sample data instead of the API.
 * @param {string}   lessonTitle     - Display title (may be syllable-split for dyslexia users).
 * @param {string}   lessonSubtitle  - Short subtitle ("About X min • Y interactions").
 * @param {string}   notice          - Optional error/warning string from the parent.
 * @param {Function} onRetry         - Triggered when the user presses "Retry" after a load error.
 * @param {Function} onExit          - Triggered when the user presses the Back button.
 * @param {Function} onComplete      - Triggered after the lesson completion flow finishes.
 */
const LessonReplay = ({ lessonId, isSample, lessonTitle, lessonSubtitle, notice, onRetry, onExit, onComplete }) => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { t } = useI18n();
  const uiLanguage = resolveUiLanguageFromPreferences(preferences);
  // Derive the content language from the learner's condition and the lesson ID suffix.
  // Dyslexia/ADHD users can study Tamil or Hindi content identified by '-hindi' / '-tamil'.
  const contentLanguage = useMemo(() => {
    const condition = String(user?.learningCondition || '').toLowerCase();
    if (condition === 'dyslexia' || condition === 'adhd') {
      // Detect content language from the lesson ID suffix
      if (lessonId?.endsWith('-hindi')) return 'hindi';
      if (lessonId?.endsWith('-tamil')) return 'tamil';
      return 'english';
    }
    return uiLanguage;
  }, [uiLanguage, user?.learningCondition, lessonId]);
  // Ordered array of lesson section objects fetched from the API or local samples
  const [sections, setSections] = useState([]);
  // Progress document for the current user+lesson (currentSectionId, completedSections, completed)
  const [progress, setProgress] = useState(null);
  // ID of the section the learner is currently working through (not replaying)
  const [activeSectionId, setActiveSectionId] = useState('');
  // ID of a previously completed section the learner is replaying; empty string when not in replay
  const [replaySectionId, setReplaySectionId] = useState('');
  // ID of the section whose interaction is currently focused (highlights the timeline item)
  const [currentInteractionSectionId, setCurrentInteractionSectionId] = useState('');
  // True while section data or progress data is being fetched
  const [isLoading, setIsLoading] = useState(true);
  // User-visible error string shown in the guidance area and timeline error state
  const [error, setError] = useState('');
  // Incrementing key that re-triggers the load effect when the user presses Retry
  const [reloadKey, setReloadKey] = useState(0);
  // Short positive message shown after section/lesson completion or on progress resume
  const [successMessage, setSuccessMessage] = useState('');
  // Track which sections have had all their interactions completed by the user
  const [completedInteractionSections, setCompletedInteractionSections] = useState(new Set());
  // Warning message shown when user tries to proceed without completing the section
  const [incompleteWarning, setIncompleteWarning] = useState('');

  // When true, the PronunciationPractice overlay replaces the section content (EPIC 3.3)
  const [showPronunciationPractice, setShowPronunciationPractice] = useState(false);
  // Becomes true once the learner finishes pronunciation practice so the gate is not shown again
  const [practiceDone, setPracticeDone] = useState(false);
  // Stores the completion arguments while the learner is inside the pronunciation practice gate
  const pendingCompletionRef = useRef(null);

  // Track interaction results for performance scoring
  const [interactionResults, setInteractionResults] = useState({});

  useEffect(() => {
    let isMounted = true;

    // Reset pronunciation gate when lesson changes/reloads.
    setShowPronunciationPractice(false);
    setPracticeDone(false);
    pendingCompletionRef.current = null;

    const loadData = async () => {
      // EPIC 2.2.1, 2.2.4: Load ordered lesson sections + resume progress for a consistent step structure.
      setIsLoading(true);
      setError('');
      try {
        if (isSample && lessonSectionSamples[lessonId]) {
          const sampleSections = localizeLessonSectionsPayload(
            lessonSectionSamples[lessonId].sort((a, b) => a.order - b.order),
            uiLanguage,
            contentLanguage
          );
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
          contentLanguage && contentLanguage !== uiLanguage
            ? getLessonSectionsWithContentLang(lessonId, uiLanguage, contentLanguage)
            : getLessonSections(lessonId, uiLanguage),
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
            setSuccessMessage(t('lessons.progressLoaded'));
            setTimeout(() => isMounted && setSuccessMessage(''), 2200);
          }

          // If lesson already completed, show a friendly note
          if (progressData?.completed) {
            // EPIC 6.2.1-6.2.4: Encouraging feedback when a learner has completed a lesson.
            setSuccessMessage(t('lessons.completedCongrats'));
            setTimeout(() => isMounted && setSuccessMessage(''), 4000);
          }
        }
      } catch (loadError) {
        if (isMounted) {
          // EPIC 6.5.3: Show friendly error message if lesson load fails.
          setError(t('lessons.unableToLoadSections'));
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
  }, [lessonId, isSample, reloadKey, t, uiLanguage, contentLanguage]);

  /** Increment reloadKey to re-trigger the data-loading effect (EPIC 6.5.4). */
  const handleRetryLoad = () => {
    setReloadKey((n) => n + 1);
  };


  // Lightweight array used for timeline rendering and navigation index calculations.
  // Avoids passing full section objects into non-rendering logic.
  const sectionList = useMemo(() => {
    return sections.map((section) => ({
      id: section._id || section.id,
      title: section.title,
      order: section.order || 0,
    }));
  }, [sections]);

  // Calculate the total number of interactions across all sections in this lesson.
  // This is used to determine the correct completion threshold instead of a hardcoded value.
  const totalInteractions = useMemo(() => {
    return sections.reduce((sum, section) => {
      const count = Array.isArray(section.interactions) ? section.interactions.length : 0;
      return sum + count;
    }, 0);
  }, [sections]);

  const condition = user?.learningCondition || '';
  const dyslexia = useDyslexiaContext({ condition, lessonId, defaultSyllableMode: true });
  // Syllable-decorated version of sectionList shown in the timeline for dyslexia users.
  // When syllable mode is off, returns the original sectionList directly.
  const displaySectionList = useMemo(() => {
    if (!dyslexia.applySyllables) return sectionList;
    return sectionList.map((s) => ({ ...s, title: decorateDyslexiaText(s.title) }));
  }, [dyslexia.applySyllables, sectionList]);

  // O(1) section lookup map: sectionId → full section object.
  // Used by the navigation handler and the section renderer.
  const sectionMap = useMemo(() => {
    const map = new Map();
    sections.forEach((section) => {
      map.set(section._id || section.id, section);
    });
    return map;
  }, [sections]);

  /**
   * Flatten all unique highlight phrases from every section into the format
   * expected by <PronunciationPractice>. De-duplicated by lowercased value.
   * An empty array disables the EPIC 3.3 pronunciation gate entirely.
   */
  const pronunciationItems = useMemo(() => {
    const phrases = [];
    for (const section of sections) {
      const highlights = Array.isArray(section?.highlights) ? section.highlights : [];
      for (const h of highlights) {
        const phrase = typeof h === 'string' ? h : (h?.phrase || '');
        const clean = String(phrase || '').trim();
        if (clean) phrases.push(clean);
      }
    }
    const unique = Array.from(new Set(phrases.map((p) => p.toLowerCase())))
      .map((lower) => phrases.find((p) => p.toLowerCase() === lower))
      .filter(Boolean);

    return unique.map((label, idx) => ({
      id: `dyslexia-${lessonId}-${idx}-${label}`,
      label,
      speakText: label,
      expectedForms: [label],
    }));
  }, [sections, lessonId]);

  /**
   * Persist lesson completion and fire the adaptive difficulty pipeline.
   *
   * Calculates a percentage score from tracked interaction results, then:
   *  - Real lessons: calls updateProgress() (EPIC 6.4.1), recordLessonScore() and
   *    adjustDifficulty() (EPIC 4.1), dispatches a 'progress:updated' event,
   *    shows a success message, and eventually calls onComplete().
   *  - Sample lessons: updates local state only, still records the score and
   *    calls /users/complete-lesson to log the event server-side.
   *
   * @param {string}   displayedSectionId - ID of the last visible section.
   * @param {string[]} nextCompleted      - Updated list of completed section IDs.
   */
  const completeLesson = useCallback(async ({ displayedSectionId, nextCompleted }) => {
    if (!displayedSectionId) return;

    // Calculate lesson score based on correct interactions
    // Score = (correct interactions / total interactions) * 100
    const totalInteractions = sections.reduce((sum, section) => {
      const count = Array.isArray(section.interactions) ? section.interactions.length : 0;
      return sum + count;
    }, 0);

    const correctInteractions = Object.values(interactionResults).filter(r => r === true).length;
    const score = totalInteractions > 0 ? (correctInteractions / totalInteractions) * 100 : 0;

    if (!isSample) {
      try {
        // EPIC 6.4.1: Auto-save completion state to backend at the end of the lesson.
        const updated = await updateProgress({
          lessonId,
          currentSectionId: displayedSectionId,
          completedSections: nextCompleted,
          isReplay: false,
        });

        setProgress(updated);

        if (updated?.completed) {
          // Record lesson score for adaptive difficulty adjustment
          recordLessonScore(user, lessonId, score, {
            module: 'dyslexia',
            totalInteractions,
            correctInteractions,
            completionDate: new Date().toISOString(),
          });

          // Check if difficulty should be adjusted
          const difficultyResult = adjustDifficulty(user);

          let msg = t('lessons.completedCongrats');

          // Add difficulty adjustment feedback if it changed
          if (difficultyResult.adjusted) {
            msg += ` Your difficulty level has been adjusted to ${difficultyResult.newDifficulty} based on your performance!`;
          } else if (difficultyResult.inCooldown) {
            msg += ' Great consistency! Difficulty will update after a couple more lessons to keep progression smooth.';
          }

          setSuccessMessage(msg);
          try {
            let summary = null;
            try { summary = await getSummary(); } catch (e) { /* ignore */ }
            window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId, summary } }));
            setTimeout(async () => {
              try {
                const summary2 = await getSummary().catch(() => null);
                window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId, summary: summary2 } }));
              } catch (e) {}
            }, 500);
          } catch (e) {}
          // Navigate to progress page after the success message has been visible for a moment
          setTimeout(() => {
            setSuccessMessage('');
            onComplete?.();
          }, 3000);
        }
      } catch (e) {
        setError(t('lessons.unableToSaveProgress'));
      }
      return;
    }

    // Sample lesson completion path
    setProgress((prev) => ({
      ...(prev || {}),
      currentSectionId: displayedSectionId,
      completedSections: nextCompleted,
      completed: true,
    }));

    // Record score for sample lessons too
    recordLessonScore(user, lessonId, score, {
      module: 'dyslexia',
      totalInteractions,
      correctInteractions,
      isSample: true,
      completionDate: new Date().toISOString(),
    });

    // Check if difficulty should be adjusted
    const difficultyResult = adjustDifficulty(user);

    let msg = t('lessons.completedCongrats');
    if (difficultyResult.adjusted) {
      msg += ` Your difficulty level has been adjusted to ${difficultyResult.newDifficulty}!`;
    } else if (difficultyResult.inCooldown) {
      msg += ' Keep going! We are pacing difficulty changes gradually for a steady learning flow.';
    }

    setSuccessMessage(msg);

    try {
      const api = await import('../../utils/api');
      const lessonKey = `sample-${lessonId}`;
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
      try { window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId } })); } catch (e) {}
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId } })); } catch (e) {}
      }, 500);
    }

    // Navigate to progress page after the success message has been visible for a moment
    setTimeout(() => {
      setSuccessMessage('');
      onComplete?.();
    }, 3000);
  }, [isSample, lessonId, sections, interactionResults, user, onComplete, t]);

  // ----- Derived display values -----
  // The section currently being shown – a replayed section takes precedence over the active one
  const displayedSectionId = replaySectionId || activeSectionId;
  // Full section object for the currently displayed section (passed to LessonSectionView)
  const displayedSection = displayedSectionId ? sectionMap.get(displayedSectionId) : null;
  // Array of section IDs already completed (available for replay)
  const completedSections = progress?.completedSections || [];
  // True when the user is viewing a previously completed section, not the active one
  const isReplay = Boolean(replaySectionId);
  // Most recently completed section; used as the target when the user taps the Replay button
  const lastCompletedSectionId = completedSections[completedSections.length - 1] || '';

  // Appreciation messages shown when a section's interactions are completed
  const sectionAppreciationMessages = [
    '🎉 Great job! Section complete! Moving to the next one…',
    '⭐ Well done! You nailed it! On to the next section…',
    '🌟 Awesome work! Section finished! Let\'s keep going…',
    '👏 Fantastic! You completed this section! Next one coming up…',
    '💪 Amazing effort! Section done! Let\'s continue…',
  ];

  const pickAppreciation = () => sectionAppreciationMessages[Math.floor(Math.random() * sectionAppreciationMessages.length)];

  // Track section that was just completed so auto-advance effect can fire
  const [pendingAutoAdvanceSectionId, setPendingAutoAdvanceSectionId] = useState(null);

  /**
   * Handler for tracking individual interaction results for performance scoring
   */
  const handleInteractionResult = React.useCallback(({ interactionId, isCorrect }) => {
    if (!interactionId) return;
    setInteractionResults((prev) => ({
      ...prev,
      [interactionId]: isCorrect,
    }));
  }, []);

  /**
   * Called by LessonSectionView when all interactions in a section are answered.
   * Updates the completedInteractionSections Set and marks the section for
   * the appreciation-message effect.
   */
  const handleSectionComplete = React.useCallback((sectionId, isComplete) => {
    if (!sectionId) return;
    setCompletedInteractionSections((prev) => {
      const next = new Set(prev);
      if (isComplete) {
        next.add(sectionId);
      } else {
        next.delete(sectionId);
      }
      return next;
    });

    // When a section is completed (not replaying), mark it for auto-advance
    if (isComplete) {
      setPendingAutoAdvanceSectionId(sectionId);
    }
  }, []);

  /**
   * Called when the focused interaction changes within a section.
   * Syncs currentInteractionSectionId so the timeline highlights the active step.
   */
  const handleInteractionChange = React.useCallback((sectionId, interactionIndex) => {
    setCurrentInteractionSectionId(sectionId);
  }, []);

  /**
   * Timeline click handler: selects a section for replay.
   * - Clicking the active section exits replay mode.
   * - Any other section is only navigable if it has been completed (EPIC 2.6.4).
   */
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

  /** Returns the 0-based index of sectionId in displaySectionList, or -1 if not found. */
  const getSectionIndex = (sectionId) => displaySectionList.findIndex((section) => section.id === sectionId);

  /**
   * Navigate forward (+1) or backward (-1) through the lesson sections.
   *
   * Forward navigation:
   *  - Blocks if the current section has incomplete interactions.
   *  - If past the last section, triggers lesson completion (with optional pronunciation gate).
   *  - Saves progress to the backend after every forward step (EPIC 6.4.1).
   *
   * Backward navigation:
   *  - Enters replay mode for the previous completed section (EPIC 2.6.3-2.6.4).
   *
   * @param {number} direction - +1 for forward, -1 for backward.
   */
  const handleNavigate = async (direction) => {
    if (!displayedSectionId) return;
    // Clear any previous warning when navigating
    setIncompleteWarning('');
    const currentIndex = getSectionIndex(displayedSectionId);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    const nextSection = sectionList[nextIndex];

    // Block forward navigation if the current section's interactions are not completed
    if (direction > 0 && !isReplay) {
      const currentSection = sectionMap.get(displayedSectionId);
      const hasInteractions = currentSection && Array.isArray(currentSection.interactions) && currentSection.interactions.length > 0;
      if (hasInteractions && !completedInteractionSections.has(displayedSectionId)) {
        setIncompleteWarning('Please complete all questions in this section before moving to the next one.');
        // Auto-clear the warning after 5 seconds
        setTimeout(() => setIncompleteWarning(''), 5000);
        return;
      }
    }

    // If trying to navigate past the last section -> treat as lesson completion
    if (!nextSection && direction > 0) {
      // EPIC 2.2.3: Manual forward navigation completes the final step.
      const nextCompleted = Array.from(new Set([...completedSections, displayedSectionId]));

      // EPIC 3.3: Gate lesson completion behind pronunciation practice.
      if (!practiceDone && pronunciationItems.length > 0) {
        pendingCompletionRef.current = { displayedSectionId, nextCompleted };
        setShowPronunciationPractice(true);
        return;
      }

      await completeLesson({ displayedSectionId, nextCompleted });

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
          // Navigate to progress page after the success message has been visible
          setTimeout(() => {
            setSuccessMessage('');
            onComplete?.();
          }, 3000);
        }
      } catch (e) {
        setError(t('lessons.unableToSaveProgress'));
      }
    } else {
      setProgress((prev) => ({
        ...(prev || {}),
        currentSectionId: nextSection.id,
        completedSections: nextCompleted,
      }));
    }
  };

  // Section-complete effect: when a section's interactions are all done,
  // show an appreciation message. The learner then presses Next (or Finish
  // on the last section) at their own pace — no automatic jumping.
  useEffect(() => {
    if (!pendingAutoAdvanceSectionId) return;
    // Only show appreciation if we're on the section that just finished and not in replay mode
    if (pendingAutoAdvanceSectionId !== displayedSectionId || replaySectionId) {
      setPendingAutoAdvanceSectionId(null);
      return;
    }

    // Show appreciation message
    setSuccessMessage(pickAppreciation());

    // Clear the message and the pending flag after 3 s — do NOT auto-navigate.
    // The learner uses the Next / Finish button to move forward at their own pace.
    const timer = setTimeout(() => {
      setSuccessMessage('');
      setPendingAutoAdvanceSectionId(null);
    }, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoAdvanceSectionId, displayedSectionId, replaySectionId]);


  // ----- Navigation-derived values (recalculated every render) -----
  // Previous/next section objects used to determine button enabled states
  const prevSection = displayedSectionId ? displaySectionList[getSectionIndex(displayedSectionId) - 1] : null;
  const nextSection = displayedSectionId ? displaySectionList[getSectionIndex(displayedSectionId) + 1] : null;
  // True when the user is on the final section and not replaying → Next button label becomes "Finish"
  const isLastSection = !isReplay && Boolean(displayedSectionId) && getSectionIndex(displayedSectionId) === displaySectionList.length - 1;
  // Back is only allowed when the previous section has been completed (supports replay navigation)
  const canGoBack = Boolean(prevSection && completedSections.includes(prevSection.id));
  // Next is allowed when moving forward through active sections or replaying through completed ones
  const canGoNext = Boolean(
    !isReplay && displayedSectionId && (nextSection || isLastSection)
  ) || Boolean(
    isReplay && nextSection && completedSections.includes(nextSection.id)
  );
  // Replay toggle is enabled as soon as at least one section has been completed
  const canReplay = Boolean(lastCompletedSectionId) || isReplay;

  // Priority-ordered guidance text for the lesson guidance area.
  // Warnings > success feedback > errors > parent notices > contextual hints.
  const guidanceText = incompleteWarning
    ? incompleteWarning
    : successMessage
      ? successMessage
      : error
        ? error
        : notice
          ? notice
          : isReplay
            ? t('lessons.replayingNotice')
            : t('lessons.replayHint');

  const resolvedTitle = lessonTitle || t('lessons.lesson');
  const resolvedSubtitle = lessonSubtitle || 'Move through one section at a time for steady progress.';

  return (
    <LessonLayout
      // EPIC 2.7.1-2.7.4: Shared lesson shell (header/guidance/footer) for predictable layout and transitions.
      title={resolvedTitle}
      subtitle={resolvedSubtitle}
      onBack={onExit}
      backLabel={t('lessons.back')}
      guidance={(
        <div className="lesson-guidance">
          <p className="lesson-guidance__label">{t('lessons.guidance')}</p>
          <p className={`lesson-guidance__text${error ? ' is-error' : ''}${incompleteWarning ? ' is-warning' : ''}${successMessage ? ' is-success' : ''}`}>{guidanceText}</p>
          {notice && onRetry && !isSample && (
            <div style={{ marginTop: 8 }}>
              <button type="button" onClick={onRetry}>{t('lessons.retry')}</button>
            </div>
          )}
        </div>
      )}
      footer={showPronunciationPractice ? null : (
        <LessonNav
          // EPIC 2.2.3, 2.7.2: Manual navigation with buttons kept in fixed positions.
          onBack={() => handleNavigate(-1)}
          onNext={() => handleNavigate(1)}
          onReplay={handleReplayToggle}
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          canReplay={canReplay}
          isReplay={isReplay}
          nextLabel={isLastSection ? t('lessons.finish') : t('lessons.next')}
        />
      )}
    >
      {showPronunciationPractice ? (
        <PronunciationPractice
          title={t('lessons.pronunciationTitle')}
          subtitle={t('lessons.pronunciationSubtitle')}
          items={pronunciationItems}
          recognitionLang="en-US"
          ttsLang="en-US"
          playbackRate={0.85}
          onExit={() => {
            setShowPronunciationPractice(false);
          }}
          onComplete={async () => {
            setPracticeDone(true);
            setShowPronunciationPractice(false);
            const pending = pendingCompletionRef.current;
            pendingCompletionRef.current = null;
            if (pending?.displayedSectionId && Array.isArray(pending?.nextCompleted)) {
              await completeLesson({
                displayedSectionId: pending.displayedSectionId,
                nextCompleted: pending.nextCompleted,
              });
            }
          }}
        />
      ) : (
      <div className="lesson-replay">
        <div className="lesson-replay-grid">
          <div className="lesson-replay-panel fx-card">
            <div className="lesson-replay-panel__header">
              <h2>{t('lessons.timelineTitle')}</h2>
              <p>{t('lessons.timelineSubtitle')}</p>
            </div>
            {isLoading ? (
              // EPIC 6.5.2: Show “Loading…” while lesson loads.
              <p className="lesson-replay-loading">{t('lessons.loadingSections')}</p>
            ) : error ? (
              <div className="fx-card">
                {/* EPIC 6.5.3: Friendly error message if lesson fails to load. */}
                <p className="is-error">{error}</p>
                {/* EPIC 6.5.4: Provide a retry button. */}
                {!isSample && <button type="button" onClick={handleRetryLoad}>{t('lessons.retry')}</button>}
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
                      {isCompleted && <span className="timeline-tag">{t('lessons.tagCompleted')}</span>}
                      {isCurrent && <span className="timeline-tag accent">{t('lessons.tagCurrent')}</span>}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          <div className="lesson-section-panel">
            {isLoading ? (
              <div className="lesson-replay-loading fx-card">{t('lessons.preparingSection')}</div>
            ) : displayedSection ? (
              <div className="lesson-content-fade" key={displayedSectionId}>
                {isReplay && <div className="replay-banner">{t('lessons.replayBanner')}</div>}
                {/* EPIC 2.1.1-2.1.4, 2.3.1-2.3.4, 2.4.1-2.4.4, 2.5.1-2.5.4: Section delivers text/audio/visuals with interactions + guidance + highlights. */}
                <LessonSectionView 
                  section={displayedSection} 
                  isReplay={isReplay} 
                  useLocalSubmission={isSample}
                  lessonId={lessonId}
                  totalInteractions={totalInteractions}
                  uiLanguage={uiLanguage}
                  contentLanguage={contentLanguage}
                  onInteractionChange={handleInteractionChange}
                  onSectionComplete={handleSectionComplete}
                  onInteractionResult={handleInteractionResult}
                />
              </div>
            ) : (
              <div className="lesson-replay-empty fx-card">{t('lessons.selectSectionToBegin')}</div>
            )}
          </div>
        </div>
      </div>
      )}
    </LessonLayout>
  );
};

export default LessonReplay;
