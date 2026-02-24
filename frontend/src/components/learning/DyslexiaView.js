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
// Component-specific styles
import './DyslexiaView.css';

/**
 * DyslexiaView – Functional component for the dyslexia-specific dashboard.
 * Renders the navbar, reading guide, lesson grid, and learning tips.
 */
const DyslexiaView = () => {
  // Destructure the authenticated user and the logout handler from AuthContext
  const { user, logout } = useAuth();

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
      title: 'Greetings',
      titleSyllables: 'Greet-ings',
      level: 'Beginner',
      apiId: 'lesson-greetings',
      Icon: MessageCircle,
      color: '#ffd700',
      description: 'Learn "Hello", "Hi", and friendly phrases',
      descriptionSyllables: 'Learn "Hello" (Hel-lo), "Hi", and friend-ly phrases',
      totalSections: 2,
      totalInteractions: 8,
    },
    {
      id: 2,
      title: 'Basic Words',
      titleSyllables: 'Ba-sic Words',
      level: 'Beginner',
      apiId: 'lesson-vocabulary',
      Icon: BookOpen,
      color: '#90caf9',
      description: 'Everyday objects, people, and actions',
      descriptionSyllables: 'E-ve-ry-day words like ap-ple, chair, book',
      totalSections: 3,
      totalInteractions: 11,
    },
    {
      id: 3,
      title: 'Numbers',
      titleSyllables: 'Num-bers',
      level: 'Beginner',
      apiId: 'lesson-numbers',
      Icon: Hash,
      color: '#a5d6a7',
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
  const uiText = React.useCallback((normalText, syllableText) => (syllableMode ? syllableText : normalText), [syllableMode]);

  /**
   * UI copy dictionary – every user-facing string has a normal and a
   * syllable-split variant. The `uiText` helper selects the right one
   * based on the current syllableMode state.
   */
  const copy = {
    greeting: uiText('Hello', 'Hel-lo'),
    welcomeTitle: uiText('Welcome to Your Learning Space', 'Wel-come to Your Learn-ing Space'),
    welcomeBody: uiText(
      'Dyslexia is about how the brain processes language sounds (not vision). Reading can take extra time, so try decoding words in parts (syllables) like: fantastic. This space supports you with clear fonts, proper spacing, and visual cues to make reading easier.',
      'Dyslexia is about how the brain processes language sounds (not vision). Reading can take extra time, so try decoding words in parts (syllables) like: fan–tas–tic. This space supports you with clear fonts, proper spacing, and visual cues to make reading easier.'
    ),
    guideTitle: uiText('Reading Guide', 'Read-ing Guide'),
    lessonsTitle: uiText('Available Lessons', 'A-vail-a-ble Les-sons'),
    tipsTitle: uiText('Learning Tips for You', 'Learn-ing Tips for You'),

    guideSoundsBody: uiText(
      'Dyslexia is linked to phonological processing. Try saying the word out loud, then read it.',
      'Dyslexia is linked to phon-o-log-i-cal pro-cess-ing. Try saying the word out loud, then read it.'
    ),
    guideBreakBodyPrefix: uiText('Read by parts (syllables):', 'Read by parts (syl-la-bles):'),
    guideBreakChip: uiText('fantastic', 'fan–tas–tic'),
    guideBreakBodySuffix: uiText('Take your time.', 'Take your time.'),
    guideSpellingBody: uiText(
      "It's common to spell phonetically at first. Practice helps the brain build faster reading paths.",
      "It’s common to spell pho-net-i-cal-ly at first. Practice helps the brain build faster reading paths."
    ),

    tipBreakTitle: uiText('Break It Down', 'Break It Down'),
    tipBreakBody: uiText(
      'Focus on one lesson at a time. Small steps lead to big progress!',
      'Focus on one lesson at a time. Small steps lead to big pro-gress!'
    ),
    tipAudioTitle: uiText('Use Audio', 'Use Au-di-o'),
    tipAudioBody: uiText(
      'Listen to pronunciations to reinforce learning through multiple senses.',
      'Listen to pro-nun-ci-a-tions to re-in-force learn-ing through mul-ti-ple sen-ses.'
    ),
    tipPracticeTitle: uiText('Practice Regularly', 'Prac-tice Reg-u-lar-ly'),
    tipPracticeBody: uiText(
      'Short, frequent sessions work better than long study periods.',
      'Short, fre-quent ses-sions work bet-ter than long stu-dy pe-ri-ods.'
    ),

    lessonCta: uiText('Start Learning', 'Start Learn-ing'),
  };

  return (
    <div className="dyslexia-view">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} aria-hidden="true" />
            <span>LinguaEase Learning</span>
          </h1>
        </div>
        <div className="nav-menu">
          <span className="user-name">{copy.greeting}, {user?.name}!</span>
          <button
            type="button"
            onClick={toggleSyllableMode}
            className="btn-settings btn-syllable-toggle"
            title="Toggle syllable-friendly text"
            aria-pressed={syllableMode}
          >
            {syllableMode ? (
              <ToggleRight size={18} aria-hidden="true" />
            ) : (
              <ToggleLeft size={18} aria-hidden="true" />
            )}
            <span className="btn-syllable-toggle__label">Syllable Mode</span>
            <span className="btn-syllable-toggle__state">{syllableMode ? 'On' : 'Off'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/progress')}
            className="btn-settings"
            title="View progress"
          >
            Progress
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="btn-settings"
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={18} aria-hidden="true" />
          </button>
          <button onClick={logout} className="btn-logout">
            Logout
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
        <section className="guide-section" aria-label="Reading guide">
          <h3>{copy.guideTitle}</h3>
          <div className="guide-grid">
            <div className="guide-card">
              <div className="guide-card__title">
                <Volume2 size={18} aria-hidden="true" />
                <span>Sounds First</span>
              </div>
              <p>
                {copy.guideSoundsBody}
              </p>
            </div>
            <div className="guide-card">
              <div className="guide-card__title">
                <BookOpen size={18} aria-hidden="true" />
                <span>Break It Down</span>
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
                <span>Spelling is Sound-Based</span>
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
              
              return (
                <div key={lesson.id} className="lesson-card">
                  <div className="lesson-icon" style={{ background: `linear-gradient(135deg, ${lesson.color}88, ${lesson.color})` }}>
                    <lesson.Icon size={28} aria-hidden="true" />
                  </div>
                  <h4>{syllableMode ? lesson.titleSyllables : lesson.title}</h4>
                  <p className="lesson-description">{syllableMode ? lesson.descriptionSyllables : lesson.description}</p>
                  <div className="lesson-meta">
                    <span className="badge">{difficultyLevel}</span>
                    <span className={`status-pill status-${statusClass}`}>{progress.status}</span>
                  </div>
                  <div className="lesson-progress">
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="progress-text">{percent}% Complete</span>
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
