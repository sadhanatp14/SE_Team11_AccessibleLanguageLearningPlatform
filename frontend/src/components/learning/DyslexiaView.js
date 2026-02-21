
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
import { useI18n } from '../../utils/i18n';
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
  const { t, lang } = useI18n();
  const isEnglish = lang === 'english';
  const navigate = useNavigate();

  // EPIC 1.4: Dyslexia-friendly reading support (syllable mode + spacing/font via preferences)

  // List of available lessons (with syllable-friendly titles/descriptions)
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

  // UI copy for dyslexia-friendly onboarding
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
          <span className="user-name">{copy.greeting}, {user?.name}!</span>
          <button
            type="button"
            onClick={toggleSyllableMode}
            className="btn-settings btn-syllable-toggle"
            title={t('learning.dyslexia.toggleSyllableTitle')}
            aria-pressed={syllableMode}
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
            onClick={() => navigate('/progress')}
            className="btn-settings"
            title={t('learning.dyslexia.viewProgressTitle')}
          >
            {t('learning.common.progress')}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="btn-settings"
            title={t('learning.common.settings')}
            aria-label={t('learning.common.settings')}
          >
            <Settings size={18} aria-hidden="true" />
          </button>
          <button onClick={logout} className="btn-logout">
            {t('learning.common.logout')}
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

        {/* Lessons Grid */}
        <div className="lessons-section">
          <h3>{copy.lessonsTitle}</h3>
          <div className="lessons-grid">
            {lessons.map((lesson) => {
              const progress = lessonProgress?.[lesson.apiId] || { status: 'Not Started', correctCount: 0 };
              const percent = Math.min(100, Math.round(((progress.correctCount || 0) / 5) * 100));
              const statusClass = (progress.status || 'Not Started').replace(/\s+/g, '-').toLowerCase();
              const lessonTitle = isEnglish
                ? (syllableMode ? lesson.titleSyllables : lesson.title)
                : t(lesson.titleKey);
              const lessonDescription = isEnglish
                ? (syllableMode ? lesson.descriptionSyllables : lesson.description)
                : t(lesson.descriptionKey);
              const lessonLevel = isEnglish ? lesson.level : t('learning.common.beginner');
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

export default DyslexiaView;
