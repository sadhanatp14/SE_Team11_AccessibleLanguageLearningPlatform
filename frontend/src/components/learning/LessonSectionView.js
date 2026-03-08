import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InteractionCard from './InteractionCard';
import VisualLesson from './VisualLesson';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import api from '../../utils/api';
import { getLessonProgress, normalizeUserId, saveLessonProgress } from '../../services/dyslexiaProgressService';
import { decorateDyslexiaText, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';
import {
  backendTtsLangFor,
  bilingualPrimaryLanguageForMode,
  isBilingualTextMode,
  resolveBilingualTextModeFromPreferences,
  speechSynthesisLangFor,
} from '../../utils/languagePrefs';
import { pickI18nString } from '../../utils/lessonI18n';
import BilingualText from './BilingualText';
import {
  Activity,
  Apple,
  Armchair,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Footprints,
  Hand,
  Hash,
  Home,
  ImageOff,
  MessageCircle,
  Mic,
  MousePointer,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Smile,
  Sparkles,
  Star,
  Sun,
  Users,
  Handshake,
} from 'lucide-react';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const joinUrl = (base, path) => {
  const baseStr = String(base || '').replace(/\/+$/, '');
  const pathStr = String(path || '');
  const normalizedPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${baseStr}${normalizedPath}`;
};

const splitParagraphs = (text, { decorateEnglish = false } = {}) => {
  const rawText = typeof text === 'string' ? text : String(text ?? '');
  if (!rawText.trim()) return [];
  const results = [];
  const regex = /[^\n]+/g;
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const leadingWhitespace = raw.search(/\S/);
    const startIndex = (match.index || 0) + (leadingWhitespace >= 0 ? leadingWhitespace : 0);
    results.push({
      text: decorateEnglish ? decorateDyslexiaText(trimmed) : trimmed,
      startIndex,
    });
  }
  return results;
};

/* Map keywords in questions/section titles to icon illustrations */
const illustrationMap = [
  { keywords: ['hello', 'greet', 'greeting', 'hi'], Icon: Hand, label: 'Greeting', bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { keywords: ['how are you', 'feeling', 'fine'], Icon: Smile, label: 'Feelings', bg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { keywords: ['goodbye', 'bye', 'see you'], Icon: Handshake, label: 'Farewell', bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { keywords: ['reply', 'respond', 'answer'], Icon: MessageCircle, label: 'Conversation', bg: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
  { keywords: ['chair', 'sit', 'furniture'], Icon: Armchair, label: 'Furniture', bg: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' },
  { keywords: ['apple', 'eat', 'fruit', 'food'], Icon: Apple, label: 'Food', bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { keywords: ['book', 'read', 'reading'], Icon: BookOpen, label: 'Reading', bg: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
  { keywords: ['home', 'house', 'live', 'place'], Icon: Home, label: 'Home', bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { keywords: ['shoe', 'feet', 'wear'], Icon: Footprints, label: 'Clothing', bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
  { keywords: ['number', 'count', 'counting'], Icon: Hash, label: 'Numbers', bg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { keywords: ['after', 'next', 'order', 'sequence'], Icon: ArrowRight, label: 'Sequence', bg: 'var(--accent-gradient-strong)' },
  { keywords: ['three', 'star', 'items', 'set'], Icon: Star, label: 'Counting', bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { keywords: ['walk', 'action', 'run'], Icon: Activity, label: 'Actions', bg: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' },
  { keywords: ['people', 'person', 'friend'], Icon: Users, label: 'People', bg: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)' },
  { keywords: ['sun', 'day', 'daily'], Icon: Sun, label: 'Daily Life', bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
  { keywords: ['speak', 'say', 'speech', 'talk', 'phrase'], Icon: Mic, label: 'Speaking', bg: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
  { keywords: ['true', 'false', 'yes', 'no'], Icon: CheckCircle2, label: 'True or False', bg: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)' },
  { keywords: ['click', 'choose', 'pick', 'select'], Icon: MousePointer, label: 'Choose', bg: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { keywords: ['type', 'write', 'word'], Icon: Pencil, label: 'Writing', bg: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' },
  { keywords: ['friendly', 'polite', 'smile'], Icon: Sparkles, label: 'Friendly', bg: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
];

const defaultIllustration = { Icon: BookOpen, label: 'Learning', bg: 'var(--accent-gradient-strong)' };

const getIllustration = (text) => {
  if (!text) return defaultIllustration;
  const lower = text.toLowerCase();
  for (const item of illustrationMap) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      return item;
    }
  }
  return defaultIllustration;
};

const LessonSectionView = ({ section, lessonId, isReplay, useLocalSubmission, onInteractionChange, onSectionComplete, onInteractionResult, totalInteractions: totalInteractionsProp, uiLanguage = 'english', contentLanguage }) => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const condition = user?.learningCondition || '';
  const dyslexia = useDyslexiaContext({ condition, lessonId, defaultSyllableMode: true });
  const audioRef = useRef(null);
  const boundaryUtteranceRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeInteractionIndex, setActiveInteractionIndex] = useState(0);

  // EPIC 3.1.4: Keep audio speed slow and easy to understand (default playback rate).
  const [playbackRate, setPlaybackRate] = useState(0.85);
  const [activeWord, setActiveWord] = useState(''); // For visual highlighting
  const [isUsingTTS, setIsUsingTTS] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);

  const sectionKey = useMemo(() => section?._id ?? section?.id ?? null, [section?._id, section?.id]);
  const lessonKey = useMemo(() => section?.lessonId ?? section?._id ?? section?.id ?? null, [section?.lessonId, section?._id, section?.id]);
  const userKey = useMemo(() => normalizeUserId(user), [user]);

  const bilingualTextMode = resolveBilingualTextModeFromPreferences(preferences);
  const bilingualEnabled = isBilingualTextMode(bilingualTextMode);
  const bilingualPrimaryLang = bilingualEnabled ? bilingualPrimaryLanguageForMode(bilingualTextMode) : null;

  const baseTextContent = useMemo(() => {
    const english = section?.textContentI18n?.english;
    if (typeof english === 'string' && english.trim()) return english;
    return section?.textContent || '';
  }, [section?.textContent, section?.textContentI18n?.english]);

  const bilingualPrimaryText = useMemo(() => {
    if (!bilingualEnabled || !bilingualPrimaryLang) return '';
    return pickI18nString(bilingualPrimaryLang, baseTextContent, section?.textContentI18n);
  }, [baseTextContent, bilingualEnabled, bilingualPrimaryLang, section?.textContentI18n]);

  const bilingualEnglishText = useMemo(() => {
    if (!bilingualEnabled) return '';
    return pickI18nString('english', baseTextContent, section?.textContentI18n);
  }, [baseTextContent, bilingualEnabled, section?.textContentI18n]);

  const bilingualPrimaryParagraphs = useMemo(() => {
    if (!bilingualEnabled) return [];
    return splitParagraphs(bilingualPrimaryText, { decorateEnglish: false });
  }, [bilingualEnabled, bilingualPrimaryText]);

  const bilingualEnglishParagraphs = useMemo(() => {
    if (!bilingualEnabled) return [];
    const decorateEnglish = Boolean(dyslexia.applySyllables && String(contentLanguage || uiLanguage).toLowerCase() === 'english');
    return splitParagraphs(bilingualEnglishText, { decorateEnglish });
  }, [bilingualEnabled, bilingualEnglishText, contentLanguage, dyslexia.applySyllables, uiLanguage]);

  const paragraphs = useMemo(() => {
    // EPIC 2.1.1: Display lesson content clearly in text format.
    if (!section?.textContent) return [];
    const decorateEnglish = Boolean(dyslexia.applySyllables && String(contentLanguage || uiLanguage).toLowerCase() === 'english');
    return splitParagraphs(section.textContent, { decorateEnglish });
  }, [contentLanguage, dyslexia.applySyllables, section?.textContent, uiLanguage]);

  const interactions = useMemo(() => {
    // EPIC 2.3.2, 2.3.4: Ask short questions during the flow and keep interactions non-overwhelming (ordered + capped).
    if (!section?.interactions) return [];
    return [...section.interactions]
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .slice(0, 5);
  }, [section?.interactions]);

  const currentInteraction = interactions[activeInteractionIndex];

  // Notify parent when all interactions in this section are completed
  const sectionCompleted = interactions.length > 0 && activeInteractionIndex >= interactions.length;
  useEffect(() => {
    if (onSectionComplete) {
      onSectionComplete(section?._id || section?.id, sectionCompleted);
    }
  }, [sectionCompleted, onSectionComplete, section?._id, section?.id]);

  const displayedInteraction = useMemo(() => {
    if (!currentInteraction) return null;
    if (!dyslexia.applySyllables) return currentInteraction;

    const safeDecorate = (value) => (value ? decorateDyslexiaText(value) : value);

    return {
      ...currentInteraction,
      question: safeDecorate(currentInteraction.question),
      hint: safeDecorate(currentInteraction.hint),
      explanation: safeDecorate(currentInteraction.explanation),
      feedback: currentInteraction.feedback
        ? {
            ...currentInteraction.feedback,
            correct: safeDecorate(currentInteraction.feedback.correct),
            incorrect: safeDecorate(currentInteraction.feedback.incorrect),
          }
        : currentInteraction.feedback,
    };
  }, [currentInteraction, dyslexia.applySyllables]);

  const sectionId = section?.id || section?._id;

  useEffect(() => {
    setActiveInteractionIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setActiveWord('');
    setIsUsingTTS(false);
    setAudioFailed(false);
    window.speechSynthesis.cancel();
    boundaryUtteranceRef.current = null;
    if (onInteractionChange && sectionId) {
      onInteractionChange(sectionId, 0);
    }
  }, [sectionKey, onInteractionChange, sectionId]);

  const stopBoundaryTracking = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!boundaryUtteranceRef.current) return;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
    boundaryUtteranceRef.current = null;
    setActiveWord('');
  };

  const startBoundaryTracking = (text) => {
    // EPIC 3.3.1-3.3.3: Highlight text in sync with audio.
    // When we play backend/pre-recorded audio, we use a silent SpeechSynthesisUtterance
    // purely for `onboundary` word events so the highlighted word roughly follows the narration.
    if (!text) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (typeof window.SpeechSynthesisUtterance === 'undefined') return;

    stopBoundaryTracking();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackRate;
      utterance.lang = speechSynthesisLangFor(uiLanguage);
      utterance.volume = 0;

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          const textBefore = text.slice(charIndex);
          const firstSpace = textBefore.search(/\s/);
          const word = firstSpace === -1 ? textBefore : textBefore.slice(0, firstSpace);
          setActiveWord(word.replace(/[.,!?;:()"]+/g, ''));
        }
      };

      utterance.onend = () => {
        boundaryUtteranceRef.current = null;
        setActiveWord('');
      };

      boundaryUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // If the browser blocks speech synthesis, we just skip synced highlighting.
      boundaryUtteranceRef.current = null;
    }
  };

  useEffect(() => {
    if (!lessonKey) return;
    getLessonProgress(userKey, lessonKey);
  }, [lessonKey, userKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setActiveWord('');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [section?.audioUrl]);

  useEffect(() => {
    if (audioRef.current && !isUsingTTS) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isUsingTTS]);

  // Audio Playback Handling (Backend -> Browser Fallback)
  const speakText = async (text) => {
    // EPIC 2.1.2, 2.1.4: Play audio narration (backend TTS with browser fallback) while keeping the lesson experience smooth.
    // EPIC 3.1.2: Read lesson text aloud using clear audio.
    // EPIC 3.5.3: Keep audio consistent in quality (prefer backend TTS, fall back to browser if needed).
    // 1. Stop existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    boundaryUtteranceRef.current = null;

    setIsPlaying(false);
    setIsUsingTTS(false);

    // 2. Try Backend TTS first (Reliable on all OS)
    try {
      const ttsUrl = joinUrl(api?.defaults?.baseURL || '/api', '/tts/speak');
      const langKey = contentLanguage || uiLanguage;
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speed: playbackRate, lang: backendTtsLangFor(langKey) })
      });

      if (!response.ok) throw new Error('Backend TTS failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = playbackRate;

      // Setup Backend Audio Handlers
      audio.onplay = () => {
        setIsPlaying(true);
        startBoundaryTracking(text);
      };
      audio.onpause = () => {
        setIsPlaying(false);
        stopBoundaryTracking();
      };
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
        setActiveWord('');
        stopBoundaryTracking();
      };

      // Note: Backend TTS (mp3) doesn't support word-level timestamps easily.
      // We will highlight the whole section or simulate? 
      // For now, we rely on the visual "text is being read" indicator and isPlaying state.

      audioRef.current = audio;
      audio.play();

    } catch (err) {
      console.warn("Backend TTS failed, falling back to Browser:", err);
      // 3. Fallback to Browser TTS
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = playbackRate;

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const charIndex = event.charIndex;
          const textBefore = text.slice(charIndex);
          const firstSpace = textBefore.search(/\s/);
          const word = firstSpace === -1 ? textBefore : textBefore.slice(0, firstSpace);
              // EPIC 2.5.1: Highlight key words/phrases (active word during narration).
          setActiveWord(word.replace(/[.,!?;:()"]/g, ''));
        }
      };

      utterance.onstart = () => {
        setIsPlaying(true);
        setIsUsingTTS(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setIsUsingTTS(false);
        setActiveWord('');
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleAudio = async () => {
    // EPIC 3.1.1: “Play Audio” button for lesson text.
    // EPIC 3.1.3, 3.5.1-3.5.2: Allow replay/repetition without limits (toggle can be used repeatedly).
    if (section?.audioUrl && !audioFailed) {
      // Use Backend/File Audio
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopBoundaryTracking();
        return;
      }
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        startBoundaryTracking(section.textContent || section.title || '');
      } catch (error) {
        // Audio file failed to play, fall back to TTS
        setAudioFailed(true);
        stopBoundaryTracking();
        speakText(section.textContent || section.title || 'No text content');
      }
    } else {
      // Use TTS Fallback
      if (isPlaying || window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsUsingTTS(false);
        stopBoundaryTracking();
      } else {
        // Read content
        speakText(section.textContent || section.title || "No text content");
      }
    }
  };

  const handleReplay = () => {
    // EPIC 3.1.3: Allow learners to replay the audio.
    // EPIC 3.5.1-3.5.2: Enable repetition for words/sentences without limits.
    if (section?.audioUrl && !audioFailed) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          setAudioFailed(true);
          stopBoundaryTracking();
          speakText(section.textContent);
        });
        setIsPlaying(true);
        startBoundaryTracking(section.textContent || section.title || '');
      }
    } else {
      speakText(section.textContent);
    }
  };

  const handleSeek = (event) => {
    if (isUsingTTS) return; // Cannot seek easily in TTS
    const nextTime = Number(event.target.value);
    if (!audioRef.current || Number.isNaN(nextTime)) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleContinue = useCallback(() => {
    setActiveInteractionIndex((prev) => {
      const nextIndex = Math.min(prev + 1, interactions.length);
      if (onInteractionChange && section) {
        onInteractionChange(section.id || section._id, nextIndex);
      }
      return nextIndex;
    });
  }, [interactions.length, onInteractionChange, section]);

  const handleAnswered = useCallback(({ isCorrect, interactionId }) => {
    if (!lessonKey || !interactionId) return;
    
    // Propagate interaction result to parent for performance tracking
    if (onInteractionResult && !isReplay) {
      onInteractionResult({ interactionId, isCorrect });
    }
    
    if (isReplay) return;

    const existing = getLessonProgress(userKey, lessonKey);
    const nextStatus = existing.status === 'Not Started' ? 'In Progress' : existing.status;
    const correctIds = new Set(existing.correctIds || []);
    if (isCorrect) {
      correctIds.add(interactionId);
    }
    // Use the actual total interactions for this lesson instead of hardcoded 5
    const requiredCount = totalInteractionsProp || existing.totalInteractions || 5;
    const correctCount = Math.min(requiredCount, correctIds.size);
    const status = correctCount >= requiredCount ? 'Completed' : nextStatus;
    saveLessonProgress(userKey, lessonKey, {
      status,
      correctCount,
      correctIds: Array.from(correctIds),
      totalInteractions: requiredCount,
    });

    // EPIC 3.5.4: Repeated listening does not reduce marks; scoring is based on answers only.

    // Notify other parts of the app (Progress page) that local progress changed.
    try {
      window.dispatchEvent(new CustomEvent('progress:updated', { detail: { lessonId: lessonKey, source: 'local' } }));
    } catch (e) {
      // ignore
    }
  }, [lessonKey, userKey, onInteractionResult, isReplay, totalInteractionsProp]);

  if (!section) return null;
  const sectionTitleBaseText =
    typeof section?.titleI18n?.english === 'string' && section.titleI18n.english.trim()
      ? section.titleI18n.english
      : section?.title || '';

  return (
    <div className="lesson-section">
      <header className="lesson-section-header">
        <div>
          <p className="lesson-section-label">Section</p>
          <h2>
            <BilingualText
              bilingualTextMode={bilingualTextMode}
              contentLanguage={contentLanguage || uiLanguage}
              baseText={sectionTitleBaseText}
              i18n={section?.titleI18n}
              showLabels={false}
              compact={true}
            />
          </h2>
        </div>
        {isReplay && <span className="replay-pill">Replaying</span>}
      </header>

      <div className="lesson-section-body">
        <div className="lesson-section-text">
          {bilingualEnabled ? (
            <div className="fx-card" style={{ padding: 14 }} aria-label="Bilingual lesson text">
              {bilingualPrimaryParagraphs.length > 0 ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <p style={{ margin: '0 0 2px', fontSize: '0.85rem', fontWeight: 700, opacity: 0.75 }}>
                      {String(bilingualPrimaryLang || '').toLowerCase() === 'hindi' ? 'Hindi' : 'Tamil'}
                    </p>
                    {bilingualPrimaryParagraphs.map((p) => (
                      <p key={`primary-${p.startIndex}`} style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>
                        {p.text}
                      </p>
                    ))}
                  </div>

                  {bilingualEnglishParagraphs.length > 0 ? (
                    <div style={{ opacity: 0.98 }}>
                      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: 700, opacity: 0.75 }}>English</p>
                      <VisualLesson
                        // Keep visuals/highlights aligned with English content to avoid clutter.
                        paragraphs={bilingualEnglishParagraphs}
                        highlights={section.highlights || []}
                        visualAids={section.visualAids || section.visuals || []}
                        activeWord={activeWord}
                      />
                    </div>
                  ) : null}
                </div>
              ) : bilingualEnglishParagraphs.length > 0 ? (
                <VisualLesson
                  paragraphs={bilingualEnglishParagraphs}
                  highlights={section.highlights || []}
                  visualAids={section.visualAids || section.visuals || []}
                  activeWord={activeWord}
                />
              ) : (
                <p>No text content available.</p>
              )}
            </div>
          ) : paragraphs.length > 0 ? (
            <VisualLesson
              // EPIC 2.5.1-2.5.4: Highlights + simple, content-matched visuals.
              paragraphs={paragraphs}
              highlights={section.highlights || []}
              visualAids={section.visualAids || section.visuals || []}
              activeWord={activeWord}
            />
          ) : (
            <p>No text content available.</p>
          )}

          {displayedInteraction && (
            <InteractionCard
              key={displayedInteraction.id || displayedInteraction._id || activeInteractionIndex}
              // EPIC 2.3.1-2.3.4, 2.4.1-2.4.4: Simple interactions + immediate feedback + hints/explanations/encouragement.
              lessonId={lessonKey}
              condition={condition}
              interaction={displayedInteraction}
              contentLanguage={contentLanguage}
              readOnly={isReplay}
              useLocalSubmission={useLocalSubmission}
              onContinue={handleContinue}
              onAnswered={handleAnswered}
              autoAdvanceOnCorrect={!isReplay}
              enableTimer={!isReplay}
              enableSpeech={!isReplay}
              autoPlayNarration={false}
              disableAutoSpeak={true}
            />
          )}

          {!currentInteraction && interactions.length > 0 && (
            <div className="fx-card" style={{ padding: 16, marginTop: 14 }}>
              <h3 style={{ marginTop: 0 }}>Section complete</h3>
              <p style={{ marginBottom: 0 }}>
                You finished the questions for this section. Use the <strong>Next</strong> button below to continue.
              </p>
            </div>
          )}
        </div>

        <aside className="lesson-section-side">
          <div className="lesson-audio fx-card" aria-label="Lesson audio">
            <div className="lesson-audio-header">
              <h3>Audio Learning</h3>
              {!isUsingTTS && <span className="lesson-audio-time">{formatTime(currentTime)} / {formatTime(duration)}</span>}
            </div>

            {section.audioUrl && <audio ref={audioRef} src={section.audioUrl} preload="metadata" onError={() => { audioRef.current = null; setAudioFailed(true); }} />}

            <div className="lesson-audio-controls" style={{ flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  className="audio-toggle fx-pressable fx-focus"
                  onClick={handleToggleAudio}
                  aria-pressed={isPlaying}
                  style={{ flex: 1 }}
                >
                  {isPlaying ? (
                    <>
                      <Pause size={16} aria-hidden="true" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} aria-hidden="true" />
                      {/* EPIC 3.1.1: Play Audio button for lesson text. */}
                      <span>Play Audio</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="audio-toggle fx-pressable fx-focus"
                  onClick={handleReplay}
                  title="Replay Audio"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                  {/* EPIC 3.1.3, 3.5.1-3.5.2: Replay audio multiple times without limits. */}
                  <span>Replay</span>
                </button>
              </div>

              {!isUsingTTS && section.audioUrl && (
                <input
                  className="audio-seek"
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  disabled={!duration}
                  aria-label="Seek audio"
                />
              )}

              {/* EPIC 3.1.4: Keep audio speed slow and easy to understand. */}
              <div className="audio-speed-control" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <span>Speed:</span>
                <button
                  onClick={() => setPlaybackRate(0.7)}
                  style={{ fontWeight: playbackRate === 0.7 ? 'bold' : 'normal', textDecoration: playbackRate === 0.7 ? 'underline' : 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                >Slow (0.7x)</button>
                |
                <button
                  onClick={() => setPlaybackRate(1.0)}
                  style={{ fontWeight: playbackRate === 1.0 ? 'bold' : 'normal', textDecoration: playbackRate === 1.0 ? 'underline' : 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                >Normal (1.0x)</button>
              </div>
            </div>

            {/* Visual Support Note */}
            <p className="lesson-muted" style={{ marginTop: '8px', fontSize: '0.8rem' }}>
              {isPlaying ? "Text is being read aloud..." : "Press play to listen."}
            </p>
          </div>

          {/* Dynamic illustration based on current question */}
          <div className="lesson-illustration fx-card" aria-label="Question illustration">
            {/* EPIC 2.5.2-2.5.4: Simple, uncluttered visuals/icons supporting understanding and matched to the current step. */}
            <h3>Illustration</h3>
            {(() => {
              const questionText = currentInteraction?.question || section?.title || '';
              const illust = getIllustration(questionText);
              return (
                <div className="illustration-scene" style={{ background: illust.bg }}>
                  <div className="illustration-emoji-wrapper">
                    <span className="illustration-emoji" aria-label={illust.label}>
                      <illust.Icon size={52} aria-hidden="true" />
                    </span>
                  </div>
                  <p className="illustration-label">{illust.label}</p>
                  <div className="illustration-sparkles" aria-hidden="true">
                    <span className="sparkle sparkle-1"><Sparkles size={14} aria-hidden="true" /></span>
                    <span className="sparkle sparkle-2"><Sparkles size={14} aria-hidden="true" /></span>
                    <span className="sparkle sparkle-3"><Sparkles size={14} aria-hidden="true" /></span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="lesson-visuals fx-card" aria-label="Lesson visuals">
            {/* EPIC 2.5.2-2.5.4: Additional simple visuals closely tied to lesson content. */}
            <h3>Visual Aids</h3>
            {(section.visuals || []).length > 0 ? (
              <div className="visuals-grid">
                {(section.visuals || []).map((visual, index) => (
                  <figure key={`${section.id}-v-${index}`}>
                    {visual.imageUrl ? (
                      <img src={visual.imageUrl} alt={visual.altText} loading="lazy" />
                    ) : visual.iconUrl ? (
                      <img src={visual.iconUrl} alt={visual.description || 'Visual aid'} loading="lazy" />
                    ) : (
                      <div className="visual-placeholder" aria-hidden="true"><ImageOff size={20} aria-hidden="true" /></div>
                    )}
                    <figcaption>{visual.relatedPhrase || visual.description}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="lesson-muted">No visuals for this section.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LessonSectionView;
