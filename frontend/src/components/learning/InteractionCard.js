import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { requestInteractionHelp, submitInteraction } from '../../services/interactionService';
import GuidedSupport from './GuidedSupport';
import { decorateDyslexiaText, useDyslexiaContext } from '../../utils/dyslexiaSyllableMode';
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
  const [selectedAnswer, setSelectedAnswer] = useState('');
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
      ? ['True', 'False']
      : interaction.options || [];

  const isShortAnswer = interaction.type === 'short_answer';

  const instructionSteps = useMemo(() => {
    // EPIC 3.7.1-3.7.4: Spoken instructions for activities that are short, replayable, and match on-screen actions.
    const steps = [];

    if (enableTts) {
      steps.push('Press “Listen to Question” to hear the question.');
    }

    if (interaction?.type === 'short_answer') {
      steps.push('Type your answer in the box.');
    } else if (interaction?.type === 'true_false') {
      steps.push('Choose True or False.');
    } else if (interaction?.type === 'click') {
      steps.push('Tap the option that matches the question.');
    } else {
      steps.push('Select one option.');
    }

    steps.push('Then press “Submit Answer”.');

    if (!readOnly) {
      steps.push('If you get stuck, press “Need help?” for a hint.');
    }

    if (enableTimer && !readOnly) {
      steps.push('Keep an eye on the timer at the top.');
    }

    return steps.slice(0, 5);
  }, [enableTts, enableTimer, interaction?.type, readOnly]);

  const instructionText = useMemo(() => {
    const header = 'Instructions.';
    return [header, ...instructionSteps].join(' ');
  }, [instructionSteps]);

  const displayedInstructionText = useMemo(() => {
    if (!dyslexia.applySyllables) return instructionText;
    return decorateDyslexiaText(instructionText);
  }, [dyslexia.applySyllables, instructionText]);

  const displayedInstructionSteps = useMemo(() => {
    if (!dyslexia.applySyllables) return instructionSteps;
    return instructionSteps.map((step) => decorateDyslexiaText(step));
  }, [dyslexia.applySyllables, instructionSteps]);

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
      const response = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          speed: overrides.rate ?? 0.85
        })
      });

      if (!response.ok) throw new Error('TTS Failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.playbackRate = overrides.rate ?? 0.85;
      audio.play().catch(e => console.warn("Backend Play error", e));

      audio.onended = () => {
        URL.revokeObjectURL(url);
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

      if (overrides.trackWords) {
        startInstructionBoundaryTracking(text, overrides.rate ?? 0.85);
      }

    } catch (e) {
      // Fallback
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = overrides.rate ?? 0.85;
        utterance.lang = overrides.lang ?? 'en-US';

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
  }, [enableTts, startInstructionBoundaryTracking, stripWordPunctuation]);

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

    const finalAnswer = selectedAnswer || typedAnswer;

    try {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (useLocalSubmission) {
        const isCorrect =
          normalizeAnswer(finalAnswer) === normalizeAnswer(interaction.correctAnswer);
        const payload = {
          isCorrect,
          feedback: isCorrect ? interaction.feedback.correct : interaction.feedback.incorrect,
        };

        if (!isCorrect) {
          if (interaction.explanation) {
            payload.explanation = interaction.explanation;
          }
          if (interaction.hint && nextAttempts >= hintTriggerAttempts) {
            payload.hint = interaction.hint;
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
    setTypedAnswer('');
  };

  const handleRetry = () => {
    setResult(null);
    setSelectedAnswer('');
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
        } else if (interaction.explanation) {
          payload.explanation = interaction.explanation;
        } else if (interaction.hint) {
          payload.hint = interaction.hint;
        }
        payload.encouragement = pickEncouragement();
        setGuidance(resolveGuidance(payload));
      } else {
        const response = await requestInteractionHelp({
          lessonId,
          interactionId: interaction.id,
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
  const guidanceTone = guidance?.tone || '';

  const handleReplayNarration = () => {
    speak(interaction?.question);
  };

  const handlePlayInstructions = () => {
    // EPIC 3.7.1-3.7.3: Provide spoken instructions + allow replay.
    setInstructionsActiveWord('');
    speak(instructionText, { rate: 0.85, lang: 'en-US', trackWords: true });
  };

  const initSpeechRecognition = () => {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
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
              <span className="timer-label">Time</span>
              <span className={`timer-value ${timeLeft !== null && timeLeft <= 5 ? 'warn' : ''}`}>
                {timeLeft ?? resolvedTimeLimit}s
              </span>
            </>
          ) : (
            <span className="timer-label">No timer</span>
          )}
        </div>
        <button
          type="button"
          className="narration-btn fx-pressable fx-focus"
          onClick={handleReplayNarration}
          aria-label="Replay narration"
          disabled={!enableTts}
        >
          {/* EPIC 2.1.2, 2.3.4: Learner-controlled question narration (simple control, not overwhelming). */}
          Listen to Question
        </button>

        <button
          type="button"
          className="instructions-btn fx-pressable fx-focus"
          onClick={() => setIsInstructionsOpen(true)}
          aria-label="Open instructions"
        >
          Instructions
        </button>
      </div>

      <fieldset disabled={isLocked || readOnly}>
        <legend className="interaction-question">{interaction.question}</legend>

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
            {options.map((option) => (
              <button
                key={option}
                type="button"
                className={`interaction-click fx-pressable fx-focus ${selectedAnswer === option ? 'selected' : ''}`}
                onClick={() => handleSelect(option)}
                aria-pressed={selectedAnswer === option}
              >
                {option}
              </button>
            ))}
          </div>
        ) : isShortAnswer ? (
          <div className="interaction-input">
            <label htmlFor={`short-${interaction.id}`} className="sr-only">Type your answer</label>
            <input
              id={`short-${interaction.id}`}
              type="text"
              value={typedAnswer}
              onChange={(event) => {
                setTypedAnswer(event.target.value);
                setSelectedAnswer('');
              }}
              placeholder="Type your answer here"
              disabled={readOnly || isLocked}
            />
          </div>
        ) : (
          <div className="interaction-options" role="radiogroup" aria-label={interaction.question}>
            {options.map((option) => (
              <label key={option} className="interaction-option">
                <input
                  type="radio"
                  name={interaction.id}
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={() => handleSelect(option)}
                />
                <span>{option}</span>
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
                {isListening ? 'Stop voice input' : 'Use voice input'}
              </button>
              {lastTranscript && (
                <span className="voice-transcript">Heard: {lastTranscript}</span>
              )}
            </div>
            {voiceError && <p className="interaction-feedback warning">{voiceError}</p>}
          </div>
        )}

        {!isShortAnswer && (
          <div className="interaction-typed-fallback">
            <label htmlFor={`typed-${interaction.id}`}>Prefer typing?</label>
            <input
              id={`typed-${interaction.id}`}
              type="text"
              value={typedAnswer}
              onChange={(event) => {
                setTypedAnswer(event.target.value);
                setSelectedAnswer('');
              }}
              placeholder="Type your answer"
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
          Replay mode: interactions are read-only.
        </p>
      )}

      <GuidedSupport
        // EPIC 2.4.1-2.4.4: One-tap access to hints/explanations and encouraging messages.
        message={guidanceMessage}
        tone={guidanceTone}
        onHelp={handleHelp}
        isLoading={isHelping}
      />

      <div className="interaction-actions">
        {!isAnswered ? (
          <button type="submit" className="btn-submit fx-pressable fx-focus" disabled={readOnly || !hasAnswer || isSubmitting}>
            {isSubmitting ? 'Checking…' : 'Submit Answer'}
          </button>
        ) : (
          <>
            {!isCorrect && (
              <button type="button" className="btn-retry fx-pressable fx-focus" onClick={handleRetry}>
                Try Again
              </button>
            )}
            {isCorrect && onContinue && (
              <button
                type="button"
                className="btn-continue fx-pressable fx-focus"
                onClick={onContinue}
                disabled={disableContinue}
              >
                Continue
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
              <h3 id="instructions-title">Instructions</h3>
              <button
                type="button"
                className="instructions-close fx-pressable fx-focus"
                onClick={closeInstructions}
                aria-label="Close instructions"
              >
                ×
              </button>
            </div>

            <p className="instructions-text" data-testid="instructions-text">
              {renderHighlightableText(displayedInstructionText, instructionsActiveWord)}
            </p>

            <ol className="instructions-list">
              {displayedInstructionSteps.map((step) => (
                <li key={step}>{renderHighlightableText(step, instructionsActiveWord)}</li>
              ))}
            </ol>

            <div className="instructions-actions">
              <button
                type="button"
                className="btn-instructions-audio fx-pressable fx-focus"
                onClick={handlePlayInstructions}
                disabled={!enableTts}
              >
                Play / Replay
              </button>
              <button
                type="button"
                className="btn-instructions-stop fx-pressable fx-focus"
                onClick={stopInstructionAudio}
              >
                Stop
              </button>
            </div>

            <p className="instructions-muted">Tip: You can press Esc to close.</p>
          </div>
        </div>
      )}
    </form>
  );
};

const resolveGuidance = (payload) => {
  if (!payload) return null;
  if (payload.explanation) {
    return { message: payload.explanation, tone: 'explanation' };
  }
  if (payload.hint) {
    return { message: payload.hint, tone: 'hint' };
  }
  if (payload.encouragement) {
    return { message: payload.encouragement, tone: 'encouragement' };
  }
  return null;
};

export default InteractionCard;
