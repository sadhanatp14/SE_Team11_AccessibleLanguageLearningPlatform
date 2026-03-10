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
import { adjustDifficulty, getCurrentDifficulty, recordLessonScore } from '../../services/difficultyAdjustmentService';
// Next-lesson recommendation service
import {
  getNextLessonRecommendation,
  skipRecommendation,
  isRecommendationSkipped,
  clearSkipState,
} from '../../services/nextLessonService';
// API utility
import api from '../../utils/api';
// Next-lesson recommendation card component
import NextLessonCard from './NextLessonCard';
// Reusable profile/settings modal component
import ProfileSettings from '../ProfileSettings';
// Icon components from lucide-react used in the UI
import { Award, BookOpen, ChevronLeft, Hash, Info, Languages, Menu, MessageCircle, Settings, Volume2, TrendingUp, X } from 'lucide-react';
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
  // Controls whether the slide-in side menu (quick controls panel) is open
  const [showSideMenu, setShowSideMenu] = useState(false);

  // Stores a mapping of lessonApiId → { status, correctCount } loaded from localStorage
  const [lessonProgress, setLessonProgress] = useState({});

  // Current difficulty level based on performance (adaptive learning)
  const [currentDifficulty, setCurrentDifficulty] = useState('Beginner');

  // Next-lesson recommendation state
  const [recommendation, setRecommendation] = useState(null);

  // Motivation feedback message fetched from the backend API (EPIC: Motivation Feedback).
  // Displayed as an encouraging banner below the recommendation card when available.
  const [motivation, setMotivation] = useState(null);

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
    {
      id: 4,
      // Fixed-language supplemental lesson – always loads Tamil content regardless of UI language.
      // Allows learners to sample Tamil greetings even when the UI is set to English or Hindi.
      titleKey: 'learning.dyslexia.lessonTamilTitle',
      title: 'Tamil Foundations: Everyday Greetings',
      titleSyllables: 'Ta-mil Foun-da-tions: Eve-ry-day Greet-ings',
      level: 'Beginner',
      apiId: 'lesson-tamil-essentials',
      Icon: Languages,
      color: '#f59e0b',
      descriptionKey: 'learning.dyslexia.lessonTamilDesc',
      description: 'Practice greetings and polite words in Tamil',
      descriptionSyllables: 'Prac-tice greet-ings and po-lite words in Ta-mil',
      totalSections: 2,
      totalInteractions: 6,
    },
    {
      id: 5,
      // Fixed-language supplemental lesson – always loads Hindi content regardless of UI language.
      // Allows learners to sample Hindi greetings even when the UI is set to English or Tamil.
      titleKey: 'learning.dyslexia.lessonHindiTitle',
      title: 'Hindi Foundations: Everyday Greetings',
      titleSyllables: 'Hin-di Foun-da-tions: Eve-ry-day Greet-ings',
      level: 'Beginner',
      apiId: 'lesson-hindi-essentials',
      Icon: Languages,
      color: '#a855f7',
      descriptionKey: 'learning.dyslexia.lessonHindiDesc',
      description: 'Practice greetings and polite words in Hindi',
      descriptionSyllables: 'Prac-tice greet-ings and po-lite words in Hin-di',
      totalSections: 2,
      totalInteractions: 6,
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
      return;
    }
    
    // Load lesson progress
    const progress = getAllLessonProgress(key);
    setLessonProgress(progress || {});

    // EPIC 4.1.1-4.1.4: Convert completed dyslexia lesson progress into scores,
    // then apply one-level adaptive difficulty changes.
    //
    // Strategy: a "score sync map" (keyed by lessonId + a content signature) is
    // stored in localStorage so each completed lesson is only scored once, even
    // if this effect re-runs multiple times for the same user.
    const scoreSyncKey = `dyslexia-difficulty-score-sync:${key}`;
    let scoreSyncMap = {};
    try {
      scoreSyncMap = JSON.parse(window.localStorage.getItem(scoreSyncKey) || '{}');
    } catch {
      scoreSyncMap = {};
    }

    let hasNewScores = false;
    Object.entries(progress || {}).forEach(([lessonId, lessonData]) => {
      const status = String(lessonData?.status || '').toLowerCase();
      if (!status.includes('complete')) return;

      // Build a unique signature for this lesson's completion state.
      // Using updatedAt when available; otherwise falling back to correctCount:total.
      // This prevents re-scoring if the user replays a lesson with the same score.
      const signature = lessonData?.updatedAt || `${lessonData?.correctCount || 0}:${lessonData?.totalInteractions || 0}`;
      const syncEntryKey = `${lessonId}:${signature}`;
      if (scoreSyncMap[syncEntryKey]) return;

      const totalInteractions = Math.max(1, Number(lessonData?.totalInteractions || 0));
      const correctCount = Math.max(0, Number(lessonData?.correctCount || 0));
      const score = Math.max(0, Math.min(100, Math.round((correctCount / totalInteractions) * 100)));

      recordLessonScore(user, lessonId, score, {
        module: 'dyslexia',
        correctCount,
        totalInteractions,
      });
      scoreSyncMap[syncEntryKey] = true;
      hasNewScores = true;
    });

    if (hasNewScores) {
      try {
        window.localStorage.setItem(scoreSyncKey, JSON.stringify(scoreSyncMap));
      } catch {
        // non-blocking
      }
      adjustDifficulty(user);
    }
    
    // Load current difficulty level
    const difficulty = getCurrentDifficulty(user);
    setCurrentDifficulty(difficulty);
    
    // Compute next-lesson recommendation
    const rec = getNextLessonRecommendation(user);
    setRecommendation(rec);
    
    // Clear skip state if the recommended lesson has changed
    // (e.g. user completed the previously skipped lesson)
    if (rec.recommendation && !isRecommendationSkipped(rec.recommendation.apiId)) {
      clearSkipState();
    }

    /**
     * Fetch a personalised motivational message from the backend.
     * The message is displayed as an encouraging banner above the tips section.
     * Errors are swallowed so a network failure doesn't break the page.
     */
    const fetchMotivation = async () => {
      try {
        const res = await api.get('/dyslexia/recommendations/motivation');
        if (res.data?.success && res.data?.motivation) {
          setMotivation(res.data.motivation);
        }
      } catch (err) {
        console.error('Error fetching motivation:', err);
        // Non-blocking error
      }
    };
    fetchMotivation();
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
            title={t('learning.common.home')}
            aria-label={t('learning.common.home')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BookOpen size={18} aria-hidden="true" />
            <span>{t('learning.common.home')}</span>
          </button>
          {/* Progress button – navigates to the learner's progress/analytics page */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-settings"
            title={t('learning.common.back')}
            aria-label={t('learning.common.back')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ChevronLeft size={18} aria-hidden="true" />
            <span>{t('learning.common.back')}</span>
          </button>
          {/* Logout button – calls AuthContext.logout to end the session */}
          <button onClick={logout} className="btn-logout">
            {t('learning.common.logout')}
          </button>
          <button
            type="button"
            onClick={() => setShowSideMenu((prev) => !prev)}
            className="btn-settings"
            title={t('learning.common.menu')}
            aria-label={t('learning.common.menu')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {showSideMenu ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            <span>{t('learning.common.menu')}</span>
          </button>
        </div>
      </nav>

      {/*
        ── Side Menu ──
        A slide-in panel (right side) that exposes quick controls:
        Progress, Badges, Syllable Mode toggle, Simplified Layout toggle,
        and Settings. The semi-transparent backdrop dismisses the menu
        when clicked, keeping the interaction model intuitive.
      */}
      {showSideMenu && (
        <>
          {/* Semi-transparent backdrop – click to close the side menu */}
          <div
            onClick={() => setShowSideMenu(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.35)',
              zIndex: 190,
            }}
          />
          {/* Side panel containing quick-access controls */}
          <aside
            aria-label="Dyslexia side menu"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '300px',
              maxWidth: '88vw',
              height: '100vh',
              background: '#ffffff',
              borderLeft: '1px solid #e5e7eb',
              boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.15)',
              padding: '18px',
              zIndex: 200,
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{t('learning.common.quickControls')}</h3>
              <button type="button" className="btn-settings" onClick={() => setShowSideMenu(false)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {/* Progress – navigate to the progress overview page */}
              <button
                type="button"
                onClick={() => {
                  navigate('/progress');
                  setShowSideMenu(false);
                }}
                className="btn-settings"
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Hash size={18} aria-hidden="true" />
                <span>{t('learning.common.progress')}</span>
              </button>

              {/* Badges – navigate to the achievements/badges page */}
              <button
                type="button"
                onClick={() => {
                  navigate('/badges');
                  setShowSideMenu(false);
                }}
                className="btn-settings"
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Award size={18} aria-hidden="true" />
                <span>{t('learning.common.badges')}</span>
              </button>

              {/* Syllable Mode toggle (EPIC 1.4.2) – split words for easier decoding */}
              <button
                type="button"
                onClick={toggleSyllableMode}
                className="btn-settings btn-syllable-toggle"
                style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                aria-pressed={syllableMode ? 'true' : 'false'}
                title={t('learning.dyslexia.toggleSyllableTitle')}
              >
                <span>{t('learning.dyslexia.syllableMode')}</span>
                <span>{syllableMode ? t('learning.common.on') : t('learning.common.off')}</span>
              </button>

              {/* Simplified Layout toggle – hides non-essential UI sections */}
              <button
                type="button"
                onClick={async () => {
                  const newValue = !preferences?.simplifiedLayout;
                  await updateAccessibilitySettings({ simplifiedLayout: newValue });
                }}
                className="btn-settings"
                style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
              >
                <span>{t('learning.common.simple')}</span>
                <span>{preferences?.simplifiedLayout ? t('learning.common.on') : t('learning.common.off')}</span>
              </button>

              {/* Settings – open the ProfileSettings modal */}
              <button
                type="button"
                onClick={() => {
                  setShowSettings(true);
                  setShowSideMenu(false);
                }}
                className="btn-settings"
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Settings size={18} aria-hidden="true" />
                <span>{t('learning.common.settings')}</span>
              </button>
            </div>
          </aside>
        </>
      )}

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

        {/* FEATURE: Display current difficulty level */}
        {currentDifficulty && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#2e7d32'
          }}>
            <TrendingUp size={18} aria-hidden="true" />
            <span>
              {isEnglish && syllableMode ? 'Cur-rent Le-vel:' : t('learning.common.currentLevelLabel')} {currentDifficulty}
            </span>
          </div>
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
          <section className="lessons-section" aria-label={t('learning.nextLesson.recommendedAria')}>
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

        {/* EPIC 4.3: Personalized Learning Path (linear, clear, low-overload) */}
        <section
          aria-label="Dyslexia learning path"
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
            {isEnglish && syllableMode ? 'Learn-ing Path' : t('learning.common.learningPathTitle')}
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {lessons.map((lesson, index) => {
              // Determine completion status from stored progress
              const progressEntry = lessonProgress?.[lesson.apiId];
              const isCompleted = String(progressEntry?.status || '').toLowerCase().includes('complete');
              // Determine the "current" lesson: prefer the recommendation if one exists,
              // otherwise find the first lesson that has not been completed yet.
              const currentApiId = recommendation?.recommendation?.apiId
                || lessons.find((item) => !String(lessonProgress?.[item.apiId]?.status || '').toLowerCase().includes('complete'))?.apiId;
              // A lesson is "current" when it's the next to tackle and hasn't been completed
              const isCurrent = currentApiId === lesson.apiId && !isCompleted;
              // Resolve the display title respecting syllable mode and language
              const title = isEnglish
                ? (syllableMode ? lesson.titleSyllables : lesson.title)
                : t(lesson.titleKey);

              return (
                <div
                  key={`dyslexia-path-${lesson.apiId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isCurrent ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    background: isCurrent ? '#eff6ff' : '#ffffff'
                  }}
                >
                  <span style={{ fontWeight: isCurrent ? 700 : 500 }}>{index + 1}. {title}</span>
                  <span style={{ fontSize: '12px', color: isCompleted ? '#166534' : isCurrent ? '#1d4ed8' : '#6b7280' }}>
                    {isEnglish && syllableMode
                      ? (isCompleted ? '✓ Com-plet-ed' : isCurrent ? 'Cur-rent' : 'Up-com-ing')
                      : (isCompleted
                        ? `✓ ${t('learning.common.statusCompleted')}`
                        : isCurrent
                          ? t('learning.common.statusCurrent')
                          : t('learning.common.statusUpcoming'))}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/*
          ── Open All Lessons CTA ──
          A banner that links to the full lesson library so learners are not
          restricted to the curated path above. Useful for review or exploration.
          Navigates to /lesson-library which renders all available lesson cards.
        */}
        <section
          aria-label={t('learning.common.openAllLessons')}
          style={{
            background: 'linear-gradient(135deg, #eef2ff, #dbeafe)',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#1e3a8a' }}>
              {isEnglish && syllableMode ? 'Open All Les-sons' : t('learning.common.openAllLessons')}
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '14px' }}>
              {isEnglish && syllableMode
                ? 'Pick any les-son and start prac-tice from a sep-a-rate page.'
                : t('learning.common.useOpenAllLessons')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/lesson-library')}
            style={{
              border: 'none',
              borderRadius: '10px',
              background: '#2563eb',
              color: '#ffffff',
              padding: '10px 14px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {isEnglish && syllableMode ? 'Open Les-sons' : t('learning.common.openAllLessons')}
          </button>
        </section>

        {/*
          ── Motivation Feedback Banner ──
          Conditionally rendered only when the backend returns a motivation
          object. Displays an encouraging message with an orange accent to
          maintain learner engagement. Syllable-split heading is shown when
          syllable mode is active (English only).
        */}
        {motivation && (
          <section className="motivation-section" style={{
            background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)',
            borderLeft: '4px solid #ff9800',
            padding: '16px 20px',
            marginBottom: '24px',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <MessageCircle size={20} aria-hidden="true" style={{ flexShrink: 0, marginTop: '4px', color: '#ff9800' }} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#e65100', marginBottom: '4px' }}>
                  {syllableMode && isEnglish ? 'Mo-ti-va-tion-al Feed-back' : 'Motivational Feedback'}
                </p>
                <p style={{ margin: 0, color: '#bf360c', lineHeight: '1.5' }}>
                  {motivation.message || 'Keep up the great work on your learning journey!'}
                </p>
              </div>
            </div>
          </section>
        )}

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
