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
