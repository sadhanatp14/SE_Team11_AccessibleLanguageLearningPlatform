import React from 'react';
import { buildHighlightedSegments } from '../../utils/highlightText';
import { getReadableTextColor } from '../../utils/theme';
import './VisualLesson.css';

const getParagraphHighlights = (paragraph, highlights = []) => {
  const paragraphLower = paragraph.text.toLowerCase();
  return highlights
    .filter((highlight) => {
      if (!highlight?.phrase) return false;
      if (typeof highlight.position === 'number') {
        return (
          highlight.position >= paragraph.startIndex &&
          highlight.position < paragraph.startIndex + paragraph.text.length
        );
      }
      return paragraphLower.includes(highlight.phrase.toLowerCase());
    })
    .map((highlight) => {
      if (typeof highlight.position === 'number') {
        return {
          ...highlight,
          position: highlight.position - paragraph.startIndex,
        };
      }
      return highlight;
    });
};

const getParagraphVisuals = (paragraph, visualAids = []) => {
  const paragraphLower = paragraph.text.toLowerCase();
  return visualAids.filter((visual) => {
    if (!visual?.relatedPhrase || !visual?.imageUrl) return false;
    return paragraphLower.includes(visual.relatedPhrase.toLowerCase());
  });
};

const HighlightSpan = ({ segment }) => {
  const { highlight, text } = segment;
  if (!highlight) {
    return <span>{text}</span>;
  }

  const classes = ['highlight'];
  classes.push(`highlight-${highlight.emphasisType}`);

  if (highlight.emphasisType === 'active-reading') {
    classes.push('highlight-active');
  }

  const style = {};
  if (highlight.color && highlight.emphasisType === 'background') {
    style['--highlight-bg'] = highlight.color;
    if (highlight.color.startsWith('#')) {
      style['--highlight-text'] = getReadableTextColor(highlight.color);
    }
  }
  if (highlight.color && highlight.emphasisType === 'underline') {
    style['--highlight-underline'] = highlight.color;
  }

  return (
    <span className={classes.join(' ')} style={style}>
      {text}
    </span>
  );
};

const VisualLesson = ({ paragraphs = [], highlights = [], visualAids = [], activeWord = '' }) => {
  return (
    // EPIC 2.5.1-2.5.4: Visual learning aids via highlights + simple, content-matched images.
    <div className="visual-lesson">
      {paragraphs.map((paragraph) => {
        // Create base highlights
        let paragraphHighlights = getParagraphHighlights(paragraph, highlights);

        // Add dynamic active word highlight if matches
        if (activeWord) {
          const lowerText = paragraph.text.toLowerCase();
          const lowerWord = activeWord.toLowerCase();
          // Simple inclusion check or precise matching if positions available
          if (lowerText.includes(lowerWord)) {
            // Note: This is a loose match. Ideally we want precise positions from TTS.
            // For now, we highlight occurrences of the word.
            paragraphHighlights.push({
              phrase: activeWord,
              emphasisType: 'active-reading'
            });
          }
        }

        const segments = buildHighlightedSegments(paragraph.text, paragraphHighlights);
        const paragraphVisuals = getParagraphVisuals(paragraph, visualAids).filter(
          (visual) => visual.placement !== 'side'
        );

        return (
          <div key={paragraph.startIndex} className="visual-paragraph">
            <p>
              {segments.map((segment, index) => (
                <HighlightSpan key={`${paragraph.startIndex}-${index}`} segment={segment} />
              ))}
            </p>

            {paragraphVisuals.length > 0 && (
              // EPIC 2.5.2-2.5.4: Inline visuals are kept simple and matched to the paragraph content.
              <div className="visual-aids">
                {paragraphVisuals.map((visual) => (
                  <figure
                    key={visual.id}
                    className={`visual-aid visual-${visual.placement} fx-card`}
                  >
                    <img src={visual.imageUrl} alt={visual.altText} loading="lazy" />
                    <figcaption>{visual.relatedPhrase}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VisualLesson;
