/**
 * InteractiveLesson Component
 * 
 * Advanced lesson player combining text content, audio narration, visual media,
 * and interactive elements for immersive language learning.
 * 
 * Core Features:
 * 
 * 1. Multi-Modal Content Delivery:
 *    - Text paragraphs with formatting
 *    - Audio narration with playback controls
 *    - Visual media (images, videos) via VisualLesson
 *    - Interactive quiz elements via InteractionCard
 * 
 * 2. Audio Player (EPIC 2.4):
 *    - Play/pause controls
 *    - Seek bar for navigation
 *    - Current time and duration display
 *    - Audio synchronization with content
 *    - Background audio support
 * 
 * 3. Interactive Elements (EPIC 2.5):
 *    - Position-based interaction triggers
 *    - Multiple choice questions
 *    - Fill-in-the-blank exercises
 *    - Matching activities
 *    - Immediate feedback
 * 
 * 4. Content Synchronization:
 *    - Interactions appear at specified positions
 *    - Paragraphs displayed progressively
 *    - Audio synced with text content
 *    - Visual media coordinated with text
 * 
 * 5. Visual Media Integration:
 *    - Images with captions
 *    - Video embed support
 *    - Fallback for missing media
 *    - Responsive media sizing
 * 
 * 6. Theme Support:
 *    - Applies user theme preferences
 *    - CSS variable injection
 *    - Accessible color schemes
 *    - Consistent styling
 * 
 * 7. State Management:
 *    - Current interaction tracking
 *    - Audio playback state
 *    - Progress through content
 *    - Interaction completion status
 * 
 * Content Structure:
 * - Text paragraphs parsed from textContent
 * - Interactions sorted by position
 * - Audio URL for narration
 * - Visual media URLs and metadata
 * 
 * Interaction Flow:
 * 1. User reads/listens to content
 * 2. Reaches interaction trigger point
 * 3. Interactive element appears
 * 4. User completes interaction
 * 5. Feedback provided
 * 6. Content continues
 * 
 * Related EPICs:
 * - EPIC 2.4: Audio narration support
 * - EPIC 2.5: Interactive lesson elements
 * - EPIC 2.6: Visual media integration
 * - EPIC 1.4-1.6: Condition-specific adaptations
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.lesson - Lesson data with content and interactions
 * @param {boolean} props.isLoading - Loading state indicator
 * @param {string} props.error - Error message if lesson failed to load
 * @param {Function} props.onClose - Callback to close the lesson player
 * @requires learning/InteractionCard - Interactive element renderer
 * @requires learning/VisualLesson - Visual media display
 * @requires context/ThemeContext - Theme preferences
 * @author SE_Team11
 * @version 1.0.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import InteractionCard from './InteractionCard';
import VisualLesson from './VisualLesson';
import { useTheme } from '../../context/ThemeContext';
import { themeToCssVars } from '../../utils/theme';
import './LessonDisplay.css';
import './InteractiveLesson.css';

/**
 * Format seconds into MM:SS time display
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string (e.g., "3:45")
 */
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const InteractiveLesson = ({ lesson, isLoading, error, onClose }) => {
  const { computed } = useTheme();
  const themeVars = useMemo(() => themeToCssVars(computed), [computed]);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeInteractionIndex, setActiveInteractionIndex] = useState(0);

  const paragraphs = useMemo(() => {
    if (!lesson?.textContent) return [];
    const results = [];
    const regex = /[^\n]+/g;
    let match;
    while ((match = regex.exec(lesson.textContent)) !== null) {
      const raw = match[0];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const leadingWhitespace = raw.search(/\S/);
      const startIndex = match.index + (leadingWhitespace >= 0 ? leadingWhitespace : 0);
      results.push({ text: trimmed, startIndex });
    }
    return results;
  }, [lesson?.textContent]);

  const interactions = useMemo(() => {
    if (!lesson?.interactions) return [];
    return [...lesson.interactions].sort((a, b) => a.position - b.position);
  }, [lesson?.interactions]);

  const currentInteraction = interactions[activeInteractionIndex];
  const isLocalLessonId = lesson?._id ? !/^[a-fA-F0-9]{24}$/.test(lesson._id) : false;

  const visibleParagraphs = useMemo(() => {
    if (!currentInteraction) return paragraphs;
    const cutoff = Math.min(paragraphs.length, currentInteraction.position + 1);
    return paragraphs.slice(0, cutoff);
  }, [paragraphs, currentInteraction]);

  const sideVisuals = useMemo(() => {
    if (!lesson?.visualAids) return [];
    return lesson.visualAids.filter((visual) => visual.placement === 'side');
  }, [lesson?.visualAids]);

  const keyIdeas = useMemo(() => {
    const phrases = (lesson?.highlights || [])
      .map((highlight) => (highlight?.phrase || '').trim())
      .filter(Boolean);
    const unique = Array.from(new Set(phrases));
    return unique.slice(0, 6);
  }, [lesson?.highlights]);

  useEffect(() => {
    setActiveInteractionIndex(0);
  }, [lesson?._id]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [lesson?.audioUrl]);

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
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [lesson?.audioUrl]);

  const handleToggleAudio = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      // Ensure audio is loaded before playing
      if (audioRef.current.readyState < 2) {
        audioRef.current.load();
        // Wait for audio to be ready with timeout
        await Promise.race([
          new Promise((resolve) => {
            const onCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('loadeddata', onCanPlay);
              resolve();
            };
            audioRef.current.addEventListener('canplay', onCanPlay);
            audioRef.current.addEventListener('loadeddata', onCanPlay);
          }),
          new Promise((resolve) => setTimeout(resolve, 3000)) // 3 second timeout
        ]);
      }
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (playError) {
      console.warn('Audio playback failed:', playError);
      setIsPlaying(false);
    }
  };

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    if (!audioRef.current || Number.isNaN(nextTime)) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleContinue = () => {
    setActiveInteractionIndex((prev) => Math.min(prev + 1, interactions.length));
  };

  if (!lesson && !isLoading && !error) {
    return null;
  }

  return (
    <section className="lesson-display fx-card" aria-live="polite" style={themeVars}>
      <header className="lesson-header">
        <div className="lesson-title-block">
          <p className="lesson-eyebrow">Lesson</p>
          <h2 className="lesson-title">{lesson?.title || 'Loading lesson...'}</h2>
          <div className="lesson-meta">
            <span className="lesson-pill">Focus mode</span>
            {keyIdeas.length > 0 && <span className="lesson-pill accent">Visual cues on</span>}
          </div>
        </div>
        {onClose && (
          <button type="button" className="lesson-close" onClick={onClose} aria-label="Close lesson">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </header>

      {isLoading && <p className="lesson-status">Loading lesson content…</p>}
      {error && <p className="lesson-status error">{error}</p>}

      {lesson && (
        <div className="lesson-body">
          <article className="lesson-text" aria-label="Lesson text content">
            {visibleParagraphs.length > 0 ? (
              <VisualLesson
                paragraphs={visibleParagraphs}
                highlights={lesson.highlights || []}
                visualAids={lesson.visualAids || []}
              />
            ) : (
              <p>No text content available for this lesson yet.</p>
            )}

            {currentInteraction ? (
              <InteractionCard
                lessonId={lesson._id}
                interaction={currentInteraction}
                onContinue={handleContinue}
                disableContinue={activeInteractionIndex >= interactions.length - 1 && paragraphs.length === visibleParagraphs.length}
                useLocalSubmission={isLocalLessonId}
                enableSpeech={true}
              />
            ) : (
              <p className="interaction-empty">No interactions in this lesson yet.</p>
            )}
          </article>

          <aside className="lesson-side">
            {keyIdeas.length > 0 && (
              <div className="lesson-key-ideas fx-card" aria-label="Key ideas">
                <h3>Key ideas</h3>
                <div className="idea-chips">
                  {keyIdeas.map((idea) => (
                    <span key={idea} className="idea-chip">{idea}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="lesson-audio fx-card" aria-label="Lesson audio">
              <div className="lesson-audio-header">
                <h3>Audio Narration</h3>
                <span className="lesson-audio-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>

              {lesson.audioUrl ? (
                <>
                  <audio ref={audioRef} src={lesson.audioUrl} preload="metadata" />
                  <div className="lesson-audio-controls">
                    <button
                      type="button"
                      className="audio-toggle fx-pressable fx-focus"
                      onClick={handleToggleAudio}
                      aria-pressed={isPlaying}
                      aria-label={isPlaying ? 'Pause audio narration' : 'Play audio narration'}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <input
                      className="audio-seek"
                      type="range"
                      min="0"
                      max={duration || 0}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      disabled={!duration}
                      aria-label="Seek audio narration"
                    />
                  </div>
                </>
              ) : (
                <p className="lesson-muted">Audio narration is not available for this lesson yet.</p>
              )}
            </div>

            <div className="lesson-visuals fx-card" aria-label="Lesson visuals">
              <h3>Visual Aids</h3>
              {sideVisuals.length > 0 || (lesson.visuals && lesson.visuals.length > 0) ? (
                <div className="visuals-grid">
                  {sideVisuals.map((visual) => (
                    <figure key={visual.id}>
                      <img src={visual.imageUrl} alt={visual.altText} loading="lazy" />
                      <figcaption>{visual.relatedPhrase}</figcaption>
                    </figure>
                  ))}
                  {(lesson.visuals || []).map((visual, index) => (
                    <figure key={`${lesson._id || lesson.title}-v-${index}`}>
                      {visual.iconUrl ? (
                        <img src={visual.iconUrl} alt={visual.description} loading="lazy" />
                      ) : (
                        <div className="visual-placeholder" aria-hidden="true"><ImageOff size={20} aria-hidden="true" /></div>
                      )}
                      <figcaption>{visual.description}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="lesson-muted">No visuals are attached to this lesson yet.</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export default InteractiveLesson;
