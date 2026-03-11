import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import api from '../../utils/api';
import { getSummary } from '../../services/progressService';
import { getAllLessonProgress, normalizeUserId } from '../../services/dyslexiaProgressService';

// Mocks
jest.mock('../../utils/api');
jest.mock('../../services/progressService');
jest.mock('../../services/dyslexiaProgressService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

let mockUser = {
  name: 'Test User',
  learningCondition: 'dyslexia',
};

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

let mockPreferences = {
  contrastTheme: 'default',
  fontFamily: 'default',
  fontSize: 'medium',
  letterSpacing: 'normal',
  wordSpacing: 'normal',
  lineHeight: 'normal',
  distractionFreeMode: false,
  reduceAnimations: false,
};

jest.mock('../../context/PreferencesContext', () => ({
  usePreferences: () => ({
    preferences: mockPreferences,
  }),
}));

jest.mock('../../utils/dyslexiaSyllableMode', () => ({
  useDyslexiaSyllableMode: () => [false],
  getDyslexiaLessonTitle: (id, title) => title || id,
}));

jest.mock('../../utils/i18n', () => ({
  useI18n: () => ({
    lang: 'english',
    t: (key) => key,
  }),
}));

import ProgressPage from '../../components/ProgressPage';

const renderPage = () => {
  return render(
    <BrowserRouter>
      <ProgressPage />
    </BrowserRouter>
  );
};

const clickFilter = (labelKey) => {
  fireEvent.click(screen.getByRole('button', { name: labelKey }));
};

describe('ProgressPage filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Summary fetch is not the focus of these tests.
    getSummary.mockResolvedValue({
      success: true,
      totalLessons: 3,
      completedCount: 0,
      completedLessons: [],
    });

    // Remote completion list.
    api.get.mockResolvedValue({ data: { success: true, completedLessons: [] } });

    normalizeUserId.mockReturnValue('test-user');
    getAllLessonProgress.mockReturnValue({});

    mockUser = { name: 'Test User', learningCondition: 'dyslexia' };
  });

  test('filters Dyslexia lessons by Completed / Partial / Not Started', async () => {
    mockUser = { name: 'Test User', learningCondition: 'dyslexia' };

    getAllLessonProgress.mockReturnValue({
      'lesson-greetings': { status: 'Completed', correctCount: 5 },
      'lesson-vocabulary': { status: 'Not Started', correctCount: 2 }, // should be treated as Partial
    });

    renderPage();

    // Default: show all 5 dyslexia lessons.
    expect(await screen.findByText('Greetings')).toBeInTheDocument();
    expect(screen.getByText('Basic Words')).toBeInTheDocument();
    expect(screen.getByText('Numbers')).toBeInTheDocument();
    expect(screen.getByText('Tamil Foundations: Everyday Greetings')).toBeInTheDocument();
    expect(screen.getByText('Hindi Foundations: Everyday Greetings')).toBeInTheDocument();

    clickFilter('progress.filterCompleted');
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.queryByText('Basic Words')).not.toBeInTheDocument();

    clickFilter('progress.filterPartial');
    expect(screen.getByText('Basic Words')).toBeInTheDocument();
    expect(screen.queryByText('Greetings')).not.toBeInTheDocument();

    clickFilter('progress.filterNotStarted');
    expect(screen.getByText('Numbers')).toBeInTheDocument();
    expect(screen.queryByText('Basic Words')).not.toBeInTheDocument();
    expect(screen.queryByText('Greetings')).not.toBeInTheDocument();

    // Clicking the active filter again should reset to all.
    clickFilter('progress.filterNotStarted');
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.getByText('Basic Words')).toBeInTheDocument();
  });

  test('filters ADHD lessons using remote completion list', async () => {
    mockUser = { name: 'Test User', learningCondition: 'adhd' };
    api.get.mockResolvedValue({
      data: {
        success: true,
        completedLessons: ['adhd-lesson-1'],
      },
    });

    renderPage();

    // Wait for remote completion fetch to populate lesson cards.
    await waitFor(() => expect(screen.getByText('Greetings')).toBeInTheDocument());

    clickFilter('progress.filterCompleted');
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.queryByText('Basic Words')).not.toBeInTheDocument();

    clickFilter('progress.filterNotStarted');
    expect(screen.queryByText('Greetings')).not.toBeInTheDocument();
    expect(screen.getByText('Basic Words')).toBeInTheDocument();
    expect(screen.getByText('Numbers')).toBeInTheDocument();
  });

  test('filters Autism lessons using remote completion list', async () => {
    mockUser = { name: 'Test User', learningCondition: 'autism' };
    api.get.mockResolvedValue({
      data: {
        success: true,
        completedLessons: ['autism-lesson-2', 'autism-lesson-4'],
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('Greetings')).toBeInTheDocument());

    clickFilter('progress.filterCompleted');
    expect(screen.getByText('Basic Words')).toBeInTheDocument();
    expect(screen.getByText('Family Members')).toBeInTheDocument();
    expect(screen.queryByText('Greetings')).not.toBeInTheDocument();

    clickFilter('progress.filterNotStarted');
    expect(screen.getByText('Greetings')).toBeInTheDocument();
    expect(screen.getByText('Numbers')).toBeInTheDocument();
    expect(screen.getByText('Common Actions')).toBeInTheDocument();
    expect(screen.queryByText('Basic Words')).not.toBeInTheDocument();
  });
});
