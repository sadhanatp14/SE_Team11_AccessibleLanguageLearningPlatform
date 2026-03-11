import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, X } from 'lucide-react';
import './LessonDisplay.css';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const LessonDisplay = ({ lesson, isLoading, error, onClose }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const paragraphs = useMemo(() => {
    if (!lesson?.textContent) return [];
    return lesson.textContent
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [lesson?.textContent]);

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
