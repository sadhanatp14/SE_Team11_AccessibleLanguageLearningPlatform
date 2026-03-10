
// ADHDView: Main learning interface for users with ADHD support needs.
// Provides lesson navigation, session timing, feedback, and progress auto-saving.
// Integrates with user preferences and backend progress APIs.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import ProfileSettings from '../ProfileSettings';
import './ADHDView.css';
import './BilingualText.css';
import PronunciationPractice from './PronunciationPractice';
import NextLessonCard from './NextLessonCard';
import PracticeSuggestion from './PracticeSuggestion';
import MotivationReward from './MotivationReward';
import ReactConfetti from 'react-confetti';
import { getSummary } from '../../services/progressService';
import { adjustDifficulty, getCurrentDifficulty, getPerformanceSummary, recordLessonScore } from '../../services/difficultyAdjustmentService';
import { getReviewBasedRecommendation } from '../../services/reviewRecommendationService';
import api from '../../utils/api';
import { useI18n } from '../../utils/i18n';
// Icon imports for UI elements
import {
  Bot,
  BookOpen,
  ChevronLeft,
  Dumbbell,
  Hand,
  Hash,
  Headphones,
  Info,
  Lightbulb,
  Award,
  Menu,
  Mic,
  Pause,
  Pencil,
  Play,
  Rocket,
  RotateCcw,
  Settings,
  Target,
  Timer,
  TrendingUp,
  Volume2,
  X,
} from 'lucide-react';
import {
  bilingualPrimaryLanguageForMode,
  backendTtsLangFor,
  inferTtsLanguageKeyFromText,
  isBilingualTextMode,
  pickByLanguage,
  resolveBilingualTextModeFromPreferences,
  resolveUiLanguageFromPreferences,
  speechRecognitionLangFor,
  speechSynthesisLangFor,
} from '../../utils/languagePrefs';
import { makeSpeechCompareForms } from '../../utils/speechCompare';
import { pickI18nString } from '../../utils/lessonI18n';

const joinUrl = (base, path) => {
  const baseStr = String(base || '').replace(/\/+$/, '');
  const pathStr = String(path || '');
  const normalizedPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${baseStr}${normalizedPath}`;
};

const labelForLang = (lang) => {
  const normalized = String(lang || '').trim().toLowerCase();
  if (normalized === 'tamil') return 'Tamil';
  if (normalized === 'hindi') return 'Hindi';
  return 'English';
};

const normalizeText = (value) => {
  const text = typeof value === 'string' ? value : String(value ?? '');
  return text.trim();
};

const ADHDView = ({ initialLessonId = null }) => {
  // Auth and preferences context
  const { user, logout } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const uiLanguage = resolveUiLanguageFromPreferences(preferences);
  const bilingualTextMode = resolveBilingualTextModeFromPreferences(preferences);
  const { t } = useI18n();
  const navigate = useNavigate();

  // Session and timer state
  const [timeRemaining, setTimeRemaining] = useState(null); // Time left in session
  const [isSessionActive, setIsSessionActive] = useState(false); // Is a lesson session active?
  const [showSettings, setShowSettings] = useState(false); // Show/hide settings panel
  const [showSideMenu, setShowSideMenu] = useState(false);
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
  const [showPracticeSuggestion, setShowPracticeSuggestion] = useState(false); // Show practice suggestion after low score
  const [lessonsCompletedCount, setLessonsCompletedCount] = useState(0); // Track completed lessons for achievements

  // Window and UI state
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight }); // For confetti, etc.
  const [countdownValue, setCountdownValue] = useState(5); // Countdown before session starts
  const [dummyUpdate, setDummyUpdate] = useState(0); // Used to force re-renders on audio state changes

  // FEATURE: Personalization features (next lesson, adaptive difficulty, learning path, motivation)
  const [nextRecommendation, setNextRecommendation] = useState(null); // Next lesson recommendation
  const [completedLessons, setCompletedLessons] = useState([]); // Completed ADHD lesson IDs
  const [skippedRecommendationId, setSkippedRecommendationId] = useState(() => {
    try {
      return window.sessionStorage.getItem('adhd-next-lesson-skipped') || null;
    } catch {
      return null;
    }
  });
  const [currentDifficulty, setCurrentDifficulty] = useState('Beginner'); // Adaptive difficulty level
  // eslint-disable-next-line no-unused-vars
  const [learningPath, setLearningPath] = useState(null); // Personalized learning path
  // eslint-disable-next-line no-unused-vars
  const [motivation, setMotivation] = useState(null); // Motivational feedback
  const [performanceSummary, setPerformanceSummary] = useState(null); // Performance summary

  // Track completed lessons in this session (prevents duplicate saves)
  const savedCompletionRef = React.useRef(new Set());

  // Save lesson completion to backend and broadcast progress update
  const saveLessonCompletion = async (lessonId) => {
    try {
      const lessonKey = `adhd-lesson-${lessonId}`;

      // EPIC 6.1.1, 6.4.1: Store completion state and auto-save after lesson completion.
      const res = await api.post('/users/complete-lesson', { lessonKey });
      setCompletedLessons((prev) => (prev.includes(lessonId) ? prev : [...prev, lessonId]));

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

  // Load completed ADHD lessons from backend (source of truth for recommendation order)
  useEffect(() => {
    const fetchCompletedLessons = async () => {
      try {
        const response = await api.get('/users/completed-lessons');
        if (response.data?.success) {
          const lessonIds = (response.data.completedLessons || [])
            .filter((key) => String(key).startsWith('adhd-lesson-'))
            .map((key) => parseInt(String(key).replace('adhd-lesson-', ''), 10))
            .filter((id) => Number.isFinite(id));
          setCompletedLessons(lessonIds);
        }
      } catch (error) {
        console.error('Error fetching completed ADHD lessons:', error);
      }
    };

    fetchCompletedLessons();
  }, []);

  const exitLesson = () => {
    window.speechSynthesis.cancel();
    // Increment completed lessons counter if lesson was passed (EPIC 4.5)
    if (currentLessonScore >= 20) {
      setLessonsCompletedCount(prev => prev + 1);
    }
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
    setShowPracticeSuggestion(false);
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // FEATURE: Load adaptive difficulty summary for ADHD
  useEffect(() => {
    const fetchPersonalizationData = async () => {
      try {
        // Load adaptive difficulty level
        const difficulty = getCurrentDifficulty(user);
        setCurrentDifficulty(difficulty);

        // Load performance summary
        const summary = getPerformanceSummary(user);
        setPerformanceSummary(summary);
      } catch (error) {
        console.error('Error fetching personalization data:', error);
        // Non-blocking error - continue with basic functionality
      }
    };

    if (user?.id) {
      fetchPersonalizationData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // EPIC 4.7.1-4.7.4: Build one clear review-based recommendation using past performance trends.
  useEffect(() => {
    const recommendation = getReviewBasedRecommendation({
      user,
      module: 'adhd',
      lessons: baseLessons,
      completedLessonIds: completedLessons,
    });

    if (!recommendation) {
      setNextRecommendation(null);
      return;
    }

    setNextRecommendation(recommendation);

    const recommendationKey = recommendation.recommendationKey || String(recommendation.lesson?.id || '');
    if (skippedRecommendationId && skippedRecommendationId !== recommendationKey) {
      try {
        window.sessionStorage.removeItem('adhd-next-lesson-skipped');
      } catch {
        // ignore
      }
      setSkippedRecommendationId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedLessons, user]);

  // Audio handling
  // Audio handling
  const [currentAudio, setCurrentAudio] = useState(null);

  const boundaryUtteranceRef = React.useRef(null);
  const [activeWord, setActiveWord] = useState('');

  const [isPlaying, setIsPlaying] = useState(false);

  const [showInstructions, setShowInstructions] = useState(false);

  const stopAllAudio = useCallback(() => {
    window.speechSynthesis.cancel();
    boundaryUtteranceRef.current = null;
    setActiveWord('');
    if (currentAudio) {
      currentAudio.pause();
    }
    setIsPlaying(false);
  }, [currentAudio]);

  const getInstructionsTextForStep = (step) => {
    if (!step) {
      return pickByLanguage(uiLanguage, {
        english: 'Follow the on-screen instructions. Use Listen to hear the text, and use Next to continue.',
        tamil: 'திரையில் உள்ள வழிமுறைகளை பின்பற்றுங்கள். கேட்க “Listen” ஐ அழுத்துங்கள். தொடர “Next” ஐ அழுத்துங்கள்.',
        hindi: 'स्क्रीन पर दिए निर्देशों का पालन करें। सुनने के लिए “Listen” दबाएँ और आगे बढ़ने के लिए “Next” दबाएँ।',
      });
    }

    if (step.type === 'learn') {
      return pickByLanguage(uiLanguage, {
        english:
          'This is a learning step. Read the word and the explanation. Press Listen to hear it. Press Next when you are ready to continue.',
        tamil:
          'இது ஒரு கற்றல் படி. சொல்லையும் விளக்கத்தையும் வாசியுங்கள். கேட்க “Listen” ஐ அழுத்துங்கள். தயாரானதும் “Next” ஐ அழுத்துங்கள்.',
        hindi:
          'यह सीखने वाला चरण है। शब्द और उसका अर्थ पढ़ें। सुनने के लिए “Listen” दबाएँ। तैयार होने पर “Next” दबाएँ।',
      });
    }

    if (step.type === 'quiz') {
      return pickByLanguage(uiLanguage, {
        english:
          'This is a quiz step. Read the question and choose one option. Press Listen to hear the question again. If a hint is available, you can open it. Answer correctly to move on.',
        tamil:
          'இது ஒரு வினாடி வினா படி. கேள்வியை வாசித்து ஒரு விருப்பத்தைத் தேர்வு செய்யுங்கள். மீண்டும் கேட்க “Listen” ஐ அழுத்துங்கள். Hint இருந்தால் அதை திறக்கலாம். சரியாக பதிலளித்தால் அடுத்ததாக செல்லலாம்.',
        hindi:
          'यह क्विज़ चरण है। प्रश्न पढ़ें और एक विकल्प चुनें। फिर से सुनने के लिए “Listen” दबाएँ। अगर Hint उपलब्ध है तो उसे खोलें। सही उत्तर देकर आगे बढ़ें।',
      });
    }

    if (step.type === 'story') {
      return pickByLanguage(uiLanguage, {
        english:
          'This is a story step. Press Play Story to listen. Use the speed slider to slow down or speed up. You can Pause and Resume. Press Replay to listen again, then press Next to continue.',
        tamil:
          'இது ஒரு கதை படி. கேட்க “Play Story” ஐ அழுத்துங்கள். வேகத்தை மாற்ற speed slider ஐ பயன்படுத்துங்கள். Pause/Resume செய்யலாம். மீண்டும் கேட்க “Replay” அழுத்தி, பிறகு “Next” ஐ அழுத்துங்கள்.',
        hindi:
          'यह कहानी वाला चरण है। सुनने के लिए “Play Story” दबाएँ। गति कम/ज़्यादा करने के लिए speed slider इस्तेमाल करें। Pause/Resume कर सकते हैं। फिर से सुनने के लिए “Replay” दबाएँ और आगे बढ़ने के लिए “Next” दबाएँ।',
      });
    }

    return pickByLanguage(uiLanguage, {
      english: 'Follow the on-screen instructions. Use Listen to hear the text, and use Next to continue.',
      tamil: 'திரையில் உள்ள வழிமுறைகளை பின்பற்றுங்கள். கேட்க “Listen” ஐ அழுத்துங்கள். தொடர “Next” ஐ அழுத்துங்கள்.',
      hindi: 'स्क्रीन पर दिए निर्देशों का पालन करें। सुनने के लिए “Listen” दबाएँ और आगे बढ़ने के लिए “Next” दबाएँ।',
    });
  };

  useEffect(() => {
    if (!showInstructions) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        stopAllAudio();
        setShowInstructions(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showInstructions, stopAllAudio]);

  const startSilentBoundaryTracking = (text, rate) => {
    if (!('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.volume = 0;
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          const textBefore = text.slice(charIndex);
          const firstSpace = textBefore.search(/\s/);
          const word = firstSpace === -1 ? textBefore : textBefore.slice(0, firstSpace);
          const cleanWord = word.replace(/[.,!?;:()"']/g, '');
          setActiveWord(cleanWord);
        }
      };
      utterance.onend = () => {
        setActiveWord('');
        if (boundaryUtteranceRef.current === utterance) {
          boundaryUtteranceRef.current = null;
        }
      };
      boundaryUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Best-effort only.
    }
  };

  const ttsEndpoint = React.useMemo(() => {
    return joinUrl(api?.defaults?.baseURL || '/api', '/tts/speak');
  }, []);

  const renderTextWithActiveWord = useCallback((text) => {
    if (!text) return null;
    const words = String(text).split(' ');
    return words.map((word, idx) => {
      const cleanWord = word.replace(/[.,!?;:()"']/g, '');
      const isActive = activeWord && cleanWord && cleanWord.toLowerCase() === activeWord.toLowerCase();
      return (
        <span
          key={`${idx}-${word}`}
          className={isActive ? 'adhd-word adhd-active-word' : 'adhd-word'}
        >
          {word}{' '}
        </span>
      );
    });
  }, [activeWord]);

  // Lightweight translations so bilingual mode actually shows 2 lines in ADHD lessons.
  // (We keep lesson logic data in English; only the rendered label becomes bilingual.)
  const EN_TO_TA = React.useMemo(
    () =>
      ({
        Hello: 'வணக்கம்',
        Hi: 'ஹாய்',
        'Good Morning': 'காலை வணக்கம்',
        'How are you?': 'எப்படி இருக்கிறீர்கள்?',
        Goodbye: 'பிரியாவிடை',
        'Good Night': 'இனிய இரவு',
        Thanks: 'நன்றி',
        'Thank you': 'நன்றி',
        Sorry: 'மன்னிக்கவும்',
        Yes: 'ஆம்',
        No: 'இல்லை',
        Maybe: 'ஒருவேளை',
        'A common way to greet someone when you meet them.': 'நீங்கள் ஒருவரை சந்திக்கும் போது வாழ்த்தும் ஒரு பொதுவான வழி.',
        'A short, friendly greeting.': 'ஒரு குறுகிய, நட்பான வாழ்த்து.',
        'Used to say hello in the early part of the day.': 'நாளின் ஆரம்ப பகுதியில் வணக்கம் சொல்ல பயன்படுத்தப்படும்.',
        'A friendly question to ask someone after you greet them.': 'வணக்கம் சொன்ன பிறகு ஒருவரிடம் கேட்கும் நட்பான கேள்வி.',
        'A round fruit that can be red or green.': 'சிவப்பு அல்லது பச்சை நிறமாக இருக்கக்கூடிய வட்டமான பழம்.',
        'A set of pages you read.': 'நீங்கள் படிக்கும் பக்கங்களின் தொகுப்பு.',
        'A small animal that says "Meow".': '"Meow" என்று சொல்லும் ஒரு சிறிய விலங்கு.',
        'You sit on it.': 'நீங்கள் இதில் உட்காருவீர்கள்.',
        'The number 1. It means a single thing.': 'எண் 1. இது ஒரு தனி பொருளை குறிக்கிறது.',
        'The number 2. One plus one equals two.': 'எண் 2. ஒன்று + ஒன்று = இரண்டு.',
        'The number 3. It means one more than two.': 'எண் 3. இது இரண்டை விட ஒன்று அதிகம்.',
        'A polite way to say “Hello” in Tamil.': 'தமிழில் “Hello” சொல்லும் மரியாதையான முறை.',
        'This means “Thank you” in Tamil.': 'இது தமிழில் “Thank you” என்பதைக் குறிக்கிறது.',
        'This means “Yes” in Tamil.': 'இது தமிழில் “Yes” என்பதைக் குறிக்கிறது.',
        'This means “No” in Tamil.': 'இது தமிழில் “No” என்பதைக் குறிக்கிறது.',
        'A polite way to say “Hello” in Hindi.': 'இந்தியில் “Hello” சொல்லும் மரியாதையான முறை.',
        'This means “Thank you” in Hindi.': 'இது இந்தியில் “Thank you” என்பதைக் குறிக்கிறது.',
        'This means “Yes” in Hindi.': 'இது இந்தியில் “Yes” என்பதைக் குறிக்கிறது.',
        'This means “No” in Hindi.': 'இது இந்தியில் “No” என்பதைக் குறிக்கிறது.',
        Apple: 'ஆப்பிள்',
        Book: 'புத்தகம்',
        Cat: 'பூனை',
        Chair: 'நாற்காலி',
        Car: 'கார்',
        Table: 'மேசை',
        Dog: 'நாய்',
        Bird: 'பறவை',
        Shoe: 'செருப்பு',
        Plate: 'தட்டு',
        One: 'ஒன்று',
        Two: 'இரண்டு',
        Three: 'மூன்று',
        Ten: 'பத்து',
        'A turtle': 'ஒரு ஆமை',
        'A cat': 'ஒரு பூனை',
        'A bird': 'ஒரு பறவை',
        'A key': 'ஒரு சாவி',
        'A book': 'ஒரு புத்தகம்',
        'An apple': 'ஒரு ஆப்பிள்',
        'A crow': 'ஒரு காக்கை',
        'A rabbit': 'ஒரு முயல்',
        Hop: 'ஹாப்',
        Sam: 'சாம்',
        Max: 'மேக்ஸ்',
        'Which word means "Hello"?': '"Hello" என்றால் எந்த சொல்?',
        'What do you say in the early part of the day?': 'நாளின் ஆரம்ப பகுதியில் நீங்கள் என்ன சொல்வீர்கள்?',
        'Which one is a question you can ask after greeting someone?': 'வணக்கம் சொன்ன பிறகு கேட்கக்கூடிய கேள்வி எது?',
        'When do we say "Good Morning"?': '"Good Morning" எப்போது சொல்வோம்?',
        'Which one is a fruit?': 'எது ஒரு பழம்?',
        'Which one is something you read?': 'எது நீங்கள் படிப்பது?',
        'Which animal says "Meow"?': '"Meow" என்று சொல்லும் விலங்கு எது?',
        'What do you sit on?': 'நீங்கள் எதில் உட்கார்வீர்கள்?',
        'How many noses do you have?': 'உங்களிடம் எத்தனை மூக்குகள் உள்ளன?',
        'How many eyes do most people have?': 'பெரும்பாலானவர்களுக்கு எத்தனை கண்கள் உள்ளன?',
        'Which number comes after 2?': '2க்கு பிறகு எந்த எண் வருகிறது?',
        'Select the word for 3.': '3 என்பதற்கான சொல்லைத் தேர்ந்தெடுக்கவும்.',
        "What was the rabbit's name?": 'முயலின் பெயர் என்ன?',
        'Who did Hop meet?': 'ஹாப் யாரை சந்தித்தான்?',
        'What did Sam drop?': 'சாம் என்னை கீழே போட்டான்?',
        'Which animal picked up the key?': 'சாவியை எடுத்தது எந்த விலங்கு?',
        'In the morning': 'காலையில்',
        'At night': 'இரவில்',
        'At lunch': 'மதிய உணவில்',
        'To greet': 'வணக்கம் சொல்ல',
        'To thank': 'நன்றி சொல்ல',
        'To say goodbye': 'பிரியாவிடை சொல்ல',
      }),
    []
  );

  const EN_TO_HI = React.useMemo(
    () =>
      ({
        Hello: 'नमस्ते',
        Hi: 'हाय',
        'Good Morning': 'सुप्रभात',
        'How are you?': 'आप कैसे हैं?',
        Goodbye: 'अलविदा',
        'Good Night': 'शुभ रात्रि',
        Thanks: 'धन्यवाद',
        'Thank you': 'धन्यवाद',
        Sorry: 'माफ़ कीजिए',
        Yes: 'हाँ',
        No: 'नहीं',
        Maybe: 'शायद',
        'A common way to greet someone when you meet them.': 'जब आप किसी से मिलते हैं तो अभिवादन करने का एक आम तरीका।',
        'A short, friendly greeting.': 'एक छोटा, दोस्ताना अभिवादन।',
        'Used to say hello in the early part of the day.': 'दिन के शुरुआती हिस्से में नमस्ते/हैलो कहने के लिए।',
        'A friendly question to ask someone after you greet them.': 'अभिवादन के बाद किसी से पूछने के लिए एक दोस्ताना सवाल।',
        'A round fruit that can be red or green.': 'एक गोल फल जो लाल या हरा हो सकता है।',
        'A set of pages you read.': 'पन्नों का एक संग्रह जिसे आप पढ़ते हैं।',
        'A small animal that says "Meow".': 'एक छोटा जानवर जो "Meow" कहता है।',
        'You sit on it.': 'आप इस पर बैठते हैं।',
        'The number 1. It means a single thing.': 'संख्या 1। इसका मतलब एक ही चीज़ है।',
        'The number 2. One plus one equals two.': 'संख्या 2। एक और एक मिलकर दो होते हैं।',
        'The number 3. It means one more than two.': 'संख्या 3। यह दो से एक अधिक है।',
        'A polite way to say “Hello” in Tamil.': 'तमिल में “Hello” कहने का एक विनम्र तरीका।',
        'This means “Thank you” in Tamil.': 'तमिल में इसका अर्थ “Thank you” है।',
        'This means “Yes” in Tamil.': 'तमिल में इसका अर्थ “Yes” है।',
        'This means “No” in Tamil.': 'तमिल में इसका अर्थ “No” है।',
        'A polite way to say “Hello” in Hindi.': 'हिंदी में “Hello” कहने का एक विनम्र तरीका।',
        'This means “Thank you” in Hindi.': 'हिंदी में इसका अर्थ “Thank you” है।',
        'This means “Yes” in Hindi.': 'हिंदी में इसका अर्थ “Yes” है।',
        'This means “No” in Hindi.': 'हिंदी में इसका अर्थ “No” है।',
        Apple: 'सेब',
        Book: 'किताब',
        Cat: 'बिल्ली',
        Chair: 'कुर्सी',
        Car: 'कार',
        Table: 'मेज़',
        Dog: 'कुत्ता',
        Bird: 'पक्षी',
        Shoe: 'जूता',
        Plate: 'प्लेट',
        One: 'एक',
        Two: 'दो',
        Three: 'तीन',
        Ten: 'दस',
        'A turtle': 'एक कछुआ',
        'A cat': 'एक बिल्ली',
        'A bird': 'एक पक्षी',
        'A key': 'एक चाबी',
        'A book': 'एक किताब',
        'An apple': 'एक सेब',
        'A crow': 'एक कौआ',
        'A rabbit': 'एक खरगोश',
        Hop: 'हॉप',
        Sam: 'सैम',
        Max: 'मैक्स',
        'Which word means "Hello"?': '"Hello" का अर्थ कौन सा शब्द है?',
        'What do you say in the early part of the day?': 'दिन के शुरुआती हिस्से में आप क्या कहते हैं?',
        'Which one is a question you can ask after greeting someone?': 'अभिवादन के बाद आप कौन सा प्रश्न पूछ सकते हैं?',
        'When do we say "Good Morning"?': '"Good Morning" कब कहते हैं?',
        'Which one is a fruit?': 'कौन सा फल है?',
        'Which one is something you read?': 'कौन सी चीज़ आप पढ़ते हैं?',
        'Which animal says "Meow"?': '"Meow" कहने वाला जानवर कौन सा है?',
        'What do you sit on?': 'आप किस पर बैठते हैं?',
        'How many noses do you have?': 'आपके पास कितनी नाकें हैं?',
        'How many eyes do most people have?': 'अधिकांश लोगों की कितनी आँखें होती हैं?',
        'Which number comes after 2?': '2 के बाद कौन सा अंक आता है?',
        'Select the word for 3.': '3 के लिए शब्द चुनें।',
        "What was the rabbit's name?": 'खरगोश का नाम क्या था?',
        'Who did Hop meet?': 'हॉप किससे मिला?',
        'What did Sam drop?': 'सैम ने क्या गिराया?',
        'Which animal picked up the key?': 'चाबी किस जानवर ने उठाई?',
        'In the morning': 'सुबह',
        'At night': 'रात में',
        'At lunch': 'दोपहर के खाने में',
        'To greet': 'नमस्ते करने के लिए',
        'To thank': 'धन्यवाद कहने के लिए',
        'To say goodbye': 'अलविदा कहने के लिए',
      }),
    []
  );

  const TA_TO_EN = React.useMemo(
    () =>
      ({
        'வணக்கம் (Vanakkam)': 'Hello',
        வணக்கம்: 'Hello',
        'நன்றி (Nandri)': 'Thank you',
        நன்றி: 'Thank you',
        'ஆம் (Aam)': 'Yes',
        ஆம்: 'Yes',
        'இல்லை (Illai)': 'No',
        இல்லை: 'No',
        'வணக்கம் means…': 'What does வணக்கம் mean?',
        'Choose “Thank you” in Tamil.': 'Choose “Thank you” in Tamil.',
        'Which one means “No”?': 'Which one means “No”?',
      }),
    []
  );

  const HI_TO_EN = React.useMemo(
    () =>
      ({
        'नमस्ते (Namaste)': 'Hello',
        नमस्ते: 'Hello',
        'धन्यवाद (Dhanyavaad)': 'Thank you',
        धन्यवाद: 'Thank you',
        'हाँ (Haan)': 'Yes',
        हाँ: 'Yes',
        'नहीं (Nahin)': 'No',
        नहीं: 'No',
        'नमस्ते means…': 'What does नमस्ते mean?',
        'Choose “Thank you” in Hindi.': 'Choose “Thank you” in Hindi.',
        'Which one means “Yes”?': 'Which one means “Yes”?',
      }),
    []
  );

  const buildAdhdI18n = useCallback(
    (text, defaultLang = 'english') => {
      const raw = typeof text === 'string' ? text : String(text ?? '');
      const trimmed = raw.trim();
      if (!trimmed) return null;

      const inferred = inferTtsLanguageKeyFromText(trimmed, defaultLang);
      if (inferred === 'tamil') {
        const english = TA_TO_EN[trimmed] || '';
        return { english, tamil: trimmed, hindi: '' };
      }

      if (inferred === 'hindi') {
        const english = HI_TO_EN[trimmed] || '';
        return { english, tamil: '', hindi: trimmed };
      }

      return {
        english: trimmed,
        tamil: EN_TO_TA[trimmed] || '',
        hindi: EN_TO_HI[trimmed] || '',
      };
    },
    [EN_TO_HI, EN_TO_TA, HI_TO_EN, TA_TO_EN]
  );

  const renderBilingualTextWithActiveWord = useCallback(
    (
      baseText,
      {
        defaultLanguage = 'english',
        showLabels = true,
        compact = false,
        fullWidth = false,
        className = '',
      } = {}
    ) => {
      const enabled = isBilingualTextMode(bilingualTextMode);
      const i18n = buildAdhdI18n(baseText, defaultLanguage);
      const plain = normalizeText(pickI18nString(defaultLanguage, baseText, i18n));

      const widthClass = fullWidth ? 'adhd-bilingual-fullwidth' : '';

      const inlineWords = (text) => <span className="adhd-inline-words">{renderTextWithActiveWord(text)}</span>;

      if (!enabled) {
        return (
          <span className={`bilingual-text bilingual-single ${compact ? 'compact' : ''} ${widthClass} ${className}`.trim()}>
            {inlineWords(plain)}
          </span>
        );
      }

      const primaryLang = bilingualPrimaryLanguageForMode(bilingualTextMode);
      const englishText = normalizeText(pickI18nString('english', baseText, i18n));
      const primaryText = normalizeText(pickI18nString(primaryLang, baseText, i18n));

      if (!primaryText || !englishText || primaryText === englishText) {
        const single = primaryText || englishText || plain;
        return (
          <span className={`bilingual-text bilingual-single ${compact ? 'compact' : ''} ${widthClass} ${className}`.trim()}>
            {inlineWords(single)}
          </span>
        );
      }

      return (
        <span className={`bilingual-text ${compact ? 'compact' : ''} ${widthClass} ${className}`.trim()}>
          <span className="bilingual-line bilingual-primary">
            {showLabels ? <span className="bilingual-label">{labelForLang(primaryLang)}</span> : null}
            <span className="bilingual-value">{inlineWords(primaryText)}</span>
          </span>
          <span className="bilingual-break" aria-hidden="true" />
          <span className="bilingual-line bilingual-secondary">
            {showLabels ? <span className="bilingual-label">English</span> : null}
            <span className="bilingual-value">{inlineWords(englishText)}</span>
          </span>
        </span>
      );
    },
    [bilingualTextMode, buildAdhdI18n, renderTextWithActiveWord]
  );

  const playAudio = async (text, rate = 1, options = {}) => {
    const { trackWords = true } = options;
    // EPIC 3.1.2: Read lesson text aloud using clear audio (backend TTS with browser fallback).
    // EPIC 3.5.3: Keep audio consistent in quality by using the same TTS path.
    // EPIC 3.5.4: Listening/replay does not affect score.
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    if (trackWords) setActiveWord('');

    try {
      const baseLangKey = activeLesson?.ttsLang || uiLanguage;
      const ttsLanguageKey = inferTtsLanguageKeyFromText(text, baseLangKey);
      const response = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed: rate, lang: backendTtsLangFor(ttsLanguageKey) })
      });

      if (!response.ok) {
        let details = '';
        try {
          details = await response.text();
        } catch {
          // ignore
        }
        const suffix = details ? `: ${details.slice(0, 500)}` : '';
        throw new Error(`Audio generation failed (${response.status})${suffix}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.playbackRate = rate;

      audio.play().catch(e => console.error("Playback failed:", e));
      setCurrentAudio(audio);
      setIsPlaying(true);

      if (trackWords) {
        startSilentBoundaryTracking(text, rate);
      }

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setCurrentAudio(null);
        setIsPlaying(false);
        if (trackWords) setActiveWord('');
      };

      audio.onpause = () => {
        setIsPlaying(false);
        if (trackWords) setActiveWord('');
      };
      audio.onplay = () => setIsPlaying(true);

    } catch (error) {
      console.error("Server TTS failed, falling back to browser:", error);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      const baseLangKey = activeLesson?.ttsLang || uiLanguage;
      const ttsLanguageKey = inferTtsLanguageKeyFromText(text, baseLangKey);
      utterance.lang = speechSynthesisLangFor(ttsLanguageKey);
      if (trackWords) {
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            const charIndex = event.charIndex;
            const textBefore = text.slice(charIndex);
            const firstSpace = textBefore.search(/\s/);
            const word = firstSpace === -1 ? textBefore : textBefore.slice(0, firstSpace);
            const cleanWord = word.replace(/[.,!?;:()"']/g, '');
            setActiveWord(cleanWord);
          }
        };
      }
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => {
        setIsPlaying(false);
        if (trackWords) setActiveWord('');
      };
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
    ,
    {
      id: 5,
      title: 'Tamil Foundations: Everyday Greetings',
      duration: '10 min',
      Icon: Volume2,
      ttsLang: 'tamil',
      steps: [
        {
          type: 'learn',
          content: 'வணக்கம் (Vanakkam)',
          explanation: 'A polite way to say “Hello” in Tamil.',
          visual: null,
          highlight: 'வணக்கம்',
          hint: 'Try saying it slowly: Va-nak-kam.'
        },
        {
          type: 'quiz',
          question: 'வணக்கம் means…',
          options: ['Hello', 'Thank you', 'Goodbye'],
          correct: 'Hello',
          hint: 'It is used to greet someone.'
        },
        {
          type: 'learn',
          content: 'நன்றி (Nandri)',
          explanation: 'This means “Thank you” in Tamil.',
          visual: null,
          highlight: 'நன்றி',
          hint: 'Use this after someone helps you.'
        },
        {
          type: 'quiz',
          question: 'Choose “Thank you” in Tamil.',
          options: ['வணக்கம்', 'நன்றி', 'இல்லை'],
          correct: 'நன்றி',
          hint: 'It starts with ந.'
        },
        {
          type: 'learn',
          content: 'ஆம் (Aam)',
          explanation: 'This means “Yes” in Tamil.',
          visual: null,
          highlight: 'ஆம்',
          hint: 'Say it when you agree.'
        },
        {
          type: 'learn',
          content: 'இல்லை (Illai)',
          explanation: 'This means “No” in Tamil.',
          visual: null,
          highlight: 'இல்லை',
          hint: 'Say it when you disagree.'
        },
        {
          type: 'quiz',
          question: 'Which one means “No”?',
          options: ['ஆம்', 'நன்றி', 'இல்லை'],
          correct: 'இல்லை',
          hint: 'It has two “ல்” sounds.'
        }
      ]
    },
    {
      id: 6,
      title: 'Hindi Foundations: Everyday Greetings',
      duration: '10 min',
      Icon: Mic,
      ttsLang: 'hindi',
      steps: [
        {
          type: 'learn',
          content: 'नमस्ते (Namaste)',
          explanation: 'A polite way to say “Hello” in Hindi.',
          visual: null,
          highlight: 'नमस्ते',
          hint: 'Say it calmly: Na-mas-te.'
        },
        {
          type: 'quiz',
          question: 'नमस्ते means…',
          options: ['Hello', 'Sorry', 'Good night'],
          correct: 'Hello',
          hint: 'It is a greeting.'
        },
        {
          type: 'learn',
          content: 'धन्यवाद (Dhanyavaad)',
          explanation: 'This means “Thank you” in Hindi.',
          visual: null,
          highlight: 'धन्यवाद',
          hint: 'Use it when someone is kind to you.'
        },
        {
          type: 'quiz',
          question: 'Choose “Thank you” in Hindi.',
          options: ['धन्यवाद', 'नमस्ते', 'नहीं'],
          correct: 'धन्यवाद',
          hint: 'It is the longest word here.'
        },
        {
          type: 'learn',
          content: 'हाँ (Haan)',
          explanation: 'This means “Yes” in Hindi.',
          visual: null,
          highlight: 'हाँ',
          hint: 'Say it when you agree.'
        },
        {
          type: 'learn',
          content: 'नहीं (Nahin)',
          explanation: 'This means “No” in Hindi.',
          visual: null,
          highlight: 'नहीं',
          hint: 'Say it when you disagree.'
        },
        {
          type: 'quiz',
          question: 'Which one means “Yes”?',
          options: ['हाँ', 'नहीं', 'नमस्ते'],
          correct: 'हाँ',
          hint: 'It is the shortest option.'
        }
      ]
    }
  ];

  const pronunciationItems = React.useMemo(() => {
    if (!activeLesson?.id) return [];
    if (!Array.isArray(steps) || steps.length === 0) return [];

    const learnSteps = steps.filter((s) => s?.type === 'learn');

    const items = learnSteps
      .map((step, idx) => {
        const label = String(step?.content || '').trim();
        if (!label) return null;

        const withoutParens = label.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
        const expectedForms = [
          label,
          withoutParens,
          step?.highlight,
        ].map((x) => String(x || '').trim()).filter(Boolean);

        return {
          id: `adhd-${activeLesson.id}-${idx}-${withoutParens || label}`,
          label: withoutParens || label,
          speakText: withoutParens || label,
          expectedForms,
        };
      })
      .filter(Boolean);

    const seen = new Set();
    const unique = [];
    for (const item of items) {
      const key = String(item.label).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique;
  }, [activeLesson?.id, steps]);

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

  const handleNextStep = useCallback(() => {
    window.speechSynthesis.cancel(); // Stop audio on next
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setFeedback(null);
      setShowHint(false);
      setAttempts(0);
      setIsTransitioning(false);
    } else {
      setLessonPhase('pronunciation');
      // Removed completion audio
    }
  }, [currentStepIndex, steps.length]);

  useEffect(() => {
    if (lessonPhase !== 'complete') return;
    if (!activeLesson?.id) return;
    if (currentLessonScore < 20) return;

    const key = `adhd-lesson-${activeLesson.id}`;
    if (savedCompletionRef.current.has(key)) return;
    savedCompletionRef.current.add(key);

    // EPIC 4.1.1-4.1.4: Record score and adjust difficulty by one level based on consistent trend.
    const quizStepCount = steps.filter((step) => step?.type === 'quiz').length;
    const maxScore = Math.max(quizStepCount * 10, 20);
    const normalizedScore = Math.max(0, Math.min(100, Math.round((currentLessonScore / maxScore) * 100)));

    recordLessonScore(user, key, normalizedScore, {
      module: 'adhd',
      rawScore: currentLessonScore,
      quizStepCount,
      maxScore,
    });
    const adjustment = adjustDifficulty(user);
    setCurrentDifficulty(adjustment.newDifficulty || adjustment.currentDifficulty || 'Beginner');
    setPerformanceSummary(getPerformanceSummary(user));

    saveLessonCompletion(activeLesson.id);
  }, [lessonPhase, activeLesson, currentLessonScore, steps, user]);

  const handlePreviousStep = () => {
    window.speechSynthesis.cancel();
    setActiveWord('');
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
    playAudio(text, playbackRate, { trackWords: true, lang: uiLanguage });
  };

  const handleAnswer = React.useCallback((option) => {
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
  }, [
    isTransitioning,
    steps,
    currentStepIndex,
    attempts,
    handleNextStep,
  ]);

  // EPIC 3.2: Voice-based answer input (STT) for quiz steps
  const answerRecognitionRef = React.useRef(null);
  const [isAnswerListening, setIsAnswerListening] = useState(false);
  const [answerTranscript, setAnswerTranscript] = useState('');
  const [answerVoiceError, setAnswerVoiceError] = useState('');

  const normalizeVoice = useCallback((value) => {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:()"'{}\u005B\u005D\u201C\u201D\u2018\u2019\u2013\u2014]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const toNumberToken = useCallback((token) => {
    const t = normalizeVoice(token);
    const map = {
      zero: '0',
      one: '1',
      two: '2',
      to: '2',
      too: '2',
      three: '3',
      four: '4',
      for: '4',
      five: '5',
      six: '6',
      seven: '7',
      eight: '8',
      ate: '8',
      nine: '9',
      ten: '10',
    };
    if (map[t]) return map[t];
    if (/^\d+$/.test(t)) return t;
    return token;
  }, [normalizeVoice]);

  const toWordToken = useCallback((token) => {
    const t = normalizeVoice(token);
    const map = {
      '0': 'zero',
      '1': 'one',
      '2': 'two',
      '3': 'three',
      '4': 'four',
      '5': 'five',
      '6': 'six',
      '7': 'seven',
      '8': 'eight',
      '9': 'nine',
      '10': 'ten',
    };
    if (map[t]) return map[t];
    return token;
  }, [normalizeVoice]);

  const makeAnswerForms = useCallback((value) => {
    const base = normalizeVoice(value);
    if (!base) return [];

    const tokens = base.split(' ').filter(Boolean);
    const wordsToDigits = tokens.map(toNumberToken).join(' ');
    const digitsToWords = tokens.map(toWordToken).join(' ');
    const compact = (s) => String(s).replace(/\s+/g, '');

    const forms = [
      base,
      compact(base),
      normalizeVoice(wordsToDigits),
      compact(wordsToDigits),
      normalizeVoice(digitsToWords),
      compact(digitsToWords),
      ...makeSpeechCompareForms(value),
    ].filter(Boolean);

    return Array.from(new Set(forms));
  }, [normalizeVoice, toNumberToken, toWordToken]);

  const isVoiceMatch = useCallback((heard, option) => {
    const heardForms = makeAnswerForms(heard);
    const optionForms = makeAnswerForms(option);
    if (!heardForms.length || !optionForms.length) return false;

    for (const h of heardForms) {
      for (const o of optionForms) {
        if (h === o) return true;

        // Avoid over-matching very short tokens like "a".
        const minLen = Math.min(h.length, o.length);
        if (minLen < 3) continue;

        if (h.includes(o) || o.includes(h)) return true;
      }
    }
    return false;
  }, [makeAnswerForms]);

  const initAnswerSpeechRecognition = useCallback((lang) => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = lang || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    return recognition;
  }, []);

  const stopAnswerListening = useCallback(() => {
    try {
      answerRecognitionRef.current?.stop?.();
    } catch (e) {
      // ignore
    }
    setIsAnswerListening(false);
  }, []);

  const startAnswerListening = useCallback(() => {
    const step = steps.length > 0 ? steps[currentStepIndex] : null;
    if (!step || step.type !== 'quiz') return;
    if (isTransitioning) return;

    setAnswerVoiceError('');

    const options = Array.isArray(step?.options) ? step.options : [];
    const baseLangKey = activeLesson?.ttsLang || uiLanguage;
    const inferredLangKey = inferTtsLanguageKeyFromText(options.join(' '), baseLangKey);
    const recognitionLang = speechRecognitionLangFor(inferredLangKey);

    // Always create a fresh recognizer so `recognition.lang` matches the current option language.
    try {
      answerRecognitionRef.current?.stop?.();
    } catch {
      // ignore
    }

    answerRecognitionRef.current = initAnswerSpeechRecognition(recognitionLang);
    const recognition = answerRecognitionRef.current;
    if (!recognition) {
      setAnswerVoiceError('Voice input is not supported in this browser.');
      return;
    }

    recognition.onstart = () => {
      setIsAnswerListening(true);
      setAnswerVoiceError('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      const cleaned = transcript.trim();
      setAnswerTranscript(cleaned);
      if (!options.length) return;

      const normalized = normalizeVoice(cleaned);
      const letterMap = { a: 0, b: 1, c: 2, d: 3 };
      if (letterMap[normalized] !== undefined) {
        const idx = letterMap[normalized];
        if (idx >= 0 && idx < options.length) {
          handleAnswer(options[idx]);
          return;
        }
      }

      const matched = options.find((opt) => {
        return isVoiceMatch(cleaned, opt);
      });
      if (matched) {
        handleAnswer(matched);
      }
    };

    recognition.onerror = (event) => {
      setIsAnswerListening(false);
      if (event.error === 'no-speech') setAnswerVoiceError('No speech detected. Please try again.');
      else if (event.error === 'audio-capture') setAnswerVoiceError('No microphone found.');
      else if (event.error === 'not-allowed') setAnswerVoiceError('Microphone permission denied.');
      else setAnswerVoiceError('Could not hear clearly. Please try again.');
    };

    recognition.onend = () => {
      setIsAnswerListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsAnswerListening(false);
    }
  }, [steps, currentStepIndex, handleAnswer, initAnswerSpeechRecognition, isTransitioning, isVoiceMatch, normalizeVoice, activeLesson, uiLanguage]);

  useEffect(() => {
    stopAnswerListening();
    setAnswerTranscript('');
    setAnswerVoiceError('');
  }, [currentStepIndex, activeLesson, stopAnswerListening]);

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
  const currentPathLessonId =
    activeLesson?.id ||
    nextRecommendation?.lesson?.id ||
    baseLessons.find((lesson) => !completedLessons.includes(lesson.id))?.id ||
    null;

  return (
    <div className="adhd-view">
      {/* Minimal Top Bar */}
      <header className="top-bar">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BookOpen size={22} aria-hidden="true" />
          <span>{t('learning.common.brand')}</span>
        </h1>
        <div className="header-actions">
          {/* Icon-based navigation buttons (EPIC 5.4) */}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-minimal"
            title={t('learning.common.home')}
            aria-label={t('learning.common.home')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <BookOpen size={18} aria-hidden="true" />
            <span>{t('learning.common.home')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/badges')}
            className="btn-minimal btn-badges"
            title={t('learning.common.badges')}
            aria-label={t('learning.common.badges')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Award size={18} aria-hidden="true" />
            <span>{t('learning.common.badges')}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isSessionActive && !activeLesson) {
                backToSessionStart();
              } else {
                navigate(-1);
              }
            }}
            className="btn-minimal"
            title={t('learning.common.back')}
            aria-label={t('learning.common.back')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ChevronLeft size={18} aria-hidden="true" />
            <span>{t('learning.common.back')}</span>
          </button>
          {/* Existing controls below */}
          {isSessionActive && timeRemaining !== null && (
            <div className="timer-display">
              <span className="timer-icon" aria-hidden="true"><Timer size={16} /></span>
              <span className="timer-text">{formatTime(timeRemaining)}</span>
            </div>
          )}
          <button type="button" onClick={logout} className="btn-logout" title={t('learning.common.logout')}>
            {t('learning.common.logout')}
          </button>
          <button
            type="button"
            onClick={() => setShowSideMenu((prev) => !prev)}
            className="btn-minimal"
            title={t('learning.common.menu')}
            aria-label={t('learning.common.menu')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {showSideMenu ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            <span>{t('learning.common.menu')}</span>
          </button>
        </div>
      </header>

      {showSideMenu && (
        <>
          <div
            onClick={() => setShowSideMenu(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.35)',
              zIndex: 190,
            }}
          />
          <aside
            aria-label="ADHD side menu"
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
              <button type="button" className="btn-minimal" onClick={() => setShowSideMenu(false)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  navigate('/progress');
                  setShowSideMenu(false);
                }}
                className="btn-minimal"
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Hash size={18} aria-hidden="true" />
                <span>{t('learning.common.progress')}</span>
              </button>

              <button
                type="button"
                onClick={toggleDistractionFreeMode}
                className="btn-minimal"
                style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
              >
                <span>{t('learning.adhd.distractionFree')}</span>
                <span>{distractionFreeMode ? t('learning.common.on') : t('learning.common.off')}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const newValue = !preferences?.simplifiedLayout;
                  await updatePreferences({ simplifiedLayout: newValue });
                }}
                className="btn-minimal"
                style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
              >
                <span>{t('learning.common.simple')}</span>
                <span>{preferences?.simplifiedLayout ? t('learning.common.on') : t('learning.common.off')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSettings(true);
                  setShowSideMenu(false);
                }}
                className="btn-minimal"
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Settings size={18} aria-hidden="true" />
                <span>{t('learning.common.settings')}</span>
              </button>
            </div>
          </aside>
        </>
      )}

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
                  <span>{t('learning.adhd.hi', { name: user?.name || '' })}</span>
                  <Hand size={18} aria-hidden="true" />
                </h2>
                <p>{t('learning.adhd.focusOneLesson')}</p>
              </div>

              {!isSessionActive ? (
                <div className="session-start">
                  <h3>{cooldownRemaining > 0 ? t('learning.adhd.takeABreak') : t('learning.adhd.readyToLearn')}</h3>
                  {cooldownRemaining > 0 ? (
                    <>
                      <p>{t('learning.adhd.restMessage', { minutes: Math.ceil(cooldownRemaining / 60) })}</p>
                      <div className="stat-number" style={{ fontSize: '48px', margin: '20px 0' }}>
                        {formatTime(cooldownRemaining)}
                      </div>
                      <button disabled className="btn-start" style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--text-secondary)' }}>
                        {t('learning.adhd.breakTime')}
                      </button>
                    </>
                  ) : (
                    <>
                      <p>{t('learning.adhd.startFocusedSession', { minutes: preferences?.sessionDuration || 20 })}</p>
                      <button onClick={startSession} className="btn-start">
                        {t('learning.adhd.startSession')}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {!preferences?.simplifiedLayout && (
                    <div className="quick-stats">
                      <div className="stat-box">
                        <div className="stat-number">{baseLessons.length}</div>
                        <div className="stat-text">{t('learning.common.lessons')}</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-number">{score}</div>
                        <div className="stat-text">{t('learning.common.pointsToday')}</div>
                      </div>
                    </div>
                  )}

                  {/* FEATURE: Display current difficulty level */}
                  {currentDifficulty && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
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
                      <span>{t('learning.common.currentLevelLabel')} {currentDifficulty}</span>
                      {performanceSummary?.recentAverage > 0 && (
                        <span style={{ marginLeft: '8px', opacity: 0.8 }}>
                          ({performanceSummary.recentAverage.toFixed(0)}% {t('learning.common.avgAbbrev')})
                        </span>
                      )}
                      {typeof performanceSummary?.completionRate === 'number' && performanceSummary.completionRate > 0 && (
                        <span style={{ opacity: 0.8 }}>• {t('learning.common.completionLabel')} {performanceSummary.completionRate}%</span>
                      )}
                    </div>
                  )}

                  {/* FEATURE: Next lesson recommendation - using NextLessonCard component */}
                  {nextRecommendation && (
                    <section className="next-lesson-recommendation" aria-label="Recommended next lesson" style={{ marginBottom: '24px' }}>
                      {nextRecommendation.allCompleted ? (
                        <NextLessonCard
                          allCompleted
                          completionMsg={nextRecommendation.reason}
                          totalLessons={nextRecommendation.totalLessons}
                        />
                      ) : (
                        nextRecommendation.lesson &&
                        skippedRecommendationId !== (nextRecommendation.recommendationKey || String(nextRecommendation.lesson.id)) && (
                          <NextLessonCard
                            recommendation={{
                              title: `${nextRecommendation.recommendationType === 'review' ? t('learning.nextLesson.reviewPrefix') : t('learning.nextLesson.nextPrefix')}: ${nextRecommendation.lesson.title}`,
                              description: `Focused lesson (${nextRecommendation.lesson.duration})`,
                              position: nextRecommendation.position,
                            }}
                            reason={nextRecommendation.reason}
                            completedCount={nextRecommendation.completedCount}
                            totalLessons={nextRecommendation.totalLessons}
                            onAccept={() => {
                              if (!isSessionActive) startSession();
                              handleStartLesson(nextRecommendation.lesson);
                            }}
                            onSkip={() => {
                              const key = nextRecommendation.recommendationKey || String(nextRecommendation.lesson.id);
                              setSkippedRecommendationId(key);
                              try {
                                window.sessionStorage.setItem('adhd-next-lesson-skipped', key);
                              } catch {
                                // ignore
                              }
                            }}
                          />
                        )
                      )}
                    </section>
                  )}

                  {/* EPIC 4.3: Personalized Learning Path (linear, clear, low-overload) */}
                  <section
                    aria-label="ADHD learning path"
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      marginBottom: '20px'
                    }}
                  >
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{t('learning.common.learningPathTitle')}</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {baseLessons.map((lesson, index) => {
                        const isCompleted = completedLessons.includes(lesson.id);
                        const isCurrent = currentPathLessonId === lesson.id && !isCompleted;
                        return (
                          <div
                            key={`adhd-path-${lesson.id}`}
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
                            <span style={{ fontWeight: isCurrent ? 700 : 500 }}>{index + 1}. {lesson.title}</span>
                            <span style={{ fontSize: '12px', color: isCompleted ? '#166534' : isCurrent ? '#1d4ed8' : '#6b7280' }}>
                              {isCompleted ? `✓ ${t('learning.common.statusCompleted')}` : isCurrent ? t('learning.common.statusCurrent') : t('learning.common.statusUpcoming')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section
                    aria-label="Open all lessons page"
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
                      <p style={{ margin: 0, fontWeight: 700, color: '#1e3a8a' }}>{t('learning.common.lessonsAvailableInLibrary')}</p>
                      <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '14px' }}>{t('learning.common.useOpenAllLessons')}</p>
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
                      {t('learning.common.openAllLessons')}
                    </button>
                  </section>
                </>
              )}
            </>
          ) : lessonPhase === 'intro' ? (
            <div className="intro-view" style={{ textAlign: 'center', padding: '3rem', animation: 'fadeIn 0.5s ease' }}>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{activeLesson.title}</h2>
              {isLoading && (
                <p style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={16} aria-hidden="true" />
                  <span>{t('learning.adhd.generatingFocusedContent')}</span>
                </p>
              )}
              <div style={{ background: 'var(--accent-color-soft)', padding: '2rem', borderRadius: '15px', display: 'inline-block', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '1.5rem', margin: 0, color: 'var(--accent-color-hover)' }}>{t('learning.adhd.passingScore')} <strong>20 {t('learning.adhd.points')}</strong></p>
              </div>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                {t('learning.adhd.getReady')}
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
                {isLoading ? t('learning.adhd.loading') : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                    <Rocket size={18} aria-hidden="true" />
                    <span>{t('learning.adhd.imReady')}</span>
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
          ) : lessonPhase === 'pronunciation' ? (
            <div className="lesson-complete-view" style={{ padding: '1.5rem' }}>
              <PronunciationPractice
                title="Pronunciation Practice"
                subtitle={`Practice the words from “${activeLesson?.title || 'this lesson'}”. Complete all to proceed.`}
                items={pronunciationItems}
                recognitionLang={speechRecognitionLangFor(activeLesson?.ttsLang || uiLanguage)}
                ttsLang={activeLesson?.ttsLang || uiLanguage}
                playbackRate={0.85}
                onExit={exitLesson}
                onComplete={() => setLessonPhase('complete')}
              />
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
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)', zIndex: 10, position: 'relative' }}>{t('learning.adhd.congratulations')}</h2>
                  <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', zIndex: 10, position: 'relative' }}>
                    {t('learning.adhd.completedLesson', { lesson: activeLesson.title })}
                  </p>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }} aria-hidden="true"><Dumbbell size={64} /></div>
                  <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('learning.adhd.dontGiveUp')}</h2>
                  <p style={{ fontSize: '1.5rem', color: 'var(--error-color)', fontWeight: 'bold' }}>
                    {t('learning.adhd.oneMoreChance')}
                  </p>
                  <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                    {t('learning.adhd.needPointsToPass', { points: 20 })}
                  </p>
                </>
              )}

              <div className="score-summary" style={{
                background: 'var(--bg-secondary)', padding: '2rem', borderRadius: '20px', margin: '2rem auto', maxWidth: '300px',
                boxShadow: 'var(--fx-shadow-soft)', border: '1px solid var(--border-color)', zIndex: 10, position: 'relative'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('learning.adhd.lessonScoreLabel')}</div>
                <div style={{ fontSize: '3.5rem', fontWeight: '800', color: currentLessonScore >= 20 ? 'var(--success-color)' : 'var(--error-color)', margin: '0.5rem 0' }}>{currentLessonScore}</div>
                <div style={{ fontSize: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  {t('learning.adhd.totalPointsTodayLabel')} <strong>{score}</strong>
                </div>
              </div>

              {/* EPIC 4.5: Motivation Through Reinforcement */}
              {currentLessonScore >= 20 && (
                <div style={{ maxWidth: '500px', margin: '1.5rem auto', zIndex: 10, position: 'relative' }}>
                  <MotivationReward
                    score={currentLessonScore}
                    maxScore={100}
                    lesson={activeLesson}
                    condition="adhd"
                    totalLessonsCompleted={lessonsCompletedCount}
                  />
                </div>
              )}

              {!showPracticeSuggestion && currentLessonScore >= 20 && currentLessonScore < 60 && (
                <div style={{ maxWidth: '500px', margin: '0 auto', zIndex: 10, position: 'relative' }}>
                  <PracticeSuggestion
                    lesson={activeLesson}
                    score={currentLessonScore}
                    condition="adhd"
                    onSkip={() => exitLesson()}
                    onStartPractice={() => setShowPracticeSuggestion(true)}
                  />
                </div>
              )}

              {!showPracticeSuggestion && (
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
                      {t('learning.adhd.returnToDashboard')}
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
                        <span>{t('learning.adhd.tryAgain')}</span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="lesson-player">
              <div className="lesson-header">
                <button onClick={exitLesson} className="btn-back">← {t('learning.common.back')}</button>
                <h3>{activeLesson.title} - {t('learning.adhd.stepProgress', { current: currentStepIndex + 1, total: steps.length })}</h3>
                <button
                  type="button"
                  onClick={() => setShowInstructions(true)}
                  className="btn-instructions"
                  title={pickByLanguage(uiLanguage, {
                    english: 'Instructions',
                    tamil: 'வழிமுறைகள்',
                    hindi: 'निर्देश',
                  })}
                >
                  <Info size={18} aria-hidden="true" />
                  <span>{t('learning.adhd.instructions')}</span>
                </button>
              </div>

              <div className="step-content">
                {!currentStep ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <h3>{t('learning.adhd.contentComingSoon')}</h3>
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
                            {renderBilingualTextWithActiveWord(currentStep.content, {
                              defaultLanguage: activeLesson?.ttsLang || 'english',
                              showLabels: true,
                            })}
                          </h2>
                          <p style={{ fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: '500', marginTop: '1rem' }}>
                            {renderBilingualTextWithActiveWord(currentStep.explanation, {
                              defaultLanguage: 'english',
                              showLabels: true,
                              compact: true,
                              fullWidth: true,
                            })}
                          </p>
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
                            {renderBilingualTextWithActiveWord(currentStep.content, {
                              defaultLanguage: 'english',
                              showLabels: true,
                              fullWidth: true,
                            })}
                          </p>
                        </div>
                      )}

                      {currentStep.type === 'quiz' && (
                        <div className="quiz-mode">
                          <h2>
                            {renderBilingualTextWithActiveWord(currentStep.question, {
                              defaultLanguage: activeLesson?.ttsLang || 'english',
                              showLabels: true,
                              fullWidth: true,
                            })}
                          </h2>
                          <div className="quiz-audio-actions">
                            <button type="button" onClick={handleListenCurrentStep} className="btn-audio" title="Listen to question">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                <Volume2 size={18} aria-hidden="true" />
                                <span>Listen</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={isAnswerListening ? stopAnswerListening : startAnswerListening}
                              className="btn-audio"
                              title="Answer by voice"
                              disabled={feedback?.type === 'success' || isTransitioning}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                                <Mic size={18} aria-hidden="true" />
                                <span>{isAnswerListening ? 'Stop Voice' : 'Answer by Voice'}</span>
                              </span>
                            </button>
                          </div>

                          {answerTranscript && (
                            <div className="voice-transcript" aria-live="polite">
                              Heard: {answerTranscript}
                            </div>
                          )}
                          {answerVoiceError && (
                            <div className="voice-error" role="alert">
                              {answerVoiceError}
                            </div>
                          )}
                          <div className="options-grid">
                            {currentStep.options.map(opt => (
                              <button
                                key={opt}
                                onClick={() => handleAnswer(opt)}
                                className="btn-option"
                                disabled={feedback?.type === 'success' || isTransitioning}
                              >
                                {renderBilingualTextWithActiveWord(opt, {
                                  defaultLanguage: 'english',
                                  showLabels: false,
                                  compact: true,
                                })}
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

      {showInstructions && (
        <div
          className="adhd-instructions-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Instructions"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              stopAllAudio();
              setShowInstructions(false);
            }
          }}
        >
          <div className="adhd-instructions-modal">
            <div className="adhd-instructions-header">
              <h3>
                {pickByLanguage(uiLanguage, {
                  english: 'Instructions',
                  tamil: 'வழிமுறைகள்',
                  hindi: 'निर्देश',
                })}
              </h3>
              <button
                type="button"
                className="adhd-instructions-close"
                onClick={() => {
                  stopAllAudio();
                  setShowInstructions(false);
                }}
                aria-label="Close instructions"
              >
                ×
              </button>
            </div>
            <p className="adhd-instructions-text">{renderTextWithActiveWord(getInstructionsTextForStep(currentStep))}</p>
            <div className="adhd-instructions-actions">
              <button
                type="button"
                className="btn-control"
                onClick={() => playAudio(getInstructionsTextForStep(currentStep), playbackRate, { trackWords: true })}
              >
                <Volume2 size={18} aria-hidden="true" />
                <span>Play</span>
              </button>
              <button
                type="button"
                className="btn-control"
                onClick={() => playAudio(getInstructionsTextForStep(currentStep), playbackRate, { trackWords: true })}
              >
                <RotateCcw size={18} aria-hidden="true" />
                <span>Replay</span>
              </button>
              <button
                type="button"
                className="btn-control"
                onClick={stopAllAudio}
              >
                <Pause size={18} aria-hidden="true" />
                <span>Stop</span>
              </button>
            </div>
            <p className="adhd-instructions-hint">
              {pickByLanguage(uiLanguage, {
                english: 'Tip: Press Esc to close.',
                tamil: 'குறிப்பு: மூட Esc ஐ அழுத்துங்கள்.',
                hindi: 'टिप: बंद करने के लिए Esc दबाएँ।',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ADHDView;
