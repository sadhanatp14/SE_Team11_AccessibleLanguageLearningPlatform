
// ADHDView: Main learning interface for users with ADHD support needs.
// Provides lesson navigation, session timing, feedback, and progress auto-saving.
// Integrates with user preferences and backend progress APIs.
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import ProfileSettings from '../ProfileSettings';
import './ADHDView.css';
import ReactConfetti from 'react-confetti';
import { getSummary } from '../../services/progressService';
import api from '../../utils/api';
// Icon imports for UI elements
import {
  Bot,
  BookOpen,
  ChevronLeft,
  Dumbbell,
  Hand,
  Hash,
  Headphones,
  Lightbulb,
  Pause,
  Pencil,
  Play,
  Rocket,
  RotateCcw,
  Settings,
  Target,
  Timer,
  ToggleLeft,
  ToggleRight,
  Volume2,
} from 'lucide-react';

const ADHDView = ({ initialLessonId = null }) => {
  // Auth and preferences context
  const { user, logout } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const navigate = useNavigate();

  // Session and timer state
  const [timeRemaining, setTimeRemaining] = useState(null); // Time left in session
  const [isSessionActive, setIsSessionActive] = useState(false); // Is a lesson session active?
  const [showSettings, setShowSettings] = useState(false); // Show/hide settings panel
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // Cooldown timer after session

  // Lesson logic state
  const [activeLesson, setActiveLesson] = useState(null); // Current lesson object
  const [steps, setSteps] = useState([]); // Steps/questions in the lesson
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Current step index
  const [showHint, setShowHint] = useState(false); // Show/hide hint for current step
  const [attempts, setAttempts] = useState(0); // Number of attempts for current step
  const [feedback, setFeedback] = useState(null); // Feedback message for user
  const [score, setScore] = useState(0); // Total score for session
  const [currentLessonScore, setCurrentLessonScore] = useState(0); // Score for current lesson
  const [lessonPhase, setLessonPhase] = useState('idle'); // Phase: idle, active, completed, etc.
  const [isTransitioning, setIsTransitioning] = useState(false); // UI transition state
  const [isLoading, setIsLoading] = useState(false); // Loading state for async actions
  const [playbackRate, setPlaybackRate] = useState(1); // Audio playback speed

  // Window and UI state
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight }); // For confetti, etc.
  const [countdownValue, setCountdownValue] = useState(5); // Countdown before session starts
  const [dummyUpdate, setDummyUpdate] = useState(0); // Used to force re-renders on audio state changes

  // Track completed lessons in this session (prevents duplicate saves)
  const savedCompletionRef = React.useRef(new Set());

  // Save lesson completion to backend and broadcast progress update
  const saveLessonCompletion = async (lessonId) => {
    try {
      const lessonKey = `adhd-lesson-${lessonId}`;

      // EPIC 6.1.1, 6.4.1: Store completion state and auto-save after lesson completion.
      const res = await api.post('/users/complete-lesson', { lessonKey });

      const summaryFromBackend = res?.data?.summary;
      if (summaryFromBackend) {
        // EPIC 6.4.1: Broadcast progress updates so ProgressPage/dashboard refresh automatically.
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: { summary: summaryFromBackend } }));
      } else {
        try {
          // EPIC 6.7.1-6.7.2: Best-effort fallback if backend did not include summary.
          const s = await getSummary();
          if (s) window.dispatchEvent(new CustomEvent('progress:updated', { detail: { summary: s } }));
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // EPIC 6.7.1-6.7.2: Completion should not break the lesson flow if saving fails.
      // Non-blocking: completion should not break the lesson flow
      console.error('Error saving ADHD lesson completion', e);
    }
  };

  const exitLesson = () => {
    window.speechSynthesis.cancel();
    setActiveLesson(null);
    setLessonPhase('idle');
    setSteps([]);
    setCurrentStepIndex(0);
    setFeedback(null);
    setShowHint(false);
    setAttempts(0);
    setIsTransitioning(false);
    setIsLoading(false);
    setCountdownValue(5);
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Audio handling
  // Audio handling
  const [currentAudio, setCurrentAudio] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const playAudio = async (text, rate = 1) => {
    // EPIC 3.1.2: Read lesson text aloud using clear audio (backend TTS with browser fallback).
    // EPIC 3.5.3: Keep audio consistent in quality by using the same TTS path.
    // EPIC 3.5.4: Listening/replay does not affect score.
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    try {
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed: rate })
      });

      if (!response.ok) throw new Error('Audio generation failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.playbackRate = rate;

      audio.play().catch(e => console.error("Playback failed:", e));
      setCurrentAudio(audio);
      setIsPlaying(true);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setCurrentAudio(null);
        setIsPlaying(false);
      };

      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);

    } catch (error) {
      console.error("Server TTS failed, falling back to browser:", error);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };



  // Ensure speed updates apply to active audio
  useEffect(() => {
    if (currentAudio) {
      currentAudio.playbackRate = playbackRate;
    }
  }, [playbackRate, currentAudio]);


  const handleSessionEnd = () => {
    // EPIC 1.5.2 / 1.5.3: Session timer ends + optional break reminders
    setIsSessionActive(false);
    setActiveLesson(null);
    setLessonPhase('idle');
    setCooldownRemaining(300); // 5 minutes cooldown
    if (preferences?.breakReminders) {
      alert('Time for a break! Take 5 minutes to rest before continuing.');
    }
  };

  useEffect(() => {
    let timer;
    if (cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    let timer;
    if (isSessionActive && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      handleSessionEnd();
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionActive, timeRemaining]);

  // Countdown Effect
  useEffect(() => {
    let interval;
    if (lessonPhase === 'countdown' && countdownValue > 0) {
      interval = setInterval(() => {
        setCountdownValue((prev) => prev - 1);
      }, 1000);
    } else if (lessonPhase === 'countdown' && countdownValue === 0) {
      setLessonPhase('active');
    }
    return () => clearInterval(interval);
  }, [lessonPhase, countdownValue]);

  const startSession = () => {
    // EPIC 1.5.2 / 1.5.3: Start a focused session with a preference-driven duration
    const duration = (preferences?.sessionDuration || 20) * 60; // Convert to seconds
    setTimeRemaining(duration);
    setIsSessionActive(true);
    setScore(0);
  };

  const distractionFreeMode = Boolean(preferences?.distractionFreeMode);
  const toggleDistractionFreeMode = async () => {
    // EPIC 1.6.1: ADHD distraction-free toggle persisted to preferences
    const next = !distractionFreeMode;
    // Persist for the user; container classing is handled by Dashboard/PreferencesContext.
    await updatePreferences({
      distractionFreeMode: next,
      // Ensure *all* animations are suppressed when distraction-free is on.
      reduceAnimations: next,
    });
  };

  const backToSessionStart = () => {
    window.speechSynthesis.cancel();
    setActiveLesson(null);
    setLessonPhase('idle');
    setSteps([]);
    setCurrentStepIndex(0);
    setFeedback(null);
    setShowHint(false);
    setAttempts(0);
    setIsTransitioning(false);
    setIsLoading(false);
    setCountdownValue(5);
    setIsSessionActive(false);
    setTimeRemaining(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const baseLessons = [
    {
      id: 1,
      title: 'Greetings',
      duration: '10 min',
      Icon: Hand,
      steps: [
        {
          type: 'learn',
          content: 'Hello',
          explanation: 'A common way to greet someone when you meet them.',
          visual: require('../../assets/images/greetings.png'),
          highlight: 'Hello',
          hint: 'Say this when you see a friend!'
        },
        {
          type: 'learn',
          content: 'Hi',
          explanation: 'A short, friendly greeting.',
          visual: null,
          highlight: 'Hi',
          hint: 'Use this with friends or classmates.'
        },
        {
          type: 'quiz',
          question: 'Which word means "Hello"?',
          options: ['Goodbye', 'Hello', 'Thanks'],
          correct: 'Hello',
          hint: 'It starts with H!'
        },
        {
          type: 'learn',
          content: 'Good Morning',
          explanation: 'Used to say hello in the early part of the day.',
          visual: null,
          highlight: 'Morning',
          hint: 'Use this before lunch.'
        },
        {
          type: 'quiz',
          question: 'What do you say in the early part of the day?',
          options: ['Good Morning', 'Good Night', 'Goodbye'],
          correct: 'Good Morning',
          hint: 'Think about when you wake up.'
        },
        {
          type: 'learn',
          content: 'How are you?',
          explanation: 'A friendly question to ask someone after you greet them.',
          visual: null,
          highlight: 'How',
          hint: 'You can say this after "Hello" or "Hi".'
        },
        {
          type: 'quiz',
          question: 'Which one is a question you can ask after greeting someone?',
          options: ['How are you?', 'Goodbye', 'Thank you'],
          correct: 'How are you?',
          hint: 'It starts with "How".'
        },
        {
          type: 'quiz',
          question: 'When do we say "Good Morning"?',
          options: ['At night', 'In the morning', 'At lunch'],
          correct: 'In the morning',
          hint: 'Think about when you wake up.'
        }
      ]
    },
    {
      id: 2,
      title: 'Basic Words',
      duration: '10 min',
      Icon: Pencil,
      steps: [
        {
          type: 'learn',
          content: 'Apple',
          explanation: 'A round fruit that can be red or green.',
          visual: null,
          highlight: 'Apple',
          hint: 'Delicious and crunchy!'
        },
        {
          type: 'quiz',
          question: 'Which one is a fruit?',
          options: ['Car', 'Apple', 'Table'],
          correct: 'Apple',
          hint: 'It grows on a tree.'
        },
        {
          type: 'learn',
          content: 'Book',
          explanation: 'A set of pages you read.',
          visual: null,
          highlight: 'Book',
          hint: 'You can read this at school or home.'
        },
        {
          type: 'quiz',
          question: 'Which one is something you read?',
          options: ['Book', 'Shoe', 'Plate'],
          correct: 'Book',
          hint: 'It has pages.'
        },
        {
          type: 'learn',
          content: 'Cat',
          explanation: 'A small animal that says "Meow".',
          visual: null,
          highlight: 'Cat',
          hint: 'A popular fluffy pet.'
        },
        {
          type: 'quiz',
          question: 'Which animal says "Meow"?',
          options: ['Dog', 'Cat', 'Bird'],
          correct: 'Cat',
          hint: 'It likes to chase mice.'
        },
        {
          type: 'learn',
          content: 'Chair',
          explanation: 'You sit on it.',
          visual: null,
          highlight: 'Chair',
          hint: 'You can sit on this at a desk.'
        },
        {
          type: 'quiz',
          question: 'What do you sit on?',
          options: ['Chair', 'Apple', 'Cat'],
          correct: 'Chair',
          hint: 'It is furniture.'
        }
      ]
    },
    {
      id: 3,
      title: 'Numbers',
      duration: '10 min',
      Icon: Hash,
      steps: [
        {
          type: 'learn',
          content: 'One (1)',
          explanation: 'The number 1. It means a single thing.',
          visual: null,
          highlight: 'One',
          hint: 'Hold up a single finger.'
        },
        {
          type: 'quiz',
          question: 'How many noses do you have?',
          options: ['One', 'Two', 'Three'],
          correct: 'One',
          hint: 'Just the one on your face!'
        },
        {
          type: 'learn',
          content: 'Two (2)',
          explanation: 'The number 2. One plus one equals two.',
          visual: null,
          highlight: 'Two',
          hint: 'Like a pair of shoes.'
        },
        {
          type: 'quiz',
          question: 'How many eyes do most people have?',
          options: ['One', 'Two', 'Ten'],
          correct: 'Two',
          hint: 'One on the left, one on the right.'
        },
        {
          type: 'learn',
          content: 'Three (3)',
          explanation: 'The number 3. It means one more than two.',
          visual: null,
          highlight: 'Three',
          hint: 'Try holding up three fingers.'
        },
        {
          type: 'quiz',
          question: 'Which number comes after 2?',
          options: ['1', '3', '5'],
          correct: '3',
          hint: 'Count: 1, 2, __.'
        },
        {
          type: 'quiz',
          question: 'Select the word for 3.',
          options: ['One', 'Two', 'Three'],
          correct: 'Three',
          hint: 'It starts with T.'
        }
      ]
    },
    {
      id: 4,
      title: 'Audio Stories',
      duration: '15 min',
      Icon: Headphones,
      isStory: true,
      steps: [
        {
          type: 'story',
          title: 'The Friendly Rabbit',
          content: 'Once upon a time, there was a rabbit named Hop. Hop loved to jump over logs. One day, he met a turtle who was very slow. Hop learned that being fast is fun, but being slow lets you see more flowers.',
          visual: null
        },
        {
          type: 'quiz',
          question: 'What was the rabbit\'s name?',
          options: ['Hop', 'Sam', 'Max'],
          correct: 'Hop',
          hint: 'Read the first sentence.'
        },
        {
          type: 'quiz',
          question: 'Who did Hop meet?',
          options: ['A turtle', 'A cat', 'A bird'],
          correct: 'A turtle',
          hint: 'It was very slow.'
        },
        {
          type: 'story',
          title: 'The Lost Key',
          content: 'Sam had a shiny silver key. He dropped it in the grass. A crow flew down and picked it up. Sam chased the crow to a tall tree. The crow dropped the key, and Sam caught it!',
          visual: null
        },
        {
          type: 'quiz',
          question: 'What did Sam drop?',
          options: ['A key', 'A book', 'An apple'],
          correct: 'A key',
          hint: 'It was shiny and silver.'
        },
        {
          type: 'quiz',
          question: 'Which animal picked up the key?',
          options: ['A crow', 'A rabbit', 'A turtle'],
          correct: 'A crow',
          hint: 'It flew down.'
        }
      ]
    }
  ];

  const handleStartLesson = async (lesson) => {
    setActiveLesson(lesson);
    setIsLoading(true);
    setLessonPhase('intro');

    // Use deterministic, topic-aligned slides + quizzes (avoids random/off-topic questions).
    setSteps([...(lesson.steps || [])]);
    setCurrentStepIndex(0);
    setCurrentLessonScore(0);
    setFeedback(null);
    setShowHint(false);
    setAttempts(0);
    setIsTransitioning(false);
    setCountdownValue(5);
    setIsLoading(false);
  };

  const autoOpenedLessonRef = React.useRef(null);

  useEffect(() => {
    if (!initialLessonId) return;
    if (activeLesson) return;

    const targetId = Number(initialLessonId);
    if (!Number.isFinite(targetId)) return;
    if (autoOpenedLessonRef.current === targetId) return;

    const lesson = baseLessons.find((l) => l.id === targetId);
    if (!lesson) return;

    autoOpenedLessonRef.current = targetId;
    if (!isSessionActive) {
      startSession();
    }
    handleStartLesson(lesson);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLessonId, activeLesson]);

  const handleNextStep = () => {
    window.speechSynthesis.cancel(); // Stop audio on next
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setFeedback(null);
      setShowHint(false);
      setAttempts(0);
      setIsTransitioning(false);
    } else {
      setLessonPhase('complete');
      // Removed completion audio
    }
  }

  useEffect(() => {
    if (lessonPhase !== 'complete') return;
    if (!activeLesson?.id) return;
    if (currentLessonScore < 20) return;

    const key = `adhd-lesson-${activeLesson.id}`;
    if (savedCompletionRef.current.has(key)) return;
    savedCompletionRef.current.add(key);
    saveLessonCompletion(activeLesson.id);
  }, [lessonPhase, activeLesson, currentLessonScore]);

  const handlePreviousStep = () => {
    window.speechSynthesis.cancel();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setFeedback(null);
      setShowHint(false);
      setAttempts(0);
      setIsTransitioning(false);
    }
  };

  const handleReplayStep = () => {
    const step = steps[currentStepIndex];
    if (step.type === 'learn') {
      // Replay is handled by the dedicated Listen button.
    } else if (step.type === 'story') {
      // EPIC 3.1.3, 3.5.1-3.5.2: Allow replay/repetition without limits.
      playAudio(step.content, playbackRate);
    }
    setFeedback(null);
  };

  const getStepReadout = (step) => {
    if (!step) return '';
    if (step.type === 'learn') {
      const parts = [step.content, step.explanation].filter(Boolean);
      return parts.join('. ');
    }
    if (step.type === 'quiz') {
      const question = step.question ? String(step.question) : '';
      const options = Array.isArray(step.options) ? step.options.filter(Boolean).join(', ') : '';
      return options ? `${question}. Options are: ${options}.` : question;
    }
    if (step.type === 'story') {
      const parts = [step.title, step.content].filter(Boolean);
      return parts.join('. ');
    }
    return '';
  };

  const handleListenCurrentStep = () => {
    const text = getStepReadout(currentStep);
    if (!text) return;

    // EPIC 3.1.1: Provide a “Play Audio”/Listen control for lesson text.
    // EPIC 3.1.4: Keep audio speed slow and easy to understand (playbackRate).
    playAudio(text, playbackRate);
  };

  const handleAnswer = (option) => {
    if (isTransitioning) return;

    const step = steps[currentStepIndex];
    if (option === step.correct) {
      setFeedback({ type: 'success', message: 'Correct! Great job!' });
      const points = 10;
      setScore(prev => prev + points);
      setCurrentLessonScore(prev => prev + points);
      // Removed audio feedback
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        setFeedback({ type: 'info', message: 'Moving to next question...' });
        const points = 5;
        setScore(prev => prev + points);
        setCurrentLessonScore(prev => prev + points);
        // Removed audio feedback
        setIsTransitioning(true);
        setTimeout(() => {
          handleNextStep();
        }, 1500);
      } else {
        setFeedback({ type: 'error', message: 'Not quite. Try reading the hint!' });
        // Removed audio feedback
      }
    }
  };

  const handlePlayStory = () => {
    const step = steps[currentStepIndex];
    if (currentAudio) {
      // Stop current audio
      currentAudio.pause();
      setCurrentAudio(null);
      // Wait 2 seconds before restarting as requested
      setTimeout(() => {
        playAudio(step.content, playbackRate);
      }, 2000);
    } else {
      playAudio(step.content, playbackRate);
    }
  };

  const currentStep = steps.length > 0 ? steps[currentStepIndex] : null;

  return (
    <div className="adhd-view">
      {/* Minimal Top Bar */}
      <header className="top-bar">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={22} aria-hidden="true" />
          <span>LinguaEase</span>
        </h1>
        <div className="header-actions">
          {isSessionActive && timeRemaining !== null && (
            <div className="timer-display">
              <span className="timer-icon" aria-hidden="true"><Timer size={16} /></span>
              <span className="timer-text">{formatTime(timeRemaining)}</span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleDistractionFreeMode}
            className="btn-minimal btn-distraction-toggle"
            title="Toggle distraction-free mode"
            aria-pressed={distractionFreeMode}
          >
            {distractionFreeMode ? (
              <ToggleRight size={18} aria-hidden="true" />
            ) : (
              <ToggleLeft size={18} aria-hidden="true" />
            )}
            <span className="btn-distraction-toggle__label">Distraction-Free</span>
            <span className="btn-distraction-toggle__state">{distractionFreeMode ? 'On' : 'Off'}</span>
          </button>

          {isSessionActive && !activeLesson && (
            <button
              type="button"
              onClick={backToSessionStart}
              className="btn-minimal"
              title="Back to session start"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/progress')}
            className="btn-minimal"
            title="View progress"
          >
            Progress
          </button>
          <button onClick={() => setShowSettings(true)} className="btn-minimal" title="Settings">
            <Settings size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={logout} className="btn-logout" title="Logout">
            Logout
          </button>
        </div>
      </header>

      {showSettings && (
        <ProfileSettings onClose={() => setShowSettings(false)} />
      )}

      <main className="focused-content">
        <div className="content-wrapper">

          {!activeLesson ? (
            /* Dashboard View */
            <>
              <div className="focus-card">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>Hi, {user?.name}!</span>
                  <Hand size={18} aria-hidden="true" />
                </h2>
                <p>Let's focus on one lesson at a time.</p>
              </div>

              {!isSessionActive ? (
                <div className="session-start">
                  <h3>{cooldownRemaining > 0 ? 'Take a Break' : 'Ready to Learn?'}</h3>
                  {cooldownRemaining > 0 ? (
                    <>
                      <p>Great job! Please rest for {Math.ceil(cooldownRemaining / 60)} minutes before starting again.</p>
                      <div className="stat-number" style={{ fontSize: '48px', margin: '20px 0' }}>
                        {formatTime(cooldownRemaining)}
                      </div>
                      <button disabled className="btn-start" style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--text-secondary)' }}>
                        Break Time
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Click below to start a focused {preferences?.sessionDuration || 20}-minute session</p>
                      <button onClick={startSession} className="btn-start">
                        Start Session
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="quick-stats">
                    <div className="stat-box">
                      <div className="stat-number">{baseLessons.length}</div>
                      <div className="stat-text">Lessons</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-number">{score}</div>
                      <div className="stat-text">Points Today</div>
                    </div>
                  </div>

                  <div className="lesson-focus">
                    <h3>Choose One Lesson</h3>
                    <div className="lesson-list">
                      {baseLessons.map((lesson) => (
                        <div key={lesson.id} className="lesson-item">
                          <div className="lesson-content">
                            <span className="lesson-emoji" aria-hidden="true"><lesson.Icon size={22} /></span>
                            <div className="lesson-info">
                              <h4>{lesson.title}</h4>
                            </div>
                          </div>
                          <button onClick={() => handleStartLesson(lesson)} className="btn-lesson">Start</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : lessonPhase === 'intro' ? (
            <div className="intro-view" style={{ textAlign: 'center', padding: '3rem', animation: 'fadeIn 0.5s ease' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{activeLesson.title}</h2>
              {isLoading && (
                <p style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={16} aria-hidden="true" />
                  <span>Generating focused content for you...</span>
                </p>
              )}
              <div style={{ background: 'var(--accent-color-soft)', padding: '2rem', borderRadius: '15px', display: 'inline-block', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-color-hover)' }}>Passing Score: <strong>20 Points</strong></p>
              </div>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                Get ready! We will count down before we start.
              </p>
              <button
                onClick={() => setLessonPhase('countdown')}
                className="btn-primary"
                disabled={isLoading}
                style={{
                  padding: '1rem 3rem',
                  fontSize: '1.5rem',
                  borderRadius: '50px',
                  border: 'none',
                  background: isLoading ? 'rgba(148, 163, 184, 0.45)' : 'var(--accent-color)',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(77, 134, 201, 0.28)'
                }}
              >
                {isLoading ? 'Loading...' : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <Rocket size={18} aria-hidden="true" />
                    <span>I'm Ready!</span>
                  </span>
                )}
              </button>
            </div>
          ) : lessonPhase === 'countdown' ? (
            <div className="countdown-view" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh'
            }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Starting in...</h2>
              <div style={{
                fontSize: '8rem', fontWeight: 'bold', color: countdownValue <= 3 ? 'var(--error-color)' : 'var(--success-color)',
                animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
                {countdownValue === 0 ? 'GO!' : countdownValue}
              </div>
            </div>
          ) : lessonPhase === 'complete' ? (
            <div className="lesson-complete-view" style={{ textAlign: 'center', padding: '3rem', animation: 'fadeIn 0.5s ease', position: 'relative', overflow: 'hidden' }}>
              {currentLessonScore >= 20 ? (
                <>
                  {!distractionFreeMode && (
                    <ReactConfetti
                      width={windowSize.width}
                      height={windowSize.height}
                      recycle={true}
                      numberOfPieces={200}
                      gravity={0.2}
                    />
                  )}
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)', zIndex: 10, position: 'relative' }}>Congratulations!</h2>
                  <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', zIndex: 10, position: 'relative' }}>
                    You have completed <strong>{activeLesson.title}</strong>!
                  </p>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }} aria-hidden="true"><Dumbbell size={64} /></div>
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Don't Give Up!</h2>
                  <p style={{ fontSize: '1.5rem', color: 'var(--error-color)', fontWeight: 'bold' }}>
                    You have one more chance!!!!
                  </p>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                    You need 20 points to pass. Let's try again!
                  </p>
                </>
              )}

              <div className="score-summary" style={{
                background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '20px', margin: '2rem auto', maxWidth: '300px',
                boxShadow: 'var(--fx-shadow-soft)', border: '1px solid var(--border-color)', zIndex: 10, position: 'relative'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Lesson Score</div>
                <div style={{ fontSize: '3.5rem', fontWeight: '800', color: currentLessonScore >= 20 ? 'var(--success-color)' : 'var(--error-color)', margin: '0.5rem 0' }}>{currentLessonScore}</div>
                <div style={{ fontSize: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  Total Points Today: <strong>{score}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {currentLessonScore >= 20 ? (
                  <button
                    onClick={exitLesson}
                    className="btn-primary"
                    style={{
                      padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '12px', border: 'none',
                      background: 'var(--accent-color)', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(77, 134, 201, 0.22)'
                    }}
                  >
                    Return to Dashboard
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartLesson(activeLesson)}
                    className="btn-primary"
                    style={{
                      padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: '12px', border: 'none',
                      background: 'var(--warning-color)', color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(194, 122, 44, 0.22)'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                      <RotateCcw size={18} aria-hidden="true" />
                      <span>Try Again</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="lesson-player">
              <div className="lesson-header">
                <button onClick={exitLesson} className="btn-back">← Back</button>
                <h3>{activeLesson.title} - Step {currentStepIndex + 1}/{steps.length}</h3>
              </div>

              <div className="step-content">
                {!currentStep ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h3>Content coming soon</h3>
                  </div>
                ) : (
                  <>
                    {currentStep.visual && (
                      <div className="step-visual">
                        <img src={currentStep.visual} alt="Lesson visual" />
                      </div>
                    )}

                    <div className="step-main">
                      {currentStep.type === 'learn' && (
                        <div className="learn-mode">
                          <h2 className={currentStep.highlight ? 'highlight-text' : ''}>
                            {currentStep.content}
                          </h2>
                          <p style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: '500', marginTop: '1rem' }}>{currentStep.explanation}</p>
                          <button type="button" onClick={handleListenCurrentStep} className="btn-audio" title="Listen">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                              <Volume2 size={18} aria-hidden="true" />
                              <span>Listen</span>
                            </span>
                          </button>
                        </div>
                      )}

                      {currentStep.type === 'story' && (
                        <div className="story-mode">
                          <h2>{currentStep.title}</h2>
                          <div className="story-controls" style={{ margin: '20px 0', padding: '20px', background: '#f5f5f5', borderRadius: '10px' }}>
                            <div style={{ marginBottom: '15px' }}>
                              <label>Audio Speed: {playbackRate}x</label>
                              <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.25"
                                value={playbackRate}
                                onChange={(e) => {
                                  const newRate = parseFloat(e.target.value);
                                  setPlaybackRate(newRate);
                                  if (currentAudio) currentAudio.playbackRate = newRate;
                                }}
                                style={{ marginLeft: '10px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                              <button onClick={handlePlayStory} className="btn-audio" style={{ fontSize: '1.2rem', padding: '10px 30px' }}>
                                {currentAudio && !currentAudio.paused ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                    <RotateCcw size={18} aria-hidden="true" />
                                    <span>Restart Story</span>
                                  </span>
                                ) : (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                    <Play size={18} aria-hidden="true" />
                                    <span>Play Story</span>
                                  </span>
                                )}
                              </button>
                              {currentAudio && (
                                <button
                                  key={dummyUpdate} // Force re-render of button when state changes
                                  onClick={() => {
                                    if (currentAudio.paused) {
                                      currentAudio.play();
                                      setDummyUpdate(prev => prev + 1); // Force re-render
                                    } else {
                                      currentAudio.pause();
                                      setDummyUpdate(prev => prev + 1); // Force re-render
                                    }
                                  }}
                                  className="btn-audio"
                                  style={{ fontSize: '1.2rem', padding: '10px 30px', background: '#ff9800' }}
                                >
                                  {currentAudio.paused ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                      <Play size={18} aria-hidden="true" />
                                      <span>Resume</span>
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                      <Pause size={18} aria-hidden="true" />
                                      <span>Pause</span>
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <p
                            className={isPlaying ? 'story-text active-reading-block' : 'story-text'}
                            style={{
                              fontSize: '1.3rem',
                              lineHeight: '1.6',
                              color: 'var(--text-primary)',
                              textAlign: 'left',
                              background: isPlaying ? '#fff9c4' : 'var(--bg-primary)', // Highlight background
                              padding: '20px',
                              borderRadius: '8px',
                              transition: 'background 0.3s ease',
                              border: isPlaying ? '2px solid #fbc02d' : '1px solid transparent'
                            }}
                          >
                            {currentStep.content}
                          </p>
                        </div>
                      )}

                      {currentStep.type === 'quiz' && (
                        <div className="quiz-mode">
                          <h2>{currentStep.question}</h2>
                          <button type="button" onClick={handleListenCurrentStep} className="btn-audio" title="Listen to question">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                              <Volume2 size={18} aria-hidden="true" />
                              <span>Listen</span>
                            </span>
                          </button>
                          <div className="options-grid">
                            {currentStep.options.map(opt => (
                              <button
                                key={opt}
                                onClick={() => handleAnswer(opt)}
                                className="btn-option"
                                disabled={feedback?.type === 'success' || isTransitioning}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="interaction-area">
                      {feedback && (
                        <div className={`feedback-message ${feedback.type}`}>
                          {feedback.message}
                        </div>
                      )}

                      <div className="controls">
                        <button onClick={handleReplayStep} className="btn-control" title="Replay">
                          <RotateCcw size={18} aria-hidden="true" />
                          <span>Replay</span>
                        </button>

                        <button
                          onClick={handlePreviousStep}
                          className="btn-control"
                          title="Previous"
                          disabled={currentStepIndex === 0 || isTransitioning}
                        >
                          <ChevronLeft size={18} aria-hidden="true" />
                          <span>Prev</span>
                        </button>

                        {currentStep.hint && attempts > 0 && (
                          <button onClick={() => setShowHint(true)} className="btn-control">
                            <Lightbulb size={18} aria-hidden="true" />
                            <span>Hint</span>
                          </button>
                        )}

                        {(currentStep.type === 'learn' || currentStep.type === 'story' || feedback?.type === 'success') && (
                          <button onClick={handleNextStep} className="btn-next">
                            Next →
                          </button>
                        )}
                      </div>

                      {showHint && currentStep.hint && (
                        <div className="hint-box">
                          <strong>Hint:</strong> {currentStep.hint}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!activeLesson && (
            <div className="simple-tips">
              <div className="tip-item">
                <span className="tip-icon" aria-hidden="true"><Lightbulb size={16} /></span>
                <span>Take breaks every 20 minutes</span>
              </div>
              <div className="tip-item">
                <span className="tip-icon" aria-hidden="true"><Target size={16} /></span>
                <span>Focus on just one lesson at a time</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ADHDView;
