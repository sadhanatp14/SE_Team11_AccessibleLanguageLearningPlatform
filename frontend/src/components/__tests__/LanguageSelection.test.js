import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LanguageSelection from '../LanguageSelection';

import { usePreferences } from '../../context/PreferencesContext';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: { next: '/accessibility-setup' } }),
}));

global.__languageSelectionUpdatePreferencesMock = global.__languageSelectionUpdatePreferencesMock || jest.fn();
const mockUpdatePreferences = global.__languageSelectionUpdatePreferencesMock;
jest.mock('../../context/PreferencesContext', () => {
  const React = require('react');
  return {
    PreferencesContext: React.createContext({ preferences: { uiLanguage: 'english' }, loading: false }),
    usePreferences: jest.fn(),
  };
});

describe('LanguageSelection', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUpdatePreferences.mockReset();

    usePreferences.mockReturnValue({
      preferences: { uiLanguage: 'english' },
      loading: false,
      updatePreferences: mockUpdatePreferences,
    });
  });

  it('renders language options and shows confirmation when selected', async () => {
    const user = userEvent.setup();
    mockUpdatePreferences.mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <LanguageSelection />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /choose your language/i })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /^tamil\b/i }));

    expect(screen.getByRole('radio', { name: /^tamil\b/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/tamil/i, { selector: 'strong' })).toBeInTheDocument();
  });

  it('saves preference and navigates on continue', async () => {
    const user = userEvent.setup();
    mockUpdatePreferences.mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <LanguageSelection />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('radio', { name: /^hindi\b/i }));
  await user.click(screen.getByTestId('language-continue'));

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ uiLanguage: 'hindi' });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/accessibility-setup');
    });
  });

  it('disables language selection when bilingual text is enabled', async () => {
    mockUpdatePreferences.mockResolvedValue({ success: true });

    usePreferences.mockReturnValue({
      preferences: { uiLanguage: 'english', bilingualTextMode: 'english_hindi' },
      loading: false,
      updatePreferences: mockUpdatePreferences,
    });

    render(
      <MemoryRouter>
        <LanguageSelection />
      </MemoryRouter>
    );

    // Options are disabled
    expect(screen.getByRole('radio', { name: /English/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Tamil/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Hindi/i })).toBeDisabled();

    // Continue should navigate but NOT try to save uiLanguage
    const user = userEvent.setup();
    await user.click(screen.getByTestId('language-continue'));
    expect(mockUpdatePreferences).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/accessibility-setup');
  });
});
