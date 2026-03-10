/**
 * Unit Tests for ADHDView Component
 * Testing ADHD-specific learning features only
 * 
 * Test Coverage:
 * 1. Session Management (Timer, Break Reminders)
 * 2. Lesson Selection & Navigation
 * 3. Interactive Quizzes & Feedback
 * 4. Audio Stories & Playback
 * 5. Distraction-Free Mode Toggle
 * 6. Progress Tracking
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ADHDView from '../../../components/learning/ADHDView';
import api from '../../../utils/api';

// Mock dependencies
jest.mock('../../../utils/api');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

// Mock Contexts
const mockUser = { name: 'Test User', id: '123' };
const mockLogout = jest.fn();

jest.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        logout: mockLogout,
    }),
}));

const mockUpdatePreferences = jest.fn();
let mockPreferences = {
    distractionFreeMode: false,
    sessionDuration: 20,
    breakReminders: true,
    learningPace: 1,
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
    playbackRate: 1,
    currentTime: 0,
}));

// Mock HTML Audio Element
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: jest.fn(() => Promise.resolve()),
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: jest.fn(),
});

const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

const startLessonAndSkipCountdown = async ({ lessonTitle } = {}) => {
    // ADHDView now shows an intro screen + countdown before the lesson becomes active.
    // Tests should click "I'm Ready!" and fast-forward timers so navigation buttons appear.
    if (lessonTitle) {
        await waitFor(() => expect(screen.getByText(lessonTitle)).toBeInTheDocument());
    }

    const readyBtn = await screen.findByText("I'm Ready!");
    fireEvent.click(readyBtn);

    // Countdown starts at 5 and decrements once per second.
    for (let i = 0; i < 5; i++) {
        await act(async () => {
            jest.advanceTimersByTime(1000);
        });
    }

    await waitFor(() => {
        expect(screen.queryByText('Starting in...')).not.toBeInTheDocument();
    });
};

describe('ADHDView Component - ADHD Learning Features', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        api.get.mockResolvedValue({ data: { success: true, completedLessons: [] } });
        api.post.mockResolvedValue({ data: { success: true } });

        // Reset preferences mock
        mockPreferences = {
            distractionFreeMode: false,
            sessionDuration: 20,
            breakReminders: true,
            learningPace: 1,
        };
    });

    // ===================================================================
    // TEST SUITE 1: Session Management
    // ===================================================================
    describe('1. Session Management', () => {
        test('should display session start screen initially', async () => {
            renderWithRouter(<ADHDView />);

            await waitFor(() => {
                expect(screen.getByText(/Ready to Learn\?/)).toBeInTheDocument();
                expect(screen.getByText(/Start Session/)).toBeInTheDocument();
            });
        });

        test('should start session and timer when Start Session is clicked', async () => {
            jest.useFakeTimers();
            renderWithRouter(<ADHDView />);

            const startBtn = screen.getByText('Start Session');
            fireEvent.click(startBtn);

            await waitFor(() => {
                // Session dashboard view is shown once session starts
                expect(screen.getByText(/These lessons are available in Open All Lessons\./i)).toBeInTheDocument();
                // Check if timer is running (20 mins = 20:00)
                expect(screen.getByText('20:00')).toBeInTheDocument();
            });

            // Advance time by 1 second
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            await waitFor(() => {
                expect(screen.getByText('19:59')).toBeInTheDocument();
            });

            jest.useRealTimers();
        });
    });

    // ===================================================================
    // TEST SUITE 2: Lesson Selection & Navigation
    // ===================================================================
    describe('2. Lesson Selection & Navigation', () => {
        test('should show Open All Lessons CTA after session starts', async () => {
            renderWithRouter(<ADHDView />);
            fireEvent.click(screen.getByText('Start Session'));

            await waitFor(() => {
                expect(screen.getByText(/These lessons are available in Open All Lessons\./i)).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /open all lessons/i })).toBeInTheDocument();
            });
        });

        test('should enter lesson view when a lesson is started', async () => {
            jest.useFakeTimers();

            // Lessons are started via Lesson Library now; unit tests can simulate this
            // by passing initialLessonId to auto-open a lesson once the session starts.
            renderWithRouter(<ADHDView initialLessonId={1} />);

            await startLessonAndSkipCountdown({ lessonTitle: 'Greetings' });

            await waitFor(() => {
                // Should show lesson content
                expect(screen.getByText('Hello')).toBeInTheDocument();
                // Should show navigation buttons
                expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /prev/i })).toBeInTheDocument();
            });

            jest.useRealTimers();
        });

        test('should navigate between steps', async () => {
            jest.useFakeTimers();

            renderWithRouter(<ADHDView initialLessonId={1} />);

            await startLessonAndSkipCountdown({ lessonTitle: 'Greetings' });

            await waitFor(() => {
                expect(screen.getByText('Hello')).toBeInTheDocument();
            });

            // Next step
            const nextBtn = screen.getByRole('button', { name: /next/i });
            fireEvent.click(nextBtn);

            await waitFor(() => {
                expect(screen.getByText('Hi')).toBeInTheDocument(); // Step 2 content
            });

            // Previous step
            const prevBtn = screen.getByRole('button', { name: /prev/i });
            fireEvent.click(prevBtn);

            await waitFor(() => {
                expect(screen.getByText('Hello')).toBeInTheDocument(); // Back to Step 1
            });

            jest.useRealTimers();
        });
    });

    // ===================================================================
    // TEST SUITE 3: Interactive Quizzes & Feedback
    // ===================================================================
    describe('3. Interactive Quizzes & Feedback', () => {
        beforeEach(async () => {
            jest.useFakeTimers();
            renderWithRouter(<ADHDView initialLessonId={1} />);

            await startLessonAndSkipCountdown({ lessonTitle: 'Greetings' });

            // Navigate to Quiz (Step 3 is quiz for Greetings: "Which word means 'Hello'?")
            fireEvent.click(screen.getByRole('button', { name: /next/i })); // Step 2
            fireEvent.click(screen.getByRole('button', { name: /next/i })); // Step 3
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should display quiz question and options', async () => {
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: /Which word means "Hello"\?/ })).toBeInTheDocument();
                expect(screen.getByText('Hello')).toBeInTheDocument();
                expect(screen.getByText('Goodbye')).toBeInTheDocument();
                expect(screen.getByText('Thanks')).toBeInTheDocument();
            });
        });

        test('should give correct feedback on correct answer', async () => {
            const correctOption = screen.getByText('Hello');
            fireEvent.click(correctOption);

            await waitFor(() => {
                expect(screen.getByText(/Correct! Great job!/)).toBeInTheDocument();
                // Success enables navigation to proceed
                expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
            });
        });

        test('should give hint/error on incorrect answer', async () => {
            const wrongOption = screen.getByText('Goodbye');
            fireEvent.click(wrongOption);

            await waitFor(() => {
                expect(screen.getByText(/Not quite/)).toBeInTheDocument();
            });
        });

        test('should show hint when requested', async () => {
            // Hint button only appears after at least one attempt.
            const wrongOption = screen.getByText('Goodbye');
            fireEvent.click(wrongOption);

            const hintBtn = await screen.findByRole('button', { name: /hint/i });
            fireEvent.click(hintBtn);

            await waitFor(() => {
                expect(screen.getByText(/It starts with H!/)).toBeInTheDocument();
            });
        });
    });

    // ===================================================================
    // TEST SUITE 4: Audio Stories & Playback
    // ===================================================================
    describe('4. Audio Stories & Playback', () => {
        beforeEach(async () => {
            jest.useFakeTimers();
            // Start Audio Stories via initialLessonId to simulate coming from Lesson Library.
            renderWithRouter(<ADHDView initialLessonId={4} />);

            await startLessonAndSkipCountdown({ lessonTitle: 'Audio Stories' });
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should display story lesson content', async () => {
            await waitFor(() => {
                expect(screen.getByRole('heading', { name: 'The Friendly Rabbit' })).toBeInTheDocument();

                // Story content is rendered as word-level spans, so match via container textContent.
                const storyParagraph = screen.getByText((_, node) => {
                    return node?.classList?.contains('story-text') &&
                        (node.textContent || '').includes('Once upon a time');
                });
                expect(storyParagraph).toBeInTheDocument();
            });
        });

        test('should trigger audio playback when requested', async () => {
            const playBtn = screen.getByRole('button', { name: /play story/i });
            fireEvent.click(playBtn);

            await waitFor(() => {
                expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
            });
        });
    });

    // ===================================================================
    // TEST SUITE 5: Distraction-Free Mode
    // ===================================================================
    describe('5. Distraction-Free Mode', () => {
        test('should toggle distraction-free mode', async () => {
            renderWithRouter(<ADHDView />);

            const menuBtn = screen.getByRole('button', { name: /menu/i });
            fireEvent.click(menuBtn);

            const toggleBtn = screen.getByRole('button', { name: /distraction-free/i });
            fireEvent.click(toggleBtn);

            await waitFor(() => {
                expect(mockUpdatePreferences).toHaveBeenCalledWith({
                    distractionFreeMode: true,
                    reduceAnimations: true
                });
            });
        });
    });
});
