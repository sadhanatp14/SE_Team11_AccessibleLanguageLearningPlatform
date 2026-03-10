
// AutismView: Main learning interface for users with autism support needs.
// Provides lesson navigation, predictable UI, reduced motion, and progress tracking.
// Integrates with backend for completed lessons and user session state.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import ProfileSettings from '../ProfileSettings';
import api from '../../utils/api';
import { adjustDifficulty, getCurrentDifficulty, getPerformanceSummary, recordLessonScore } from '../../services/difficultyAdjustmentService';
import { getReviewBasedRecommendation } from '../../services/reviewRecommendationService';
import NextLessonCard from './NextLessonCard';
import {
  bilingualPrimaryLanguageForMode,
  backendTtsLangFor,
  isBilingualTextMode,
  normalizePreferredLanguage,
  pickByLanguage,
  resolveBilingualTextModeFromPreferences,
  resolveUiLanguageFromPreferences,
  speechSynthesisLangFor,
} from '../../utils/languagePrefs';
import { useI18n } from '../../utils/i18n';
import BilingualText from './BilingualText';
// Icon imports for UI elements
import {
  BookOpen,
  Check,
  ChevronLeft,
  Hand,
  Hash,
  Info,
  Lightbulb,
  Award,
  Menu,
  Mic,
  Pause,
  RotateCcw,
  Settings,
  Star,
  Timer,
  TrendingUp,
  Volume2,
  X,
} from 'lucide-react';
import PronunciationPractice from './PronunciationPractice';
import PracticeSuggestion from './PracticeSuggestion';
import MotivationReward from './MotivationReward';
// EPIC 4: Personalized Learning Engine Components (Autism Module Only)
// NOTE: These components are imported but not yet created. TODO: Implement these components.
// import AutismRecommendationCard from './AutismRecommendationCard';
// import AutismProgressFeedback from './AutismProgressFeedback';
// import AutismLearningPath from './AutismLearningPath';
import './AutismView.css';

const AUTISM_DASHBOARD_DUPLICATE_LESSON_TITLES = new Set([
  'Greetings',
  'Basic Words',
  'Numbers',
  'Family Members',
  'Common Actions',
]);

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

const inferScriptLanguage = (text) => {
  const value = String(text || '');
  if (/[\u0B80-\u0BFF]/.test(value)) return 'tamil';
  if (/[\u0900-\u097F]/.test(value)) return 'hindi';
  return 'english';
};

const AutismView = ({ initialLessonId = null }) => {
  // Auth context
  const { user, logout } = useAuth();
  const { preferences, updateAccessibilitySettings } = usePreferences();
  const uiLanguage = resolveUiLanguageFromPreferences(preferences);
  const bilingualTextMode = resolveBilingualTextModeFromPreferences(preferences);
  const showBilingualText = isBilingualTextMode(bilingualTextMode);
  const { t } = useI18n();
  const navigate = useNavigate();

  const AUTISM_TEXT_EN_TO_TA = useMemo(
    () => ({
      Hello: 'வணக்கம்',
      Goodbye: 'பிரியாவிடை',
      'Thank you': 'நன்றி',
      Sorry: 'மன்னிக்கவும்',
      Yes: 'ஆம்',
      No: 'இல்லை',
      Maybe: 'ஒருவேளை',
      'How are you?': 'எப்படி இருக்கிறீர்கள்?',
      'Where are you?': 'நீங்கள் எங்கே இருக்கிறீர்கள்?',
      'What is your name?': 'உங்கள் பெயர் என்ன?',
      'Good Morning': 'காலை வணக்கம்',
      'Good night': 'இனிய இரவு',
      'Good Night': 'இனிய இரவு',
      'To greet': 'வணக்கம் சொல்ல',
      'To thank': 'நன்றி சொல்ல',
      'To say goodbye': 'பிரியாவிடை சொல்ல',
      Greeting: 'வணக்கம்',
      Thanking: 'நன்றி சொல்வது',
      'Saying goodbye': 'பிரியாவிடை சொல்வது',
      'In the morning': 'காலையில்',
      'At night': 'இரவில்',
      'In the evening': 'மாலையில்',
      'To say you are fine': 'நீங்கள் நலமாக இருக்கிறேன் என்று சொல்ல',
      'To say thank you': 'நன்றி சொல்ல',
      'To agree': 'ஒப்புக்கொள்ள',
      'To disagree': 'மறுக்க',
      'To ask a question': 'ஒரு கேள்வி கேட்க',
      'To be polite': 'மரியாதையாக இருக்க',

      // English lesson options (alphabet)
      Apple: 'ஆப்பிள்',
      Ball: 'பந்து',
      Cat: 'பூனை',
      Dog: 'நாய்',
      Elephant: 'யானை',
      Fish: 'மீன்',
      Goat: 'ஆடு',
      Hat: 'தொப்பி',
      Ice: 'பனி',
      Jug: 'குடம்',
      Kite: 'பட்டம்',

      // Actions (used as lesson content)
      Walk: 'நட',
      Run: 'ஓடு',
      Sit: 'உட்கார்',
      Stand: 'நில்',
      Eat: 'சாப்பிடு',
      Drink: 'குடி',
      Sleep: 'தூங்கு',
      Jump: 'குதி',
      Read: 'படி',
      Write: 'எழுது',

      // Numbers / general
      One: 'ஒன்று',
      Two: 'இரண்டு',
      Three: 'மூன்று',
      Four: 'நான்கு',
      Five: 'ஐந்து',
      Six: 'ஆறு',
      Seven: 'ஏழு',
      Eight: 'எட்டு',
      Nine: 'ஒன்பது',
      Ten: 'பத்து',
      Eleven: 'பதினொன்று',

      // Family members options
      Mother: 'அம்மா',
      Father: 'அப்பா',
      Sister: 'சகோதரி',
      Brother: 'சகோதரன்',
      Grandfather: 'தாத்தா',
      Grandmother: 'பாட்டி',
      Uncle: 'மாமா',
      Aunt: 'அத்தை',
      'Elder brother': 'மூத்த சகோதரன்',
      'Younger brother': 'இளைய சகோதரன்',
      'Elder sister': 'மூத்த சகோதரி',
      'Younger sister': 'இளைய சகோதரி',

      // Actions lesson options
      'Move your feet': 'உங்கள் கால்களை நகர்த்துங்கள்',
      'Jump high': 'உயரமாக குதிக்க',
      'Stay still': 'அசையாமல் இருங்கள்',
      'Same speed': 'அதே வேகம்',
      'On a chair': 'நாற்காலியில்',
      'In the air': 'காற்றில்',
      'On the ceiling': 'மேல்சுவரில்',
      'Your feet': 'உங்கள் கால்கள்',
      'Your hands': 'உங்கள் கைகள்',
      'Your head': 'உங்கள் தலை',
      'Chew food': 'உணவை மென்று சாப்பிட',
      Water: 'தண்ணீர்',
      'A rock': 'ஒரு கல்',
      'A chair': 'ஒரு நாற்காலி',
      Chair: 'நாற்காலி',
      'While walking': 'நடக்கும் போது',
      'While eating': 'சாப்பிடும் போது',
      'You go up': 'நீங்கள் மேலே செல்கிறீர்கள்',
      'You sit down': 'நீங்கள் உட்காருகிறீர்கள்',
      'You sleep': 'நீங்கள் தூங்குகிறீர்கள்',
      Books: 'புத்தகங்கள்',
      Food: 'உணவு',
      Air: 'காற்று',
      'A pen': 'ஒரு பேனா',
      'Your nose': 'உங்கள் மூக்கு',
    }),
    []
  );

  const AUTISM_TEXT_EN_TO_HI = useMemo(
    () => ({
      Hello: 'नमस्ते',
      Goodbye: 'अलविदा',
      'Thank you': 'धन्यवाद',
      Sorry: 'माफ़ कीजिए',
      Yes: 'हाँ',
      No: 'नहीं',
      Maybe: 'शायद',
      'How are you?': 'आप कैसे हैं?',
      'Where are you?': 'आप कहाँ हैं?',
      'What is your name?': 'आपका नाम क्या है?',
      'Good Morning': 'सुप्रभात',
      'Good night': 'शुभ रात्रि',
      'Good Night': 'शुभ रात्रि',
      'To greet': 'अभिवादन करने के लिए',
      'To thank': 'धन्यवाद कहने के लिए',
      'To say goodbye': 'अलविदा कहने के लिए',
      Greeting: 'अभिवादन',
      Thanking: 'धन्यवाद कहना',
      'Saying goodbye': 'अलविदा कहना',
      'In the morning': 'सुबह',
      'At night': 'रात में',
      'In the evening': 'शाम',
      'To say you are fine': 'यह बताने के लिए कि आप ठीक हैं',
      'To say thank you': 'धन्यवाद कहने के लिए',
      'To agree': 'सहमत होने के लिए',
      'To disagree': 'असहमत होने के लिए',
      'To ask a question': 'प्रश्न पूछने के लिए',
      'To be polite': 'विनम्र होने के लिए',

      Apple: 'सेब',
      Ball: 'गेंद',
      Cat: 'बिल्ली',
      Dog: 'कुत्ता',
      Elephant: 'हाथी',
      Fish: 'मछली',
      Goat: 'बकरी',
      Hat: 'टोपी',
      Ice: 'बर्फ',
      Jug: 'घड़ा',
      Kite: 'पतंग',

      // Actions (used as lesson content)
      Walk: 'चलना',
      Run: 'दौड़ना',
      Sit: 'बैठना',
      Stand: 'खड़ा होना',
      Eat: 'खाना',
      Drink: 'पीना',
      Sleep: 'सोना',
      Jump: 'कूदना',
      Read: 'पढ़ना',
      Write: 'लिखना',

      One: 'एक',
      Two: 'दो',
      Three: 'तीन',
      Four: 'चार',
      Five: 'पाँच',
      Six: 'छह',
      Seven: 'सात',
      Eight: 'आठ',
      Nine: 'नौ',
      Ten: 'दस',
      Eleven: 'ग्यारह',

      Mother: 'माँ',
      Father: 'पिता',
      Sister: 'बहन',
      Brother: 'भाई',
      Grandfather: 'दादा',
      Grandmother: 'दादी',
      Uncle: 'चाचा',
      Aunt: 'चाची',
      'Elder brother': 'बड़ा भाई',
      'Younger brother': 'छोटा भाई',
      'Elder sister': 'बड़ी बहन',
      'Younger sister': 'छोटी बहन',

      'Move your feet': 'अपने पैर हिलाएँ',
      'Jump high': 'ऊँचा कूदो',
      'Stay still': 'स्थिर रहो',
      'Same speed': 'वही गति',
      'On a chair': 'कुर्सी पर',
      'In the air': 'हवा में',
      'On the ceiling': 'छत पर',
      'Your feet': 'आपके पैर',
      'Your hands': 'आपके हाथ',
      'Your head': 'आपका सिर',
      'Chew food': 'खाना चबाओ',
      Water: 'पानी',
      'A rock': 'एक पत्थर',
      'A chair': 'एक कुर्सी',
      Chair: 'कुर्सी',
      'While walking': 'चलते समय',
      'While eating': 'खाते समय',
      'You go up': 'आप ऊपर जाते हैं',
      'You sit down': 'आप बैठते हैं',
      'You sleep': 'आप सोते हैं',
      Books: 'किताबें',
      Food: 'खाना',
      Air: 'हवा',
      'A pen': 'एक पेन',
      'Your nose': 'आपकी नाक',
    }),
    []
  );

  const AUTISM_CONTENT_TO_EN = useMemo(
    () => ({
      'வணக்கம் (Vanakkam)': 'Hello',
      'நன்றி (Nandri)': 'Thank you',
      'எப்படி இருக்கிறீர்கள்? (Eppadi Irukkireergal?)': 'How are you?',
      'மன்னிக்கவும் (Mannikkavum)': 'Sorry',
      'இல்லை (Illai)': 'No',
      'பிரியாவிடை (Piriyavidai)': 'Goodbye',
      'காலை வணக்கம் (Kaalai Vanakkam)': 'Good Morning',
      'நான் நலமாக இருக்கிறேன் (Naan Nalamaaga Irukkiren)': 'I am fine',
      'ஆம் (Aam)': 'Yes',
      'தயவு செய்து (Thayavu Seidhu)': 'Please',

      'एक (Ek)': 'One',
      'दो (Do)': 'Two',
      'तीन (Teen)': 'Three',
      'चार (Chaar)': 'Four',
      'पाँच (Paanch)': 'Five',
      'छह (Chhah)': 'Six',
      'सात (Saat)': 'Seven',
      'आठ (Aath)': 'Eight',
      'नौ (Nau)': 'Nine',
      'दस (Das)': 'Ten',

      'அம்மா (Amma)': 'Mother',
      'அப்பா (Appa)': 'Father',
      'அண்ணா (Anna)': 'Elder brother',
      'அக்கா (Akka)': 'Elder sister',
      'தம்பி (Thambi)': 'Younger brother',
      'தங்கை (Thangai)': 'Younger sister',
      'தாத்தா (Thaathaa)': 'Grandfather',
      'பாட்டி (Paatti)': 'Grandmother',
      'மாமா (Maama)': 'Uncle',
      'அத்தை (Atthai)': 'Aunt',

      Walk: 'Walk',
      Run: 'Run',
      Sit: 'Sit',
      Stand: 'Stand',
      Eat: 'Eat',
      Drink: 'Drink',
      Sleep: 'Sleep',
      Jump: 'Jump',
      Read: 'Read',
      Write: 'Write',
    }),
    []
  );

  const translateAutismEnglishText = useCallback(
    (text, lang) => {
      const key = String(text || '').trim();
      if (!key) return '';
      const normalized = String(lang || '').trim().toLowerCase();
      if (normalized === 'tamil') return AUTISM_TEXT_EN_TO_TA[key] || '';
      if (normalized === 'hindi') return AUTISM_TEXT_EN_TO_HI[key] || '';
      return '';
    },
    [AUTISM_TEXT_EN_TO_HI, AUTISM_TEXT_EN_TO_TA]
  );

  const translateAutismQuestion = useCallback(
    (question, lang) => {
      const q = String(question || '').trim();
      if (!q) return '';
      const normalized = String(lang || '').trim().toLowerCase();

      // Pattern-based translations cover the full question set in this module.
      let m = q.match(/^What does\s+(.+?)\s+mean\?$/i);
      if (m) {
        const term = m[1];
        return normalized === 'tamil' ? `${term} என்றால் என்ன?` : `${term} का मतलब क्या है?`;
      }

      m = q.match(/^When do you say\s+(.+?)\?$/i);
      if (m) {
        const phrase = m[1];
        return normalized === 'tamil' ? `நீங்கள் ${phrase} எப்போது சொல்வீர்கள்?` : `आप ${phrase} कब कहते हैं?`;
      }

      m = q.match(/^What is\s+(.+?)\s+used for\?$/i);
      if (m) {
        const phrase = m[1];
        return normalized === 'tamil' ? `${phrase} எதற்குப் பயன்படுத்தப்படுகிறது?` : `${phrase} किस लिए उपयोग होता है?`;
      }

      m = q.match(/^Why do we use\s+(.+?)\?$/i);
      if (m) {
        const phrase = m[1];
        return normalized === 'tamil' ? `நாம் ${phrase} என்பதை ஏன் பயன்படுத்துகிறோம்?` : `हम ${phrase} का उपयोग क्यों करते हैं?`;
      }

      m = q.match(/^Which word starts with\s+(.+?)\?$/i);
      if (m) {
        const letter = m[1];
        return normalized === 'tamil' ? `எந்த வார்த்தை ${letter}-ஆல் தொடங்குகிறது?` : `कौन सा शब्द ${letter} से शुरू होता है?`;
      }

      m = q.match(/^What number is\s+(.+?)\?$/i);
      if (m) {
        const token = m[1];
        return normalized === 'tamil' ? `${token} எந்த எண்?` : `${token} कौन सी संख्या है?`;
      }

      // Explicit translations for the remaining fixed questions.
      const TA = {
        'What do you do when you walk?': 'நீங்கள் நடக்கும்போது என்ன செய்வீர்கள்?',
        'Is running faster than walking?': 'ஓடுவது நடப்பதைவிட வேகமாக உள்ளதா?',
        'Where can you sit?': 'நீங்கள் எங்கே உட்காரலாம்?',
        'What do you use to stand?': 'நீங்கள் நின்றிருக்க எதை பயன்படுத்துகிறீர்கள்?',
        'What do you do when you eat?': 'நீங்கள் சாப்பிடும் போது என்ன செய்வீர்கள்?',
        'What can you drink?': 'நீங்கள் என்ன குடிக்கலாம்?',
        'When do you usually sleep?': 'நீங்கள் பொதுவாக எப்போது தூங்குவீர்கள்?',
        'What happens when you jump?': 'நீங்கள் குதிக்கும்போது என்ன நடக்கும்?',
        'What do you read?': 'நீங்கள் என்ன படிப்பீர்கள்?',
        'What do you use to write?': 'நீங்கள் எழுத எதை பயன்படுத்துகிறீர்கள்?',
      };

      const HI = {
        'What do you do when you walk?': 'जब आप चलते हैं तो आप क्या करते हैं?',
        'Is running faster than walking?': 'क्या दौड़ना चलने से तेज़ है?',
        'Where can you sit?': 'आप कहाँ बैठ सकते हैं?',
        'What do you use to stand?': 'खड़े होने के लिए आप क्या इस्तेमाल करते हैं?',
        'What do you do when you eat?': 'जब आप खाते हैं तो आप क्या करते हैं?',
        'What can you drink?': 'आप क्या पी सकते हैं?',
        'When do you usually sleep?': 'आप आमतौर पर कब सोते हैं?',
        'What happens when you jump?': 'जब आप कूदते हैं तो क्या होता है?',
        'What do you read?': 'आप क्या पढ़ते हैं?',
        'What do you use to write?': 'लिखने के लिए आप क्या इस्तेमाल करते हैं?',
      };

      if (normalized === 'tamil') return TA[q] || '';
      if (normalized === 'hindi') return HI[q] || '';
      return '';
    },
    []
  );

  const renderContentWithActiveWord = useCallback(
    (text, highlightPhrase, currentActiveWord) => {
      const rawText = String(text || '');
      if (!rawText) return null;

      const phrase = String(highlightPhrase || '').trim();
      const highlightIndex = phrase ? rawText.indexOf(phrase) : -1;

      const renderWords = (segment, keyPrefix, isHighlighted) =>
        segment
          .split(' ')
          .filter((w) => w.length > 0)
          .map((word, idx) => {
            const cleanWord = word.replace(/[.,!?;:() "]/g, '');
            const isActive =
              currentActiveWord && cleanWord.toLowerCase() === currentActiveWord.toLowerCase();
            return (
              <span
                key={`${keyPrefix}-${idx}`}
                className={
                  isActive ? 'highlight active-word' :
                  isHighlighted ? 'highlight keyword-highlight' : ''
                }
              >
                {word}{' '}
              </span>
            );
          });

      if (highlightIndex === -1) {
        return renderWords(rawText, 'w', false);
      }

      const before = rawText.slice(0, highlightIndex);
      const match = rawText.slice(highlightIndex, highlightIndex + phrase.length);
      const after = rawText.slice(highlightIndex + phrase.length);

      return (
        <>
          {renderWords(before, 'before', false)}
          {renderWords(match, 'match', true)}
          {renderWords(after, 'after', false)}
        </>
      );
    },
    []
  );
  // UI state for settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // EPIC 1.6: Autism support is delivered via predictable UI and reduced motion/distraction-free styling.

  // Lesson navigation and progress state
  const [selectedLesson, setSelectedLesson] = useState(null); // Currently selected lesson
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // Current step in lesson
  const [showHint, setShowHint] = useState(false); // Show/hide hint for current step
  const [feedback, setFeedback] = useState(''); // Feedback message for user
  const [completedLessons, setCompletedLessons] = useState([]); // List of completed lesson IDs
  const [stepAnsweredCorrectly, setStepAnsweredCorrectly] = useState({}); // Track correct answers per step
  const [wrongAnswerCount, setWrongAnswerCount] = useState({}); // Track wrong answers per step
  const [showCompletionScreen, setShowCompletionScreen] = useState(false); // Show completion UI
  const [showPronunciationPractice, setShowPronunciationPractice] = useState(false);

  // Timer state for questions
  const [timeRemaining, setTimeRemaining] = useState(null); // Time left for current question
  const [timerActive, setTimerActive] = useState(false); // Is timer running?
  const [questionAnswered, setQuestionAnswered] = useState(false); // Has current question been answered?

  // Audio and timer refs
  const audioRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const autoProgressTimerRef = useRef(null);

  // EPIC 4: Personalized Learning Engine State (Autism Module Only)
  const [nextRecommendation, setNextRecommendation] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [practiceSuggestion, setPracticeSuggestion] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [motivation, setMotivation] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [learningPath, setLearningPath] = useState(null);
  const [showRecommendation, setShowRecommendation] = useState(true);
  const [showPracticeSuggestion, setShowPracticeSuggestion] = useState(false);
  
  // FEATURE: Adaptive Difficulty for Autism
  const [currentDifficulty, setCurrentDifficulty] = useState('Beginner');
  const [performanceSummary, setPerformanceSummary] = useState(null);
  
  const [lessonPerformanceData, setLessonPerformanceData] = useState({
    correctAnswers: 0,
    wrongAnswers: 0,
    hintsUsed: 0,
    startTime: null,
  });

  // Load completed lessons from backend on mount
  useEffect(() => {
    const fetchCompletedLessons = async () => {
      try {
        // EPIC 6.3.1-6.3.4: Fetch read-only completion history to support reopen/review affordances.
        const response = await api.get('/users/completed-lessons');
        if (response.data.success) {
          // Convert backend format (e.g., "autism-lesson-1") to lesson IDs
          const lessonIds = response.data.completedLessons
            .filter(key => key.startsWith('autism-lesson-'))
            .map(key => parseInt(key.replace('autism-lesson-', '')));
          setCompletedLessons(lessonIds);
        }
      } catch (error) {
        // EPIC 6.7.1-6.7.2: Best-effort history fetch; do not block learning center if it fails.
        console.error('Error fetching completed lessons:', error);
      }
    };

    fetchCompletedLessons();
  }, []);

  // EPIC 4: Load adaptive difficulty data (Autism Module Only)
  useEffect(() => {
    // FEATURE: Load adaptive difficulty level
    const difficulty = getCurrentDifficulty(user);
    setCurrentDifficulty(difficulty);

    // Load performance summary
    const summary = getPerformanceSummary(user);
    setPerformanceSummary(summary);
  }, [user]);

  // Define lessons with multi-format content (text, audio, visuals, etc.)
  // Each lesson contains steps/questions for the user
  const lessons = useMemo(() => ([
    {
      id: 1,
      title: 'Greetings',
      language: 'Tamil',
      Icon: Hand,
      description: 'Learn basic Tamil greetings',
      steps: [
        {
          id: 1,
          title: 'Hello in Tamil',
          content: 'வணக்கம் (Vanakkam)',
          translation: 'A common word used when meeting someone',
          highlight: 'வணக்கம்',
          image: '/images/autism-tamil-greeting.svg',
          audio: '/audio/autism-tamil-hello.mp3',
          hint: 'Say "வணக்கம்" when you meet someone. It shows respect and warmth.',
          interaction: {
            question: 'What does வணக்கம் mean?',
            options: ['Hello', 'Goodbye', 'Thank you'],
            correct: 0,
          }
        },
        {
          id: 2,
          title: 'Thank You in Tamil',
          Icon: BookOpen,
          content: 'நன்றி (Nandri)',
          highlight: 'நன்றி',
          image: '/images/autism-tamil-thanks.svg',
          audio: '/audio/autism-tamil-thanks.mp3',
          hint: 'Say "நன்றி" to show gratitude. It\'s a polite way to thank someone.',
          interaction: {
            question: 'When do you say நன்றி?',
            options: ['To greet', 'To thank', 'To say goodbye'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 3,
          title: 'How Are You in Tamil',
          content: 'எப்படி இருக்கிறீர்கள்? (Eppadi Irukkireergal?)',
          translation: 'A question to ask someone in Tamil',
          highlight: 'எப்படி இருக்கிறீர்கள்?',
          image: '/images/autism-tamil-how-are-you.svg',
          audio: '/audio/autism-tamil-how-are-you.mp3',
          hint: 'Use this to ask someone how they are doing. It shows you care.',
          interaction: {
            question: 'What does எப்படி இருக்கிறீர்கள் mean?',
            options: ['How are you?', 'Where are you?', 'What is your name?'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 4,
          title: 'Sorry in Tamil',
          content: 'மன்னிக்கவும் (Mannikkavum)',
          translation: 'A word used when you make a mistake',
          highlight: 'மன்னிக்கவும்',
          image: '/images/autism-tamil-sorry.svg',
          audio: '/audio/autism-tamil-sorry.mp3',
          hint: 'Say this when you make a mistake or need to apologize.',
          interaction: {
            question: 'What does மன்னிக்கவும் mean?',
            options: ['Sorry', 'Thank you', 'Hello'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 5,
          title: 'No in Tamil',
          content: 'இல்லை (Illai)',
          translation: 'Another response word in Tamil',
          highlight: 'இல்லை',
          image: '/images/autism-tamil-no.svg',
          audio: '/audio/autism-tamil-no.mp3',
          hint: 'Use இல்லை when you disagree or want to say no.',
          interaction: {
            question: 'What does இல்லை mean?',
            options: ['No', 'Yes', 'Maybe'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 6,
          title: 'Goodbye in Tamil',
          content: 'பிரியாவிடை (Piriyavidai)',
          translation: 'A respectful parting word in Tamil',
          highlight: 'பிரியாவிடை',
          image: '/images/autism-tamil-goodbye.svg',
          audio: '/audio/autism-tamil-goodbye.mp3',
          hint: 'Say "பிரியாவிடை" when you leave. It\'s a respectful way to say goodbye.',
          interaction: {
            question: 'What is பிரியாவிடை used for?',
            options: ['Greeting', 'Thanking', 'Saying goodbye'],
            correct: 2,
            difficulty: 'medium'
          }
        },
        {
          id: 7,
          title: 'Good Morning in Tamil',
          content: 'காலை வணக்கம் (Kaalai Vanakkam)',
          translation: 'A time-specific greeting in Tamil',
          highlight: 'காலை வணக்கம்',
          image: '/images/autism-tamil-good-morning.svg',
          audio: '/audio/autism-tamil-good-morning.mp3',
          hint: 'காலை means morning. Use this greeting in the morning time.',
          interaction: {
            question: 'When do you say காலை வணக்கம்?',
            options: ['In the morning', 'At night', 'In the evening'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 8,
          title: 'I Am Fine in Tamil',
          content: 'நான் நலமாக இருக்கிறேன் (Naan Nalamaaga Irukkiren)',
          translation: 'A common response in conversation',
          highlight: 'நான் நலமாக இருக்கிறேன்',
          image: '/images/autism-tamil-i-am-fine.svg',
          audio: '/audio/autism-tamil-i-am-fine.mp3',
          hint: 'Say this when someone asks how you are and you feel good.',
          interaction: {
            question: 'When do you say நான் நலமாக இருக்கிறேன்?',
            options: ['To say you are fine', 'To say goodbye', 'To say thank you'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 9,
          title: 'Yes in Tamil',
          content: 'ஆம் (Aam)',
          translation: 'A response word in Tamil',
          highlight: 'ஆம்',
          image: '/images/autism-tamil-yes.svg',
          audio: '/audio/autism-tamil-yes.mp3',
          hint: 'Use ஆம் when you agree or want to say yes.',
          interaction: {
            question: 'When do you say ஆம்?',
            options: ['To agree', 'To disagree', 'To ask a question'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 10,
          title: 'Please in Tamil',
          content: 'தயவு செய்து (Thayavu Seidhu)',
          translation: 'A word used when making requests',
          highlight: 'தயவு செய்து',
          image: '/images/autism-tamil-please.svg',
          audio: '/audio/autism-tamil-please.mp3',
          hint: 'Add this when making a request to be polite and respectful.',
          interaction: {
            question: 'Why do we use தயவு செய்து?',
            options: ['To be polite', 'To greet', 'To say goodbye'],
            correct: 0,
            difficulty: 'hard'
          }
        }
      ]
    },
    {
      id: 2,
      title: 'Basic Words',
      language: 'English',
      Icon: BookOpen,
      description: 'Learn English alphabet letters',
      steps: [
        {
          id: 1,
          title: 'Letter A',
          content: 'A',
          translation: 'This is the first letter of the alphabet',
          highlight: 'A',
          image: '/images/autism-letter-a.svg',
          audio: '/audio/letter-a.mp3',
          hint: 'A is the first letter of the alphabet. Words like "Apple" start with A.',
          interaction: {
            question: 'Which word starts with A?',
            options: ['Ball', 'Apple', 'Cat'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 2,
          title: 'Letter B',
          content: 'B',
          translation: 'This is the second letter of the alphabet',
          highlight: 'B',
          image: '/images/autism-letter-b.svg',
          audio: '/audio/letter-b.mp3',
          hint: 'B is the second letter. Words like "Ball" start with B.',
          interaction: {
            question: 'Which word starts with B?',
            options: ['Apple', 'Ball', 'Dog'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 3,
          title: 'Letter C',
          content: 'C',
          translation: 'This is the third letter of the alphabet',
          highlight: 'C',
          image: '/images/autism-letter-c.svg',
          audio: '/audio/letter-c.mp3',
          hint: 'C is the third letter. Words like "Cat" start with C.',
          interaction: {
            question: 'Which word starts with C?',
            options: ['Cat', 'Ball', 'Apple'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 4,
          title: 'Letter D',
          content: 'D',
          translation: 'This is the fourth letter of the alphabet',
          highlight: 'D',
          image: '/images/autism-letter-d.svg',
          audio: '/audio/letter-d.mp3',
          hint: 'D is the fourth letter. Words like "Dog" start with D.',
          interaction: {
            question: 'Which word starts with D?',
            options: ['Dog', 'Elephant', 'Cat'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 5,
          title: 'Letter E',
          content: 'E',
          translation: 'This is the fifth letter of the alphabet',
          highlight: 'E',
          image: '/images/autism-letter-e.svg',
          audio: '/audio/letter-e.mp3',
          hint: 'E is the fifth letter. Words like "Elephant" start with E.',
          interaction: {
            question: 'Which word starts with E?',
            options: ['Fish', 'Elephant', 'Apple'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 6,
          title: 'Letter F',
          content: 'F',
          translation: 'This is the sixth letter of the alphabet',
          highlight: 'F',
          image: '/images/autism-letter-f.svg',
          audio: '/audio/letter-f.mp3',
          hint: 'F is the sixth letter. Words like "Fish" start with F.',
          interaction: {
            question: 'Which word starts with F?',
            options: ['Fish', 'Goat', 'Dog'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 7,
          title: 'Letter G',
          content: 'G',
          translation: 'This is the seventh letter of the alphabet',
          highlight: 'G',
          image: '/images/autism-letter-g.svg',
          audio: '/audio/letter-g.mp3',
          hint: 'G is the seventh letter. Words like "Goat" start with G.',
          interaction: {
            question: 'Which word starts with G?',
            options: ['Hat', 'Goat', 'Fish'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 8,
          title: 'Letter H',
          content: 'H',
          translation: 'This is the eighth letter of the alphabet',
          highlight: 'H',
          image: '/images/autism-letter-h.svg',
          audio: '/audio/letter-h.mp3',
          hint: 'H is the eighth letter. Words like "Hat" start with H.',
          interaction: {
            question: 'Which word starts with H?',
            options: ['Ice', 'Hat', 'Goat'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 9,
          title: 'Letter I',
          content: 'I',
          translation: 'This is the ninth letter of the alphabet',
          highlight: 'I',
          image: '/images/autism-letter-i.svg',
          audio: '/audio/letter-i.mp3',
          hint: 'I is the ninth letter. Words like "Ice" start with I.',
          interaction: {
            question: 'Which word starts with I?',
            options: ['Ice', 'Jug', 'Hat'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 10,
          title: 'Letter J',
          content: 'J',
          translation: 'This is the tenth letter of the alphabet',
          highlight: 'J',
          image: '/images/autism-letter-j.svg',
          audio: '/audio/letter-j.mp3',
          hint: 'J is the tenth letter. Words like "Jug" start with J.',
          interaction: {
            question: 'Which word starts with J?',
            options: ['Kite', 'Jug', 'Ice'],
            correct: 1,
            difficulty: 'easy'
          }
        }
      ]
    },
    {
      id: 3,
      title: 'Numbers',
      language: 'Hindi',
      Icon: Hash,
      description: 'Learn Hindi numbers 1 to 10',
      steps: [
        {
          id: 1,
          title: 'Number One',
          content: 'एक (Ek)',
          translation: 'This is how we say a number in Hindi',
          highlight: 'एक',
          image: '/images/autism-hindi-one.svg',
          audio: '/audio/hindi-one.mp3',
          hint: 'एक (Ek) is the number 1. Hold up one finger to show एक.',
          interaction: {
            question: 'What number is एक?',
            options: ['One', 'Two', 'Three'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 2,
          title: 'Number Two',
          content: 'दो (Do)',
          translation: 'This is another number in Hindi',
          highlight: 'दो',
          image: '/images/autism-hindi-two.svg',
          audio: '/audio/hindi-two.mp3',
          hint: 'दो (Do) is the number 2. Hold up two fingers to show दो.',
          interaction: {
            question: 'What number is दो?',
            options: ['One', 'Two', 'Three'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 3,
          title: 'Number Three',
          content: 'तीन (Teen)',
          translation: 'Learn this number in Hindi',
          highlight: 'तीन',
          image: '/images/autism-hindi-three.svg',
          audio: '/audio/hindi-three.mp3',
          hint: 'तीन (Teen) is the number 3. Hold up three fingers to show तीन.',
          interaction: {
            question: 'What number is तीन?',
            options: ['One', 'Two', 'Three'],
            correct: 2,
            difficulty: 'easy'
          }
        },
        {
          id: 4,
          title: 'Number Four',
          content: 'चार (Chaar)',
          translation: 'Continue learning Hindi numbers',
          highlight: 'चार',
          image: '/images/autism-hindi-four.svg',
          audio: '/audio/hindi-four.mp3',
          hint: 'चार (Chaar) is the number 4. Hold up four fingers to show चार.',
          interaction: {
            question: 'What number is चार?',
            options: ['Three', 'Four', 'Five'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 5,
          title: 'Number Five',
          content: 'पाँच (Paanch)',
          translation: 'Learn the number five in Hindi',
          highlight: 'पाँच',
          image: '/images/autism-hindi-five.svg',
          audio: '/audio/hindi-five.mp3',
          hint: 'पाँच (Paanch) is the number 5. Show all five fingers on one hand.',
          interaction: {
            question: 'What number is पाँच?',
            options: ['Four', 'Five', 'Six'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 6,
          title: 'Number Six',
          content: 'छह (Chhah)',
          translation: 'Learn the number six in Hindi',
          highlight: 'छह',
          image: '/images/autism-hindi-six.svg',
          audio: '/audio/hindi-six.mp3',
          hint: 'छह (Chhah) is the number 6. Use both hands to show six fingers.',
          interaction: {
            question: 'What number is छह?',
            options: ['Five', 'Six', 'Seven'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 7,
          title: 'Number Seven',
          content: 'सात (Saat)',
          translation: 'Learn the number seven in Hindi',
          highlight: 'सात',
          image: '/images/autism-hindi-seven.svg',
          audio: '/audio/hindi-seven.mp3',
          hint: 'सात (Saat) is the number 7. There are seven days in a week.',
          interaction: {
            question: 'What number is सात?',
            options: ['Six', 'Seven', 'Eight'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 8,
          title: 'Number Eight',
          content: 'आठ (Aath)',
          translation: 'Learn the number eight in Hindi',
          highlight: 'आठ',
          image: '/images/autism-hindi-eight.svg',
          audio: '/audio/hindi-eight.mp3',
          hint: 'आठ (Aath) is the number 8. Show eight fingers using both hands.',
          interaction: {
            question: 'What number is आठ?',
            options: ['Seven', 'Eight', 'Nine'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 9,
          title: 'Number Nine',
          content: 'नौ (Nau)',
          translation: 'Learn the number nine in Hindi',
          highlight: 'नौ',
          image: '/images/autism-hindi-nine.svg',
          audio: '/audio/hindi-nine.mp3',
          hint: 'नौ (Nau) is the number 9. Show nine fingers using both hands.',
          interaction: {
            question: 'What number is नौ?',
            options: ['Eight', 'Nine', 'Ten'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 10,
          title: 'Number Ten',
          content: 'दस (Das)',
          translation: 'Learn the number ten in Hindi',
          highlight: 'दस',
          image: '/images/autism-hindi-ten.svg',
          audio: '/audio/hindi-ten.mp3',
          hint: 'दस (Das) is the number 10. Show all ten fingers on both hands.',
          interaction: {
            question: 'What number is दस?',
            options: ['Nine', 'Ten', 'Eleven'],
            correct: 1,
            difficulty: 'easy'
          }
        }
      ]
    },
    {
      id: 4,
      title: 'Family Members',
      language: 'Tamil',
      Icon: Hand,
      description: 'Learn Tamil words for family members',
      steps: [
        {
          id: 1,
          title: 'Mother',
          content: 'அம்மா (Amma)',
          translation: 'The word for mother in Tamil',
          highlight: 'அம்மா',
          image: '/images/autism-tamil-mother.svg',
          audio: '/audio/autism-tamil-mother.mp3',
          hint: 'அம்மா is how you call your mother. It shows love and respect.',
          interaction: {
            question: 'What does அம்மா mean?',
            options: ['Mother', 'Father', 'Sister'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 2,
          title: 'Father',
          content: 'அப்பா (Appa)',
          translation: 'The word for father in Tamil',
          highlight: 'அப்பா',
          image: '/images/autism-tamil-father.svg',
          audio: '/audio/autism-tamil-father.mp3',
          hint: 'அப்பா is how you call your father. It shows love and respect.',
          interaction: {
            question: 'What does அப்பா mean?',
            options: ['Brother', 'Father', 'Mother'],
            correct: 1,
            difficulty: 'easy'
          }
        },
        {
          id: 3,
          title: 'Elder Brother',
          content: 'அண்ணா (Anna)',
          translation: 'The word for elder brother in Tamil',
          highlight: 'அண்ணா',
          image: '/images/autism-tamil-brother.svg',
          audio: '/audio/autism-tamil-brother.mp3',
          hint: 'அண்ணா is used for elder brother. It shows respect for age.',
          interaction: {
            question: 'What does அண்ணா mean?',
            options: ['Elder brother', 'Younger brother', 'Father'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 4,
          title: 'Elder Sister',
          content: 'அக்கா (Akka)',
          translation: 'The word for elder sister in Tamil',
          highlight: 'அக்கா',
          image: '/images/autism-tamil-sister.svg',
          audio: '/audio/autism-tamil-sister.mp3',
          hint: 'அக்கா is used for elder sister. It shows respect for age.',
          interaction: {
            question: 'What does அக்கா mean?',
            options: ['Mother', 'Elder sister', 'Younger sister'],
            correct: 1,
            difficulty: 'medium'
          }
        },
        {
          id: 5,
          title: 'Younger Brother',
          content: 'தம்பி (Thambi)',
          translation: 'The word for younger brother in Tamil',
          highlight: 'தம்பி',
          image: '/images/autism-tamil-younger-brother.svg',
          audio: '/audio/autism-tamil-younger-brother.mp3',
          hint: 'தம்பி is used for younger brother with affection.',
          interaction: {
            question: 'What does தம்பி mean?',
            options: ['Elder brother', 'Younger brother', 'Father'],
            correct: 1,
            difficulty: 'medium'
          }
        },
        {
          id: 6,
          title: 'Younger Sister',
          content: 'தங்கை (Thangai)',
          translation: 'The word for younger sister in Tamil',
          highlight: 'தங்கை',
          image: '/images/autism-tamil-younger-sister.svg',
          audio: '/audio/autism-tamil-younger-sister.mp3',
          hint: 'தங்கை is used for younger sister with affection.',
          interaction: {
            question: 'What does தங்கை mean?',
            options: ['Younger sister', 'Elder sister', 'Mother'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 7,
          title: 'Grandfather',
          content: 'தாத்தா (Thaathaa)',
          translation: 'The word for grandfather in Tamil',
          highlight: 'தாத்தா',
          image: '/images/autism-tamil-grandfather.svg',
          audio: '/audio/autism-tamil-grandfather.mp3',
          hint: 'தாத்தா is how you call your grandfather with respect.',
          interaction: {
            question: 'What does தாத்தா mean?',
            options: ['Grandfather', 'Grandmother', 'Father'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 8,
          title: 'Grandmother',
          content: 'பாட்டி (Paatti)',
          translation: 'The word for grandmother in Tamil',
          highlight: 'பாட்டி',
          image: '/images/autism-tamil-grandmother.svg',
          audio: '/audio/autism-tamil-grandmother.mp3',
          hint: 'பாட்டி is how you call your grandmother with love.',
          interaction: {
            question: 'What does பாட்டி mean?',
            options: ['Mother', 'Grandmother', 'Grandfather'],
            correct: 1,
            difficulty: 'medium'
          }
        },
        {
          id: 9,
          title: 'Uncle',
          content: 'மாமா (Maama)',
          translation: 'The word for uncle in Tamil',
          highlight: 'மாமா',
          image: '/images/autism-tamil-uncle.svg',
          audio: '/audio/autism-tamil-uncle.mp3',
          hint: 'மாமா is used for your mother\'s brother or uncle.',
          interaction: {
            question: 'What does மாமா mean?',
            options: ['Uncle', 'Aunt', 'Grandfather'],
            correct: 0,
            difficulty: 'hard'
          }
        },
        {
          id: 10,
          title: 'Aunt',
          content: 'அத்தை (Atthai)',
          translation: 'The word for aunt in Tamil',
          highlight: 'அத்தை',
          image: '/images/autism-tamil-aunt.svg',
          audio: '/audio/autism-tamil-aunt.mp3',
          hint: 'அத்தை is used for your father\'s sister or aunt.',
          interaction: {
            question: 'What does அத்தை mean?',
            options: ['Mother', 'Aunt', 'Grandmother'],
            correct: 1,
            difficulty: 'hard'
          }
        }
      ]
    },
    {
      id: 5,
      title: 'Common Actions',
      language: 'English',
      Icon: BookOpen,
      description: 'Learn everyday action words',
      steps: [
        {
          id: 1,
          title: 'Walk',
          content: 'Walk',
          translation: 'Moving by putting one foot in front of the other',
          highlight: 'Walk',
          image: '/images/autism-action-walk.svg',
          audio: '/audio/action-walk.mp3',
          hint: 'When you walk, you move your feet step by step.',
          interaction: {
            question: 'What do you do when you walk?',
            options: ['Move your feet', 'Jump high', 'Stay still'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 2,
          title: 'Run',
          content: 'Run',
          translation: 'Moving quickly by moving your legs fast',
          highlight: 'Run',
          image: '/images/autism-action-run.svg',
          audio: '/audio/action-run.mp3',
          hint: 'Running is faster than walking. You move your legs quickly.',
          interaction: {
            question: 'Is running faster than walking?',
            options: ['Yes', 'No', 'Same speed'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 3,
          title: 'Sit',
          content: 'Sit',
          translation: 'Resting on a chair or the ground',
          highlight: 'Sit',
          image: '/images/autism-action-sit.svg',
          audio: '/audio/action-sit.mp3',
          hint: 'When you sit, you rest on a chair or on the floor.',
          interaction: {
            question: 'Where can you sit?',
            options: ['On a chair', 'In the air', 'On the ceiling'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 4,
          title: 'Stand',
          content: 'Stand',
          translation: 'Being upright on your feet',
          highlight: 'Stand',
          image: '/images/autism-action-stand.svg',
          audio: '/audio/action-stand.mp3',
          hint: 'When you stand, you are on your feet in an upright position.',
          interaction: {
            question: 'What do you use to stand?',
            options: ['Your feet', 'Your hands', 'Your head'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 5,
          title: 'Eat',
          content: 'Eat',
          translation: 'Putting food in your mouth and chewing',
          highlight: 'Eat',
          image: '/images/autism-action-eat.svg',
          audio: '/audio/action-eat.mp3',
          hint: 'When you eat, you put food in your mouth and chew it.',
          interaction: {
            question: 'What do you do when you eat?',
            options: ['Chew food', 'Sleep', 'Run'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 6,
          title: 'Drink',
          content: 'Drink',
          translation: 'Taking liquid into your mouth',
          highlight: 'Drink',
          image: '/images/autism-action-drink.svg',
          audio: '/audio/action-drink.mp3',
          hint: 'When you drink, you take liquid like water or juice.',
          interaction: {
            question: 'What can you drink?',
            options: ['Water', 'A rock', 'A chair'],
            correct: 0,
            difficulty: 'easy'
          }
        },
        {
          id: 7,
          title: 'Sleep',
          content: 'Sleep',
          translation: 'Resting with your eyes closed',
          highlight: 'Sleep',
          image: '/images/autism-action-sleep.svg',
          audio: '/audio/action-sleep.mp3',
          hint: 'When you sleep, you close your eyes and rest at night.',
          interaction: {
            question: 'When do you usually sleep?',
            options: ['At night', 'While walking', 'While eating'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 8,
          title: 'Jump',
          content: 'Jump',
          translation: 'Pushing yourself off the ground',
          highlight: 'Jump',
          image: '/images/autism-action-jump.svg',
          audio: '/audio/action-jump.mp3',
          hint: 'When you jump, you push off the ground and go up in the air.',
          interaction: {
            question: 'What happens when you jump?',
            options: ['You go up', 'You sit down', 'You sleep'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 9,
          title: 'Read',
          content: 'Read',
          translation: 'Looking at words and understanding them',
          highlight: 'Read',
          image: '/images/autism-action-read.svg',
          audio: '/audio/action-read.mp3',
          hint: 'When you read, you look at words in a book and understand them.',
          interaction: {
            question: 'What do you read?',
            options: ['Books', 'Food', 'Air'],
            correct: 0,
            difficulty: 'medium'
          }
        },
        {
          id: 10,
          title: 'Write',
          content: 'Write',
          translation: 'Making letters and words on paper',
          highlight: 'Write',
          image: '/images/autism-action-write.svg',
          audio: '/audio/action-write.mp3',
          hint: 'When you write, you use a pen or pencil to make words.',
          interaction: {
            question: 'What do you use to write?',
            options: ['A pen', 'Your feet', 'Your nose'],
            correct: 0,
            difficulty: 'hard'
          }
        }
      ]
    }
  ]), []);

  // Autism lessons have a fixed teaching language per lesson (Tamil/English/Hindi).
  // UI language should not hide lessons; it only controls scaffolding/chrome text.
  const dashboardLessons = useMemo(() => {
    return lessons.filter((lesson) => !AUTISM_DASHBOARD_DUPLICATE_LESSON_TITLES.has(lesson.title));
  }, [lessons]);

  const displayedLessons = lessons;

  // EPIC 4.7.1-4.7.4: Recommend one follow-up lesson from review + trend data.
  useEffect(() => {
    const recommendation = getReviewBasedRecommendation({
      user,
      module: 'autism',
      lessons,
      completedLessonIds: completedLessons,
    });

    if (!recommendation) {
      setNextRecommendation(null);
      return;
    }

    setNextRecommendation(recommendation);
    setShowRecommendation(true);
  }, [completedLessons, lessons, user]);

  // Get current step data
  const currentLesson = displayedLessons.find(l => l.id === selectedLesson) || lessons.find(l => l.id === selectedLesson);
  const currentStep = currentLesson?.steps[currentStepIndex];
  const totalSteps = currentLesson?.steps.length || 0;
  const currentPathLessonId =
    selectedLesson ||
    nextRecommendation?.lesson?.id ||
    lessons.find((lesson) => !completedLessons.includes(lesson.id))?.id ||
    null;

  const teachingLanguage = useMemo(() => {
    return normalizePreferredLanguage(currentLesson?.language || 'english');
  }, [currentLesson?.language]);

  // No lesson visibility filtering; keep selection stable.

  const resolveLessonLang = useCallback((lessonLanguage) => {
    const raw = String(lessonLanguage || '').toLowerCase();
    if (raw.includes('tamil')) return 'ta-IN';
    if (raw.includes('hindi')) return 'hi-IN';
    return 'en-US';
  }, []);

  const practiceItems = useMemo(() => {
    if (!currentLesson?.steps) return [];

    const items = currentLesson.steps
      .map((step) => {
        const label = (step?.highlight || '').trim() || String(step?.content || '').trim();
        if (!label) return null;

        const content = String(step?.content || '');
        const match = content.match(/\(([^)]+)\)/);
        const transliteration = match?.[1] ? String(match[1]).trim() : '';

        const expectedForms = [
          step?.highlight,
          transliteration,
          label,
        ].map((x) => String(x || '').trim()).filter(Boolean);

        return {
          id: `autism-${currentLesson.id}-${step.id || step.title || label}`,
          label,
          speakText: step?.highlight || label,
          expectedForms,
        };
      })
      .filter(Boolean);

    // Deduplicate by label
    const seen = new Set();
    const unique = [];
    for (const item of items) {
      const key = String(item.label).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique;
  }, [currentLesson?.id, currentLesson?.steps]);

  // EPIC 2.6.1-2.6.4: Navigation handlers with replay support
  const handleNext = () => {
    // Check if current step has been answered correctly
    const stepKey = `${selectedLesson}-${currentStepIndex}`;

    if (!stepAnsweredCorrectly[stepKey]) {
      setFeedback('Please answer the question correctly before moving to the next step.');
      setTimeout(() => setFeedback(''), 3000);
      return;
    }

    setFeedback('');
    setShowHint(false);
    setQuestionAnswered(false); // Reset for next question
    setTimerActive(false); // Stop current timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Lesson content complete -> move to pronunciation practice gate.
      setShowPronunciationPractice(true);
    }
  };

  const handlePrevious = () => {
    setFeedback('');
    setShowHint(false);
    setQuestionAnswered(false); // Reset for previous question
    setTimerActive(false); // Stop current timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Save lesson completion to backend and notify progress system
  const saveLessonCompletion = async (lessonId) => {
    try {
      const lessonKey = `autism-lesson-${lessonId}`;

      // EPIC 6.1.1, 6.4.1: Store completion state and auto-save after lesson completion.
      const res = await api.post('/users/complete-lesson', { lessonKey });

      // EPIC 4.1: Save performance data for difficulty adjustment
      const endTime = Date.now();
      const timeSpent = lessonPerformanceData.startTime 
        ? Math.floor((endTime - lessonPerformanceData.startTime) / 1000)
        : 0;

      const totalQuestions = currentLesson?.steps?.length || 0;
      const correctAnswers = lessonPerformanceData.correctAnswers;
      const wrongAnswers = lessonPerformanceData.wrongAnswers;
      const score = totalQuestions > 0 
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0;

      // EPIC 4.1.1-4.1.4: Record score and adjust difficulty one level at a time.
      recordLessonScore(user, lessonKey, score, {
        module: 'autism',
        totalQuestions,
        correctAnswers,
        wrongAnswers,
        hintsUsed: lessonPerformanceData.hintsUsed,
        timeSpent,
      });
      const adjustment = adjustDifficulty(user);
      setCurrentDifficulty(adjustment.newDifficulty || adjustment.currentDifficulty || 'Beginner');
      setPerformanceSummary(getPerformanceSummary(user));

      try {
        const perfResponse = await api.post('/autism/performance', {
          lessonId,
          score,
          totalQuestions,
          correctAnswers,
          wrongAnswers,
          hintsUsed: lessonPerformanceData.hintsUsed,
          timeSpent,
        });

        if (perfResponse.data.success) {
          // EPIC 4.4: Check if practice is needed
          const pracResponse = await api.get(`/autism/recommendations/practice/${lessonId}`);
          if (pracResponse.data.success) {
            setPracticeSuggestion(pracResponse.data);
          }
        }
      } catch (perfError) {
        console.error('Error saving performance:', perfError);
        // Non-blocking - continue with completion
      }

      // If backend returned a progress summary, broadcast it to update the progress bar/dashboard
      const summary = res?.data?.summary;
      if (summary) {
        // EPIC 6.4.1: Broadcast progress updates so ProgressPage/dashboard refresh automatically.
        window.dispatchEvent(new CustomEvent('progress:updated', { detail: { summary } }));
      } else {
        // Fallback: try to fetch summary and dispatch
        try {
          const { getSummary } = await import('../../services/progressService');
          // EPIC 6.7.1-6.7.2: Best-effort fallback if backend did not include summary.
          const s = await getSummary();
          if (s) {
            window.dispatchEvent(new CustomEvent('progress:updated', { detail: { summary: s } }));
          }
        } catch (e) {
          // ignore fallback errors
        }
      }
    } catch (error) {
      // EPIC 6.7.1-6.7.2: Completion should not break the lesson flow if saving fails.
      console.error('Error saving lesson completion:', error);
    }
  };

  // EPIC 2.1.2, 2.1.4: Audio playback with text-to-speech fallback
  const handlePlayAudio = () => {
    // EPIC 3.1.1: Add a “Play Audio” button for lesson text.
    // EPIC 3.1.2: Read lesson text aloud using clear audio (file audio when available, otherwise TTS).
    // EPIC 3.1.3, 3.5.1-3.5.2: Allow unlimited replay/repetition.
    // EPIC 3.1.4: Keep audio speed slow and easy to understand.
    // EPIC 3.5.4: Repeated listening does not affect marks.
    if (audioRef.current && currentStep?.audio) {
      // Ensure current speed applies to file-based audio
      audioRef.current.playbackRate = playbackSpeed;
      // Try to play the audio file
      audioRef.current.play().catch((error) => {
        console.log('Audio file not available, using text-to-speech fallback');
        // Fallback to browser's text-to-speech if audio file not found
        speakText(currentStep.content, { trackWords: true, preferredLanguage: teachingLanguage });
      });

      // Keep active-word highlighting roughly in sync even when using file audio
      if (currentStep?.content) {
        startSilentBoundaryTracking(currentStep.content, playbackSpeed);
      }

      setFeedback('Playing audio...');
      setTimeout(() => setFeedback(''), 2000);
    } else if (currentStep?.content) {
      // If no audio ref, use text-to-speech directly
      speakText(currentStep.content, { trackWords: true, preferredLanguage: teachingLanguage });
      setFeedback('Playing audio...');
      setTimeout(() => setFeedback(''), 2000);
    }
  };

  const [activeWord, setActiveWord] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(0.8);

  // EPIC 3.2: Voice-based answer input (STT)
  const answerRecognitionRef = useRef(null);
  const [isAnswerListening, setIsAnswerListening] = useState(false);
  const [answerTranscript, setAnswerTranscript] = useState('');
  const [answerVoiceError, setAnswerVoiceError] = useState('');

  const normalizeVoice = useCallback((value) => {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:()"'{}\u005B\u005D\u201C\u201D\u2018\u2019\u2013\u2014]/g, '');
  }, []);

  // EPIC 2.3.1-2.3.4: Interactive engagement with immediate feedback
  const handleInteraction = useCallback(
    (optionIndex) => {
      if (currentStep?.interaction && !questionAnswered) {
        setQuestionAnswered(true);
        setTimerActive(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }

        const stepKey = `${selectedLesson}-${currentStepIndex}`;
        if (optionIndex === currentStep.interaction.correct) {
          setFeedback('Good job! That\'s correct!');
          setStepAnsweredCorrectly((prev) => ({
            ...prev,
            [stepKey]: true,
          }));
          setWrongAnswerCount((prev) => ({
            ...prev,
            [stepKey]: 0,
          }));
        } else {
          const currentWrongCount = wrongAnswerCount[stepKey] || 0;
          const newWrongCount = currentWrongCount + 1;

          setWrongAnswerCount((prev) => ({
            ...prev,
            [stepKey]: newWrongCount,
          }));

          if (newWrongCount >= 2) {
            setFeedback('Try again. Use the hint if you need help, then press Retry to attempt again.');
            setShowHint(true);
          } else {
            setFeedback('Try again! Press Retry to attempt again, or view the hint.');
          }
        }
      }
    },
    [currentStep, currentStepIndex, questionAnswered, selectedLesson, wrongAnswerCount]
  );

  const initAnswerSpeechRecognition = useCallback((preferredLanguage) => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = speechSynthesisLangFor(preferredLanguage || 'english');
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
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
    if (questionAnswered) return;
    setAnswerVoiceError('');

    // ALWAYS use English recognition because all answer options are in English
    // (even for Tamil/Hindi lessons - the options remain in English)
    const desiredLang = speechSynthesisLangFor('english');
    if (!answerRecognitionRef.current || answerRecognitionRef.current.lang !== desiredLang) {
      answerRecognitionRef.current = initAnswerSpeechRecognition('english');
    }

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
      // Collect all alternative transcripts for better matching
      const altList = Array.from(event?.results?.[0] || [])
        .map((item) => String(item?.transcript || '').trim())
        .filter(Boolean);

      const cleaned = altList[0] || '';
      setAnswerTranscript(cleaned);

      const options = currentStep?.interaction?.options || [];
      if (!options.length || !altList.length) return;

      // Try each alternative transcript
      for (const transcript of altList) {
        const normalized = normalizeVoice(transcript);

        // Support speaking A/B/C
        const letterMap = { a: 0, b: 1, c: 2, d: 3 };
        if (letterMap[normalized] !== undefined) {
          const idx = letterMap[normalized];
          if (idx >= 0 && idx < options.length) {
            handleInteraction(idx);
            return;
          }
        }

        // Match by option text - try exact, substring, or partial match
        const matchedIndex = options.findIndex((opt) => {
          const optNorm = normalizeVoice(opt);
          if (optNorm === normalized) return true;
          if (normalized.includes(optNorm) || optNorm.includes(normalized)) return true;
          // Also try compact match (no spaces)
          const normalizedCompact = normalized.replace(/\s+/g, '');
          const optCompact = optNorm.replace(/\s+/g, '');
          return normalizedCompact === optCompact || normalizedCompact.includes(optCompact) || optCompact.includes(normalizedCompact);
        });

        if (matchedIndex >= 0) {
          handleInteraction(matchedIndex);
          return;
        }
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
  }, [currentStep?.interaction?.options, handleInteraction, initAnswerSpeechRecognition, normalizeVoice, questionAnswered]);

  const getInstructionsTextForStep = useCallback(
    (step) => {
      if (!step) {
        return pickByLanguage(uiLanguage, {
          english: 'Follow the on-screen instructions. Use Play Audio to listen, and use Next to continue.',
          tamil: 'திரையில் உள்ள வழிமுறைகளை பின்பற்றுங்கள். கேட்க “Play Audio” ஐ அழுத்துங்கள். தொடர “Next” ஐ அழுத்துங்கள்.',
          hindi: 'स्क्रीन पर दिए निर्देशों का पालन करें। सुनने के लिए “Play Audio” दबाएँ और आगे बढ़ने के लिए “Next” दबाएँ।',
        });
      }

      const hasOptions = Boolean(step?.interaction?.options?.length);
      const hasTyping = Boolean(step?.interaction?.type === 'typing');

      const base = pickByLanguage(uiLanguage, {
        english: 'Take your time. Focus on one step at a time.',
        tamil: 'அவசரம் வேண்டாம். ஒவ்வொரு படியிலும் கவனம் செலுத்துங்கள்.',
        hindi: 'धीरे करें। एक समय में एक चरण पर ध्यान दें।',
      });

      if (hasOptions) {
        return pickByLanguage(uiLanguage, {
          english: `${base} Read the sentence. Press Play Audio to hear it. Then choose one option. If you need help, press Hint. Answer correctly to go to the next step.`,
          tamil: `${base} வாக்கியத்தை வாசியுங்கள். கேட்க “Play Audio” ஐ அழுத்துங்கள். பிறகு ஒரு விருப்பத்தைத் தேர்வு செய்யுங்கள். உதவி தேவைப்பட்டால் “Hint” ஐ அழுத்துங்கள். சரியாக பதிலளித்தால் அடுத்த படிக்கு செல்லலாம்.`,
          hindi: `${base} वाक्य पढ़ें। सुनने के लिए “Play Audio” दबाएँ। फिर एक विकल्प चुनें। मदद चाहिए तो “Hint” दबाएँ। सही उत्तर देकर अगले चरण पर जाएँ।`,
        });
      }

      if (hasTyping) {
        return pickByLanguage(uiLanguage, {
          english: `${base} Read the prompt. Press Play Audio to hear it. Type your answer and submit. If you need help, press Hint. You can replay audio anytime.`,
          tamil: `${base} கேள்வியை வாசியுங்கள். கேட்க “Play Audio” ஐ அழுத்துங்கள். உங்கள் பதிலை টাইப் செய்து submit செய்யுங்கள். உதவி தேவைப்பட்டால் “Hint” ஐ அழுத்துங்கள். ஆடியோவை எப்போது வேண்டுமானாலும் மீண்டும் கேட்கலாம்.`,
          hindi: `${base} संकेत/प्रॉम्प्ट पढ़ें। सुनने के लिए “Play Audio” दबाएँ। अपना जवाब टाइप करें और submit करें। मदद चाहिए तो “Hint” दबाएँ। आप कभी भी ऑडियो फिर से सुन सकते हैं।`,
        });
      }

      return pickByLanguage(uiLanguage, {
        english: `${base} Read the sentence and translation. Press Play Audio to hear it. Use Hint if needed. Continue when you are ready.`,
        tamil: `${base} வாக்கியமும் மொழிபெயர்ப்பும் வாசியுங்கள். கேட்க “Play Audio” ஐ அழுத்துங்கள். தேவைப்பட்டால் “Hint” பயன்படுத்துங்கள். தயாரானதும் தொடருங்கள்.`,
        hindi: `${base} वाक्य और अनुवाद पढ़ें। सुनने के लिए “Play Audio” दबाएँ। जरूरत हो तो “Hint” इस्तेमाल करें। तैयार होने पर आगे बढ़ें।`,
      });
    },
    [uiLanguage]
  );

  const stopAllAudio = useCallback(() => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setActiveWord('');
    setFeedback('');
  }, []);

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

  const stripWordPunctuation = useCallback((value) => {
    return String(value ?? '').replace(/[.,!?;:()"'{}\u005B\u005D\u201C\u201D\u2018\u2019\u2013\u2014]/g, '');
  }, []);

  const renderInstructionsWithActiveWord = useCallback(
    (text) => {
      if (!text) return null;
      return String(text)
        .split(' ')
        .map((token, idx) => {
          const clean = stripWordPunctuation(token);
          const isActive = activeWord && clean && clean.toLowerCase() === activeWord.toLowerCase();
          return (
            <span
              key={`${idx}-${token}`}
              className={isActive ? 'autism-instructions-word is-active' : 'autism-instructions-word'}
            >
              {token}{' '}
            </span>
          );
        });
    },
    [activeWord, stripWordPunctuation]
  );

  const startSilentBoundaryTracking = useCallback((text, rate) => {
    if (!('speechSynthesis' in window)) return;
    try {
      // Cancel any previous boundary tracking utterance
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
          const cleanWord = word.replace(/[.,!?;:()"]/g, '');
          setActiveWord(cleanWord);
        }
      };

      utterance.onend = () => {
        setActiveWord('');
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // Best-effort only.
    }
  }, []);

  // Keep playback speed in sync for both file audio and backend TTS audio.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Text-to-speech fallback function
  // Audio Handling with Backend Support

  const speakText = async (text, options = {}) => {
    const { trackWords = true, preferredLanguage = uiLanguage } = options;
    // Cancel any existing
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if (trackWords) setActiveWord('');

    try {
      // Try Backend TTS
      const ttsUrl = joinUrl(api?.defaults?.baseURL || '/api', '/tts/speak');
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed: playbackSpeed, lang: backendTtsLangFor(preferredLanguage) })
      });

      if (!response.ok) throw new Error('Backend failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = playbackSpeed;
      ttsAudioRef.current = audio;

      audio.onplay = () => setFeedback('Playing audio...');
      audio.onended = () => {
        setFeedback('');
        if (ttsAudioRef.current === audio) {
          ttsAudioRef.current = null;
        }
        if (trackWords) setActiveWord('');
        URL.revokeObjectURL(url);
      };

      audio.onpause = () => {
        if (trackWords) setActiveWord('');
      };

      if (trackWords) {
        startSilentBoundaryTracking(text, playbackSpeed);
      }

      audio.play();

    } catch (e) {
      // Fallback to Browser
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = playbackSpeed;
        utterance.lang = speechSynthesisLangFor(preferredLanguage);

        if (trackWords) {
          utterance.onboundary = (event) => {
            if (event.name === 'word') {
              const charIndex = event.charIndex;
              const textBefore = text.slice(charIndex);
              const firstSpace = textBefore.search(/\s/);
              const word = firstSpace === -1 ? textBefore : textBefore.slice(0, firstSpace);
              const cleanWord = word.replace(/[.,!?;:()"]+/g, '');
              setActiveWord(cleanWord);
            }
          };
        }

        utterance.onstart = () => setFeedback('Playing audio...');
        utterance.onend = () => {
          if (trackWords) setActiveWord('');
          setFeedback('');
        };

        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // EPIC 2.4.3: Learner can request help manually (hint toggle)
  const handleShowHint = () => {
    setShowHint(!showHint);
    // EPIC 4: Track hints used
    if (!showHint) {
      setLessonPerformanceData(prev => ({
        ...prev,
        hintsUsed: prev.hintsUsed + 1,
      }));
    }
  };

  // Timer logic for questions based on difficulty
  const getTimeForDifficulty = useCallback((difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 20; // 20 seconds for easy questions
      case 'medium':
        return 35; // 35 seconds for medium questions
      case 'hard':
        return 50; // 50 seconds for hard questions
      default:
        return 30; // default 30 seconds
    }
  }, []);

  // Handle timeout
  const handleTimeOut = useCallback(() => {
    if (!questionAnswered) {
      setFeedback('Time\'s up! Click retry to try again.');
      setQuestionAnswered(true);
      setTimerActive(false);

      const stepKey = `${selectedLesson}-${currentStepIndex}`;
      const currentWrongCount = wrongAnswerCount[stepKey] || 0;
      const newWrongCount = currentWrongCount + 1;

      setWrongAnswerCount((prev) => ({
        ...prev,
        [stepKey]: newWrongCount,
      }));

      setTimeout(() => {
        setShowHint(true); // Show hint after timeout
      }, 1500);
    }
  }, [questionAnswered, selectedLesson, currentStepIndex, wrongAnswerCount]);

  // Start timer when step changes or has interaction
  useEffect(() => {
    const hasInteraction = Boolean(currentStep?.interaction);

    if (hasInteraction) {
      const difficulty = currentStep?.interaction?.difficulty || 'medium';
      const timeLimit = getTimeForDifficulty(difficulty);
      setTimeRemaining(timeLimit);
      setTimerActive(true);
      setQuestionAnswered(false);
      setFeedback('');
      setShowHint(false);
    } else {
      setTimerActive(false);
      setTimeRemaining(null);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentStepIndex, selectedLesson, currentStep?.interaction, getTimeForDifficulty]);

  // Timer countdown effect
  useEffect(() => {
    if (timerActive && timeRemaining !== null && timeRemaining > 0 && !questionAnswered) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimerActive(false);
            // Handle timeout
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [timerActive, timeRemaining, questionAnswered, handleTimeOut]);

  // Handle retry button click
  const handleRetry = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const difficulty = currentStep?.interaction?.difficulty || 'medium';
    const timeLimit = getTimeForDifficulty(difficulty);
    setTimeRemaining(timeLimit);
    setTimerActive(true);
    setQuestionAnswered(false);
    setFeedback('');
    setShowHint(false);
    const stepKey = `${selectedLesson}-${currentStepIndex}`;
    // Reset wrong answer count for this step
    setWrongAnswerCount(prev => ({
      ...prev,
      [stepKey]: 0
    }));
  };

  useEffect(() => {
    // Stop listening when moving to a new step or after answering.
    if (questionAnswered) stopAnswerListening();
  }, [questionAnswered, stopAnswerListening, currentStepIndex, selectedLesson]);

  const renderDifficultyLabel = (difficulty) => {
    const normalized = difficulty || 'medium';
    const count = normalized === 'easy' ? 1 : normalized === 'medium' ? 2 : 3;
    const text = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} aria-hidden="true">
          {Array.from({ length: count }).map((_, idx) => (
            <Star key={idx} size={14} />
          ))}
        </span>
        <span>{text}</span>
      </span>
    );
  };

  // Start lesson
  const handleStartLesson = (lessonId) => {
    setSelectedLesson(lessonId);
    setCurrentStepIndex(0);
    setShowHint(false);
    setFeedback('');
    setStepAnsweredCorrectly({});
    setWrongAnswerCount({});
    setQuestionAnswered(false);
    setShowCompletionScreen(false);
    setShowPronunciationPractice(false);
    
    // EPIC 4: Initialize performance tracking
    setLessonPerformanceData({
      correctAnswers: 0,
      wrongAnswers: 0,
      hintsUsed: 0,
      startTime: Date.now(),
    });
    setPracticeSuggestion(null);
  };

  const autoOpenedLessonRef = React.useRef(null);

  useEffect(() => {
    if (!initialLessonId) return;
    if (selectedLesson) return;

    const targetId = Number(initialLessonId);
    if (!Number.isFinite(targetId)) return;
    if (autoOpenedLessonRef.current === targetId) return;

    autoOpenedLessonRef.current = targetId;
    handleStartLesson(targetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLessonId, selectedLesson]);

  // Return to lesson list
  const handleBackToLessons = () => {
    setSelectedLesson(null);
    setCurrentStepIndex(0);
    setShowHint(false);
    setFeedback('');
    setStepAnsweredCorrectly({});
    setWrongAnswerCount({});
    setQuestionAnswered(false);
    setShowCompletionScreen(false);
    setShowPronunciationPractice(false);
  };

  // Handle next lesson from completion screen
  const handleNextLesson = () => {
    const nextLessonId = selectedLesson + 1;
    if (nextLessonId <= lessons.length) {
      handleStartLesson(nextLessonId);
    } else {
      // No more lessons, go back to lesson list
      handleBackToLessons();
    }
  };

  // Handle progress navigation
  const handleGoToProgress = () => {
    navigate('/progress');
  };

  // Cleanup audio on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
      }
      // Clear auto-progress timer
      if (autoProgressTimerRef.current) {
        clearTimeout(autoProgressTimerRef.current);
      }
    };
  }, []);

  // Clear auto-progress timer when changing steps or lessons
  useEffect(() => {
    // Clear any pending auto-progress when step or lesson changes
    if (autoProgressTimerRef.current) {
      clearTimeout(autoProgressTimerRef.current);
      autoProgressTimerRef.current = null;
    }
  }, [currentStepIndex, selectedLesson]);

  // EPIC 1.6: Distraction-free mode when in lesson view
  if (selectedLesson && currentStep) {
    if (showPronunciationPractice) {
      const lessonLang = resolveLessonLang(currentLesson?.language);
      return (
        <div className="autism-view pronunciation-screen">
          <div className="completion-container">
            <div className="completion-content">
              <PronunciationPractice
                title="Pronunciation Practice"
                subtitle={`Practice the words from “${currentLesson?.title || 'this lesson'}”. Complete all to proceed.`}
                items={practiceItems}
                recognitionLang={lessonLang}
                ttsLang={lessonLang}
                playbackRate={0.85}
                onExit={handleBackToLessons}
                onComplete={() => {
                  // Mark lesson as completed *after* practice.
                  if (!completedLessons.includes(selectedLesson)) {
                    setCompletedLessons([...completedLessons, selectedLesson]);
                    saveLessonCompletion(selectedLesson);
                  }
                  setShowPronunciationPractice(false);
                  setShowCompletionScreen(true);
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Show completion screen after finishing all steps
    if (showCompletionScreen) {
      // Calculate normalized score (0-100) using lesson performance data
      const correctCount = lessonPerformanceData?.correctAnswers || 0;
      const totalCount = currentStepIndex + 1;
      const normalizedScore = Math.round((correctCount / Math.max(1, totalCount)) * 100);
      
      return (
        <div className="autism-view completion-screen">
          <div className="completion-container">
            <div className="completion-content">
              <div className="completion-icon">🎉</div>
              <h1 className="completion-title">Great Job!</h1>
              <p className="completion-message">You completed "{currentLesson.title}" lesson!</p>
              <p style={{ fontSize: '14px', color: '#556270', marginTop: '8px' }}>
                Score: {normalizedScore}%
              </p>

              {/* EPIC 4.5: Motivation Through Reinforcement */}
              {normalizedScore >= 20 && (
                <div style={{ maxWidth: '500px', margin: '20px auto' }}>
                  <MotivationReward
                    score={normalizedScore}
                    maxScore={100}
                    lesson={currentLesson}
                    condition="autism"
                    totalLessonsCompleted={1}
                  />
                </div>
              )}

              {!showPracticeSuggestion && normalizedScore >= 20 && normalizedScore < 60 && (
                <div style={{ maxWidth: '500px', margin: '20px auto' }}>
                  <PracticeSuggestion
                    lesson={currentLesson}
                    score={normalizedScore}
                    condition="autism"
                    onSkip={() => handleBackToLessons()}
                    onStartPractice={() => setShowPracticeSuggestion(true)}
                  />
                </div>
              )}

              {!showPracticeSuggestion && (
                <div className="completion-actions">
                  {selectedLesson < lessons.length && (
                    <button onClick={handleNextLesson} className="btn-completion btn-next-lesson">
                      <span className="btn-icon">➡️</span>
                      Go to Next Lesson
                    </button>
                  )}
                  <button onClick={handleBackToLessons} className="btn-completion btn-back-lessons">
                    <span className="btn-icon">📚</span>
                    Back to Lessons
                  </button>
                  <button onClick={handleGoToProgress} className="btn-completion btn-progress">
                    <span className="btn-icon">📊</span>
                    View Progress
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="autism-view distraction-free">
        {/* EPIC 1.6: Minimal header for focus */}
        <header className="lesson-header">
          <button onClick={handleBackToLessons} className="btn-back">
            ← Back to Lessons
          </button>
          <h2 className="lesson-title">{currentLesson.title}</h2>
          <button
            type="button"
            onClick={() => navigate('/progress')}
            className="btn-settings"
            title="View progress"
            style={{ marginLeft: 'auto' }}
          >
            Progress
          </button>
        </header>

        {/* EPIC 2.2.2, 2.2.4, 2.7.1-2.7.4: Consistent single-step layout */}
        <main className="lesson-content">
          <div className="lesson-step-container">
            {/* Step progress indicator */}
            <div className="step-progress">
              <span className="step-number">Step {currentStepIndex + 1} of {totalSteps}</span>
              <div className="progress-dots">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <span
                    key={i}
                    className={`dot ${i === currentStepIndex ? 'active' : ''} ${i < currentStepIndex ? 'completed' : ''}`}
                  ></span>
                ))}
              </div>
            </div>

            {/* EPIC 2.1.1-2.1.4: Multi-format lesson display (text + audio + visuals) */}
            <div className="step-content-card">
              {/* Left Column: Image, Question, and Options */}
              <div className="visual-column">
                {/* EPIC 2.5.2-2.5.4: Visual learning aid with image + keyword label */}
                <div className="step-visual">
                  <img src={currentStep.image} alt={currentStep.title} className="visual-image" />
                  {/* EPIC 2.5.4: Keyword badge on image linking visual to content */}
                  {currentStep.highlight && (
                    <span className="visual-keyword-badge">{currentStep.highlight}</span>
                  )}
                </div>
                {/* EPIC 2.5.2: Caption linking image to lesson content */}
                <p className="visual-caption">
                  <span className="caption-icon" aria-hidden="true">🔤</span>
                  {currentStep.title}
                </p>

                {/* Question below image */}
                {currentStep.interaction && (
                  <div className="step-interaction-left">
                    <p className="interaction-question">
                      {showBilingualText ? (
                        <BilingualText
                          bilingualTextMode={bilingualTextMode}
                          contentLanguage="english"
                          baseText={currentStep.interaction.question}
                          i18n={{
                            english: currentStep.interaction.question,
                            tamil: translateAutismQuestion(currentStep.interaction.question, 'tamil'),
                            hindi: translateAutismQuestion(currentStep.interaction.question, 'hindi'),
                          }}
                          showLabels={false}
                          compact
                        />
                      ) : (
                        currentStep.interaction.question
                      )}
                    </p>

                    <div className="interaction-voice-answer">
                      <button
                        type="button"
                        onClick={isAnswerListening ? stopAnswerListening : startAnswerListening}
                        className="btn-audio btn-voice"
                        disabled={questionAnswered}
                        title="Answer by voice"
                      >
                        <Mic size={18} aria-hidden="true" />
                        <span>{isAnswerListening ? 'Stop Voice' : 'Answer by Voice'}</span>
                      </button>

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
                    </div>
                  </div>
                )}

                {/* Answer Options below question */}
                {currentStep.interaction && (
                  <div className="interaction-options">
                    {currentStep.interaction.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleInteraction(index)}
                        className="btn-option"
                        disabled={questionAnswered}
                      >
                        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                        <span className="option-text">
                          <BilingualText
                            bilingualTextMode={bilingualTextMode}
                            contentLanguage="english"
                            baseText={option}
                            i18n={{
                              english: option,
                              tamil: translateAutismEnglishText(option, 'tamil'),
                              hindi: translateAutismEnglishText(option, 'hindi'),
                            }}
                            showLabels={false}
                            compact
                          />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Right Column: Content, Timer/Retry */}
              <div className="content-column">
                {/* EPIC 2.5.1: Highlighted main content with multi-word phrase support */}
                <div className="step-text">
                  <p className="content-main">
                    {showBilingualText ? (
                      (() => {
                        const rawContent = String(currentStep.content || '');
                        const highlightPhrase = currentStep.highlight || '';
                        const contentLang = inferScriptLanguage(rawContent);

                        // If the content is English, show primary as user's preferred local language.
                        const primaryLang = bilingualPrimaryLanguageForMode(bilingualTextMode);
                        const primaryLabel = contentLang === 'english' ? labelForLang(primaryLang) : labelForLang(contentLang);

                        const primaryText =
                          contentLang === 'english'
                            ? translateAutismEnglishText(rawContent, primaryLang) || rawContent
                            : rawContent;

                        const englishMeaning = AUTISM_CONTENT_TO_EN[rawContent] || '';
                        const secondaryText = contentLang === 'english' ? rawContent : (englishMeaning || rawContent);

                        return (
                          <span className="bilingual-text">
                            <span className="bilingual-line bilingual-primary">
                              <span className="bilingual-label">{primaryLabel}</span>
                              <span className="bilingual-value">{renderContentWithActiveWord(primaryText, highlightPhrase, activeWord)}</span>
                            </span>
                            <span className="bilingual-break" aria-hidden="true" />
                            <span className="bilingual-line bilingual-secondary">
                              <span className="bilingual-label">English</span>
                              <span className="bilingual-value">{renderContentWithActiveWord(secondaryText, highlightPhrase, activeWord)}</span>
                            </span>
                          </span>
                        );
                      })()
                    ) : (
                      renderContentWithActiveWord(currentStep.content, currentStep.highlight, activeWord)
                    )}
                  </p>
                    {showBilingualText && currentStep.translation ? (
                      <p className="content-translation">{currentStep.translation}</p>
                    ) : null}
                </div>

                {/* EPIC 2.1.2: Audio controls */}
                <div className="step-audio-section">
                  <div className="autism-audio-actions">
                    <button onClick={handlePlayAudio} className="btn-audio">
                      <Volume2 size={18} aria-hidden="true" />
                      <span>Play Audio</span>
                    </button>
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
                      <span>Instructions</span>
                    </button>
                  </div>
                  <audio
                    ref={audioRef}
                    src={currentStep.audio}
                    preload="none"
                    onError={() => console.log('Audio file not found, will use text-to-speech')}
                  />
                  <p className="audio-info">Click to hear the pronunciation</p>

                  <div className="audio-controls-speed" style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.9rem', alignSelf: 'center' }}>Speed:</span>
                    <button
                      onClick={() => setPlaybackSpeed(0.6)}
                      className={playbackSpeed === 0.6 ? 'btn-speed active' : 'btn-speed'}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: playbackSpeed === 0.6 ? 'var(--accent-color-soft)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      Slow
                    </button>
                    <button
                      onClick={() => setPlaybackSpeed(0.9)}
                      className={playbackSpeed === 0.9 ? 'btn-speed active' : 'btn-speed'}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: playbackSpeed === 0.9 ? 'var(--accent-color-soft)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      Normal
                    </button>
                  </div>
                </div>

                {/* Timer Display OR Retry Button in same position */}
                {currentStep.interaction && (
                  <div className="timer-retry-container">
                    {timerActive && timeRemaining !== null && !questionAnswered ? (
                      <div className={`timer-display ${timeRemaining <= 10 ? 'timer-warning' : ''}`}>
                        <div className="timer-circle">
                          <svg width="100" height="100" viewBox="0 0 120 120">
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              fill="none"
                              stroke="#e0e0e0"
                              strokeWidth="8"
                            />
                            <circle
                              cx="60"
                              cy="60"
                              r="50"
                              fill="none"
                              stroke={timeRemaining <= 10 ? '#ff5252' : '#4CAF50'}
                              strokeWidth="8"
                              strokeDasharray={`${2 * Math.PI * 50}`}
                              strokeDashoffset={`${2 * Math.PI * 50 * (1 - timeRemaining / getTimeForDifficulty(currentStep.interaction.difficulty))}`}
                              transform="rotate(-90 60 60)"
                              style={{ transition: 'stroke-dashoffset 1s linear' }}
                            />
                          </svg>
                          <div className="timer-content">
                            <span className="timer-emoji" aria-hidden="true"><Timer size={18} /></span>
                            <span className="timer-number">{timeRemaining}</span>
                          </div>
                        </div>
                        <div className="timer-info">
                          <span className={`difficulty-badge difficulty-${currentStep.interaction.difficulty}`}>
                            {renderDifficultyLabel(currentStep.interaction.difficulty)}
                          </span>
                        </div>
                      </div>
                    ) : questionAnswered && !timerActive ? (
                      <div className="retry-section">
                        <span className={`difficulty-badge difficulty-${currentStep.interaction.difficulty}`}>
                          {renderDifficultyLabel(currentStep.interaction.difficulty)}
                        </span>
                        <button onClick={handleRetry} className="btn-retry">
                          <RotateCcw size={18} aria-hidden="true" />
                          <span>Retry Question</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* EPIC 2.3.3: Immediate feedback */}
                {feedback && <div className="feedback-message">{feedback}</div>}

                {/* EPIC 2.4.1-2.4.4: Hint/explanation/encouragement section - hide in simplified mode */}
                {!preferences?.simplifiedLayout && (
                  <div className="hint-section">
                    <button onClick={handleShowHint} className="btn-hint">
                      <Lightbulb size={18} aria-hidden="true" />
                      <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                    </button>
                    {showHint && <div className="hint-content">{currentStep.hint}</div>}
                  </div>
                )}
              </div>

            </div>

            {/* EPIC 2.6.1-2.6.4, 2.7.2: Consistent navigation in fixed position */}
            <div className="step-navigation">
              <button
                onClick={handlePrevious}
                disabled={currentStepIndex === 0}
                className="btn-nav btn-previous"
              >
                <ChevronLeft size={18} />
                <span>Prev</span>
              </button>
              <button
                onClick={handleNext}
                className="btn-nav btn-next"
              >
                {currentStepIndex < totalSteps - 1 ? 'Next →' : (
                  <>
                    <span>Complete Lesson</span>
                    <Check size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          </div>
        </main>

        {showInstructions && (
          <div
            className="autism-instructions-overlay"
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
            <div className="autism-instructions-modal">
              <div className="autism-instructions-header">
                <h3>
                  {pickByLanguage(uiLanguage, {
                    english: 'Instructions',
                    tamil: 'வழிமுறைகள்',
                    hindi: 'निर्देश',
                  })}
                </h3>
                <button
                  type="button"
                  className="autism-instructions-close"
                  onClick={() => {
                    stopAllAudio();
                    setShowInstructions(false);
                  }}
                  aria-label="Close instructions"
                >
                  ×
                </button>
              </div>
              <p className="autism-instructions-text">{renderInstructionsWithActiveWord(getInstructionsTextForStep(currentStep))}</p>
              <div className="autism-instructions-actions">
                <button
                  type="button"
                  className="btn-settings"
                  onClick={() => speakText(getInstructionsTextForStep(currentStep), { trackWords: true })}
                >
                  <Volume2 size={18} aria-hidden="true" />
                  <span>{t('learning.common.play')}</span>
                </button>
                <button
                  type="button"
                  className="btn-settings"
                  onClick={() => speakText(getInstructionsTextForStep(currentStep), { trackWords: true })}
                >
                  <RotateCcw size={18} aria-hidden="true" />
                  <span>{t('learning.common.replay')}</span>
                </button>
                <button
                  type="button"
                  className="btn-settings"
                  onClick={stopAllAudio}
                >
                  <Pause size={18} aria-hidden="true" />
                  <span>{t('learning.common.stop')}</span>
                </button>
              </div>
              <p className="autism-instructions-hint">
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
  }

  // EPIC 1.6: Lesson selection view (simplified layout)
  return (
    <div className="autism-view">
      {/* Simple Header */}
      <header className="simple-header">
        <div className="header-left">
          <h1>{t('learning.autism.learningCenterTitle')}</h1>
          <p className="header-subtitle">{t('learning.autism.chooseYourLesson')}</p>
        </div>
        <div className="header-actions">
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
          <button
            type="button"
            onClick={() => navigate('/badges')}
            className="btn-settings"
            title={t('learning.common.badges')}
            aria-label={t('learning.common.badges')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Award size={18} aria-hidden="true" />
            <span>{t('learning.common.badges')}</span>
          </button>
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
          <button onClick={logout} className="btn-exit">
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
            aria-label="Autism side menu"
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

      {showSettings && (
        <ProfileSettings onClose={() => setShowSettings(false)} />
      )}

      {/* Main Content */}
      <main className="content-area-simple">
        {/* Welcome Card */}
        <div className="welcome-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{t('learning.autism.hello', { name: user?.name || '' })}</span>
            <Hand size={18} aria-hidden="true" />
          </h2>
          <p>{t('learning.autism.selectLessonToBegin')}</p>
        </div>

        {/* FEATURE: Display current difficulty level */}
        {currentDifficulty && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            marginTop: '20px',
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

        {/* Lessons Grid - Predictable Layout */}
        <div className="lessons-simple-grid" aria-label="Available lessons">
          {dashboardLessons.length === 0 ? (
            <div className="autism-dashboard-recommendation" style={{ gridColumn: '1 / -1' }}>
              {nextRecommendation ? (
                nextRecommendation.allCompleted ? (
                  <NextLessonCard
                    variant="autism"
                    allCompleted
                    completionMsg={nextRecommendation.reason}
                    totalLessons={nextRecommendation.totalLessons}
                  />
                ) : (
                  showRecommendation &&
                  nextRecommendation.lesson && (
                    <NextLessonCard
                      variant="autism"
                      recommendation={{
                        ...nextRecommendation.lesson,
                        position: nextRecommendation.position,
                      }}
                      reason={nextRecommendation.reason}
                      completedCount={nextRecommendation.completedCount}
                      totalLessons={nextRecommendation.totalLessons}
                      onAccept={(rec) => handleStartLesson(rec.id)}
                      onSkip={() => setShowRecommendation(false)}
                    />
                  )
                )
              ) : (
                <button
                  type="button"
                  className="btn-lesson-start"
                  onClick={() => navigate('/lesson-library')}
                >
                  {t('learning.common.openAllLessons')}
                </button>
              )}
            </div>
          ) : (
            dashboardLessons.map((lesson, index) => {
            const isCompleted = completedLessons.includes(lesson.id);
            const palette = [
              { accent: '#2563eb', soft: '#dbeafe', hover: '#1d4ed8' },
              { accent: '#7c3aed', soft: '#ede9fe', hover: '#6d28d9' },
              { accent: '#059669', soft: '#d1fae5', hover: '#047857' },
              { accent: '#d97706', soft: '#fef3c7', hover: '#b45309' },
            ];
            const colors = palette[index % palette.length];
            const LessonIcon = lesson.Icon || BookOpen;

            return (
              <div
                key={`autism-lesson-card-${lesson.id}`}
                className={`lesson-simple-card${isCompleted ? ' completed' : ''}`}
                style={{
                  '--accent-color': colors.accent,
                  '--accent-color-soft': colors.soft,
                  '--accent-color-hover': colors.hover,
                }}
              >
                <div className="lesson-top">
                  <div className="lesson-large-icon" aria-hidden="true">
                    <LessonIcon size={28} />
                  </div>
                  {isCompleted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="completion-checkmark" aria-label={t('learning.common.statusCompleted')}>
                        <Check size={18} aria-hidden="true" />
                      </span>
                      <span className="completion-badge">{t('learning.common.statusCompleted')}</span>
                    </div>
                  )}
                </div>
                <div className="lesson-body">
                  <h4>{lesson.title}</h4>
                  <p>{lesson.description}</p>
                </div>
                <button
                  type="button"
                  className="btn-lesson-start"
                  onClick={() => handleStartLesson(lesson.id)}
                >
                  {isCompleted ? t('learning.common.reviewLesson') : t('learning.common.startLesson')}
                </button>
              </div>
            );
          })
          )}
        </div>

        {/* EPIC 4.5: Motivational Feedback */}
        {/* NOTE: AutismProgressFeedback component not yet created
        {motivation && (
          <AutismProgressFeedback
            motivation={motivation}
            onContinue={() => {/* Continue to lessons *//* }}
          />
        )}
        */}

        {/* EPIC 4.2: Next Lesson Recommendation */}
        {/* NOTE: AutismRecommendationCard component not yet created
        {showRecommendation && nextRecommendation && (
          <AutismRecommendationCard
            recommendation={nextRecommendation}
            onStart={(lessonId) => {
              handleStartLesson(lessonId);
              setShowRecommendation(false);
            }}
            onSkip={() => setShowRecommendation(false)}
          />
        )}
        */}

        {/* EPIC 4.3: Learning Path Overview */}
        {/* NOTE: AutismLearningPath component not yet created
        {learningPath && (
          <AutismLearningPath
            learningPath={learningPath.learningPath}
            progress={learningPath.progress}
            onSelectLesson={(lessonId) => handleStartLesson(lessonId)}
          />
        )}
        */}

        {/* EPIC 4.3: Personalized Learning Path (linear, clear, low-overload) */}
        <section
          aria-label="Autism learning path"
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
            {lessons.map((lesson, index) => {
              const isCompleted = completedLessons.includes(lesson.id);
              const isCurrent = currentPathLessonId === lesson.id && !isCompleted;
              return (
                <div
                  key={`autism-path-${lesson.id}`}
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
            background: 'linear-gradient(135deg, #e7edf5, #c9d8e8)',
            border: '1px solid #9fb6cc',
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
            <p style={{ margin: 0, fontWeight: 700, color: '#1f3f57' }}>{t('learning.common.lessonsAvailableInLibrary')}</p>
            <p style={{ margin: '4px 0 0 0', color: '#334155', fontSize: '14px' }}>{t('learning.common.useOpenAllLessons')}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/lesson-library')}
            style={{
              border: 'none',
              borderRadius: '10px',
              background: '#27465f',
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

        {/* Simple Help Section */}
        <div className="help-section">
          <div className="help-card">
            <span className="help-icon" aria-hidden="true"><Info size={20} /></span>
            <div className="help-text">
              <h4>{t('learning.autism.howItWorks')}</h4>
              <p>{t('learning.autism.howItWorksBody')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AutismView;
