/**
 * Text Highlighting Utility Module
 * 
 * Provides text highlighting functionality for lesson content, enabling
 * visual emphasis on key words, phrases, and vocabulary items.
 * 
 * Core Features:
 * 
 * 1. Highlight Range Building:
 *    - Locates phrase positions in text
 *    - Handles explicit position or auto-detection
 *    - Prevents overlapping highlights
 *    - Case-insensitive matching
 *    - Sorted by position
 * 
 * 2. Segment Generation:
 *    - Splits text into highlighted and normal segments
 *    - Preserves original text formatting
 *    - Handles edge cases (empty text, no matches)
 *    - Efficient linear processing
 * 
 * 3. Overlap Prevention:
 *    - Detects overlapping highlight ranges
 *    - First-come-first-served priority
 *    - Prevents visual artifacts
 *    - Clean highlight boundaries
 * 
 * Use Cases:
 * - Vocabulary word highlighting in lessons
 * - Key phrase emphasis
 * - Search result highlighting
 * - Reading guide annotations
 * - Dyslexia focus words
 * 
 * Algorithm:
 * 1. Normalize highlights to position/range objects
 * 2. Sort by position
 * 3. Filter overlapping ranges
 * 4. Split text into segments at range boundaries
 * 5. Mark each segment as highlighted or normal
 * 
 * @module utils/highlightText
 * @author SE_Team11
 * @version 1.0.0
 */

/**
 * Normalize text to lowercase for case-insensitive matching
 * @param {string} value - Input text
 * @returns {string} Lowercase text
 */
const normalizeText = (value) => String(value || '').toLowerCase();

const rangesOverlap = (a, b) => !(a.end <= b.start || b.end <= a.start);

export const buildHighlightRanges = (text, highlights = []) => {
  const textLower = normalizeText(text);
  const used = [];

  const ranges = highlights
    .map((highlight) => {
      if (!highlight?.phrase) return null;
      const phraseLower = normalizeText(highlight.phrase);
      let start = typeof highlight.position === 'number'
        ? highlight.position
        : textLower.indexOf(phraseLower);
      if (start < 0) return null;
      const end = start + highlight.phrase.length;
      if (end > text.length) return null;
      return { ...highlight, start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)
    .filter((range) => {
      if (used.some((existing) => rangesOverlap(existing, range))) {
        return false;
      }
      used.push({ start: range.start, end: range.end });
      return true;
    });

  return ranges;
};

export const buildHighlightedSegments = (text, highlights = []) => {
  const ranges = buildHighlightRanges(text, highlights);
  const segments = [];
  let cursor = 0;

  ranges.forEach((range) => {
    if (cursor < range.start) {
      segments.push({ text: text.slice(cursor, range.start), highlight: null });
    }
    segments.push({
      text: text.slice(range.start, range.end),
      highlight: range,
    });
    cursor = range.end;
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: null });
  }

  return segments;
};
