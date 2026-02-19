
// DyslexiaView: Main learning interface for users with dyslexia support needs.
// Provides syllable mode, lesson navigation, and progress tracking.
// Integrates with user preferences and local progress storage.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllLessonProgress, normalizeUserId } from '../../services/dyslexiaProgressService';
import ProfileSettings from '../ProfileSettings';
import { BookOpen, Hash, Info, MessageCircle, Settings, ToggleLeft, ToggleRight, Volume2 } from 'lucide-react';
import { useDyslexiaSyllableMode } from '../../utils/dyslexiaSyllableMode';
import './DyslexiaView.css';

const DyslexiaView = () => {
  // Auth context
  const { user, logout } = useAuth();
  // UI state for settings panel
  const [showSettings, setShowSettings] = useState(false);
  // Track lesson progress for current user
  const [lessonProgress, setLessonProgress] = useState({});
  // Syllable mode toggle for dyslexia-friendly text
  const [syllableMode, setSyllableMode] = useDyslexiaSyllableMode(true);
  const navigate = useNavigate();

  // EPIC 1.4: Dyslexia-friendly reading support (syllable mode + spacing/font via preferences)

  // List of available lessons (with syllable-friendly titles/descriptions)
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
    },
  ];

  // Toggle syllable mode for all UI text
  const toggleSyllableMode = () => {
    // EPIC 1.4.2: Reading assistance toggle (syllable-friendly text)
    setSyllableMode((prev) => !prev);
  };

  // Start a lesson (navigate to lesson page)
  const handleStartLesson = (lesson) => {
    navigate(`/lessons/${lesson.apiId}`);
  };

  // Load lesson progress for current user on mount or user change
  useEffect(() => {
    const key = normalizeUserId(user);
    if (!key) {
      setLessonProgress({});
      return;
    }
    const progress = getAllLessonProgress(key);
    setLessonProgress(progress || {});
  }, [user]);

  // Helper to switch between normal and syllable-friendly text
  const uiText = React.useCallback((normalText, syllableText) => (syllableMode ? syllableText : normalText), [syllableMode]);

  // UI copy for dyslexia-friendly onboarding
  const copy = {
    greeting: uiText('Hi', 'Hi'),
    welcomeTitle: uiText('Welcome!', 'Wel-come!'),
    welcomeBody: uiText(
      'This space helps you read and learn. Try breaking words into parts. Use the tools to help you.',
      'This space helps you read and learn. Try breaking words into parts. Use the tools to help you.'
    ),
    guideTitle: uiText('Guide', 'Guide'),
    lessonsTitle: uiText('Lessons', 'Les-sons'),
    tipsTitle: uiText('Tips', 'Tips'),

    guideSoundsBody: uiText(
      'Try saying the word out loud, then read it.',
      'Try saying the word out loud, then read it.'
    ),
    guideBreakBodyPrefix: uiText('Read by parts:', 'Read by parts:'),
    guideBreakChip: uiText('fantastic', 'fan–tas–tic'),
    guideBreakBodySuffix: uiText('Take your time.', 'Take your time.'),
    guideSpellingBody: uiText(
      "It is okay to spell by sound. Practice helps you get better.",
      "It is okay to spell by sound. Practice helps you get better."
    ),

    tipBreakTitle: uiText('Break It Down', 'Break It Down'),
    tipBreakBody: uiText(
      'Do one lesson at a time. Small steps help you learn!',
      'Do one lesson at a time. Small steps help you learn!'
    ),
    tipAudioTitle: uiText('Use Audio', 'Use Au-di-o'),
    tipAudioBody: uiText(
      'Listen to words to help you learn.',
      'Listen to words to help you learn.'
    ),
    tipPracticeTitle: uiText('Practice Often', 'Prac-tice Of-ten'),
    tipPracticeBody: uiText(
      'Short, regular practice is best.',
      'Short, regular practice is best.'
    ),

    lessonCta: uiText('Start', 'Start'),
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
            title="Toggle syllable-friendly text"
            aria-pressed={syllableMode}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {syllableMode ? (
              <ToggleRight size={18} aria-hidden="true" />
            ) : (
              <ToggleLeft size={18} aria-hidden="true" />
            )}
            <span>Syllable Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="btn-settings"
            title="Settings"
            aria-label="Settings"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Settings size={18} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button onClick={logout} className="btn-logout" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {showSettings && (
        <ProfileSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Main Content */}
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

        {/* Lessons Grid */}
        <div className="lessons-section">
          <h3>{copy.lessonsTitle}</h3>
          <div className="lessons-grid">
            {lessons.map((lesson) => {
              const progress = lessonProgress?.[lesson.apiId] || { status: 'Not Started', correctCount: 0 };
              const percent = Math.min(100, Math.round(((progress.correctCount || 0) / 5) * 100));
              const statusClass = (progress.status || 'Not Started').replace(/\s+/g, '-').toLowerCase();
              return (
                <div key={lesson.id} className="lesson-card">
                  <div className="lesson-icon" style={{ background: `linear-gradient(135deg, ${lesson.color}88, ${lesson.color})` }}>
                    <lesson.Icon size={28} aria-hidden="true" />
                  </div>
                  <h4>{syllableMode ? lesson.titleSyllables : lesson.title}</h4>
                  <p className="lesson-description">{syllableMode ? lesson.descriptionSyllables : lesson.description}</p>
                  <div className="lesson-meta">
                    <span className="badge">{lesson.level}</span>
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

export default DyslexiaView;
