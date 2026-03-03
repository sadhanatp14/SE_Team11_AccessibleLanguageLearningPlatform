import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { requestInteractionHelp, submitInteraction } from '../../services/interactionService';
import GuidedSupport from './GuidedSupport';
import { decorateDyslexiaText, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';
import { usePreferences } from '../../context/PreferencesContext';
import { useI18n } from '../../utils/i18n';
import {
  backendTtsLangFor,
  pickByLanguage,
  resolveBilingualTextModeFromPreferences,
  resolveUiLanguageFromPreferences,
  speechSynthesisLangFor,
} from '../../utils/languagePrefs';
import { pickI18nString } from '../../utils/lessonI18n';
import { Mic } from 'lucide-react';
import BilingualText from './BilingualText';
import './InteractionCard.css';

const normalizeAnswer = (value) => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  return String(value ?? '').trim().toLowerCase();
};

const encouragementMessages = [
  "You're getting closer!",
  'Nice try. Let’s look at this together.',
  'Learning takes practice. Keep going!',
  'Good effort. Try once more.',
  'You are making progress. Keep it up!',
];

const pickEncouragement = () => {
  return encouragementMessages[
    Math.floor(Math.random() * encouragementMessages.length)
  ];
};

const InteractionCard = ({
  lessonId,
  condition,
  interaction,
  contentLanguage,
  onContinue,
  disableContinue = false,
  useLocalSubmission = false,
  readOnly = false,
  enableTimer = true,
  autoAdvanceOnCorrect = true,
  timeLimitSeconds = 30,
  enableSpeech = false,
  enableTts = true,
  autoPlayNarration = false,
  disableAutoSpeak = false,
  onAnswered,
}) => {
  const { preferences } = usePreferences();
  const { t } = useI18n();
  const uiLanguage = resolveUiLanguageFromPreferences(preferences);
  const bilingualTextMode = resolveBilingualTextModeFromPreferences(preferences);
  const resolvedContentLanguage = String(contentLanguage || '').trim() ? contentLanguage : uiLanguage;
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [guidance, setGuidance] = useState(null);
  const [isHelping, setIsHelping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [lastTranscript, setLastTranscript] = useState('');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [instructionsActiveWord, setInstructionsActiveWord] = useState('');
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const instructionBoundaryRef = useRef(null);

  const dyslexia = useDyslexiaContext({ condition, lessonId, defaultSyllableMode: true });

  const hintTriggerAttempts = useMemo(() => 2, []);
  const resolvedTimeLimit = Number.isFinite(interaction?.timeLimitSeconds)
    ? interaction.timeLimitSeconds
    : timeLimitSeconds;

  const hasAnswer = Boolean(selectedAnswer || typedAnswer);
  const isAnswered = Boolean(result);
  const isCorrect = Boolean(result?.isCorrect);
  const isLocked = isSubmitting || isCorrect;

  useEffect(() => {
    setSelectedAnswer('');
    setSelectedOptionIndex(null);
    setTypedAnswer('');
    setResult(null);
    setError('');
    setIsSubmitting(false);
    setAttempts(0);
    setGuidance(null);
    setTimeLeft(enableTimer && !readOnly ? resolvedTimeLimit : null);
    setLastTranscript('');
    setVoiceError('');
  }, [interaction?.id, lessonId, enableTimer, readOnly, resolvedTimeLimit]);

  const options =
    interaction.type === 'true_false'
      ? ['true', 'false']
      : interaction.options || [];

  const optionItems = useMemo(() => {
    if (interaction.type === 'true_false') {
      return [
        {
          value: 'true',
          baseText: 'True',
          i18n: { english: 'True', tamil: 'சரி', hindi: 'सही' },
        },
        {
          value: 'false',
          baseText: 'False',
          i18n: { english: 'False', tamil: 'தவறு', hindi: 'गलत' },
        },
      ];
    }

    const rawOptions = Array.isArray(interaction?.options) ? interaction.options : [];
    const rawI18n = Array.isArray(interaction?.optionsI18n) ? interaction.optionsI18n : [];
    return rawOptions
      .map((opt, idx) => {
        const optI18n = rawI18n[idx];
        return {
          value: opt,
          baseText: (optI18n && typeof optI18n.english === 'string' && optI18n.english.trim()) ? optI18n.english : opt,
          i18n: optI18n,
        };
      })
      .filter((item) => typeof item.value === 'string' && item.value.trim());
  }, [interaction?.options, interaction?.optionsI18n, interaction?.type]);

  const isShortAnswer = interaction.type === 'short_answer';

  const questionBaseText = useMemo(() => {
    const fromI18n = interaction?.questionI18n?.english;
    if (typeof fromI18n === 'string' && fromI18n.trim()) return fromI18n;
    return interaction?.question || '';
  }, [interaction?.question, interaction?.questionI18n?.english]);

  const instructionStepDicts = useMemo(() => {
    // EPIC 3.7.1-3.7.4: Spoken instructions for activities that are short, replayable, and match on-screen actions.
    const steps = [];

    if (enableTts) {
      steps.push({
        english: 'Press “Listen to Question” to hear the question.',
        tamil: 'கேள்வியை கேட்க “Listen to Question” ஐ அழுத்துங்கள்.',
        hindi: 'प्रश्न सुनने के लिए “Listen to Question” दबाएँ।',
      });
    }

    if (interaction?.type === 'short_answer') {
      steps.push({
        english: 'Type your answer in the box.',
        tamil: 'பெட்டியில் உங்கள் பதிலை টাইப் செய்யுங்கள்.',
        hindi: 'अपना जवाब बॉक्स में टाइप करें।',
      });
    } else if (interaction?.type === 'true_false') {
      steps.push({
        english: 'Choose True or False.',
        tamil: 'True அல்லது False ஐ தேர்வு செய்யுங்கள்.',
        hindi: 'True या False चुनें।',
      });
    } else if (interaction?.type === 'click') {
      steps.push({
        english: 'Tap the option that matches the question.',
        tamil: 'கேள்விக்கு பொருந்தும் விருப்பத்தைத் தட்டுங்கள்.',
        hindi: 'प्रश्न से मिलती विकल्प पर टैप करें।',
      });
    } else {
      steps.push({
        english: 'Select one option.',
        tamil: 'ஒரு விருப்பத்தைத் தேர்வு செய்யுங்கள்.',
        hindi: 'एक विकल्प चुनें।',
      });
    }

    steps.push({
      english: 'Then press “Submit Answer”.',
      tamil: 'பிறகு “Submit Answer” ஐ அழுத்துங்கள்.',
      hindi: 'फिर “Submit Answer” दबाएँ।',
    });

    if (!readOnly) {
      steps.push({
        english: 'If you get stuck, press “Need help?” for a hint.',
        tamil: 'உங்களுக்கு உதவி தேவைப்பட்டால் “Need help?” ஐ அழுத்துங்கள்.',
        hindi: 'अगर अटक जाएँ, तो “Need help?” दबाएँ।',
      });
    }

    if (enableTimer && !readOnly) {
      steps.push({
        english: 'Keep an eye on the timer at the top.',
        tamil: 'மேலே உள்ள நேரம்காட்டியை கவனியுங்கள்.',
        hindi: 'ऊपर दिए टाइमर को देखें।',
      });
    }

    return steps.slice(0, 5);
  }, [enableTts, enableTimer, interaction?.type, readOnly]);

  const instructionSteps = useMemo(() => {
    // 5.2: Instructions should display only in selected UI language.
    return instructionStepDicts.map((step) => pickByLanguage(uiLanguage, step));
  }, [instructionStepDicts, uiLanguage]);

  const instructionHeaderDict = useMemo(
    () => ({
      english: 'Instructions.',
      tamil: 'வழிமுறைகள்.',
      hindi: 'निर्देश.',
    }),
    []
  );

  const instructionText = useMemo(() => {
    const header = pickByLanguage(uiLanguage, instructionHeaderDict);
    return [header, ...instructionSteps].join(' ');
  }, [instructionHeaderDict, instructionSteps, uiLanguage]);


  const displayedInstructionText = useMemo(() => {
    if (!dyslexia.applySyllables) return instructionText;
    if (String(uiLanguage).toLowerCase() !== 'english') return instructionText;
    return decorateDyslexiaText(instructionText);
  }, [dyslexia.applySyllables, instructionText, uiLanguage]);

  const displayedInstructionSteps = useMemo(() => {
    if (!dyslexia.applySyllables) return instructionSteps;
    if (String(uiLanguage).toLowerCase() !== 'english') return instructionSteps;
    return instructionSteps.map((step) => decorateDyslexiaText(step));
  }, [dyslexia.applySyllables, instructionSteps, uiLanguage]);

  const stripWordPunctuation = useCallback((value) => {
    // Remove common ASCII + Unicode punctuation so word highlighting matches
    // things like “Listen”, It’s, or em–dash separated tokens.
    return String(value ?? '').replace(/[.,!?;:()"'{}\u005B\u005D\u201C\u201D\u2018\u2019\u2013\u2014]/g, '');
  }, []);

  const renderHighlightableText = useCallback((text, activeWord) => {
    if (!text) return null;
    const raw = String(text);
    return raw.split(' ').map((token, idx) => {
      const clean = stripWordPunctuation(token);
      const isActive = activeWord && clean && clean.toLowerCase() === activeWord.toLowerCase();
      return (
        <span
          key={`${idx}-${token}`}
          className={isActive ? 'instructions-word is-active' : 'instructions-word'}
        >
          {token}{' '}
        </span>
      );
    });
  }, [stripWordPunctuation]);

  const startInstructionBoundaryTracking = useCallback((text, rate) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!text) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.volume = 0;

      utterance.onboundary = (event) => {
        if (event.name !== 'word') return;
        if (instructionBoundaryRef.current !== utterance) return;
        const charIndex = event.charIndex;
        const textBefore = text.slice(charIndex);
        const firstSpace = textBefore.search(/\s/);
        const word = firstSpace === -1 ? textBefore : textBefore.slice(0, firstSpace);
        const cleanWord = stripWordPunctuation(word);
        setInstructionsActiveWord(cleanWord);
      };

      utterance.onend = () => {
        setInstructionsActiveWord('');
        if (instructionBoundaryRef.current === utterance) {
          instructionBoundaryRef.current = null;
        }
      };

      instructionBoundaryRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // best-effort
    }
  }, [stripWordPunctuation]);

  const stopInstructionAudio = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
    instructionBoundaryRef.current = null;
    setInstructionsActiveWord('');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const closeInstructions = useCallback(() => {
    setIsInstructionsOpen(false);
    stopInstructionAudio();
  }, [stopInstructionAudio]);

  const speak = useCallback(async (text, overrides = {}) => {
    // EPIC 2.1.2, 2.1.4: Audio narration for questions/feedback (backend TTS with fallback) integrated into the interaction flow.
    // EPIC 3.5.1-3.5.2: Allow replay/repetition for words and sentences without limits.
    // EPIC 3.5.3: Keep audio consistent in quality (prefer backend TTS, fall back to browser).
    // EPIC 3.5.4: Repeated listening does not affect marks; scoring is based on answers only.
    if (!enableTts || !text) return;

    // Stop existing audio
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Try Backend TTS first
    try {
      const ttsLanguageKey = overrides.languageKey ?? uiLanguage;
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speed: overrides.rate ?? 0.85,
          lang: backendTtsLangFor(ttsLanguageKey),
        })
      });

      if (!response.ok) throw new Error('TTS Failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.playbackRate = overrides.rate ?? 0.85;
      const cleanupUrl = () => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      };

      audio.onended = () => {
        cleanupUrl();
        if (overrides.trackWords) {
          instructionBoundaryRef.current = null;
          setInstructionsActiveWord('');
          try {
            window.speechSynthesis.cancel();
          } catch (e) {
            // ignore
          }
        }
      };

      // NOTE: audio.play() can fail due to autoplay/user-gesture policies if the
      // fetch took long enough that the click activation expired. If it fails,
      // fall back to browser speechSynthesis in the catch block.
      try {
        await audio.play();
      } catch (playError) {
        try {
          audio.pause();
        } catch (e) {
          // ignore
        }
        audioRef.current = null;
        cleanupUrl();
        throw playError;
      }

      if (overrides.trackWords) {
        startInstructionBoundaryTracking(text, overrides.rate ?? 0.85);
      }

    } catch (e) {
      // Fallback
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = overrides.rate ?? 0.85;
        const ttsLanguageKey = overrides.languageKey ?? uiLanguage;
        utterance.lang = overrides.lang ?? speechSynthesisLangFor(ttsLanguageKey);

        if (overrides.trackWords) {
          utterance.onboundary = (event) => {
            if (event.name !== 'word') return;
            const charIndex = event.charIndex;
            const textBefore = text.slice(charIndex);
            const firstSpace = textBefore.search(/\s/);
            const word = firstSpace === -1 ? textBefore : textBefore.slice(0, firstSpace);
            const cleanWord = stripWordPunctuation(word);
            setInstructionsActiveWord(cleanWord);
          };
          utterance.onend = () => setInstructionsActiveWord('');
        }
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [enableTts, startInstructionBoundaryTracking, stripWordPunctuation, uiLanguage]);

  useEffect(() => {
    if (!isInstructionsOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeInstructions();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isInstructionsOpen, closeInstructions]);

  const playAudio = useCallback((audioUrl) => {
    // EPIC 3.5.1-3.5.2: Audio can be replayed any number of times.
    // EPIC 3.5.4: Listening does not change attempts/score.
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onerror = () => {
      console.warn('Audio source not found, falling back to TTS:', audioUrl);
      audioRef.current = null;
      if (interaction?.question) {
        speak(interaction.question);
      }
    };
    audio.play().catch((err) => {
      console.warn('Audio playback failed, trying TTS:', err);
      if (interaction?.question) {
        speak(interaction.question);
      }
    });
  }, [interaction?.question, speak]);

  useEffect(() => {
    if (!interaction?.question || readOnly || !autoPlayNarration || disableAutoSpeak) return;
    
    // Try to play audio file first, fallback to TTS
    if (interaction.questionAudioUrl) {
      playAudio(interaction.questionAudioUrl);
    } else {
      speak(interaction.question);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, [
    interaction?.id,
    interaction?.question,
    interaction?.questionAudioUrl,
    readOnly,
    autoPlayNarration,
    disableAutoSpeak,
    playAudio,
    speak,
  ]);

  useEffect(() => {
    // EPIC 2.3.4: Keep interactions structured and non-overwhelming (optional timer with a clear limit).
    if (!enableTimer || readOnly || isAnswered) return undefined;
    if (!Number.isFinite(resolvedTimeLimit) || resolvedTimeLimit <= 0) return undefined;
    if (timeLeft === null) return undefined;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enableTimer, readOnly, isAnswered, resolvedTimeLimit, timeLeft]);

  useEffect(() => {
    if (!enableTimer || readOnly) return;
    if (timeLeft === 0 && !isAnswered) {
      // EPIC 2.3.3: Immediate feedback when time runs out.
      const payload = {
        isCorrect: false,
        feedback: 'Time is up. Let’s try again.',
        timedOut: true,
      };
      setResult(payload);
      setGuidance(resolveGuidance({ encouragement: pickEncouragement() }));
      if (!disableAutoSpeak) speak('Time is up. Let\'s try again.');
      if (onAnswered) {
        onAnswered({ isCorrect: false, interactionId: interaction?.id, timedOut: true });
      }
    }
  }, [timeLeft, enableTimer, readOnly, isAnswered, interaction?.id, onAnswered, speak, disableAutoSpeak]);

  // Play feedback audio when result changes (only if auto-speak is not disabled)
  useEffect(() => {
    // EPIC 2.3.3: Immediate feedback (and optional narration) after each attempt.
    if (!result || readOnly || disableAutoSpeak) return;
    
    const isCorrect = Boolean(result.isCorrect);
    const feedback = result.feedback;

    if (isCorrect && interaction?.feedback?.correctAudioUrl) {
      playAudio(interaction.feedback.correctAudioUrl);
    } else if (!isCorrect && interaction?.feedback?.incorrectAudioUrl) {
      playAudio(interaction.feedback.incorrectAudioUrl);
    } else if (feedback) {
      speak(feedback);
    }

    // Play explanation audio if available
    if (result.explanation && interaction?.explanationAudioUrl) {
      setTimeout(() => {
        playAudio(interaction.explanationAudioUrl);
      }, 2000); // Wait 2 seconds after feedback
    }
  }, [
    result,
    readOnly,
    disableAutoSpeak,
    interaction?.feedback?.correctAudioUrl,
    interaction?.feedback?.incorrectAudioUrl,
    interaction?.explanationAudioUrl,
    playAudio,
    speak,
  ]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly || !hasAnswer || isSubmitting) return;

    setIsSubmitting(true);
    setError('');

    const finalAnswer = (() => {
      if (interaction?.type === 'true_false') {
        if (selectedOptionIndex === 0) return true;
        if (selectedOptionIndex === 1) return false;
        return selectedAnswer || typedAnswer;
      }

      if (selectedOptionIndex !== null && selectedOptionIndex !== undefined) {
        return selectedOptionIndex;
      }

      return selectedAnswer || typedAnswer;
    })();

    try {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (useLocalSubmission) {
        const localOptions = Array.isArray(interaction?.options) ? interaction.options : null;
        let selectedForCompare = finalAnswer;
        let correctForCompare = interaction.correctAnswer;

        if (typeof correctForCompare === 'string' && interaction?.correctAnswerI18n) {
          correctForCompare = pickI18nString(resolvedContentLanguage, correctForCompare, interaction.correctAnswerI18n);
        }

        if (localOptions && localOptions.length > 0) {
          if (typeof correctForCompare === 'string' && typeof selectedForCompare === 'number') {
            const mapped = localOptions[selectedForCompare];
            if (typeof mapped === 'string') selectedForCompare = mapped;
          }
          if (typeof correctForCompare === 'number' && typeof selectedForCompare === 'string') {
            const idx = localOptions.findIndex((opt) => normalizeAnswer(opt) === normalizeAnswer(selectedForCompare));
            if (idx >= 0) selectedForCompare = idx;
          }
        }

        const isCorrect =
          normalizeAnswer(selectedForCompare) === normalizeAnswer(correctForCompare);
        const payload = {
          isCorrect,
          feedback: isCorrect ? interaction.feedback.correct : interaction.feedback.incorrect,
        };

        if (!isCorrect) {
          if (interaction.explanation) {
            payload.explanation = interaction.explanation;
            if (interaction.explanationI18n) payload.explanationI18n = interaction.explanationI18n;
          }
          if (interaction.hint && nextAttempts >= hintTriggerAttempts) {
            payload.hint = interaction.hint;
            if (interaction.hintI18n) payload.hintI18n = interaction.hintI18n;
          }
          payload.encouragement = pickEncouragement();
        }

        setResult(payload);
        setGuidance(resolveGuidance(payload));
        if (onAnswered) {
          onAnswered({ isCorrect, interactionId: interaction?.id, timedOut: false });
        }
      } else {
        const response = await submitInteraction({
          lessonId,
          interactionId: interaction.id,
          selectedAnswer: finalAnswer,
          uiLanguage,
        });
        setResult(response);
        setGuidance(resolveGuidance(response));
        if (onAnswered) {
          onAnswered({ isCorrect: Boolean(response?.isCorrect), interactionId: interaction?.id, timedOut: false });
        }
      }
    } catch (submitError) {
      setError('Unable to submit your answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = (option) => {
    if (result && !result.isCorrect) {
      setResult(null);
      setError('');
      setGuidance(null);
    }
    setSelectedAnswer(option);
    const idx = Array.isArray(options) ? options.findIndex((opt) => opt === option) : -1;
    setSelectedOptionIndex(idx >= 0 ? idx : null);
    setTypedAnswer('');
  };

  const handleRetry = () => {
    setResult(null);
    setSelectedAnswer('');
    setSelectedOptionIndex(null);
    setTypedAnswer('');
    setError('');
    setGuidance(null);
    setTimeLeft(enableTimer && !readOnly ? resolvedTimeLimit : null);
  };

  const handleHelp = async () => {
    // EPIC 2.4.1-2.4.4: Guided support: hints/explanations + manual request + encouraging messages.
    setIsHelping(true);
    setError('');
    try {
      if (useLocalSubmission) {
        const payload = {};
        if (interaction.hint && attempts >= hintTriggerAttempts) {
          payload.hint = interaction.hint;
          if (interaction.hintI18n) payload.hintI18n = interaction.hintI18n;
        } else if (interaction.explanation) {
          payload.explanation = interaction.explanation;
          if (interaction.explanationI18n) payload.explanationI18n = interaction.explanationI18n;
        } else if (interaction.hint) {
          payload.hint = interaction.hint;
          if (interaction.hintI18n) payload.hintI18n = interaction.hintI18n;
        }
        payload.encouragement = pickEncouragement();
        setGuidance(resolveGuidance(payload));
      } else {
        const response = await requestInteractionHelp({
          lessonId,
          interactionId: interaction.id,
          uiLanguage,
        });
        setGuidance(resolveGuidance(response));
      }
    } catch (helpError) {
      setError('Unable to load help right now.');
    } finally {
      setIsHelping(false);
    }
  };

  useEffect(() => {
    if (!result) return;
    if (result.isCorrect) {
      // EPIC 2.3.1-2.3.4: Keep interactions simple; auto-advance reduces extra steps after success.
      if (!disableAutoSpeak) speak('Great job. Moving on.');
      if (autoAdvanceOnCorrect && onContinue) {
        const timer = setTimeout(() => {
          onContinue();
        }, 700);
        return () => clearTimeout(timer);
      }
    } else if (result?.timedOut) {
      if (!disableAutoSpeak) speak('Let\'s try again.');
    } else {
      if (!disableAutoSpeak) speak('Nice try. Let\'s try again.');
    }
    return undefined;
  }, [result, autoAdvanceOnCorrect, onContinue, speak, disableAutoSpeak]);

  const guidanceMessage = guidance?.message || '';
  const guidanceMessageI18n = guidance?.i18n || null;
  const guidanceTone = guidance?.tone || '';

  const handleReplayNarration = () => {
    speak(interaction?.question, {
      languageKey: resolvedContentLanguage,
    });
  };

  const handlePlayInstructions = () => {
    // EPIC 3.7.1-3.7.3: Provide spoken instructions + allow replay.
    setInstructionsActiveWord('');
    speak(instructionText, {
      rate: 0.85,
      lang: speechSynthesisLangFor(uiLanguage),
      languageKey: uiLanguage,
      trackWords: true,
    });
  };

  const initSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = speechSynthesisLangFor(resolvedContentLanguage);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    return recognition;
  };

  const handleStartListening = () => {
    if (!enableSpeech) return;
    if (readOnly || isLocked) return;
    setVoiceError('');
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition();
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError('');
    };

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      const cleaned = transcript.trim();
      setLastTranscript(cleaned);
      
      // Always show the transcribed text in the typing field
      setTypedAnswer(cleaned);
      
      if (options.length > 0) {
        // loose matching
        const matched = options.find(
          (option) => normalizeAnswer(option) === normalizeAnswer(cleaned) ||
            cleaned.toLowerCase().includes(option.toLowerCase())
        );
        if (matched) {
          setSelectedAnswer(matched);
          // Keep the transcribed text visible in the typing field
          return;
        }
      }
      // For short answer or unmatched voice input, clear selection
      setSelectedAnswer('');
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        setVoiceError('No speech was detected. Please try again.');
      } else if (event.error === 'audio-capture') {
        setVoiceError('No microphone was found. Ensure it is plugged in.');
      } else if (event.error === 'not-allowed') {
        setVoiceError('Microphone permission denied. Please allow access.');
      } else {
        setVoiceError('We could not hear you clearly. Please try again.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (startError) {
      console.error("Speech start error", startError);
      setIsListening(false);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <form className="interaction-card fx-card" onSubmit={handleSubmit} aria-live="polite">
      <div className="interaction-meta">
        <div className="interaction-timer" aria-live="polite">
          {enableTimer && !readOnly ? (
            <>
              <span className="timer-label">{t('learning.interaction.timeLabel')}</span>
              <span className={`timer-value ${timeLeft !== null && timeLeft <= 5 ? 'warn' : ''}`}>
                {timeLeft ?? resolvedTimeLimit}s
              </span>
            </>
          ) : (
            <span className="timer-label">{t('learning.interaction.noTimer')}</span>
          )}
        </div>
        <button
          type="button"
          className="narration-btn fx-pressable fx-focus"
          onClick={handleReplayNarration}
          aria-label={t('learning.interaction.replayNarrationAria')}
          disabled={!enableTts}
        >
          {/* EPIC 2.1.2, 2.3.4: Learner-controlled question narration (simple control, not overwhelming). */}
          {t('learning.interaction.listenToQuestion')}
        </button>

        <button
          type="button"
          className="instructions-btn fx-pressable fx-focus"
          onClick={() => setIsInstructionsOpen(true)}
          aria-label={t('learning.interaction.openInstructionsAria')}
        >
          {t('learning.interaction.instructionsButton')}
        </button>
      </div>

      <fieldset disabled={isLocked || readOnly}>
        <legend className="interaction-question">
          <BilingualText
            bilingualTextMode={bilingualTextMode}
            contentLanguage={resolvedContentLanguage}
            baseText={questionBaseText}
            i18n={interaction?.questionI18n}
            showLabels={true}
            compact={false}
          />
        </legend>

        {/* Visual aid image for the question (Task 2.5.2, 2.5.4) */}
        {interaction.questionImageUrl && (
          <div className="interaction-question-image">
            <img
              src={interaction.questionImageUrl}
              alt={interaction.question || 'Question illustration'}
              loading="lazy"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )}

        {interaction.type === 'click' ? (
          <div className="interaction-click-group" role="list">
            {optionItems.map((item, idx) => (
              <button
                key={`${interaction.id || 'interaction'}-click-${idx}-${String(item.value)}`}
                type="button"
                className={`interaction-click fx-pressable fx-focus ${selectedAnswer === item.value ? 'selected' : ''}`}
                onClick={() => handleSelect(item.value)}
                aria-pressed={selectedAnswer === item.value}
              >
                <BilingualText
                  bilingualTextMode={bilingualTextMode}
                  contentLanguage={resolvedContentLanguage}
                  baseText={item.baseText}
                  i18n={item.i18n}
                  showLabels={false}
                  compact={true}
                />
              </button>
            ))}
          </div>
        ) : isShortAnswer ? (
          <div className="interaction-input">
            <label htmlFor={`short-${interaction.id}`} className="sr-only">{t('learning.interaction.typeYourAnswer')}</label>
            <input
              id={`short-${interaction.id}`}
              type="text"
              value={typedAnswer}
              onChange={(event) => {
                setTypedAnswer(event.target.value);
                setSelectedAnswer('');
              }}
              placeholder={t('learning.interaction.typeYourAnswerPlaceholder')}
              disabled={readOnly || isLocked}
            />
          </div>
        ) : (
          <div className="interaction-options" role="radiogroup" aria-label={interaction.question}>
            {optionItems.map((item, idx) => (
              <label key={`${interaction.id || 'interaction'}-opt-${idx}-${String(item.value)}`} className="interaction-option">
                <input
                  type="radio"
                  name={interaction.id}
                  value={item.value}
                  checked={selectedAnswer === item.value}
                  onChange={() => handleSelect(item.value)}
                />
                <span>
                  <BilingualText
                    bilingualTextMode={bilingualTextMode}
                    contentLanguage={resolvedContentLanguage}
                    baseText={item.baseText}
                    i18n={item.i18n}
                    showLabels={false}
                    compact={true}
                  />
                </span>
              </label>
            ))}
          </div>
        )}

        {enableSpeech && !readOnly && (
          <div className="interaction-voice">
            <div className="voice-controls">
              <button
                type="button"
                className="voice-btn fx-pressable fx-focus"
                onClick={isListening ? handleStopListening : handleStartListening}
                aria-pressed={isListening}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                  <Mic size={18} aria-hidden="true" />
                  <span>{isListening ? t('learning.interaction.stopVoice') : t('learning.interaction.answerByVoice')}</span>
                </span>
              </button>
              {lastTranscript && (
                <span className="voice-transcript">{t('learning.interaction.heardPrefix')} {lastTranscript}</span>
              )}
            </div>
            {voiceError && <p className="interaction-feedback warning">{voiceError}</p>}
          </div>
        )}

        {!isShortAnswer && (
          <div className="interaction-typed-fallback">
            <label htmlFor={`typed-${interaction.id}`}>{t('learning.interaction.preferTyping')}</label>
            <input
              id={`typed-${interaction.id}`}
              type="text"
              value={typedAnswer}
              onChange={(event) => {
                setTypedAnswer(event.target.value);
                setSelectedAnswer('');
              }}
              placeholder={t('learning.interaction.typeYourAnswerShort')}
              disabled={readOnly || isLocked}
            />
          </div>
        )}
      </fieldset>

      {error && (
        <p className="interaction-feedback error" role="status">
          {error}
        </p>
      )}
      {isAnswered && (
        <div
          className={`interaction-feedback ${isCorrect ? 'correct' : 'incorrect'}`}
          role="status"
        >
          <p>{result?.feedback}</p>
          {isCorrect ? (
            <div className="answer-celebration" aria-hidden="true">
              <span className="celebration-star"></span>
              <span className="celebration-star"></span>
              <span className="celebration-star"></span>
            </div>
          ) : (
            <div className="answer-try-again" aria-hidden="true">
              <span className="try-again-pulse"></span>
            </div>
          )}
        </div>
      )}

      {readOnly && (
        <p className="interaction-feedback" role="status">
          {t('learning.interaction.replayReadOnly')}
        </p>
      )}

      <GuidedSupport
        // EPIC 2.4.1-2.4.4: One-tap access to hints/explanations and encouraging messages.
        message={guidanceMessage}
        messageI18n={guidanceMessageI18n}
        bilingualTextMode={bilingualTextMode}
        uiLanguage={uiLanguage}
        tone={guidanceTone}
        onHelp={handleHelp}
        isLoading={isHelping}
      />

      <div className="interaction-actions">
        {!isAnswered ? (
          <button type="submit" className="btn-submit fx-pressable fx-focus" disabled={readOnly || !hasAnswer || isSubmitting}>
            {isSubmitting ? t('learning.interaction.checking') : t('learning.interaction.submitAnswer')}
          </button>
        ) : (
          <>
            {!isCorrect && (
              <button type="button" className="btn-retry fx-pressable fx-focus" onClick={handleRetry}>
                {t('learning.interaction.tryAgain')}
              </button>
            )}
            {isCorrect && onContinue && (
              <button
                type="button"
                className="btn-continue fx-pressable fx-focus"
                onClick={onContinue}
                disabled={disableContinue}
              >
                {t('app.continue')}
              </button>
            )}
          </>
        )}
      </div>

      {isInstructionsOpen && (
        <div
          className="instructions-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="instructions-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeInstructions();
          }}
        >
          <div
            className={
              dyslexia.isDyslexia
                ? 'instructions-modal instructions-modal--dyslexia'
                : 'instructions-modal'
            }
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="instructions-header">
              <h3 id="instructions-title">{t('learning.interaction.instructionsTitle')}</h3>
              <button
                type="button"
                className="instructions-close fx-pressable fx-focus"
                onClick={closeInstructions}
                aria-label={t('learning.interaction.closeInstructionsAria')}
              >
                ×
              </button>
            </div>

            <p className="instructions-text" data-testid="instructions-text">
              {renderHighlightableText(displayedInstructionText, instructionsActiveWord)}
            </p>

            <ol className="instructions-list">
              {displayedInstructionSteps.map((step, idx) => (
                <li key={`${idx}-${step}`}>
                  <div className="instructions-step-primary">
                    {renderHighlightableText(step, instructionsActiveWord)}
                  </div>
                </li>
              ))}
            </ol>

            <div className="instructions-actions">
              <button
                type="button"
                className="btn-instructions-audio fx-pressable fx-focus"
                onClick={handlePlayInstructions}
                disabled={!enableTts}
              >
                {t('learning.interaction.playReplay')}
              </button>
              <button
                type="button"
                className="btn-instructions-stop fx-pressable fx-focus"
                onClick={stopInstructionAudio}
              >
                {t('learning.common.stop')}
              </button>
            </div>

            <p className="instructions-muted">{t('learning.interaction.tipEscToClose')}</p>
          </div>
        </div>
      )}
    </form>
  );
};

const resolveGuidance = (payload) => {
  if (!payload) return null;
  if (payload.explanation) {
    return { message: payload.explanation, i18n: payload.explanationI18n || null, tone: 'explanation' };
  }
  if (payload.hint) {
    return { message: payload.hint, i18n: payload.hintI18n || null, tone: 'hint' };
  }
  if (payload.encouragement) {
    return { message: payload.encouragement, i18n: null, tone: 'encouragement' };
  }
  return null;
};

export default InteractionCard;
