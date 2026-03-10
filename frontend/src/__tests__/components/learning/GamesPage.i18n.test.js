import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GamesPage from '../../../components/learning/GamesPage';

const mockLogout = jest.fn();

let mockUser = { id: 'u1', name: 'Test User', learningCondition: 'autism' };

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
  }),
}));

let mockPreferences = {
  uiLanguage: 'tamil',
  preferredLanguage: 'tamil',
  simplifiedLayout: false,
};

const mockUpdateAccessibilitySettings = jest.fn().mockResolvedValue({ success: true });

jest.mock('../../../context/PreferencesContext', () => {
  const React = require('react');

  const defaultValue = {};
  Object.defineProperty(defaultValue, 'preferences', { get: () => mockPreferences });
  Object.defineProperty(defaultValue, 'updateAccessibilitySettings', { get: () => mockUpdateAccessibilitySettings });

  const PreferencesContext = React.createContext(defaultValue);

  return {
    PreferencesContext,
    usePreferences: () => ({
      preferences: mockPreferences,
      updateAccessibilitySettings: mockUpdateAccessibilitySettings,
    }),
  };
});

jest.mock('../../../utils/dyslexiaSyllableMode', () => ({
  useDyslexiaSyllableMode: () => [false],
}));

describe('GamesPage i18n', () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockUpdateAccessibilitySettings.mockClear();

    document.body.innerHTML = '';
  });

  it('translates Autism games when language changes', () => {
    mockUser = { ...mockUser, learningCondition: 'autism' };

    mockPreferences = { ...mockPreferences, uiLanguage: 'tamil', preferredLanguage: 'tamil' };
    const { rerender } = render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'விளையாட்டுகளை விளையாடு' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'உணர்வு பொருத்தம்' })).toBeInTheDocument();

    mockPreferences = { ...mockPreferences, uiLanguage: 'hindi', preferredLanguage: 'hindi' };
    rerender(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'खेल खेलें' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'भाव मिलान' })).toBeInTheDocument();
  });

  it('translates Dyslexia game titles in Tamil', () => {
    mockUser = { ...mockUser, learningCondition: 'dyslexia' };
    mockPreferences = { ...mockPreferences, uiLanguage: 'tamil', preferredLanguage: 'tamil' };

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'விளையாட்டுகளை விளையாடு' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'எழுத்து கலக்கம்' })).toBeInTheDocument();
  });

  it('translates ADHD game titles in Hindi', () => {
    mockUser = { ...mockUser, learningCondition: 'adhd' };
    mockPreferences = { ...mockPreferences, uiLanguage: 'hindi', preferredLanguage: 'hindi' };

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'खेल खेलें' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'फ्लैश मिलान' })).toBeInTheDocument();
  });

  it('does not apply simplified layout styling on GamesPage', () => {
    mockUser = { ...mockUser, learningCondition: 'autism' };
    mockPreferences = { ...mockPreferences, uiLanguage: 'english', preferredLanguage: 'english', simplifiedLayout: true };

    const container = document.createElement('div');
    container.id = 'learning-container';
    container.className = 'simplified-layout';
    document.body.appendChild(container);

    const { unmount } = render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>
    );

    // While mounted, GamesPage suppresses the simplified-layout class.
    expect(container.classList.contains('simplified-layout')).toBe(false);

    // On unmount, restore if the preference was enabled.
    unmount();
    expect(container.classList.contains('simplified-layout')).toBe(true);
  });
});
