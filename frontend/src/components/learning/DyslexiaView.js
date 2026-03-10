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
   *
   * The apiId suffix changes based on the selected language so the correct
   * lesson content (English / Hindi / Tamil) is loaded.
   */
  // Language suffix appended to each lesson's apiId so the backend
  // returns content in the correct language. Empty string for English,
  // e.g. "lesson-greetings" (English) vs "lesson-greetings-hindi" (Hindi).
  const langSuffix = lang === 'hindi' ? '-hindi' : lang === 'tamil' ? '-tamil' : '';

  const lessons = [
    {
      id: 1,
      titleKey: 'learning.dyslexia.lessonGreetingsTitle',
      title: lang === 'hindi' ? 'अभिवादन' : lang === 'tamil' ? 'வாழ்த்துகள்' : 'Greetings',
      titleSyllables: lang === 'hindi' ? 'अभिवादन' : lang === 'tamil' ? 'வாழ்த்துகள்' : 'Greet-ings',
      level: 'Beginner',
      apiId: `lesson-greetings${langSuffix}`,
      Icon: MessageCircle,
      color: '#ffd700',
      descriptionKey: 'learning.dyslexia.lessonGreetingsDesc',
      description: lang === 'hindi'
        ? '"नमस्ते", "हाय", और दोस्ताना वाक्य सीखें'
        : lang === 'tamil'
          ? '"வணக்கம்", "ஹாய்", மற்றும் நட்பான சொற்றொடர்கள் கற்றுக்கொள்ளுங்கள்'
          : 'Learn "Hello", "Hi", and friendly phrases',
      descriptionSyllables: lang === 'hindi'
        ? '"नमस्ते", "हाय", और दोस्ताना वाक्य सीखें'
        : lang === 'tamil'
          ? '"வணக்கம்", "ஹாய்", நட்பான சொற்றொடர்கள்'
          : 'Learn "Hello" (Hel-lo), "Hi", and friend-ly phrases',
      totalSections: 2,
      totalInteractions: 8,
    },
    {
      id: 2,
      titleKey: 'learning.dyslexia.lessonBasicWordsTitle',
      title: lang === 'hindi' ? 'मूल शब्द' : lang === 'tamil' ? 'அடிப்படை சொற்கள்' : 'Basic Words',
      titleSyllables: lang === 'hindi' ? 'मूल शब्द' : lang === 'tamil' ? 'அடிப்படை சொற்கள்' : 'Ba-sic Words',
      level: 'Beginner',
      apiId: `lesson-vocabulary${langSuffix}`,
      Icon: BookOpen,
      color: '#90caf9',
      descriptionKey: 'learning.dyslexia.lessonBasicWordsDesc',
      description: lang === 'hindi'
        ? 'रोज़मर्रा की वस्तुएँ, लोग और क्रियाएँ'
        : lang === 'tamil'
          ? 'அன்றாட பொருட்கள், மக்கள், மற்றும் செயல்கள்'
          : 'Everyday objects, people, and actions',
      descriptionSyllables: lang === 'hindi'
        ? 'रोज़मर्रा की वस्तुएँ जैसे कुर्सी, सेब, किताब'
        : lang === 'tamil'
          ? 'அன்றாட சொற்கள்: நாற்காலி, ஆப்பிள், புத்தகம்'
          : 'E-ve-ry-day words like ap-ple, chair, book',
      totalSections: 3,
      totalInteractions: 11,
    },
    {
      id: 3,
      titleKey: 'learning.dyslexia.lessonNumbersTitle',
      title: lang === 'hindi' ? 'संख्याएँ' : lang === 'tamil' ? 'எண்கள்' : 'Numbers',
      titleSyllables: lang === 'hindi' ? 'संख्याएँ' : lang === 'tamil' ? 'எண்கள்' : 'Num-bers',
      level: 'Beginner',
      apiId: `lesson-numbers${langSuffix}`,
      Icon: Hash,
      color: '#a5d6a7',
      descriptionKey: 'learning.dyslexia.lessonNumbersDesc',
      description: lang === 'hindi'
        ? 'गिनें, मिलाएँ, और संख्याएँ क्रम में लगाएँ'
        : lang === 'tamil'
          ? 'எண்ணுங்கள், பொருத்துங்கள், மற்றும் எண்களை வரிசைப்படுத்துங்கள்'
          : 'Count, match, and order numbers',
      descriptionSyllables: lang === 'hindi'
        ? 'गिनें, मिलाएँ, और क्रम में लगाएँ'
        : lang === 'tamil'
          ? 'எண்ணுங்கள், பொருத்துங்கள், வரிசைப்படுத்துங்கள்'
          : 'Count, match, and or-der num-bers',
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

  /**
   * Memoised callback that maps an English progress-status string
   * ("Completed", "In Progress", "Not Started") to its localised
   * equivalent for non-English languages. When the UI is already in
   * English the raw value is returned as-is. The normalisation step
   * (lowercasing + substring check) keeps the mapping resilient to
   * minor variations in the stored status strings.
   *
   * @param {string|undefined} status – raw status from lesson progress data
   * @returns {string} localised status label
   */
  const displayStatus = React.useCallback(
    (status) => {
      const value = status || 'Not Started';
      // English UI – no translation needed
      if (isEnglish) return value;
      // Normalise to lowercase for case-insensitive comparison
      const normalized = String(value).toLowerCase();
      if (normalized.includes('complete')) return t('learning.common.statusCompleted');
      if (normalized.includes('progress')) return t('learning.common.statusInProgress');
      if (normalized.includes('not started') || normalized.includes('not-started')) return t('learning.common.statusNotStarted');
      // Fallback: return the original value if no translation key matches
      return value;
    },
    [isEnglish, t]
  );

  /**
   * UI copy dictionary – every user-facing string has a normal and a
   * syllable-split variant. The `uiText` helper selects the right one
   * based on the current syllableMode state.
   */
  // Each key holds the result of uiText(normal, syllable):
  // – Normal variant uses the i18n translation function t()
  // – Syllable variant is an English-only hand-crafted split
  // The active variant depends on syllableMode and the current language.
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
      {/*
        ── Navigation Bar ──
        Top-level navbar containing:
        1. Brand logo + label
        2. Home button      – returns to the main dashboard
        3. Progress button   – navigates to the progress overview page
        4. Syllable toggle   – enables / disables syllable-split text (EPIC 1.4.2)
        5. Simple layout toggle – hides non-essential UI sections for reduced cognitive load
        6. Settings button   – opens the ProfileSettings modal
        7. Logout button     – signs the user out via AuthContext
      */}
      <nav className="navbar">
        {/* Brand logo and application title */}
        <div className="nav-brand">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} aria-hidden="true" />
            <span>{t('learning.common.brandLearning')}</span>
          </h1>
        </div>
        <div className="nav-menu">
          {/* Home button – navigates back to the main dashboard */}
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
          {/* Progress button – navigates to the learner's progress/analytics page */}
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
          {/*
            Syllable Mode toggle (EPIC 1.4.2)
            When pressed, all UI text switches between normal and
            syllable-split variants to aid phonological decoding.
            aria-pressed communicates the toggle state to screen readers.
          */}
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
          {/*
            Simplified Layout toggle
            Hides secondary UI sections (reading guide, progress meta,
            performance indicator) to reduce visual clutter and
            cognitive load for users who prefer a minimal interface.
            The preference is persisted via the PreferencesContext.
          */}
          <button
            type="button"
            onClick={async () => {
              // Toggle the simplifiedLayout flag and persist it
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
          {/* Settings button – opens the ProfileSettings modal overlay */}
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
          {/* Logout button – calls AuthContext.logout to end the session */}
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

        {/*
          ── Reading Guide Section ──
          Three evidence-based tips for dyslexic readers:
          1. Sounds First  – encourages speaking words aloud (phonological awareness)
          2. Break It Down – demonstrates syllable splitting with a visual chip
          3. Spelling Is Sound-Based – reassures that phonetic spelling is normal

          Hidden when simplified layout is active to reduce cognitive load.
        */}
        {!preferences?.simplifiedLayout && (
          <section className="guide-section" aria-label={t('learning.dyslexia.guideTitle')}>
            <h3>{copy.guideTitle}</h3>
            <div className="guide-grid">
            {/* Guide Card 1 – Sounds First: phonological awareness tip */}
            <div className="guide-card">
              <div className="guide-card__title">
                <Volume2 size={18} aria-hidden="true" />
                <span>{t('learning.dyslexia.guideSoundsFirstTitle')}</span>
              </div>
              <p>
                {copy.guideSoundsBody}
              </p>
            </div>
            {/* Guide Card 2 – Break It Down: syllable decoding demonstration */}
            <div className="guide-card">
              <div className="guide-card__title">
                <BookOpen size={18} aria-hidden="true" />
                <span>{t('learning.dyslexia.guideBreakItDownTitle')}</span>
              </div>
              <p>
                {copy.guideBreakBodyPrefix}{' '}
                {/* syllable-chip renders the word with visible syllable delimiters */}
                <span className="syllable-chip">{copy.guideBreakChip}</span>.
                {' '}{copy.guideBreakBodySuffix}
              </p>
            </div>
            {/* Guide Card 3 – Spelling Is Sound-Based: reassurance about phonetic spelling */}
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
        )}

        {/*
          ── Next-Lesson Recommendation ──
          Shown prominently above the lessons grid to guide the learner
          towards the most appropriate next lesson.

          Two states:
          A) allCompleted === true  → congratulatory card, all lessons done
          B) recommendation exists  → card with "Start" / "Skip" actions
             - Hidden if the learner has already skipped this recommendation
               during the current session (tracked via nextLessonService).
        */}
        {recommendation && (
          <section className="lessons-section" aria-label="Recommended next lesson">
            {recommendation.allCompleted ? (
              /* State A: All lessons completed – show congratulations message */
              <NextLessonCard
                allCompleted
                completionMsg={recommendation.reason}
                totalLessons={recommendation.totalLessons}
                syllableMode={syllableMode}
              />
            ) : (
              /* State B: Recommended lesson available and not skipped */
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
            {/*
              Performance Indicator pill
              Displays the learner's adaptive difficulty level (e.g. "Beginner")
              and their recent average score percentage.
              Hidden in simplified layout or when no lessons have been attempted.
            */}
            {!preferences?.simplifiedLayout && performanceSummary && performanceSummary.totalLessons > 0 && (
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
          {/*
            ── Lesson Card Loop ──
            Iterates over the static `lessons` array and renders a card
            for each one. Each card shows:
              • Icon with a coloured gradient circle
              • Localised title and description (syllable-split if active)
              • Difficulty badge (driven by the adaptive difficulty system)
              • Status pill ("Not Started" / "In Progress" / "Completed")
              • Progress bar (percentage of correctly answered interactions)
              • "Start Learning" CTA button
            The progress data is sourced from localStorage via dyslexiaProgressService.
          */}
          <div className="lessons-grid">
            {lessons.map((lesson) => {
              // Look up stored progress for this lesson; default to 'Not Started' / 0 correct
              const progress = lessonProgress?.[lesson.apiId] || { status: 'Not Started', correctCount: 0 };
              // Use the stored totalInteractions from progress if available, otherwise fall back to the lesson definition
              const total = progress.totalInteractions || lesson.totalInteractions || 1;
              // Calculate completion percentage: cap at 100% to handle edge cases
              const percent = Math.min(100, Math.round(((progress.correctCount || 0) / total) * 100));
              // Convert status text to a CSS-safe class name (e.g. "Not Started" → "not-started")
              const statusClass = (progress.status || 'Not Started').replace(/\s+/g, '-').toLowerCase();
              // Use adaptive difficulty level from the difficulty adjustment system
              const difficultyLevel = currentDifficulty || lesson.level;

              // Resolve the display title: use syllable variant when syllableMode
              // is active (English only); otherwise use the i18n translated key
              const lessonTitle = isEnglish
                ? (syllableMode ? lesson.titleSyllables : lesson.title)
                : t(lesson.titleKey);
              // Same logic for the lesson description
              const lessonDescription = isEnglish
                ? (syllableMode ? lesson.descriptionSyllables : lesson.description)
                : t(lesson.descriptionKey);
              // Level badge label – localised for non-English languages
              const lessonLevel = isEnglish ? difficultyLevel : t('learning.common.beginner');
              return (
                <div key={lesson.id} className="lesson-card">
                  {/* Gradient icon circle – colour defined per lesson */}
                  <div className="lesson-icon" style={{ background: `linear-gradient(135deg, ${lesson.color}88, ${lesson.color})` }}>
                    <lesson.Icon size={28} aria-hidden="true" />
                  </div>
                  {/* Lesson title (syllable-split or normal) */}
                  <h4>{lessonTitle}</h4>
                  {/* Short description of what the lesson covers */}
                  <p className="lesson-description">{lessonDescription}</p>
                  {/* Meta information and progress bar – hidden in simplified layout */}
                  {!preferences?.simplifiedLayout && (
                    <>
                      <div className="lesson-meta">
                        {/* Difficulty badge (adaptive) */}
                        <span className="badge">{lessonLevel}</span>
                        {/* Status pill – colour varies by status via CSS class */}
                        <span className={`status-pill status-${statusClass}`}>{displayStatus(progress.status)}</span>
                      </div>
                      <div className="lesson-progress">
                        {/* Visual progress bar filled to `percent`% */}
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                        </div>
                        {/* Textual progress label, e.g. "45% Complete" */}
                        <span className="progress-text">{t('learning.common.percentComplete', { percent })}</span>
                      </div>
                    </>
                  )}
                  {/* CTA button – navigates to the lesson page */}
                  <button className="btn btn-primary btn-block" onClick={() => handleStartLesson(lesson)}>
                    {copy.lessonCta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/*
          ── Tips Section ──
          Three actionable learning tips displayed as cards:
          1. Break It Down      – encourages tackling one lesson at a time
          2. Use Audio          – promotes multi-sensory learning via audio
          3. Practice Regularly – advocates short, frequent study sessions
          All text respects syllable mode when active (English only).
        */}
        <div className="tips-section">
          <h3>{copy.tipsTitle}</h3>
          <div className="tips-grid">
            {/* Tip 1 – Break It Down */}
            <div className="tip-card">
              <h4>{copy.tipBreakTitle}</h4>
              <p>{copy.tipBreakBody}</p>
            </div>
            {/* Tip 2 – Use Audio */}
            <div className="tip-card">
              <h4>{copy.tipAudioTitle}</h4>
              <p>{copy.tipAudioBody}</p>
            </div>
            {/* Tip 3 – Practice Regularly */}
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
