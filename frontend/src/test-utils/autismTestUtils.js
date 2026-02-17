/**
 * Test Setup Utilities for AutismView Component
 * Helper functions and mocks for testing
 */

import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Renders a component with all required providers (Router, Auth)
 * @param {ReactElement} component - Component to render
 * @param {Object} authValue - Mock authentication context value
 * @returns {RenderResult} - Testing library render result
 */
export const renderWithProviders = (component, authValue = {}) => {
  const defaultAuthValue = {
    user: { name: 'Test User', id: '123', email: 'test@example.com' },
    logout: jest.fn(),
    login: jest.fn(),
    ...authValue
  };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={defaultAuthValue}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

/**
 * Simulates completing multiple steps in a lesson
 * @param {Function} fireEvent - Testing library fireEvent function
 * @param {Function} screen - Testing library screen object
 * @param {number} steps - Number of steps to complete
 */
export const completeSteps = async (fireEvent, screen, steps, waitFor) => {
  for (let i = 0; i < steps; i++) {
    await waitFor(() => {
      const nextButton = screen.getByText(/Next →|Complete Lesson ✓/);
      fireEvent.click(nextButton);
    });
  }

  // EPIC 3.3: If pronunciation practice gate appears, mark all items done and proceed.
  // (JSDOM cannot do real SpeechRecognition; this keeps completion-flow tests stable.)
  if (screen.queryByText('Pronunciation Practice')) {
    const proceedBtn = screen.getByText('Proceed');
    fireEvent.click(proceedBtn);
  }
};

/**
 * Mock lesson data for testing
 */
export const mockLesson = {
  id: 1,
  title: 'Test Lesson',
  language: 'English',
  icon: '🎓',
  description: 'A test lesson',
  steps: [
    {
      id: 1,
      title: 'Test Step',
      content: 'Test Content',
      translation: 'Test Translation',
      highlight: 'Test',
      image: '/test-image.svg',
      audio: '/test-audio.mp3',
      hint: 'Test hint',
      interaction: {
        question: 'Test question?',
        options: ['Option 1', 'Option 2', 'Option 3'],
        correct: 0,
        difficulty: 'easy'
      }
    }
  ]
};

/**
 * Mocks the Web Speech API
 */
export const setupSpeechMock = () => {
  const mockSpeechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    getVoices: jest.fn(() => []),
    speaking: false,
    pending: false,
    paused: false
  };
  
  global.speechSynthesis = mockSpeechSynthesis;
  global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
    text,
    rate: 1,
    pitch: 1,
    volume: 1,
    onstart: null,
    onend: null,
    onboundary: null
  }));
  
  return mockSpeechSynthesis;
};

/**
 * Mocks the Audio API
 */
export const setupAudioMock = () => {
  const mockAudio = {
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(),
    load: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    playbackRate: 1,
    volume: 1,
    currentTime: 0,
    duration: 0
  };
  
  global.Audio = jest.fn(() => mockAudio);
  
  return mockAudio;
};

/**
 * Mocks the API module
 */
export const setupApiMock = () => {
  return {
    get: jest.fn(() => Promise.resolve({ data: { success: true, completedLessons: [] } })),
    post: jest.fn(() => Promise.resolve({ data: { success: true } })),
    put: jest.fn(() => Promise.resolve({ data: { success: true } })),
    delete: jest.fn(() => Promise.resolve({ data: { success: true } }))
  };
};

/**
 * Creates a mock navigation function
 */
export const createMockNavigate = () => jest.fn();

/**
 * Waits for an element to appear with custom timeout
 * @param {Function} callback - Function that checks for element
 * @param {number} timeout - Timeout in milliseconds
 */
export const waitForElement = (callback, timeout = 3000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        const result = callback();
        if (result) {
          resolve(result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for element'));
        } else {
          setTimeout(check, 100);
        }
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(error);
        } else {
          setTimeout(check, 100);
        }
      }
    };
    
    check();
  });
};

/**
 * Simulates selecting an answer option
 * @param {Function} fireEvent - Testing library fireEvent
 * @param {Function} screen - Testing library screen
 * @param {string} optionText - Text of the option to select
 */
export const selectAnswer = (fireEvent, screen, optionText) => {
  const optionButton = screen.getByText(optionText).closest('button');
  fireEvent.click(optionButton);
};

/**
 * Fast-forwards timers and flushes microtasks
 */
export const advanceTimersAndFlush = async (ms) => {
  jest.advanceTimersByTime(ms);
  await Promise.resolve(); // Flush microtasks
};
