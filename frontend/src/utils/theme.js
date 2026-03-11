export const buildTheme = (input) => {
  const background = resolveColor(input.backgroundColor, '#F0F8FF');
  const primary = resolveColor(input.primaryColor, '#4D86C9');
  const accentRaw = resolveColor(input.accentColor || primary, primary);

  const text = getReadableTextColor(background);
  const mutedText = buildMutedText(text, background);

  const surfaceCandidate = mixColors(background, primary, 0.08);
  const surface = ensureBackgroundContrast(surfaceCandidate, text, 4.5, getOppositeText(text));

  const borderCandidate = mixColors(text, background, 0.15);
  const border = ensureBackgroundContrast(borderCandidate, background, 1.5, text);

  const accent = ensureBackgroundContrast(accentRaw, background, 3, text);
  const accentText = ensureContrast(text, accent, 4.5);

  const optionBg = mixColors(surface, background, 0.2);
  const optionBorder = ensureBackgroundContrast(mixColors(text, background, 0.2), optionBg, 2, text);
  const optionSelectedBg = ensureBackgroundContrast(mixColors(accent, background, 0.15), optionBg, 3, accentText);
  const optionSelectedText = ensureContrast(text, optionSelectedBg, 4.5);

  const feedbackCorrect = ensureContrast(mixColors(accent, text, 0.25), background, 4.5);
  const feedbackIncorrect = ensureContrast(mixColors(primary, text, 0.4), background, 4.5);
  const focus = ensureContrast(mixColors(accent, text, 0.2), background, 3);

  return {
    background,
    text,
    mutedText,
    surface,
    border,
    accent,
    accentText,
    focus,
    feedbackCorrect,
    feedbackIncorrect,
    optionBg,
    optionBorder,
    optionSelectedBg,
    optionSelectedText,
  };
};

export const themeToCssVars = (theme) => {
  return {
    '--theme-bg': theme.background,
    '--theme-text': theme.text,
    '--theme-muted-text': theme.mutedText,
    '--theme-surface': theme.surface,
    '--theme-border': theme.border,
    '--theme-accent': theme.accent,
    '--theme-accent-text': theme.accentText,
    '--theme-focus': theme.focus,
    '--theme-feedback-correct': theme.feedbackCorrect,
    '--theme-feedback-incorrect': theme.feedbackIncorrect,
    '--theme-option-bg': theme.optionBg,
    '--theme-option-border': theme.optionBorder,
    '--theme-option-selected-bg': theme.optionSelectedBg,
    '--theme-option-selected-text': theme.optionSelectedText,
  };
};

export const getContrastRatio = (foreground, background) => {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return 1;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getReadableTextColor = (background) => ensureContrast('#000000', background, 4.5);

const clamp = (value, min = 0, max = 255) => Math.min(max, Math.max(min, value));

const rgbToHex = (rgb) => {
  const toHex = (value) => clamp(Math.round(value)).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '').trim();
  if (![3, 6].includes(normalized.length)) return null;
  const hexValue = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const intVal = Number.parseInt(hexValue, 16);
  if (Number.isNaN(intVal)) return null;
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
};

const parseRgbString = (input) => {
  const match = input.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(',').map((part) => part.trim());
  if (parts.length < 3) return null;
  const [r, g, b] = parts.map((part) => Number.parseFloat(part));
  if ([r, g, b].some((val) => Number.isNaN(val))) return null;
  return { r, g, b };
};

const resolveColor = (input, fallback) => {
  if (!input) return fallback;
  if (input.startsWith('#')) {
    const parsed = hexToRgb(input);
    return parsed ? rgbToHex(parsed) : fallback;
  }

  const parsedRgb = parseRgbString(input);
  if (parsedRgb) return rgbToHex(parsedRgb);

  if (typeof document === 'undefined') return fallback;

  const probe = document.createElement('div');
  probe.style.color = input;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const computedRgb = parseRgbString(computed);
  return computedRgb ? rgbToHex(computedRgb) : fallback;
};

const relativeLuminance = (rgb) => {
  const srgb = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};

const mixColors = (base, mixin, weight) => {
  const rgbBase = hexToRgb(base);
  const rgbMix = hexToRgb(mixin);
  if (!rgbBase || !rgbMix) return base;
  const mix = {
    r: rgbBase.r + (rgbMix.r - rgbBase.r) * weight,
    g: rgbBase.g + (rgbMix.g - rgbBase.g) * weight,
    b: rgbBase.b + (rgbMix.b - rgbBase.b) * weight,
  };
  return rgbToHex(mix);
};

const ensureContrast = (foreground, background, minRatio) => {
  const ratio = getContrastRatio(foreground, background);
  if (ratio >= minRatio) return foreground;
  const blackRatio = getContrastRatio('#000000', background);
  const whiteRatio = getContrastRatio('#ffffff', background);
  return blackRatio >= whiteRatio ? '#000000' : '#ffffff';
};

const ensureBackgroundContrast = (background, reference, minRatio, target) => {
  let result = background;
  if (getContrastRatio(result, reference) >= minRatio) return result;
  for (let step = 0.1; step <= 1; step += 0.1) {
    result = mixColors(background, target, step);
    if (getContrastRatio(result, reference) >= minRatio) break;
  }
  return result;
};

const getOppositeText = (text) => (text === '#000000' ? '#ffffff' : '#000000');

const buildMutedText = (text, background) => {
  const muted = mixColors(text, background, 0.4);
  return ensureContrast(muted, background, 3);
};
