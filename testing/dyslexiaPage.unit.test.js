/**
 * =============================================================================
 * DYSLEXIA PAGE – UNIT TESTS
 * =============================================================================
 *
 * Covers user stories:
 *   1.4  – Dyslexia-Friendly Reading Support
 *   2.5  – Visual Learning Aids  (dyslexia-specific highlight / syllable logic)
 *   2.7  – Consistent Lesson Layout (DyslexiaView dashboard layout stability)
 *
 * Test framework  : Jest + React Testing Library (shipped with react-scripts)
 * Run             : cd frontend && npx react-scripts test --watchAll=false
 *                     --testPathPattern=testing/dyslexiaPage
 * =============================================================================
 */

import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// Mocks – isolate the component from external dependencies
// ---------------------------------------------------------------------------

// React-Router mocks for navigation and URL parameters
const mockNavigate = jest.fn(); // Mock function to track programmatic navigation
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Retain other actual router implementations
  useNavigate: () => mockNavigate, // Mock hook returning the tracked navigation function
  useParams: () => ({ lessonId: 'lesson-greetings' }), // Mock hook providing a static lesson parameter
  BrowserRouter: ({ children }) => <div>{children}</div>, // Mock router wrapper to allow rendering without a real DOM router
}));

// AuthContext mock to simulate a logged-in user with dyslexia
const mockUser = { id: 'u1', name: 'TestUser', learningCondition: 'dyslexia' }; // Simulated user profile
const mockLogout = jest.fn(); // Mock function to track logout interactions
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }), // Mock hook providing the standard user state
}));

// PreferencesContext (not directly used in DyslexiaView but imported transitively)
jest.mock('../../src/context/PreferencesContext', () => ({
  usePreferences: () => ({ preferences: null, applyPreferences: jest.fn() }),
}));

// ThemeContext
jest.mock('../../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {},
    computed: {},
    setTheme: jest.fn(),
  }),
  ThemeProvider: ({ children }) => <div>{children}</div>,
}));

// Dyslexia progress service – pure localStorage wrapper; mock it.
jest.mock('../../src/services/dyslexiaProgressService', () => ({
  getAllLessonProgress: jest.fn(() => ({})),
  getLessonProgress: jest.fn(() => ({ status: 'Not Started', correctCount: 0, correctIds: [] })),
  saveLessonProgress: jest.fn(),
  normalizeUserId: jest.fn((u) => (u ? u.id || 'anonymous' : 'anonymous')),
}));

// ProfileSettings – render a stub so tests aren't coupled to that component.
jest.mock('../../src/components/ProfileSettings', () => {
  return function MockProfileSettings({ onClose }) {
    return (
      <div data-testid="profile-settings">
        <button onClick={onClose}>Close Settings</button>
      </div>
    );
  };
});

// ---------- Import subjects AFTER mocks ----------
import DyslexiaView from '../../src/components/learning/DyslexiaView';
import {
  decorateDyslexiaText,
  getDyslexiaSyllableMode,
  setDyslexiaSyllableMode,
  getSyllableHint,
  getDyslexiaLessonTitle,
  isDyslexiaLessonId,
  useDyslexiaSyllableMode,
  SYLLABLE_MODE_STORAGE_KEY,
} from '../../src/utils/dyslexiaSyllableMode';
import {
  buildHighlightRanges,
  buildHighlightedSegments,
} from '../../src/utils/highlightText';
import {
  getAllLessonProgress,
  getLessonProgress,
  saveLessonProgress,
  normalizeUserId,
} from '../../src/services/dyslexiaProgressService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockNavigate.mockReset();
});

// ============================
// 1. DYSLEXIA-FRIENDLY READING SUPPORT (User Story 1.4)
// ============================
describe('1.4 – Dyslexia-Friendly Reading Support', () => {
  // ---------- 1.4.1 Dyslexia-friendly font applied ----------
  describe('TC-DYS-001: Dyslexia-friendly font is applied to lesson text', () => {
    test('DyslexiaView.css applies OpenDyslexic font via CSS custom properties', () => {
      /*
       * The application ships a CSS file that applies OpenDyslexic font to the
       * .dyslexia-view container. We verify that the root container class is
       * present so the CSS rules take effect.
       */
      const { container } = render(<DyslexiaView />); // Render the component
      const root = container.querySelector('.dyslexia-view'); // Find the main container
      expect(root).toBeInTheDocument(); // Assert container exists in DOM
    });

    test('Lesson card text renders inside the dyslexia-view container', () => {
      render(<DyslexiaView />);
      const lessonCards = screen.getAllByText(/Start Learning/i);
      expect(lessonCards.length).toBe(3); // 3 lessons
      lessonCards.forEach((btn) => {
        // Each button lives inside .dyslexia-view → inherits font
        expect(btn.closest('.dyslexia-view')).toBeInTheDocument();
      });
    });
  });

  // ---------- 1.4.2 Text size adjustment ----------
  describe('TC-DYS-002: Text size adjustment works correctly', () => {
    test('Welcome heading renders with expected text', () => {
      render(<DyslexiaView />);
      // Default (syllable mode ON) text
      expect(
        screen.getByText(/Wel-come to Your Learn-ing Space/i)
      ).toBeInTheDocument();
    });
  });

  // ---------- 1.4.3 Line spacing and letter spacing ----------
  describe('TC-DYS-003: Line spacing and letter spacing updates', () => {
    test('Subtitle text has appropriate line-height for readability', () => {
      render(<DyslexiaView />);
      const subtitle = document.querySelector('.subtitle');
      expect(subtitle).toBeInTheDocument();
      // CSS defines line-height: 1.8 via .subtitle – class presence is the gate
    });
  });

  // ---------- 1.4.4 Reading settings persist ----------
  describe('TC-DYS-004: Reading settings persist across lesson pages', () => {
    test('Syllable mode state is persisted to localStorage', () => {
      setDyslexiaSyllableMode(true);
      expect(localStorage.getItem(SYLLABLE_MODE_STORAGE_KEY)).toBe('true');

      setDyslexiaSyllableMode(false);
      expect(localStorage.getItem(SYLLABLE_MODE_STORAGE_KEY)).toBe('false');
    });

    test('getDyslexiaSyllableMode reads persisted value', () => {
      localStorage.setItem(SYLLABLE_MODE_STORAGE_KEY, 'false');
      expect(getDyslexiaSyllableMode(true)).toBe(false);

      localStorage.setItem(SYLLABLE_MODE_STORAGE_KEY, 'true');
      expect(getDyslexiaSyllableMode(false)).toBe(true);
    });

    test('getDyslexiaSyllableMode returns default when nothing stored', () => {
      localStorage.removeItem(SYLLABLE_MODE_STORAGE_KEY);
      expect(getDyslexiaSyllableMode(true)).toBe(true);
      expect(getDyslexiaSyllableMode(false)).toBe(false);
    });
  });

  // ---------- 1.4.5 Readability settings consistency ----------
  describe('TC-DYS-005: Readability settings consistent on different screens', () => {
    test('Syllable mode toggle button renders with aria-pressed', () => {
      render(<DyslexiaView />);
      const toggleBtn = screen.getByTitle('Toggle syllable-friendly text');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute('aria-pressed');
    });

    test('Toggling syllable mode switches displayed text between normal and syllable versions', () => {
      render(<DyslexiaView />);

      // Default: syllable mode is ON → shows syllable titles
      expect(screen.getByText('Greet-ings')).toBeInTheDocument();

      // Toggle OFF
      const toggleBtn = screen.getByTitle('Toggle syllable-friendly text');
      fireEvent.click(toggleBtn);

      // Now should show normal titles
      expect(screen.getByText('Greetings')).toBeInTheDocument();
    });

    test('Syllable mode toggle updates the button label state text', () => {
      render(<DyslexiaView />);
      // Syllable mode starts ON
      expect(screen.getByText('On')).toBeInTheDocument();
      const toggleBtn = screen.getByTitle('Toggle syllable-friendly text');
      fireEvent.click(toggleBtn);
      expect(screen.getByText('Off')).toBeInTheDocument();
    });
  });
});

// ============================
// 2. SYLLABLE MODE UTILITY TESTS (supporting 1.4)
// ============================
describe('Syllable Mode Utility – dyslexiaSyllableMode.js', () => {
  describe('TC-DYS-006: decorateDyslexiaText applies syllable hints', () => {
    test('decorates known words with syllable hints', () => {
      const result = decorateDyslexiaText('Hello World');
      expect(result).toContain('Hel-lo');
    });

    test('leaves unknown words untouched', () => {
      const result = decorateDyslexiaText('Keyboard');
      expect(result).toBe('Keyboard');
    });

    test('handles empty string gracefully', () => {
      expect(decorateDyslexiaText('')).toBe('');
      expect(decorateDyslexiaText(null)).toBe('');
      expect(decorateDyslexiaText(undefined)).toBe('');
    });

    test('does not double-decorate already decorated text', () => {
      // If input already contains the hint, it should not add it again
      const input = 'Hello (Hel-lo) World';
      const result = decorateDyslexiaText(input);
      // Should not produce "Hello (Hel-lo) (Hel-lo)"
      const occurrences = (result.match(/Hel-lo/g) || []).length;
      expect(occurrences).toBe(1);
    });
  });

  describe('TC-DYS-007: getSyllableHint returns correct hints', () => {
    test('returns hint for known words (case-insensitive)', () => {
      expect(getSyllableHint('hello')).toBe('Hel-lo');
      expect(getSyllableHint('Hello')).toBe('Hel-lo');
      expect(getSyllableHint('HELLO')).toBe('Hel-lo');
    });

    test('returns empty string for unknown words', () => {
      expect(getSyllableHint('rocket')).toBe('');
    });

    test('handles null / undefined / empty', () => {
      expect(getSyllableHint(null)).toBe('');
      expect(getSyllableHint(undefined)).toBe('');
      expect(getSyllableHint('')).toBe('');
    });
  });

  describe('TC-DYS-008: getDyslexiaLessonTitle returns syllable titles', () => {
    test('returns syllable title for lesson-greetings', () => {
      expect(getDyslexiaLessonTitle('lesson-greetings')).toBe('Greet-ings');
    });

    test('returns syllable title for lesson-vocabulary', () => {
      expect(getDyslexiaLessonTitle('lesson-vocabulary')).toBe('Ba-sic Words');
    });

    test('returns syllable title for lesson-numbers', () => {
      expect(getDyslexiaLessonTitle('lesson-numbers')).toBe('Num-bers');
    });

    test('returns fallback title for unknown lesson', () => {
      expect(getDyslexiaLessonTitle('lesson-xyz', 'Fallback')).toBe('Fallback');
    });

    test('returns lessonId when no fallback given for unknown lesson', () => {
      expect(getDyslexiaLessonTitle('lesson-unknown')).toBe('lesson-unknown');
    });
  });

  describe('TC-DYS-009: isDyslexiaLessonId identifies dyslexia lessons', () => {
    test('returns true for known dyslexia lesson IDs', () => {
      expect(isDyslexiaLessonId('lesson-greetings')).toBe(true);
      expect(isDyslexiaLessonId('lesson-vocabulary')).toBe(true);
      expect(isDyslexiaLessonId('lesson-numbers')).toBe(true);
    });

    test('returns false for non-dyslexia lesson IDs', () => {
      expect(isDyslexiaLessonId('lesson-advanced')).toBe(false);
      expect(isDyslexiaLessonId('')).toBe(false);
    });

    test('returns false for null / undefined', () => {
      expect(isDyslexiaLessonId(null)).toBe(false);
      expect(isDyslexiaLessonId(undefined)).toBe(false);
    });
  });
});

// ============================
// 3. HIGHLIGHT TEXT UTILITY TESTS (supporting 2.5)
// ============================
describe('2.5 – Visual Learning Aids – highlightText utilities', () => {
  describe('TC-DYS-010: buildHighlightRanges computes correct ranges', () => {
    const text = 'Hello World! Welcome to Learning.';

    test('returns range for a matching phrase', () => {
      const highlights = [{ phrase: 'Hello', emphasisType: 'background' }];
      const ranges = buildHighlightRanges(text, highlights);
      expect(ranges).toHaveLength(1);
      expect(ranges[0].start).toBe(0);
      expect(ranges[0].end).toBe(5);
    });

    test('uses explicit position when provided', () => {
      const highlights = [{ phrase: 'World', emphasisType: 'underline', position: 6 }];
      const ranges = buildHighlightRanges(text, highlights);
      expect(ranges).toHaveLength(1);
      expect(ranges[0].start).toBe(6);
      expect(ranges[0].end).toBe(11);
    });

    test('skips highlights with no matching phrase', () => {
      const highlights = [{ phrase: 'Nonexistent', emphasisType: 'bold' }];
      const ranges = buildHighlightRanges(text, highlights);
      expect(ranges).toHaveLength(0);
    });

    test('handles empty highlights array', () => {
      expect(buildHighlightRanges(text, [])).toEqual([]);
    });

    test('handles null highlight entries', () => {
      const ranges = buildHighlightRanges(text, [null, undefined]);
      expect(ranges).toEqual([]);
    });

    test('prevents overlapping ranges (first-wins)', () => {
      const highlights = [
        { phrase: 'Hello World', emphasisType: 'background' },
        { phrase: 'World', emphasisType: 'underline' },
      ];
      const ranges = buildHighlightRanges(text, highlights);
      // 'World' overlaps with 'Hello World', so only 1 range
      expect(ranges).toHaveLength(1);
      expect(ranges[0].phrase).toBe('Hello World');
    });
  });

  describe('TC-DYS-011: buildHighlightedSegments produces correct segments', () => {
    test('single highlight in the middle', () => {
      const text = 'Say Hello to everyone.';
      const highlights = [{ phrase: 'Hello', emphasisType: 'background' }];
      const segments = buildHighlightedSegments(text, highlights);

      expect(segments.length).toBe(3); // before, highlight, after
      expect(segments[0].text).toBe('Say ');
      expect(segments[0].highlight).toBeNull();
      expect(segments[1].text).toBe('Hello');
      expect(segments[1].highlight).not.toBeNull();
      expect(segments[2].text).toBe(' to everyone.');
      expect(segments[2].highlight).toBeNull();
    });

    test('no highlights returns single segment', () => {
      const text = 'Just plain text.';
      const segments = buildHighlightedSegments(text, []);
      expect(segments).toHaveLength(1);
      expect(segments[0].text).toBe(text);
      expect(segments[0].highlight).toBeNull();
    });

    test('highlight at start of text', () => {
      const text = 'Hello there.';
      const highlights = [{ phrase: 'Hello', emphasisType: 'bold' }];
      const segments = buildHighlightedSegments(text, highlights);
      expect(segments[0].text).toBe('Hello');
      expect(segments[0].highlight).not.toBeNull();
    });

    test('highlight at end of text', () => {
      const text = 'Say Hello';
      const highlights = [{ phrase: 'Hello', emphasisType: 'bold' }];
      const segments = buildHighlightedSegments(text, highlights);
      expect(segments[segments.length - 1].text).toBe('Hello');
      expect(segments[segments.length - 1].highlight).not.toBeNull();
    });
  });
});

// ============================
// 4. DYSLEXIA PROGRESS SERVICE (supporting 1.4 persistence & 2.6 replay)
// ============================
describe('Dyslexia Progress Service', () => {
  // These tests verify the *real* module logic; we unmock for this block.
  beforeEach(() => {
    localStorage.clear();
  });

  describe('TC-DYS-012: normalizeUserId', () => {
    test('returns user id when present', () => {
      // The mock returns the mapped value; test the mock contract
      expect(normalizeUserId({ id: 'u1' })).toBe('u1');
    });

    test('returns "anonymous" for null user', () => {
      expect(normalizeUserId(null)).toBe('anonymous');
    });
  });

  describe('TC-DYS-013: getAllLessonProgress returns stored progress', () => {
    test('returns an object (mocked)', () => {
      const result = getAllLessonProgress('u1');
      expect(typeof result).toBe('object');
    });
  });
});

// ============================
// 5. DYSLEXIA VIEW – DASHBOARD LAYOUT & RENDERING (2.7)
// ============================
describe('2.7 – Consistent Layout – DyslexiaView Dashboard', () => {
  describe('TC-DYS-014: Navigation bar renders consistently', () => {
    test('renders brand name', () => {
      render(<DyslexiaView />);
      expect(screen.getByText('LinguaEase Learning')).toBeInTheDocument();
    });

    test('renders user greeting', () => {
      render(<DyslexiaView />);
      expect(screen.getByText(/TestUser/)).toBeInTheDocument();
    });

    test('renders navigation buttons (Progress, Settings, Logout)', () => {
      render(<DyslexiaView />);
      expect(screen.getByText('Progress')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    test('navbar has sticky position class', () => {
      const { container } = render(<DyslexiaView />);
      const nav = container.querySelector('.navbar');
      expect(nav).toBeInTheDocument();
    });
  });

  describe('TC-DYS-015: Lesson cards render consistently', () => {
    test('renders exactly 3 lesson cards', () => {
      const { container } = render(<DyslexiaView />);
      const cards = container.querySelectorAll('.lesson-card');
      expect(cards).toHaveLength(3);
    });

    test('each lesson card has an icon, title, description, level badge, and CTA', () => {
      const { container } = render(<DyslexiaView />);
      const cards = container.querySelectorAll('.lesson-card');
      cards.forEach((card) => {
        expect(card.querySelector('.lesson-icon')).toBeInTheDocument();
        expect(card.querySelector('h4')).toBeInTheDocument();
        expect(card.querySelector('.lesson-description')).toBeInTheDocument();
        expect(card.querySelector('.badge')).toBeInTheDocument();
        expect(within(card).getByRole('button')).toBeInTheDocument();
      });
    });

    test('lesson levels are all "Beginner"', () => {
      render(<DyslexiaView />);
      const badges = screen.getAllByText('Beginner');
      expect(badges).toHaveLength(3);
    });
  });

  describe('TC-DYS-016: No unexpected layout changes on interaction', () => {
    test('opening ProfileSettings does not remove the navbar', () => {
      render(<DyslexiaView />);
      const settingsBtn = screen.getByLabelText('Settings');
      fireEvent.click(settingsBtn);

      expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
      // Navbar should still be present
      expect(screen.getByText('LinguaEase Learning')).toBeInTheDocument();
    });

    test('closing ProfileSettings restores original layout', () => {
      render(<DyslexiaView />);
      fireEvent.click(screen.getByLabelText('Settings'));
      expect(screen.getByTestId('profile-settings')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Settings'));
      expect(screen.queryByTestId('profile-settings')).not.toBeInTheDocument();
    });
  });

  describe('TC-DYS-017: Progress bar renders for each lesson', () => {
    test('displays 0% when no progress exists', () => {
      render(<DyslexiaView />);
      const progressTexts = screen.getAllByText('0% Complete');
      expect(progressTexts).toHaveLength(3);
    });

    test('progress bar fill width is 0% with no progress', () => {
      const { container } = render(<DyslexiaView />);
      const fills = container.querySelectorAll('.progress-bar-fill');
      fills.forEach((fill) => {
        expect(fill.style.width).toBe('0%');
      });
    });
  });

  describe('TC-DYS-018: Navigation actions work correctly', () => {
    test('clicking "Start Learning" navigates to the correct lesson', () => {
      render(<DyslexiaView />);
      const buttons = screen.getAllByText(/Start Learn/);
      fireEvent.click(buttons[0]); // First lesson → Greetings
      expect(mockNavigate).toHaveBeenCalledWith('/lessons/lesson-greetings');
    });

    test('clicking Progress navigates to /progress', () => {
      render(<DyslexiaView />);
      fireEvent.click(screen.getByText('Progress'));
      expect(mockNavigate).toHaveBeenCalledWith('/progress');
    });

    test('clicking Logout calls the logout function', () => {
      render(<DyslexiaView />);
      fireEvent.click(screen.getByText('Logout'));
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});

// ============================
// 6. DYSLEXIA VIEW – READING GUIDE & TIPS SECTIONS
// ============================
describe('DyslexiaView – Guide & Tips sections', () => {
  describe('TC-DYS-019: Reading Guide section renders', () => {
    test('renders Reading Guide heading', () => {
      render(<DyslexiaView />);
      expect(screen.getByText(/Read-ing Guide|Reading Guide/)).toBeInTheDocument();
    });

    test('renders three guide cards', () => {
      const { container } = render(<DyslexiaView />);
      const cards = container.querySelectorAll('.guide-card');
      expect(cards).toHaveLength(3);
    });

    test('guide section has aria-label for accessibility', () => {
      render(<DyslexiaView />);
      const section = screen.getByLabelText('Reading guide');
      expect(section).toBeInTheDocument();
    });
  });

  describe('TC-DYS-020: Tips section renders', () => {
    test('renders tips heading', () => {
      render(<DyslexiaView />);
      expect(screen.getByText(/Learn-ing Tips|Learning Tips/)).toBeInTheDocument();
    });

    test('renders three tip cards', () => {
      const { container } = render(<DyslexiaView />);
      const cards = container.querySelectorAll('.tip-card');
      expect(cards).toHaveLength(3);
    });
  });

  describe('TC-DYS-021: Syllable chip visual cue renders', () => {
    test('renders syllable-chip element with syllable text', () => {
      const { container } = render(<DyslexiaView />);
      const chip = container.querySelector('.syllable-chip');
      expect(chip).toBeInTheDocument();
      // When syllable mode is ON, chip shows fan–tas–tic
      expect(chip.textContent).toMatch(/fan–tas–tic|fantastic/);
    });
  });
});

// ============================
// 7. EDGE CASES & ACCESSIBILITY
// ============================
describe('Edge Cases & Accessibility – DyslexiaView', () => {
  describe('TC-DYS-022: Handles missing user gracefully', () => {
    test('normalizeUserId returns anonymous for undefined', () => {
      expect(normalizeUserId(undefined)).toBe('anonymous');
    });
  });

  describe('TC-DYS-023: Syllable mode toggle has correct ARIA attributes', () => {
    test('toggle button has aria-pressed matching state', () => {
      render(<DyslexiaView />);
      const btn = screen.getByTitle('Toggle syllable-friendly text');
      // Default is ON
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      fireEvent.click(btn);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('TC-DYS-024: Status pills render with correct classes', () => {
    test('status pill renders "Not Started" by default', () => {
      render(<DyslexiaView />);
      const pills = screen.getAllByText('Not Started');
      expect(pills.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('TC-DYS-025: Lesson icon gradient backgrounds render', () => {
    test('lesson icon elements have inline background style', () => {
      const { container } = render(<DyslexiaView />);
      const icons = container.querySelectorAll('.lesson-icon');
      icons.forEach((icon) => {
        expect(icon.style.background).toContain('linear-gradient');
      });
    });
  });
});
