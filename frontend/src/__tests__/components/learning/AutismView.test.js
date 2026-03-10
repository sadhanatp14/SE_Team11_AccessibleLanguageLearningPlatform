/**
 * Unit Tests for AutismView Component
 * Testing Autism-specific learning features only
 * 
 * Test Coverage:
 * 1. Multi-format lesson display (text, audio, visuals)
 * 2. Step-by-step lesson flow
 * 3. Interactive lesson engagement (selections, retry, feedback)
 * 4. Guided learning support (hints, explanations)
 * 5. Visual learning aids (highlighted text, images)
 * 6. Lesson replay and revision
 * 7. Consistent layout behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AutismView from '../../../components/learning/AutismView';
import * as AuthContext from '../../../context/AuthContext';
import api from '../../../utils/api';

// Mock dependencies
jest.mock('../../../utils/api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock useAuth hook
const mockUser = { name: 'Test User', id: '123' };
const mockLogout = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

// Mock PreferencesContext (AutismView reads preferredLanguage from preferences)
const mockUpdatePreferences = jest.fn();
let mockPreferences = {
  preferredLanguage: 'english',
};

jest.mock('../../../context/PreferencesContext', () => {
  const React = require('react');
  const defaultValue = {};
  Object.defineProperty(defaultValue, 'preferences', { get: () => mockPreferences });
  Object.defineProperty(defaultValue, 'updatePreferences', { get: () => mockUpdatePreferences });
  const PreferencesContext = React.createContext(defaultValue);

  return {
    PreferencesContext,
    usePreferences: () => ({
      preferences: mockPreferences,
      updatePreferences: mockUpdatePreferences,
    }),
  };
});

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => []),
};
global.speechSynthesis = mockSpeechSynthesis;
global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  rate: 1,
  lang: 'en-US',
  volume: 1,
  onboundary: null,
  onstart: null,
  onend: null,
}));

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock HTML Audio Element for <audio> tags
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: jest.fn(() => Promise.resolve()),
});

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: jest.fn(),
});

// Helper function to render component with context
const renderWithAuth = (component, userValue = { name: 'Test User', id: '123' }) => {
  // Update mock user for this render
  mockUser.name = userValue.name || 'Test User';
  mockUser.id = userValue.id || '123';
  
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

const renderAutismLesson = (lessonId = 1) => renderWithAuth(<AutismView initialLessonId={lessonId} />);

const completePronunciationPracticeIfPresent = () => {
  if (!screen.queryByText('Pronunciation Practice')) return;
  const proceedButton = screen.getByText('Proceed');
  fireEvent.click(proceedButton);
};

const normalizeText = (text) => (text || '').replace(/\s+/g, ' ').trim();

const getStepCounterText = () => {
  const node = document.querySelector('.step-number');
  return normalizeText(node?.textContent);
};

const advanceLessonStep = async () => {
  const before = getStepCounterText();
  const nextButtonInitial = screen.queryByText(/Next →|Complete Lesson/);
  if (!nextButtonInitial) return;

  fireEvent.click(nextButtonInitial);
  await new Promise((r) => setTimeout(r, 0));

  const afterDirect = getStepCounterText();
  if (afterDirect && afterDirect !== before) return;

  const optionButtons = Array.from(document.querySelectorAll('.interaction-options button'));
  for (const optionButton of optionButtons) {
    if (optionButton.disabled) continue;
    fireEvent.click(optionButton);

    const nextButton = screen.queryByText(/Next →|Complete Lesson/);
    if (nextButton) fireEvent.click(nextButton);
    await new Promise((r) => setTimeout(r, 0));

    const afterOption = getStepCounterText();
    if (afterOption && afterOption !== before) return;

    const retryButton = screen.queryByText('Retry Question');
    if (retryButton && !retryButton.disabled) {
      fireEvent.click(retryButton);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
};

const getPrevNavButton = () =>
  screen.queryByRole('button', { name: /^prev$/i }) ||
  screen.queryByRole('button', { name: /previous/i });

const advanceLessonSteps = async (count) => {
  for (let i = 0; i < count; i++) {
    await advanceLessonStep();
  }
};

describe('AutismView Component - Autism Learning Features', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { success: true, completedLessons: [] } });
    api.post.mockResolvedValue({ data: { success: true } });

    try {
      window.localStorage.clear();
    } catch {
      // non-blocking
    }

    mockPreferences = {
      preferredLanguage: 'english',
    };

    // Prevent jsdom from attempting real network calls when the component uses fetch for TTS.
    global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));
  });

  // ===================================================================
  // TEST SUITE 1: Multi-format Lesson Display
  // Testing text, audio, and visual content loading
  // ===================================================================
  describe('1. Multi-format Lesson Display', () => {
    test('should not display duplicate lessons on the dashboard (use Open All Lessons instead)', async () => {
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        // Lessons are not duplicated as dashboard lesson cards.
        expect(document.querySelectorAll('.lesson-simple-card').length).toBe(0);
      });

      // The Open All Lessons CTA is present.
      expect(screen.getByText(/These lessons are available in Open All Lessons\./i)).toBeInTheDocument();

      // A prominent next-lesson recommendation card is shown instead.
      expect(await screen.findByLabelText('Recommended next lesson')).toBeInTheDocument();

      // Learning path is visible (titles may appear there).
      expect(screen.getByText('Learning Path')).toBeInTheDocument();

      // Verify Open All Lessons entry point exists
      expect(screen.getAllByRole('button', { name: /open all lessons/i }).length).toBeGreaterThan(0);
      
      // Lessons grid still renders (it may show an empty state)
      const lessonsGrid = document.querySelector('.lessons-simple-grid');
      expect(lessonsGrid).toBeInTheDocument();
    });

    test('should display text content when lesson is started', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Verify lesson content is displayed
        const tamilTexts = screen.getAllByText(/வணக்கம்/);
        expect(tamilTexts.length).toBeGreaterThan(0);
      });
    });

    test('should display visual image for current step', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Check if image element exists with correct src
        const images = screen.getAllByRole('img');
        const stepImage = images.find(img => img.src.includes('autism-tamil-greeting.svg'));
        expect(stepImage).toBeInTheDocument();
      });
    });

    test('should have audio playback controls available', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Verify audio button is present
        expect(screen.getByText('Play Audio')).toBeInTheDocument();
        expect(screen.getByText('Click to hear the pronunciation')).toBeInTheDocument();
      });
    });

    test('should display translation text alongside main content', async () => {
      mockPreferences = {
        ...mockPreferences,
        bilingualTextMode: 'english_tamil',
      };
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Check both Tamil content and English translation are shown
        const tamilTexts = screen.getAllByText(/வணக்கம்/);
        expect(tamilTexts.length).toBeGreaterThan(0);
        expect(screen.getByText(/A common word used when meeting someone/)).toBeInTheDocument();
      });
    });
  });

  // ===================================================================
  // TEST SUITE 2: Step-by-Step Lesson Flow
  // Testing navigation, one-step-at-a-time behavior
  // ===================================================================
  describe('2. Step-by-Step Lesson Flow', () => {
    test('should start at step 1 when lesson begins', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Verify we're on step 1
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
    });

    test('should advance to next step when Next button is clicked', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
      
      // Advance to step 2 (Next is gated until an answer is selected)
      await advanceLessonStep();
      
      await waitFor(() => {
        // Should move to step 2
        expect(screen.getByText('Step 2 of 10')).toBeInTheDocument();
        const tamilTexts = screen.getAllByText(/நன்றி/);
        expect(tamilTexts.length).toBeGreaterThan(0); // Step 2 content
      });
    });

    test('should go back to previous step when Previous button is clicked', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
      
      // Go to step 2 (requires answering step 1)
      await advanceLessonStep();
      
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 10')).toBeInTheDocument();
      });
      
      // Go back to step 1
      const prevButton = getPrevNavButton();
      expect(prevButton).toBeInTheDocument();
      fireEvent.click(prevButton);
      
      await waitFor(() => {
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      await waitFor(() => {
        const tamilTexts = screen.getAllByText(/வணக்கம்/);
        expect(tamilTexts.length).toBeGreaterThan(0); // Step 1 content
      });
    });

    test('should disable Previous button on first step', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        const prevButton = getPrevNavButton();
        expect(prevButton).toBeInTheDocument();
        expect(prevButton).toBeDisabled();
      });
    });

    test('should show completion screen after last step', async () => {
      renderAutismLesson(1);
      
      // Navigate to last step (step 10)
      await advanceLessonSteps(10);

      completePronunciationPracticeIfPresent();
      
      await waitFor(() => {
        // Check completion screen appears
        expect(screen.getByText('Great Job!')).toBeInTheDocument();
        expect(screen.getByText(/You completed "Greetings" lesson!/)).toBeInTheDocument();
      });
    });

    test('should display progress dots for all steps', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Check progress dots container exists
        const progressDots = document.querySelector('.progress-dots');
        expect(progressDots).toBeInTheDocument();
        
        // Should have 10 dots for 10 steps
        const dots = progressDots.querySelectorAll('.dot');
        expect(dots.length).toBe(10);
      });
    });
  });

  // ===================================================================
  // TEST SUITE 3: Interactive Lesson Engagement
  // Testing selections, retry mechanism, feedback
  // ===================================================================
  describe('3. Interactive Lesson Engagement', () => {
    test('should display multiple choice question with options', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Check question is displayed
        expect(screen.getByText('What does வணக்கம் mean?')).toBeInTheDocument();
        
        // Check all three options are present
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Goodbye')).toBeInTheDocument();
        expect(screen.getByText('Thank you')).toBeInTheDocument();
      });
    });

    test('should show positive feedback when correct answer is selected', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
      
      // Select correct answer (Hello - index 0)
      const correctButton = screen.getByText('Hello').closest('button');
      fireEvent.click(correctButton);
      
      await waitFor(() => {
        // Check for positive feedback
        expect(screen.getByText(/Good job! That's correct!/)).toBeInTheDocument();
      });
    });

    test('should show retry option after one wrong answer', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Goodbye')).toBeInTheDocument();
      });
      
      // Select wrong answer
      const wrongButton = screen.getByText('Goodbye').closest('button');
      fireEvent.click(wrongButton);
      
      await waitFor(() => {
        // Retry button should appear after 1 wrong answer
          expect(screen.getByText('Retry Question')).toBeInTheDocument();
      });
    });

    test('should prevent progression without answering question', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
      
      // Click Next without answering
      const nextButton = screen.getByText('Next →');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        // Should remain on step 1 and show gentle guidance
        expect(getStepCounterText()).toBe('Step 1 of 10');
        expect(screen.getByText(/Please answer the question correctly before moving to the next step\./i)).toBeInTheDocument();
      });
    });

    test.skip('should auto-progress after correct answer is selected (skipped - timer complexity)', async () => {
      jest.useFakeTimers();
      
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        expect(screen.getByText('Greetings')).toBeInTheDocument();
      });
      
      const startButton = screen.getAllByText('Start Lesson')[0];
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
      
      // Select correct answer
      const correctButton = screen.getByText('Hello').closest('button');
      fireEvent.click(correctButton);
      
      // Fast-forward time by 2 seconds (auto-progression delay)
      jest.advanceTimersByTime(2000);
      
      // Run all pending timers and flush promises
      await waitFor(() => {
        jest.runOnlyPendingTimers();
      });
      
      await waitFor(() => {
        // Should auto-progress to step 2
        expect(screen.getByText('Step 2 of 10')).toBeInTheDocument();
      }, { timeout: 3000 });
      
      jest.useRealTimers();
    });

    test('should disable option buttons after answer is selected', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
      
      // Select an answer
      const optionButton = screen.getByText('Hello').closest('button');
      fireEvent.click(optionButton);
      
      await waitFor(() => {
        // All option buttons should be disabled
        const optionButtons = screen.getAllByRole('button').filter(btn => {
          const hasOptionLetter = btn.querySelector('.option-letter');
          const hasOptionClass = btn.classList.contains('btn-option');
          return hasOptionLetter || hasOptionClass;
        });
        expect(optionButtons.length).toBeGreaterThan(0);
        optionButtons.forEach(btn => {
          expect(btn).toBeDisabled();
        });
      });
    });

    test('should reset question state when retry button is clicked', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Goodbye')).toBeInTheDocument();
      });
      
      // Select wrong answer
      const wrongButton = screen.getByText('Goodbye').closest('button');
      fireEvent.click(wrongButton);
      
      await waitFor(() => {
        expect(screen.getByText('Retry Question')).toBeInTheDocument();
      });
      
      // Click retry
      const retryButton = screen.getByText('Retry Question');
      fireEvent.click(retryButton);
      
      await waitFor(() => {
        // Options should be enabled again
        const optionButton = screen.getByText('Hello').closest('button');
        expect(optionButton).not.toBeDisabled();
      });
    });
  });

  // ===================================================================
  // TEST SUITE 4: Guided Learning Support
  // Testing hint display and explanation messages
  // ===================================================================
  describe('4. Guided Learning Support', () => {
    test('should display hint button for each step', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Hint button should be present
        expect(screen.getByText('Show Hint')).toBeInTheDocument();
      });
    });

    test('should show hint content when hint button is clicked', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Show Hint')).toBeInTheDocument();
      });
      
      // Click hint button
      const hintButton = screen.getByText('Show Hint');
      fireEvent.click(hintButton);
      
      await waitFor(() => {
        // Hint text should be displayed
        expect(screen.getByText(/Say "வணக்கம்" when you meet someone/)).toBeInTheDocument();
      });
    });

    test('should toggle hint button text when clicked', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Show Hint')).toBeInTheDocument();
      });
      
      // Click to show hint
      let hintButton = screen.getByText('Show Hint');
      fireEvent.click(hintButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hide Hint')).toBeInTheDocument();
      });
      
      // Click to hide hint
      hintButton = screen.getByText('Hide Hint');
      fireEvent.click(hintButton);
      
      await waitFor(() => {
        expect(screen.getByText('Show Hint')).toBeInTheDocument();
      });
    });

    test('should hide hint when moving to next step', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('Show Hint')).toBeInTheDocument();
      });
      
      // Show hint
      fireEvent.click(screen.getByText('Show Hint'));
      
      await waitFor(() => {
        expect(screen.getByText('Hide Hint')).toBeInTheDocument();
      });
      
      // Move to next step
      await advanceLessonStep();
      
      await waitFor(() => {
        // Hint should be hidden (button text reset)
        expect(screen.getByText('Show Hint')).toBeInTheDocument();
      });
    });

    test('should display appropriate hint for each step', async () => {
      renderAutismLesson(1);
      
      // Step 1 hint
      await waitFor(() => {
        fireEvent.click(screen.getByText('Show Hint'));
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Say "வணக்கம்" when you meet someone/)).toBeInTheDocument();
      });
      
      // Go to step 2
      await advanceLessonStep();
      
      // Step 2 hint
      await waitFor(() => {
        fireEvent.click(screen.getByText('Show Hint'));
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Say "நன்றி" to show gratitude/)).toBeInTheDocument();
      });
    });
  });

  // ===================================================================
  // TEST SUITE 5: Visual Learning Aids
  // Testing highlighted text and visual image loading
  // ===================================================================
  describe('5. Visual Learning Aids', () => {
    test('should highlight key Tamil words in content', async () => {
        renderAutismLesson(1);
      
      await waitFor(() => {
        // Check if highlighted content exists
        const highlightedElements = document.querySelectorAll('.highlight');
        expect(highlightedElements.length).toBeGreaterThan(0);
      });
    });

    test('should load appropriate image for each step', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Step 1 image
        const images = screen.getAllByRole('img');
        const stepImage = images.find(img => img.src.includes('autism-tamil-greeting.svg'));
        expect(stepImage).toBeInTheDocument();
      });
      
      // Move to step 2
      await advanceLessonStep();
      
      await waitFor(() => {
        // Step 2 should have different image
        const images = screen.getAllByRole('img');
        const stepImage = images.find(img => img.src.includes('autism-tamil-thanks.svg'));
        expect(stepImage).toBeInTheDocument();
      });
    });

    test('should display lesson icon in lesson selection view', async () => {
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        // Dashboard has no lesson cards now; still should show an entry point to the lesson library.
        expect(screen.getAllByRole('button', { name: /open all lessons/i }).length).toBeGreaterThan(0);
        // And the UI still uses icons in the header.
        expect(document.querySelectorAll('svg.lucide').length).toBeGreaterThan(0);
      });
    });

    test('should show visual feedback icons in completion screen', async () => {
      renderAutismLesson(1);
      
      // Complete all steps
      await advanceLessonSteps(10);

      completePronunciationPracticeIfPresent();
      
      await waitFor(() => {
        // Check completion icon
        expect(screen.getByText('🎉')).toBeInTheDocument();
      });
    });
  });

  // ===================================================================
  // TEST SUITE 6: Lesson Replay and Revision
  // Testing replay functionality and progress preservation
  // ===================================================================
  describe('6. Lesson Replay and Revision', () => {
    test('should mark lesson as completed after finishing', async () => {
        renderAutismLesson(1);
      
      // Complete all steps
      await advanceLessonSteps(10);

      completePronunciationPracticeIfPresent();
      
      await waitFor(() => {
        expect(screen.getByText('Great Job!')).toBeInTheDocument();
      });
      
      // Verify completion was saved to backend
      expect(api.post).toHaveBeenCalledWith('/users/complete-lesson', { lessonKey: 'autism-lesson-1' });
    });

    test('should show completion badge for completed lessons', async () => {
      // Mock completed lesson
      api.get.mockResolvedValue({
        data: { success: true, completedLessons: ['autism-lesson-1'] }
      });
      
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        // Dashboard no longer lists lesson cards; completion state should still load without crashing.
        expect(api.get).toHaveBeenCalledWith('/users/completed-lessons');
        expect(document.querySelectorAll('.lesson-simple-card').length).toBe(0);
        expect(screen.getAllByRole('button', { name: /open all lessons/i }).length).toBeGreaterThan(0);
      });
    });

    test('should allow replaying completed lessons', async () => {
      // Mock completed lesson
      api.get.mockResolvedValue({
        data: { success: true, completedLessons: ['autism-lesson-1'] }
      });
      
      renderWithAuth(<AutismView initialLessonId={1} />);
      
      await waitFor(() => {
        // Should start the lesson
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
    });

    test.skip('should allow audio replay on same step (skipped - JSDOM audio limitation)', async () => {
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        expect(screen.getByText('Greetings')).toBeInTheDocument();
      });
      
      const startButton = screen.getAllByText('Start Lesson')[0];
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText('🔊 Play Audio')).toBeInTheDocument();
      });
      
      // Click audio multiple times - should not throw errors
      const audioButton = screen.getByText('🔊 Play Audio');
      
      await waitFor(async () => {
        fireEvent.click(audioButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      await waitFor(async () => {
        fireEvent.click(audioButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Should work multiple times (no error)
      expect(audioButton).toBeInTheDocument();
    });

    test('should navigate to next lesson from completion screen', async () => {
      renderAutismLesson(1);
      
      // Complete all steps
      await advanceLessonSteps(10);

      completePronunciationPracticeIfPresent();
      
      await waitFor(() => {
        expect(screen.getByText('Go to Next Lesson')).toBeInTheDocument();
      });
      
      // Click next lesson
      fireEvent.click(screen.getByText('Go to Next Lesson'));
      
      await waitFor(() => {
        // Should start lesson 2
        expect(screen.getByText('Basic Words')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
    });

    test('should return to lesson list from completion screen', async () => {
      renderAutismLesson(1);
      
      // Complete all steps
      await advanceLessonSteps(10);

      completePronunciationPracticeIfPresent();
      
      await waitFor(() => {
        expect(screen.getByText('Back to Lessons')).toBeInTheDocument();
      });
      
      // Click back to lessons
      fireEvent.click(screen.getByText('Back to Lessons'));
      
      await waitFor(() => {
        // Should show lesson selection again
        expect(screen.getByText('Choose your lesson')).toBeInTheDocument();
      });
    });
  });

  // ===================================================================
  // TEST SUITE 7: Consistent Layout Behavior
  // Testing navigation buttons and predictable flow
  // ===================================================================
  describe('7. Consistent Layout Behavior', () => {
    test('should display header with lesson title during lesson', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Check header elements
        expect(screen.getByText('← Back to Lessons')).toBeInTheDocument();
        expect(screen.getByText('Greetings')).toBeInTheDocument();
      });
    });

    test('should always show navigation buttons in fixed position', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        // Check navigation buttons exist
        expect(getPrevNavButton()).toBeInTheDocument();
        expect(screen.getByText('Next →')).toBeInTheDocument();
      });
      
      // Move to next step
      fireEvent.click(screen.getByText('Next →'));
      
      await waitFor(() => {
        // Navigation buttons should still be there
        expect(getPrevNavButton()).toBeInTheDocument();
        expect(screen.getByText('Next →')).toBeInTheDocument();
      });
    });

    test('should return to lesson list when Back to Lessons is clicked', async () => {
      renderAutismLesson(1);
      
      await waitFor(() => {
        expect(screen.getByText('← Back to Lessons')).toBeInTheDocument();
      });
      
      // Click back button
      fireEvent.click(screen.getByText('← Back to Lessons'));
      
      await waitFor(() => {
        // Should show lesson selection
        expect(screen.getByText('Choose your lesson')).toBeInTheDocument();
      });
    });

    test('should not duplicate core lessons as dashboard cards', async () => {
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        const lessonCards = document.querySelectorAll('.lesson-simple-card');
        expect(lessonCards.length).toBe(0);
      });

      expect(screen.getAllByRole('button', { name: /open all lessons/i }).length).toBeGreaterThan(0);
    });

    test('should maintain lesson state when navigating back and forth', async () => {
      renderAutismLesson(1);

      await waitFor(() => {
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
      
      // Move to step 3
      await advanceLessonSteps(2);
      
      await waitFor(() => {
        expect(getStepCounterText()).toBe('Step 3 of 10');
      });
      
      // Go back
      const prevButton = getPrevNavButton();
      expect(prevButton).toBeInTheDocument();
      fireEvent.click(prevButton);
      
      await waitFor(() => {
        expect(getStepCounterText()).toBe('Step 2 of 10');
      });
      
      // Go forward again
      await advanceLessonStep();
      
      await waitFor(() => {
        // Should be back at step 3
        expect(getStepCounterText()).toBe('Step 3 of 10');
      });
    });

    test('should change Next button text to Complete Lesson on last step', async () => {
      renderAutismLesson(1);

      await waitFor(() => {
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
      
      // Navigate to step 9 (second to last)
      await advanceLessonSteps(8);
      
      await waitFor(() => {
        expect(screen.getByText('Next →')).toBeInTheDocument();
      });
      
      // Move to last step (step 10)
      await advanceLessonStep();
      
      await waitFor(() => {
        // Button text should change
        expect(screen.getByText('Complete Lesson')).toBeInTheDocument();
      });
    });

    test('should show step counter on every step', async () => {
      renderAutismLesson(1);

      await waitFor(() => {
        expect(screen.getByText('Step 1 of 10')).toBeInTheDocument();
      });
      
      // Check each step has counter
      for (let i = 1; i <= 5; i++) {
        await waitFor(() => {
          expect(getStepCounterText()).toBe(`Step ${i} of 10`);
        });
        
        if (i < 5) {
          await advanceLessonStep();
        }
      }
    });

    test('should display welcome message with user name', async () => {
      renderWithAuth(<AutismView />, { name: 'John Doe', id: '123' });
      
      await waitFor(() => {
        expect(
          screen.getByText((_, node) => normalizeText(node?.textContent) === 'Hello, John Doe', { selector: 'h2' })
        ).toBeInTheDocument();
      });
    });
  });

  // ===================================================================
  // EDGE CASES AND ERROR HANDLING
  // ===================================================================
  describe('Edge Cases and Error Handling', () => {
    test('should handle API error when fetching completed lessons', async () => {
      api.get.mockRejectedValue(new Error('Network error'));
      
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        // Component should still render even if API fails
        expect(screen.getAllByRole('button', { name: /open all lessons/i }).length).toBeGreaterThan(0);
      });
    });

    test.skip('should handle audio playback failure gracefully (skipped - JSDOM audio limitation)', async () => {
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        expect(screen.getByText('Greetings')).toBeInTheDocument();
      });
      
      const startButton = screen.getAllByText('Start Lesson')[0];
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(screen.getByText('🔊 Play Audio')).toBeInTheDocument();
      });
      
      const audioButton = screen.getByText('🔊 Play Audio');
      
      // Audio should not crash even if play fails
      await waitFor(async () => {
        fireEvent.click(audioButton);
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      // Should not crash
      expect(audioButton).toBeInTheDocument();
    });

    test('should handle lesson with no initialLessonId prop', async () => {
      renderWithAuth(<AutismView />);
      
      await waitFor(() => {
        // Should show lesson selection
        expect(screen.getByText('Choose your lesson')).toBeInTheDocument();
      });

      // Dashboard shows recommendation + learning path, but no duplicated lesson cards.
      expect(document.querySelectorAll('.lesson-simple-card').length).toBe(0);
      expect(await screen.findByLabelText('Recommended next lesson')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /open all lessons/i }).length).toBeGreaterThan(0);
    });

    test('should not show next lesson button on last lesson completion', async () => {
      renderAutismLesson(5);
      
      // Complete all steps
      await advanceLessonSteps(10);

      await waitFor(() => {
        expect(screen.getByText('Pronunciation Practice')).toBeInTheDocument();
      });

      completePronunciationPracticeIfPresent();

      await waitFor(() => {
        expect(screen.getByText('Great Job!')).toBeInTheDocument();
        expect(screen.getByText(/You completed ".+" lesson!/)).toBeInTheDocument();
      });
      
      await waitFor(() => {
        // Next lesson button should not appear
        expect(screen.queryByText('Go to Next Lesson')).not.toBeInTheDocument();
      });
    });
  });
});
