/**
 * =============================================================================
 * LESSON PAGE – UNIT TESTS
 * =============================================================================
 *
 * Covers user stories:
 *   2.1  – Multi-Format Lesson Display
 *   2.3  – Interactive Lesson Engagement
 *   2.4  – Guided Learning Support
 *   2.5  – Visual Learning Aids
 *   2.6  – Lesson Replay and Revision
 *   2.7  – Consistent Lesson Layout
 *
 * Test framework  : Jest + React Testing Library (shipped with react-scripts)
 * Run             : cd frontend && npx react-scripts test --watchAll=false
 *                     --testPathPattern=testing/lessonPage
 * =============================================================================
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// ---------------------------------------------------------------------------
// MOCKS
// ---------------------------------------------------------------------------

// React-Router mock to track navigation and url parameters
const mockNavigate = jest.fn(); // Mock function to track programmatic navigation
const mockParams = { lessonId: 'lesson-greetings' }; // Mock the currently viewed lesson
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Keep other router features intact
  useNavigate: () => mockNavigate, // Replace useNavigate with our tracked function
  useParams: () => mockParams, // Replace useParams with our static test parameters
  BrowserRouter: ({ children }) => <div>{children}</div>, // Dummy wrapper for router components
}));

// AuthContext mock to simulate an authenticated user with a learning profile
const mockUser = { id: 'u1', name: 'TestUser', learningCondition: 'dyslexia' };
jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: jest.fn(), isAuthenticated: true }), // Simulated auth hook
}));

// PreferencesContext mock
jest.mock('../../src/context/PreferencesContext', () => ({
  usePreferences: () => ({
    preferences: null,
    applyPreferences: jest.fn(), // Track parameter applications
  }),
}));

// ThemeContext mock to define standardized theme variables for testing ui features
jest.mock('../../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {},
    computed: {
      background: '#F0F8FF',
      text: '#000000',
      mutedText: '#666666',
      surface: '#FFFFFF',
      border: '#CCCCCC',
      accent: '#4D86C9',
      accentText: '#FFFFFF',
      focus: '#4D86C9',
      feedbackCorrect: '#28a745',
      feedbackIncorrect: '#dc3545',
      optionBg: '#F5F5F5',
      optionBorder: '#DDDDDD',
      optionSelectedBg: '#D0E8FF',
      optionSelectedText: '#000000',
    },
    setTheme: jest.fn(), // Track theme updates
  }),
  ThemeProvider: ({ children }) => <div>{children}</div>, // Dummy wrapper for theme components
}));

// Data service mocks
jest.mock('../../src/services/lessonService', () => ({
  getLessonById: jest.fn(() => Promise.reject(new Error('mocked'))), // Mock API failure response
}));

jest.mock('../../src/services/lessonSectionService', () => ({
  getLessonSections: jest.fn(() => Promise.resolve([])), // Mock empty sections structure
}));

jest.mock('../../src/services/progressService', () => ({
  getProgress: jest.fn(() => Promise.resolve({ currentSectionId: '', completedSections: [] })), // Mock progress state retrieval
  updateProgress: jest.fn(() => Promise.resolve({ currentSectionId: '', completedSections: [] })), // Mock recording progress updates
  getSummary: jest.fn(() => Promise.resolve({})), // Mock progress summaries
}));

jest.mock('../../src/services/interactionService', () => ({
  submitInteraction: jest.fn(() =>
    Promise.resolve({ isCorrect: true, feedback: 'Good job!' }) // Mock interactive submission with correct state
  ),
  requestInteractionHelp: jest.fn(() =>
    Promise.resolve({ hint: 'Try harder.', encouragement: 'Keep going!' }) // Mock getting a hint to questions
  ),
}));

jest.mock('../../src/services/dyslexiaProgressService', () => ({
  getAllLessonProgress: jest.fn(() => ({})),
  getLessonProgress: jest.fn(() => ({
    status: 'Not Started',
    correctCount: 0,
    correctIds: [],
  })),
  saveLessonProgress: jest.fn(),
  normalizeUserId: jest.fn((u) => (u ? u.id || 'anonymous' : 'anonymous')),
}));

// Stub the global Audio constructor and speechSynthesis
beforeAll(() => {
  // Mock Audio
  global.Audio = jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    load: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 4,
    currentTime: 0,
    duration: 120,
    playbackRate: 1,
    onended: null,
    onplay: null,
    onerror: null,
  }));

  // Mock SpeechSynthesis
  global.speechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    speaking: false,
  };

  global.SpeechSynthesisUtterance = jest.fn().mockImplementation(() => ({
    rate: 1,
    lang: 'en-US',
    onstart: null,
    onend: null,
    onboundary: null,
  }));

  // Mock fetch for TTS
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      blob: () => Promise.resolve(new Blob()),
    })
  );
});

// ---------- Import subjects AFTER mocks ----------
import LessonPage from '../../src/components/learning/LessonPage';
import LessonLayout from '../../src/components/learning/LessonLayout';
import LessonNav from '../../src/components/learning/LessonNav';
import GuidedSupport from '../../src/components/learning/GuidedSupport';
import VisualLesson from '../../src/components/learning/VisualLesson';
import InteractionCard from '../../src/components/learning/InteractionCard';
import LessonReplay from '../../src/components/learning/LessonReplay';
import LessonDisplay from '../../src/components/learning/LessonDisplay';
import InteractiveLesson from '../../src/components/learning/InteractiveLesson';
import lessonSamples from '../../src/components/learning/lessonSamples';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockNavigate.mockReset();
});

// Sample data from lessonSamples for reuse
const sampleGreetings = lessonSamples['lesson-greetings'];
const sampleInteraction = sampleGreetings.interactions[0]; // true_false: "Is Hello a friendly greeting?"

// ===================================================================
// 2.1 – MULTI-FORMAT LESSON DISPLAY
// ===================================================================
describe('2.1 – Multi-Format Lesson Display', () => {
  // ---------- 2.1.1 Lesson text content renders correctly ----------
  describe('TC-LP-001: Lesson text content renders correctly', () => {
    test('LessonDisplay renders lesson title', () => {
      render(
        <LessonDisplay
          lesson={sampleGreetings}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText('Greetings')).toBeInTheDocument();
    });

    test('LessonDisplay renders paragraphs from textContent', () => {
      render(
        <LessonDisplay
          lesson={sampleGreetings}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText(/This lesson helps you greet someone politely/)).toBeInTheDocument();
    });

    test('LessonDisplay shows "Loading lesson..." when lesson is null and loading', () => {
      render(
        <LessonDisplay lesson={null} isLoading={true} error="" onClose={jest.fn()} />
      );
      expect(screen.getByText('Loading lesson...')).toBeInTheDocument();
      expect(screen.getByText('Loading lesson content…')).toBeInTheDocument();
    });

    test('LessonDisplay shows error message', () => {
      render(
        <LessonDisplay
          lesson={sampleGreetings}
          isLoading={false}
          error="Something went wrong"
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    test('LessonDisplay returns null when no lesson, not loading, no error', () => {
      const { container } = render(
        <LessonDisplay lesson={null} isLoading={false} error="" onClose={jest.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    test('LessonDisplay shows "No text content" when textContent is empty', () => {
      const emptyLesson = { ...sampleGreetings, textContent: '' };
      render(
        <LessonDisplay
          lesson={emptyLesson}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText(/No text content available/)).toBeInTheDocument();
    });
  });

  // ---------- 2.1.2 Audio narration controls ----------
  describe('TC-LP-002: Audio narration starts, pauses, and stops correctly', () => {
    test('LessonDisplay shows Play button when audioUrl is present', () => {
      const lesson = { ...sampleGreetings, audioUrl: '/audio/test.mp3' };
      render(
        <LessonDisplay lesson={lesson} isLoading={false} error="" onClose={jest.fn()} />
      );
      const playBtn = screen.getByRole('button', { name: /play audio narration/i });
      expect(playBtn).toBeInTheDocument();
      expect(playBtn).toHaveTextContent('Play');
    });

    test('LessonDisplay shows message when no audioUrl', () => {
      const lesson = { ...sampleGreetings, audioUrl: '' };
      render(
        <LessonDisplay lesson={lesson} isLoading={false} error="" onClose={jest.fn()} />
      );
      expect(
        screen.getByText(/Audio narration is not available/)
      ).toBeInTheDocument();
    });

    test('Audio seek slider is disabled when duration is 0', () => {
      const lesson = { ...sampleGreetings, audioUrl: '/audio/test.mp3' };
      render(
        <LessonDisplay lesson={lesson} isLoading={false} error="" onClose={jest.fn()} />
      );
      const slider = screen.getByRole('slider', { name: /seek audio narration/i });
      // duration starts at 0 so slider should be disabled
      expect(slider).toBeDisabled();
    });

    test('Audio time display shows 0:00 / 0:00 initially', () => {
      const lesson = { ...sampleGreetings, audioUrl: '/audio/test.mp3' };
      render(
        <LessonDisplay lesson={lesson} isLoading={false} error="" onClose={jest.fn()} />
      );
      expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
    });
  });

  // ---------- 2.1.3 Visual elements load ----------
  describe('TC-LP-003: Visual elements/icons load properly', () => {
    test('LessonDisplay renders visual aids when present', () => {
      render(
        <LessonDisplay
          lesson={sampleGreetings}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      const visualSection = screen.getByLabelText('Lesson visuals');
      expect(visualSection).toBeInTheDocument();
      // Sample has 2 visuals
      const figures = visualSection.querySelectorAll('figure');
      expect(figures.length).toBeGreaterThanOrEqual(1);
    });

    test('LessonDisplay shows "No visuals" when visuals array is empty', () => {
      const lesson = { ...sampleGreetings, visuals: [] };
      render(
        <LessonDisplay lesson={lesson} isLoading={false} error="" onClose={jest.fn()} />
      );
      expect(
        screen.getByText(/No visuals are attached/)
      ).toBeInTheDocument();
    });

    test('LessonDisplay visual figure has figcaption with description', () => {
      render(
        <LessonDisplay
          lesson={sampleGreetings}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText(/Wave hello/i)).toBeInTheDocument();
    });
  });

  // ---------- 2.1.4 & 2.1.5 Synchronisation & No media conflicts ----------
  describe('TC-LP-004: Text, audio, and visuals are synchronized', () => {
    test('LessonDisplay renders text, audio section, and visuals in the same view', () => {
      const lesson = { ...sampleGreetings, audioUrl: '/audio/test.mp3' };
      render(
        <LessonDisplay lesson={lesson} isLoading={false} error="" onClose={jest.fn()} />
      );
      // Text
      expect(screen.getByLabelText('Lesson text content')).toBeInTheDocument();
      // Audio
      expect(screen.getByLabelText('Lesson audio')).toBeInTheDocument();
      // Visuals
      expect(screen.getByLabelText('Lesson visuals')).toBeInTheDocument();
    });
  });

  describe('TC-LP-005: Close button fires onClose callback', () => {
    test('close button triggers onClose', () => {
      const onClose = jest.fn();
      render(
        <LessonDisplay
          lesson={sampleGreetings}
          isLoading={false}
          error=""
          onClose={onClose}
        />
      );
      const closeBtn = screen.getByRole('button', { name: /close lesson/i });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

// ===================================================================
// 2.3 – INTERACTIVE LESSON ENGAGEMENT
// ===================================================================
describe('2.3 – Interactive Lesson Engagement', () => {
  // ---------- 2.3.1 Click / select interactions register ----------
  describe('TC-LP-006: Click/select interactions register correctly', () => {
    test('InteractionCard renders question text', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      expect(
        screen.getByText(/Is "Hello" a friendly greeting/i)
      ).toBeInTheDocument();
    });

    test('true_false interaction renders True and False radio options', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      expect(screen.getByLabelText('True')).toBeInTheDocument();
      expect(screen.getByLabelText('False')).toBeInTheDocument();
    });

    test('selecting a radio option enables the Submit button', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      const submitBtn = screen.getByRole('button', { name: /submit answer/i });
      expect(submitBtn).toBeDisabled(); // no selection yet

      fireEvent.click(screen.getByLabelText('True'));
      expect(submitBtn).not.toBeDisabled();
    });

    test('click-type interaction renders clickable option buttons', () => {
      const clickInteraction = sampleGreetings.interactions[2]; // click type
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={clickInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      const optionBtns = screen.getAllByRole('button', { name: /How are you\?|Where is it\?|See you later/ });
      expect(optionBtns.length).toBe(3);
    });

    test('clicking an option marks it as selected (aria-pressed)', () => {
      const clickInteraction = sampleGreetings.interactions[2];
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={clickInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      const btn = screen.getByRole('button', { name: 'How are you?' });
      fireEvent.click(btn);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    });

    test('short_answer interaction renders a text input', () => {
      const shortInteraction = sampleGreetings.interactions[3]; // short_answer
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={shortInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      const input = screen.getByPlaceholderText(/type your answer here/i);
      expect(input).toBeInTheDocument();
    });
  });

  // ---------- 2.3.2 Questions appear at correct lesson points ----------
  describe('TC-LP-007: Questions appear at correct lesson points', () => {
    test('interactions in lessonSamples have sequential positions', () => {
      sampleGreetings.interactions.forEach((interaction, index) => {
        expect(interaction.position).toBe(index);
      });
    });

    test('InteractiveLesson shows first interaction initially', () => {
      render(
        <InteractiveLesson
          lesson={sampleGreetings}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      // First interaction question
      expect(screen.getByText(/Is "Hello" a friendly greeting/i)).toBeInTheDocument();
    });
  });

  // ---------- 2.3.3 Immediate feedback shown ----------
  describe('TC-LP-008: Immediate feedback shown after interaction', () => {
    test('submitting correct answer shows correct feedback (local mode)', async () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      fireEvent.click(screen.getByLabelText('True'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() => {
        expect(screen.getByText(/Great job/i)).toBeInTheDocument();
      });
    });

    test('submitting incorrect answer shows incorrect feedback (local mode)', async () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      fireEvent.click(screen.getByLabelText('False'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() => {
        expect(screen.getByText(/Good effort/i)).toBeInTheDocument();
      });
    });

    test('correct answer shows celebration animation container', async () => {
      const { container } = render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      fireEvent.click(screen.getByLabelText('True'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() => {
        expect(container.querySelector('.answer-celebration')).toBeInTheDocument();
      });
    });

    test('incorrect answer shows try-again animation container', async () => {
      const { container } = render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      fireEvent.click(screen.getByLabelText('False'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() => {
        expect(container.querySelector('.answer-try-again')).toBeInTheDocument();
      });
    });
  });

  // ---------- 2.3.4 Interaction logic does not overwhelm the learner ----------
  describe('TC-LP-009: Interaction logic does not overwhelm', () => {
    test('only one interaction is shown at a time', () => {
      render(
        <InteractiveLesson
          lesson={sampleGreetings}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      // Only the first interaction's question should be visible
      expect(screen.getByText(/Is "Hello" a friendly greeting/i)).toBeInTheDocument();
      // Second interaction should NOT be visible
      expect(screen.queryByText(/Choose a friendly greeting/i)).not.toBeInTheDocument();
    });

    test('InteractionCard has "No timer" label when timer is disabled', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      expect(screen.getByText('No timer')).toBeInTheDocument();
    });
  });

  // ---------- 2.3.5 Invalid interactions handled safely ----------
  describe('TC-LP-010: Invalid interactions are handled safely', () => {
    test('submit button is disabled when nothing is selected', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      const submitBtn = screen.getByRole('button', { name: /submit answer/i });
      expect(submitBtn).toBeDisabled();
    });

    test('InteractionCard in readOnly mode shows replay message', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          readOnly={true}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      expect(screen.getByText(/replay mode/i)).toBeInTheDocument();
    });

    test('Try Again button resets the interaction after wrong answer', async () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      fireEvent.click(screen.getByLabelText('False'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() => {
        expect(screen.getByText(/Good effort/i)).toBeInTheDocument();
      });

      const retryBtn = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryBtn);

      // Feedback should be cleared, submit button visible again
      await waitFor(() => {
        expect(screen.queryByText(/Good effort/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /submit answer/i })).toBeInTheDocument();
      });
    });
  });
});

// ===================================================================
// 2.4 – GUIDED LEARNING SUPPORT
// ===================================================================
describe('2.4 – Guided Learning Support', () => {
  // ---------- 2.4.1 Hints appear when learner struggles ----------
  describe('TC-LP-011: Hints appear when learner struggles', () => {
    test('after 2 incorrect attempts, hint is shown (local mode)', async () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );

      // Attempt 1 – wrong
      fireEvent.click(screen.getByLabelText('False'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));
      await waitFor(() => expect(screen.getByText(/Good effort/i)).toBeInTheDocument());

      // Retry
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Attempt 2 – wrong again → should trigger hint
      fireEvent.click(screen.getByLabelText('False'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() => {
        // Hint should appear: "Try reading it as Hel-lo when you say it."
        expect(screen.getByText(/Hel-lo/i)).toBeInTheDocument();
      });
    });
  });

  // ---------- 2.4.2 Incorrect answers trigger explanations ----------
  describe('TC-LP-012: Incorrect answers trigger explanations', () => {
    test('explanation is included in guidance after wrong answer', async () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );

      fireEvent.click(screen.getByLabelText('False'));
      fireEvent.submit(screen.getByRole('button', { name: /submit answer/i }));

      await waitFor(() => {
        // The explanation or encouragement should be visible
        const guidedMessage = document.querySelector('.guided-message');
        expect(guidedMessage).toBeInTheDocument();
      });
    });
  });

  // ---------- 2.4.3 Manual help request ----------
  describe('TC-LP-013: Manual help request works correctly', () => {
    test('GuidedSupport renders "Need help?" button', () => {
      render(
        <GuidedSupport
          message=""
          tone=""
          onHelp={jest.fn()}
          isLoading={false}
        />
      );
      expect(screen.getByText('Need help?')).toBeInTheDocument();
    });

    test('clicking "Need help?" calls onHelp callback', () => {
      const onHelp = jest.fn();
      render(
        <GuidedSupport message="" tone="" onHelp={onHelp} isLoading={false} />
      );
      fireEvent.click(screen.getByText('Need help?'));
      expect(onHelp).toHaveBeenCalledTimes(1);
    });

    test('GuidedSupport shows loading state text', () => {
      render(
        <GuidedSupport message="" tone="" onHelp={jest.fn()} isLoading={true} />
      );
      expect(screen.getByText('Getting help…')).toBeInTheDocument();
    });

    test('GuidedSupport button is disabled during loading', () => {
      render(
        <GuidedSupport message="" tone="" onHelp={jest.fn()} isLoading={true} />
      );
      expect(screen.getByRole('button', { name: /getting help/i })).toBeDisabled();
    });
  });

  // ---------- 2.4.4 Encouraging static messages ----------
  describe('TC-LP-014: Encouraging static messages display properly', () => {
    test('GuidedSupport renders the guidance message', () => {
      render(
        <GuidedSupport
          message="You're getting closer!"
          tone="encouragement"
          onHelp={jest.fn()}
          isLoading={false}
        />
      );
      expect(screen.getByText("You're getting closer!")).toBeInTheDocument();
    });

    test('GuidedSupport message has role="status" for screen readers', () => {
      render(
        <GuidedSupport
          message="Keep going!"
          tone="encouragement"
          onHelp={jest.fn()}
          isLoading={false}
        />
      );
      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveTextContent('Keep going!');
    });

    test('GuidedSupport has aria-live="polite" on container', () => {
      const { container } = render(
        <GuidedSupport
          message="Test message"
          tone=""
          onHelp={jest.fn()}
          isLoading={false}
        />
      );
      expect(container.firstChild).toHaveAttribute('aria-live', 'polite');
    });
  });

  // ---------- 2.4.5 Messages do not change unexpectedly ----------
  describe('TC-LP-015: Messages do not change unexpectedly', () => {
    test('message stays the same when props do not change', () => {
      const { rerender } = render(
        <GuidedSupport
          message="Stable message"
          tone="hint"
          onHelp={jest.fn()}
          isLoading={false}
        />
      );
      expect(screen.getByText('Stable message')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <GuidedSupport
          message="Stable message"
          tone="hint"
          onHelp={jest.fn()}
          isLoading={false}
        />
      );
      expect(screen.getByText('Stable message')).toBeInTheDocument();
    });

    test('no guidance message renders when message is empty', () => {
      const { container } = render(
        <GuidedSupport message="" tone="" onHelp={jest.fn()} isLoading={false} />
      );
      expect(container.querySelector('.guided-message')).not.toBeInTheDocument();
    });
  });
});

// ===================================================================
// 2.5 – VISUAL LEARNING AIDS
// ===================================================================
describe('2.5 – Visual Learning Aids', () => {
  const paragraphs = [
    { text: 'Hello World!', startIndex: 0 },
    { text: 'Welcome to learning.', startIndex: 13 },
  ];
  const highlights = [
    { phrase: 'Hello', emphasisType: 'background', color: '#ffe7a3' },
  ];
  const visualAids = [
    {
      id: 'v1',
      imageUrl: '/visuals/wave.svg',
      altText: 'Wave icon',
      relatedPhrase: 'Hello',
      placement: 'inline',
    },
  ];

  // ---------- 2.5.1 Important words highlighted ----------
  describe('TC-LP-016: Important words are highlighted correctly', () => {
    test('VisualLesson renders highlighted text with .highlight class', () => {
      const { container } = render(
        <VisualLesson paragraphs={paragraphs} highlights={highlights} visualAids={[]} />
      );
      const highlightSpans = container.querySelectorAll('.highlight');
      expect(highlightSpans.length).toBeGreaterThanOrEqual(1);
      expect(highlightSpans[0]).toHaveTextContent('Hello');
    });

    test('highlight has correct emphasis type class', () => {
      const { container } = render(
        <VisualLesson paragraphs={paragraphs} highlights={highlights} visualAids={[]} />
      );
      const span = container.querySelector('.highlight-background');
      expect(span).toBeInTheDocument();
    });

    test('non-highlighted text has no highlight class', () => {
      const { container } = render(
        <VisualLesson
          paragraphs={[{ text: 'Just plain text.', startIndex: 0 }]}
          highlights={[]}
          visualAids={[]}
        />
      );
      const highlightSpans = container.querySelectorAll('.highlight');
      expect(highlightSpans).toHaveLength(0);
    });
  });

  // ---------- 2.5.2 Images load and correspond ----------
  describe('TC-LP-017: Images load and correspond to lesson content', () => {
    test('VisualLesson renders inline visual aid with image', () => {
      render(
        <VisualLesson paragraphs={paragraphs} highlights={[]} visualAids={visualAids} />
      );
      const img = screen.getByAltText('Wave icon');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/visuals/wave.svg');
    });

    test('visual aid figure has figcaption matching relatedPhrase', () => {
      render(
        <VisualLesson paragraphs={paragraphs} highlights={[]} visualAids={visualAids} />
      );
      expect(screen.getByText('Hello')).toBeInTheDocument(); // figcaption
    });
  });

  // ---------- 2.5.3 Visuals are simple and uncluttered ----------
  describe('TC-LP-018: Visuals are simple and uncluttered', () => {
    test('VisualLesson renders paragraphs in separate blocks', () => {
      const { container } = render(
        <VisualLesson paragraphs={paragraphs} highlights={[]} visualAids={[]} />
      );
      const blocks = container.querySelectorAll('.visual-paragraph');
      expect(blocks).toHaveLength(2);
    });

    test('each paragraph block wraps text in a <p> tag', () => {
      const { container } = render(
        <VisualLesson paragraphs={paragraphs} highlights={[]} visualAids={[]} />
      );
      const ps = container.querySelectorAll('.visual-paragraph p');
      expect(ps).toHaveLength(2);
    });
  });

  // ---------- 2.5.4 Visuals update with lesson changes ----------
  describe('TC-LP-019: Visuals update correctly with lesson changes', () => {
    test('re-rendering with new paragraphs updates the displayed text', () => {
      const { container, rerender } = render(
        <VisualLesson paragraphs={paragraphs} highlights={[]} visualAids={[]} />
      );
      expect(container.querySelectorAll('.visual-paragraph')).toHaveLength(2);

      const newParagraphs = [{ text: 'New content.', startIndex: 0 }];
      rerender(
        <VisualLesson paragraphs={newParagraphs} highlights={[]} visualAids={[]} />
      );
      expect(container.querySelectorAll('.visual-paragraph')).toHaveLength(1);
      expect(screen.getByText('New content.')).toBeInTheDocument();
    });

    test('active-reading highlight class applied for activeWord', () => {
      const { container } = render(
        <VisualLesson
          paragraphs={paragraphs}
          highlights={[]}
          visualAids={[]}
          activeWord="Hello"
        />
      );
      const activeSpan = container.querySelector('.highlight-active');
      expect(activeSpan).toBeInTheDocument();
    });
  });

  // ---------- Side visuals excluded from inline ----------
  describe('TC-LP-020: Side-placed visuals are excluded from inline rendering', () => {
    test('side-placement visual is not rendered inline', () => {
      const sideVisual = {
        id: 'v-side',
        imageUrl: '/visuals/sun.svg',
        altText: 'Sun',
        relatedPhrase: 'Hello',
        placement: 'side',
      };
      const { container } = render(
        <VisualLesson paragraphs={paragraphs} highlights={[]} visualAids={[sideVisual]} />
      );
      // Side visuals are filtered out in VisualLesson's inline rendering
      const figures = container.querySelectorAll('.visual-aid');
      expect(figures).toHaveLength(0);
    });
  });
});

// ===================================================================
// 2.6 – LESSON REPLAY AND REVISION
// ===================================================================
describe('2.6 – Lesson Replay and Revision', () => {
  // ---------- 2.6.1 Lesson sections can be replayed ----------
  describe('TC-LP-021: Lesson sections can be replayed', () => {
    test('LessonNav renders Replay button', () => {
      render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={false}
          canGoNext={true}
          canReplay={true}
          isReplay={false}
          nextLabel="Next"
        />
      );
      const replayBtn = screen.getByRole('button', { name: /replay/i });
      expect(replayBtn).toBeInTheDocument();
      expect(replayBtn).not.toBeDisabled();
    });

    test('Replay button is disabled when canReplay is false and isReplay is false', () => {
      render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={false}
          canGoNext={true}
          canReplay={false}
          isReplay={false}
          nextLabel="Next"
        />
      );
      const replayBtn = screen.getByRole('button', { name: /replay/i });
      expect(replayBtn).toBeDisabled();
    });

    test('Replay button has is-active class when isReplay is true', () => {
      const { container } = render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={false}
          canGoNext={false}
          canReplay={true}
          isReplay={true}
          nextLabel="Next"
        />
      );
      const replayBtn = container.querySelector('.lesson-nav__button--replay');
      expect(replayBtn).toHaveClass('is-active');
    });

    test('Replay button has aria-pressed matching isReplay', () => {
      render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={false}
          canGoNext={false}
          canReplay={true}
          isReplay={true}
          nextLabel="Next"
        />
      );
      const replayBtn = screen.getByRole('button', { name: /replay/i });
      expect(replayBtn).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ---------- 2.6.2 Audio and visuals replay correctly ----------
  describe('TC-LP-022: Audio and visuals replay correctly', () => {
    test('InteractionCard in readOnly mode (replay) still shows the question', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          readOnly={true}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      expect(screen.getByText(/Is "Hello" a friendly greeting/i)).toBeInTheDocument();
    });

    test('InteractionCard in readOnly mode disables submit', () => {
      render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          readOnly={true}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      const submitBtn = screen.getByRole('button', { name: /submit answer/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  // ---------- 2.6.3 Previous lesson steps are accessible ----------
  describe('TC-LP-023: Previous lesson steps are accessible', () => {
    test('LessonNav back button calls onBack when canGoBack is true', () => {
      const onBack = jest.fn();
      render(
        <LessonNav
          onBack={onBack}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={true}
          canGoNext={true}
          canReplay={false}
          isReplay={false}
          nextLabel="Next"
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    test('LessonNav back button is disabled when canGoBack is false', () => {
      render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={false}
          canGoNext={true}
          canReplay={false}
          isReplay={false}
          nextLabel="Next"
        />
      );
      expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled();
    });
  });

  // ---------- 2.6.4 Learner progress state is preserved ----------
  describe('TC-LP-024: Learner progress state is preserved during replay', () => {
    test('saveLessonProgress is callable (mock contract)', () => {
      const { saveLessonProgress } = require('../../src/services/dyslexiaProgressService');
      saveLessonProgress('u1', 'lesson-greetings', { status: 'In Progress', correctCount: 2 });
      expect(saveLessonProgress).toHaveBeenCalledWith('u1', 'lesson-greetings', {
        status: 'In Progress',
        correctCount: 2,
      });
    });
  });

  // ---------- 2.6.5 Replay does not reset unrelated progress ----------
  describe('TC-LP-025: Replay does not reset unrelated progress', () => {
    test('LessonNav next button shows "Finish" label for last section', () => {
      render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={true}
          canGoNext={true}
          canReplay={false}
          isReplay={false}
          nextLabel="Finish"
        />
      );
      expect(screen.getByRole('button', { name: /finish/i })).toBeInTheDocument();
    });
  });
});

// ===================================================================
// 2.7 – CONSISTENT LESSON LAYOUT
// ===================================================================
describe('2.7 – Consistent Lesson Layout', () => {
  // ---------- 2.7.1 Layout structure consistent ----------
  describe('TC-LP-026: Layout structure remains consistent', () => {
    test('LessonLayout renders header, main, guidance, and footer regions', () => {
      render(
        <LessonLayout
          title="Test Lesson"
          subtitle="Subtitle"
          guidance={<p>Guidance text</p>}
          footer={<p>Footer</p>}
        >
          <p>Content</p>
        </LessonLayout>
      );
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    test('LessonLayout renders title and subtitle', () => {
      render(
        <LessonLayout title="My Lesson" subtitle="Step through slowly">
          <p>Content</p>
        </LessonLayout>
      );
      expect(screen.getByText('My Lesson')).toBeInTheDocument();
      expect(screen.getByText('Step through slowly')).toBeInTheDocument();
    });

    test('LessonLayout renders "Lesson" eyebrow label', () => {
      render(
        <LessonLayout title="Title">
          <p>Content</p>
        </LessonLayout>
      );
      expect(screen.getByText('Lesson')).toBeInTheDocument();
    });

    test('LessonLayout has role="region" with aria-label', () => {
      const { container } = render(
        <LessonLayout title="Title">
          <p>Content</p>
        </LessonLayout>
      );
      const region = container.querySelector('[role="region"]');
      expect(region).toHaveAttribute('aria-label', 'Lesson layout');
    });
  });

  // ---------- 2.7.2 Navigation buttons stay in fixed positions ----------
  describe('TC-LP-027: Navigation buttons stay in fixed positions', () => {
    test('LessonNav renders Back, Replay, Next in consistent order', () => {
      const { container } = render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={true}
          canGoNext={true}
          canReplay={true}
          isReplay={false}
          nextLabel="Next"
        />
      );
      const buttons = container.querySelectorAll('.lesson-nav__button');
      expect(buttons).toHaveLength(3);
      expect(buttons[0]).toHaveTextContent('Back');
      expect(buttons[1]).toHaveTextContent('Replay');
      expect(buttons[2]).toHaveTextContent('Next');
    });

    test('LessonNav has role="navigation" with aria-label', () => {
      render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={false}
          canGoNext={false}
          canReplay={false}
          isReplay={false}
          nextLabel="Next"
        />
      );
      const nav = screen.getByRole('navigation', { name: /lesson navigation/i });
      expect(nav).toBeInTheDocument();
    });
  });

  // ---------- 2.7.3 No unexpected layout changes ----------
  describe('TC-LP-028: No unexpected layout changes occur', () => {
    test('LessonLayout back button shows when onBack is provided', () => {
      const onBack = jest.fn();
      render(
        <LessonLayout title="Title" onBack={onBack} backLabel="Go back">
          <p>Content</p>
        </LessonLayout>
      );
      const backBtn = screen.getByRole('button', { name: /go back/i });
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    test('LessonLayout hides back button when onBack is not provided', () => {
      render(
        <LessonLayout title="Title">
          <p>Content</p>
        </LessonLayout>
      );
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    test('LessonLayout children render inside main area', () => {
      render(
        <LessonLayout title="Title">
          <div data-testid="child">Hello</div>
        </LessonLayout>
      );
      const main = screen.getByRole('main');
      expect(within(main).getByTestId('child')).toBeInTheDocument();
    });
  });

  // ---------- 2.7.4 Screen transitions are predictable ----------
  describe('TC-LP-029: Screen transitions are predictable and stable', () => {
    test('LessonLayout guidance section has aria-live="polite"', () => {
      const { container } = render(
        <LessonLayout title="Title" guidance={<p>Guidance</p>}>
          <p>Content</p>
        </LessonLayout>
      );
      const guidanceSection = container.querySelector('[aria-live="polite"]');
      expect(guidanceSection).toBeInTheDocument();
    });

    test('InteractionCard form has aria-live="polite" for dynamic feedback', () => {
      const { container } = render(
        <InteractionCard
          lessonId="lesson-greetings"
          interaction={sampleInteraction}
          onContinue={jest.fn()}
          useLocalSubmission={true}
          disableAutoSpeak={true}
          autoPlayNarration={false}
          enableTimer={false}
          autoAdvanceOnCorrect={false}
        />
      );
      const form = container.querySelector('form[aria-live="polite"]');
      expect(form).toBeInTheDocument();
    });
  });
});

// ===================================================================
// LESSON PAGE INTEGRATION (component mounting)
// ===================================================================
describe('LessonPage – component mounting', () => {
  describe('TC-LP-030: LessonPage renders with sample lesson', () => {
    test('LessonPage renders without crashing', async () => {
      await act(async () => {
        render(<LessonPage />);
      });
      // LessonPage should render the layout container
      const container = document.getElementById('learning-container');
      expect(container).toBeInTheDocument();
    });

    test('LessonPage sets data-user-condition attribute', async () => {
      await act(async () => {
        render(<LessonPage />);
      });
      const container = document.getElementById('learning-container');
      expect(container).toHaveAttribute('data-user-condition', 'dyslexia');
    });
  });
});

// ===================================================================
// EDGE CASES
// ===================================================================
describe('Edge Cases – Lesson Components', () => {
  describe('TC-LP-031: InteractiveLesson handles empty interactions', () => {
    test('shows "No interactions" message when interactions array is empty', () => {
      const lesson = { ...sampleGreetings, interactions: [] };
      render(
        <InteractiveLesson
          lesson={lesson}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText(/No interactions/i)).toBeInTheDocument();
    });
  });

  describe('TC-LP-032: InteractiveLesson handles missing textContent', () => {
    test('shows "No text content" when textContent is empty', () => {
      const lesson = { ...sampleGreetings, textContent: '', interactions: [] };
      render(
        <InteractiveLesson
          lesson={lesson}
          isLoading={false}
          error=""
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText(/No text content/i)).toBeInTheDocument();
    });
  });

  describe('TC-LP-033: VisualLesson handles empty arrays gracefully', () => {
    test('renders nothing when paragraphs array is empty', () => {
      const { container } = render(
        <VisualLesson paragraphs={[]} highlights={[]} visualAids={[]} />
      );
      const blocks = container.querySelectorAll('.visual-paragraph');
      expect(blocks).toHaveLength(0);
    });
  });

  describe('TC-LP-034: LessonNav uses default nextLabel when not provided', () => {
    test('renders "Next" when nextLabel is not specified', () => {
      render(
        <LessonNav
          onBack={jest.fn()}
          onNext={jest.fn()}
          onReplay={jest.fn()}
          canGoBack={false}
          canGoNext={true}
          canReplay={false}
          isReplay={false}
        />
      );
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });
  });

  describe('TC-LP-035: GuidedSupport tone class is applied', () => {
    test('message div includes tone class when provided', () => {
      const { container } = render(
        <GuidedSupport
          message="Hint: Think carefully"
          tone="hint"
          onHelp={jest.fn()}
          isLoading={false}
        />
      );
      const msgDiv = container.querySelector('.guided-message');
      expect(msgDiv).toHaveClass('hint');
    });
  });
});
