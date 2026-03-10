/**
 * LessonDisplay.js
 *
 * Presents a single lesson's content in a two-column layout:
 *  - Left column  (article): paragraph-split text content.
 *  - Right column (aside):   audio narration player + visual aid gallery.
 *
 * Manages HTML5 audio playback state (play/pause/seek) through an imperative ref.
 * Falls back gracefully when audio or visuals are not yet available.
 *
 * @prop {object}   lesson    - Lesson document: title, textContent, audioUrl, visuals[].
 * @prop {boolean}  isLoading - Show a loading placeholder while data is being fetched.
 * @prop {string}   error     - Error message to display if the lesson failed to load.
 * @prop {Function} onClose   - Optional callback to dismiss/close the lesson panel.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import './LessonDisplay.css';

/**
 * Format a duration in seconds to an "M:SS" display string.
 * Returns "0:00" for non-finite or negative values.
 *
 * @param {number} seconds - Duration in seconds.
 * @returns {string} Formatted string e.g. "3:07".
 */
const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * LessonDisplay – Renders lesson text, audio narration, and visual aids.
 */
const LessonDisplay = ({ lesson, isLoading, error, onClose }) => {
  // Ref to the underlying <audio> element for imperative play/pause/seek control
  const audioRef = useRef(null);
  // True while the audio is actively playing
  const [isPlaying, setIsPlaying] = useState(false);
  // Current playback position in seconds (kept in sync via the timeupdate event)
  const [currentTime, setCurrentTime] = useState(0);
  // Total audio duration in seconds (set once audio metadata has loaded)
  const [duration, setDuration] = useState(0);

  // Split lesson text on blank lines into individual <p> elements; memoised to avoid re-splitting
  const paragraphs = useMemo(() => {
    if (!lesson?.textContent) return [];
    return lesson.textContent
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [lesson?.textContent]);

  // Reset playback state whenever the lesson (audio source) changes so controls start fresh
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [lesson?.audioUrl]);

  /**
   * Attach audio event listeners whenever the audioUrl changes.
   * Cleans up listeners on unmount or URL change to prevent stale state updates
   * from a previous audio source.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    // Update duration state once the browser has parsed the audio metadata
    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    // Keep currentTime in sync with the playback position for the seek slider
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    // Flip isPlaying to false when the audio naturally reaches the end
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

  /**
   * Toggle audio playback.
   * If the audio is not yet buffered (readyState < HAVE_CURRENT_DATA), triggers
   * a reload and waits up to 3 s before attempting to play. Errors are caught
   * so a failed play() call does not crash the component.
   */
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

  /**
   * Seek the audio to the position selected via the range slider.
   * Updates both the audio element and the currentTime state simultaneously so
   * the slider thumb moves immediately without waiting for the timeupdate event.
   */
  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    if (!audioRef.current || Number.isNaN(nextTime)) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  if (!lesson && !isLoading && !error) {
    return null;
  }

  return (
    <section className="lesson-display" aria-live="polite">
      <header className="lesson-header">
        <div>
          <p className="lesson-eyebrow">Lesson</p>
          <h2 className="lesson-title">{lesson?.title || 'Loading lesson...'}</h2>
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
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={`${lesson._id || lesson.title}-p-${index}`}>{paragraph}</p>
              ))
            ) : (
              <p>No text content available for this lesson yet.</p>
            )}
          </article>

          <aside className="lesson-side">
            <div className="lesson-audio" aria-label="Lesson audio">
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
                      className="audio-toggle"
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

            <div className="lesson-visuals" aria-label="Lesson visuals">
              <h3>Visual Aids</h3>
              {lesson.visuals && lesson.visuals.length > 0 ? (
                <div className="visuals-grid">
                  {lesson.visuals.map((visual, index) => (
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

export default LessonDisplay;
