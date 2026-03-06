/**
 * DyslexiaView.js
 *
 * Main learning dashboard for users with dyslexia support needs.
 * This component serves as the primary interface for dyslexic learners,
 * providing syllable-mode text, lesson navigation, progress tracking,
 * and evidence-based reading guides.
 *
 * Key features:
 *  - Syllable mode toggle: splits words into syllables for easier decoding
 *  - Lesson cards with individual progress bars and status badges
 *  - Reading guide section with phonological awareness tips
 *  - Integrates with AuthContext for user data and logout
 *  - Persists lesson progress via dyslexiaProgressService (localStorage)
 *
 * Related EPICs:
 *  - EPIC 1.4: Dyslexia-friendly reading support
 *  - EPIC 1.4.2: Reading assistance toggle (syllable-friendly text)
 */

// React core and hooks
import React, { useEffect, useState } from 'react';
// Navigation hook for programmatic routing
import { useNavigate } from 'react-router-dom';
// Authentication context – provides current user object and logout function
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
// Service for reading/writing per-user lesson progress from localStorage
import { getAllLessonProgress, normalizeUserId } from '../../services/dyslexiaProgressService';
// Performance-based difficulty adjustment service
import { getCurrentDifficulty, getPerformanceSummary } from '../../services/difficultyAdjustmentService';
// Next-lesson recommendation service
import {
  getNextLessonRecommendation,
  skipRecommendation,
  isRecommendationSkipped,
  clearSkipState,
} from '../../services/nextLessonService';
// Next-lesson recommendation card component
import NextLessonCard from './NextLessonCard';
// Reusable profile/settings modal component
import ProfileSettings from '../ProfileSettings';
// Icon components from lucide-react used in the UI
import { BookOpen, Hash, Info, MessageCircle, Settings, ToggleLeft, ToggleRight, Volume2, TrendingUp } from 'lucide-react';
// Custom hook that persists the syllable-mode preference in localStorage
import { useDyslexiaSyllableMode } from '../../utils/dyslexiaSyllableMode';
import { useI18n } from '../../utils/i18n';
// Component-specific styles
import './DyslexiaView.css';

/**
 * DyslexiaView – Functional component for the dyslexia-specific dashboard.
 * Renders the navbar, reading guide, lesson grid, and learning tips.
 */
const DyslexiaView = () => {
  // Destructure the authenticated user and the logout handler from AuthContext
  const { user, logout } = useAuth();
  const { preferences, updateAccessibilitySettings } = usePreferences();

  // Controls whether the ProfileSettings modal is visible
  const [showSettings, setShowSettings] = useState(false);

  // Stores a mapping of lessonApiId → { status, correctCount } loaded from localStorage
  const [lessonProgress, setLessonProgress] = useState({});

  // Current difficulty level based on performance (adaptive learning)
  const [currentDifficulty, setCurrentDifficulty] = useState('Beginner');

  // Performance summary for the user
  const [performanceSummary, setPerformanceSummary] = useState(null);

  // Next-lesson recommendation state
  const [recommendation, setRecommendation] = useState(null);

  // Syllable mode: when true, all UI text is rendered with syllable-split variants.
  // The custom hook persists the preference to localStorage so it survives page reloads.
  const [syllableMode, setSyllableMode] = useDyslexiaSyllableMode(true);
  const { t, lang } = useI18n();
  const isEnglish = lang === 'english';

  // React Router hook for programmatic navigation
  const navigate = useNavigate();

  // EPIC 1.4: Dyslexia-friendly reading support (syllable mode + spacing/font via preferences)

  /**
   * Static list of available lessons.
   * Each lesson object contains:
   *  - id: unique numeric identifier for rendering keys
   *  - title / titleSyllables: normal and syllable-split display names
   *  - level: difficulty label shown as a badge
   *  - apiId: identifier used for backend API calls and local progress keys
   *  - Icon: lucide-react icon component rendered on the lesson card
   *  - color: accent colour used for the gradient on the icon circle
   *  - description / descriptionSyllables: short blurb about the lesson
   *  - totalSections: number of sections in the lesson (used for progress calculation)
   *  - totalInteractions: total number of interactions across all sections
   */
  const lessons = [
    {
      id: 1,
      titleKey: 'learning.dyslexia.lessonGreetingsTitle',
      title: 'Greetings',
      titleSyllables: 'Greet-ings',
      level: 'Beginner',
      apiId: 'lesson-greetings',
      Icon: MessageCircle,
      color: '#ffd700',
      descriptionKey: 'learning.dyslexia.lessonGreetingsDesc',
      description: 'Learn "Hello", "Hi", and friendly phrases',
      descriptionSyllables: 'Learn "Hello" (Hel-lo), "Hi", and friend-ly phrases',
      totalSections: 2,
      totalInteractions: 8,
    },
    {
      id: 2,
      titleKey: 'learning.dyslexia.lessonBasicWordsTitle',
      title: 'Basic Words',
      titleSyllables: 'Ba-sic Words',
      level: 'Beginner',
      apiId: 'lesson-vocabulary',
      Icon: BookOpen,
      color: '#90caf9',
      descriptionKey: 'learning.dyslexia.lessonBasicWordsDesc',
      description: 'Everyday objects, people, and actions',
      descriptionSyllables: 'E-ve-ry-day words like ap-ple, chair, book',
      totalSections: 3,
      totalInteractions: 11,
    },
    {
      id: 3,
      titleKey: 'learning.dyslexia.lessonNumbersTitle',
      title: 'Numbers',
      titleSyllables: 'Num-bers',
      level: 'Beginner',
      apiId: 'lesson-numbers',
      Icon: Hash,
      color: '#a5d6a7',
      descriptionKey: 'learning.dyslexia.lessonNumbersDesc',
      description: 'Count, match, and order numbers',
      descriptionSyllables: 'Count, match, and or-der num-bers',
      totalSections: 3,
      totalInteractions: 11,
    },
  ];

  /**
   * Toggle syllable mode on/off.
   * EPIC 1.4.2: Reading assistance toggle – when enabled, all labels,
   * descriptions, and guide text render with syllable-split variants
   * to help dyslexic readers decode unfamiliar words.
   */
  const toggleSyllableMode = () => {
    setSyllableMode((prev) => !prev);
  };

  /**
   * Navigate to the individual lesson page for the selected lesson.
   * Uses the lesson's apiId as the URL parameter so the LessonPage
   * component can load the correct content from the backend or local samples.
   */
  const handleStartLesson = (lesson) => {
    navigate(`/lessons/${lesson.apiId}`);
  };

  /**
   * Accept the recommended next lesson — navigate directly to that lesson page.
   */
  const handleAcceptRecommendation = (lesson) => {
    navigate(`/lessons/${lesson.apiId}`);
  };

  /**
   * Skip the recommendation — hide the card for this session.
   * The learner can still manually pick any lesson from the grid below.
   * Skipping does NOT affect progress in any way.
   */
  const handleSkipRecommendation = (lesson) => {
    skipRecommendation(lesson.apiId);
    // Force a re-render by updating the recommendation state with skip applied
    setRecommendation((prev) => ({ ...prev, _skipped: true }));
  };

  /**
   * Load lesson progress and difficulty level from localStorage whenever the user changes.
   * normalizeUserId extracts a stable key (e.g. ObjectId or email)
   * from the user object so progress is scoped per-user.
   * If no valid key exists (logged-out state), reset progress to empty.
   * 
   * Also loads current difficulty level and performance summary for adaptive learning.
   */
  useEffect(() => {
    const key = normalizeUserId(user);
    if (!key) {
      setLessonProgress({});
      setCurrentDifficulty('Beginner');
      setPerformanceSummary(null);
      return;
    }
    
    // Load lesson progress
    const progress = getAllLessonProgress(key);
    setLessonProgress(progress || {});
    
    // Load current difficulty level
    const difficulty = getCurrentDifficulty(user);
    setCurrentDifficulty(difficulty);
    
    // Load performance summary
    const summary = getPerformanceSummary(user);
    setPerformanceSummary(summary);
    
    // Compute next-lesson recommendation
    const rec = getNextLessonRecommendation(user);
    setRecommendation(rec);
    
    // Clear skip state if the recommended lesson has changed
    // (e.g. user completed the previously skipped lesson)
    if (rec.recommendation && !isRecommendationSkipped(rec.recommendation.apiId)) {
      clearSkipState();
    }
  }, [user]);

  /**
   * Memoised helper that returns syllable-friendly text when syllableMode is on,
   * or the standard text otherwise. Used to build the `copy` object below.
   */
  const uiText = React.useCallback(
    (normalText, syllableText) => (syllableMode && isEnglish ? syllableText : normalText),
    [syllableMode, isEnglish]
  );

  const displayStatus = React.useCallback(
    (status) => {
      const value = status || 'Not Started';
      if (isEnglish) return value;
      const normalized = String(value).toLowerCase();
      if (normalized.includes('complete')) return t('learning.common.statusCompleted');
      if (normalized.includes('progress')) return t('learning.common.statusInProgress');
      if (normalized.includes('not started') || normalized.includes('not-started')) return t('learning.common.statusNotStarted');
      return value;
    },
    [isEnglish, t]
  );

  /**
   * UI copy dictionary – every user-facing string has a normal and a
   * syllable-split variant. The `uiText` helper selects the right one
   * based on the current syllableMode state.
   */
  const copy = {
    greeting: uiText(t('learning.dyslexia.greeting'), 'Hel-lo'),
    welcomeTitle: uiText(t('learning.dyslexia.welcomeTitle'), 'Wel-come to Your Learn-ing Space'),
    welcomeBody: uiText(
      t('learning.dyslexia.welcomeBody'),
      'Dyslexia is about how the brain processes language sounds (not vision). Reading can take extra time, so try decoding words in parts (syllables) like: fan–tas–tic. This space supports you with clear fonts, proper spacing, and visual cues to make reading easier.'
    ),
    guideTitle: uiText(t('learning.dyslexia.guideTitle'), 'Read-ing Guide'),
    lessonsTitle: uiText(t('learning.dyslexia.lessonsTitle'), 'A-vail-a-ble Les-sons'),
    tipsTitle: uiText(t('learning.dyslexia.tipsTitle'), 'Learn-ing Tips for You'),

    guideSoundsBody: uiText(
      t('learning.dyslexia.guideSoundsBody'),
      'Dyslexia is linked to phon-o-log-i-cal pro-cess-ing. Try saying the word out loud, then read it.'
    ),
    guideBreakBodyPrefix: uiText(t('learning.dyslexia.guideBreakBodyPrefix'), 'Read by parts (syl-la-bles):'),
    guideBreakChip: uiText(t('learning.dyslexia.guideBreakChip'), 'fan–tas–tic'),
    guideBreakBodySuffix: uiText(t('learning.dyslexia.guideBreakBodySuffix'), 'Take your time.'),
    guideSpellingBody: uiText(
      t('learning.dyslexia.guideSpellingBody'),
      "It’s common to spell pho-net-i-cal-ly at first. Practice helps the brain build faster reading paths."
    ),

    tipBreakTitle: uiText(t('learning.dyslexia.tipBreakTitle'), 'Break It Down'),
    tipBreakBody: uiText(
      t('learning.dyslexia.tipBreakBody'),
      'Focus on one lesson at a time. Small steps lead to big pro-gress!'
    ),
    tipAudioTitle: uiText(t('learning.dyslexia.tipAudioTitle'), 'Use Au-di-o'),
    tipAudioBody: uiText(
      t('learning.dyslexia.tipAudioBody'),
      'Listen to pro-nun-ci-a-tions to re-in-force learn-ing through mul-ti-ple sen-ses.'
    ),
    tipPracticeTitle: uiText(t('learning.dyslexia.tipPracticeTitle'), 'Prac-tice Reg-u-lar-ly'),
    tipPracticeBody: uiText(
      t('learning.dyslexia.tipPracticeBody'),
      'Short, fre-quent ses-sions work bet-ter than long stu-dy pe-ri-ods.'
    ),

    lessonCta: uiText(t('learning.dyslexia.lessonCta'), 'Start Learn-ing'),
  };

  return (
    <div className="dyslexia-view">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} aria-hidden="true" />
            <span>{t('learning.common.brandLearning')}</span>
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
          <button
            type="button"
            onClick={() => navigate('/progress')}
            className="btn-settings"
            title="Progress"
            aria-label="Progress"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Hash size={18} aria-hidden="true" />
            <span>Progress</span>
          </button>
          <button
            type="button"
            onClick={toggleSyllableMode}
            className="btn-settings btn-syllable-toggle"
            title={t('learning.dyslexia.toggleSyllableTitle')}
            aria-pressed={syllableMode}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {syllableMode ? (
              <ToggleRight size={18} aria-hidden="true" />
            ) : (
              <ToggleLeft size={18} aria-hidden="true" />
            )}
            <span className="btn-syllable-toggle__label">{t('learning.dyslexia.syllableMode')}</span>
            <span className="btn-syllable-toggle__state">{syllableMode ? t('learning.common.on') : t('learning.common.off')}</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              const newValue = !preferences?.simplifiedLayout;
              await updateAccessibilitySettings({ simplifiedLayout: newValue });
            }}
            className="btn-settings btn-simplified-toggle"
            title="Toggle simple layout"
            aria-pressed={preferences?.simplifiedLayout}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {preferences?.simplifiedLayout ? (
              <ToggleRight size={18} aria-hidden="true" />
            ) : (
              <ToggleLeft size={18} aria-hidden="true" />
            )}
            <span className="btn-simplified-toggle__label">Simple</span>
            <span className="btn-simplified-toggle__state">{preferences?.simplifiedLayout ? t('learning.common.on') : t('learning.common.off')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="btn-settings"
            title={t('learning.common.settings')}
            aria-label={t('learning.common.settings')}
          >
            <Settings size={18} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button onClick={logout} className="btn-logout">
            {t('learning.common.logout')}
          </button>
        </div>
      </nav>

      {/* Conditionally render the ProfileSettings modal when the user clicks the gear icon */}
      {showSettings && (
        <ProfileSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Main Content – welcome section, reading guide, lessons grid, and tips */}
      <main className="main-content">
        <div className="welcome-section">
          <h2>{copy.welcomeTitle}</h2>
          <p className="subtitle">
            {copy.welcomeBody}
          </p>
        </div>

        {/* Reading Guide */}
        <section className="guide-section" aria-label={t('learning.dyslexia.guideTitle')}>
          <h3>{copy.guideTitle}</h3>
          <div className="guide-grid">
            <div className="guide-card">
              <div className="guide-card__title">
                <Volume2 size={18} aria-hidden="true" />
                <span>{t('learning.dyslexia.guideSoundsFirstTitle')}</span>
              </div>
              <p>
                {copy.guideSoundsBody}
              </p>
            </div>
            <div className="guide-card">
              <div className="guide-card__title">
                <BookOpen size={18} aria-hidden="true" />
                <span>{t('learning.dyslexia.guideBreakItDownTitle')}</span>
              </div>
              <p>
                {copy.guideBreakBodyPrefix}{' '}
                <span className="syllable-chip">{copy.guideBreakChip}</span>.
                {' '}{copy.guideBreakBodySuffix}
              </p>
            </div>
            <div className="guide-card">
              <div className="guide-card__title">
                <Info size={18} aria-hidden="true" />
                <span>{t('learning.dyslexia.guideSpellingSoundBasedTitle')}</span>
              </div>
              <p>
                {copy.guideSpellingBody}
              </p>
            </div>
          </div>
        </section>

        {/* Next-Lesson Recommendation — shown prominently above the lessons grid */}
        {recommendation && (
          <section className="lessons-section" aria-label="Recommended next lesson">
            {recommendation.allCompleted ? (
              <NextLessonCard
                allCompleted
                completionMsg={recommendation.reason}
                totalLessons={recommendation.totalLessons}
                syllableMode={syllableMode}
              />
            ) : (
              recommendation.recommendation &&
              !isRecommendationSkipped(recommendation.recommendation.apiId) &&
              !recommendation._skipped && (
                <NextLessonCard
                  recommendation={recommendation.recommendation}
                  reason={recommendation.reason}
                  completedCount={recommendation.completedCount}
                  totalLessons={recommendation.totalLessons}
                  syllableMode={syllableMode}
                  onAccept={handleAcceptRecommendation}
                  onSkip={handleSkipRecommendation}
                />
              )
            )}
          </section>
        )}

        {/* Lessons Grid – renders a card for each lesson with icon, description, progress bar, and start button */}
        <div className="lessons-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>{copy.lessonsTitle}</h3>
            {performanceSummary && performanceSummary.totalLessons > 0 && (
              <div className="performance-indicator" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 16px', 
                background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                <TrendingUp size={18} aria-hidden="true" />
                <span>Current Level: {currentDifficulty}</span>
                {performanceSummary.recentAverage > 0 && (
                  <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                    ({performanceSummary.recentAverage.toFixed(0)}% avg)
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="lessons-grid">
            {lessons.map((lesson) => {
              // Look up stored progress for this lesson; default to 'Not Started' / 0 correct
              const progress = lessonProgress?.[lesson.apiId] || { status: 'Not Started', correctCount: 0 };
              // Use the stored totalInteractions from progress if available, otherwise fall back to the lesson definition
              const total = progress.totalInteractions || lesson.totalInteractions || 1;
              // Calculate completion percentage based on the actual number of interactions in the lesson
              const percent = Math.min(100, Math.round(((progress.correctCount || 0) / total) * 100));
              // Convert status text to a CSS-safe class name (e.g. "Not Started" → "not-started")
              const statusClass = (progress.status || 'Not Started').replace(/\s+/g, '-').toLowerCase();
              // Use adaptive difficulty level instead of hardcoded "Beginner"
              const difficultyLevel = currentDifficulty || lesson.level;
              const lessonTitle = isEnglish
                ? (syllableMode ? lesson.titleSyllables : lesson.title)
                : t(lesson.titleKey);
              const lessonDescription = isEnglish
                ? (syllableMode ? lesson.descriptionSyllables : lesson.description)
                : t(lesson.descriptionKey);
              const lessonLevel = isEnglish ? difficultyLevel : t('learning.common.beginner');
              return (
                <div key={lesson.id} className="lesson-card">
                  <div className="lesson-icon" style={{ background: `linear-gradient(135deg, ${lesson.color}88, ${lesson.color})` }}>
                    <lesson.Icon size={28} aria-hidden="true" />
                  </div>
                  <h4>{lessonTitle}</h4>
                  <p className="lesson-description">{lessonDescription}</p>
                  <div className="lesson-meta">
                    <span className="badge">{lessonLevel}</span>
                    <span className={`status-pill status-${statusClass}`}>{displayStatus(progress.status)}</span>
                  </div>
                  <div className="lesson-progress">
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="progress-text">{t('learning.common.percentComplete', { percent })}</span>
                  </div>
                  <button className="btn btn-primary btn-block" onClick={() => handleStartLesson(lesson)}>
                    {copy.lessonCta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tips Section */}
        <div className="tips-section">
          <h3>{copy.tipsTitle}</h3>
          <div className="tips-grid">
            <div className="tip-card">
              <h4>{copy.tipBreakTitle}</h4>
              <p>{copy.tipBreakBody}</p>
            </div>
            <div className="tip-card">
              <h4>{copy.tipAudioTitle}</h4>
              <p>{copy.tipAudioBody}</p>
            </div>
            <div className="tip-card">
              <h4>{copy.tipPracticeTitle}</h4>
              <p>{copy.tipPracticeBody}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Export DyslexiaView as the default export for use in the router
export default DyslexiaView;
