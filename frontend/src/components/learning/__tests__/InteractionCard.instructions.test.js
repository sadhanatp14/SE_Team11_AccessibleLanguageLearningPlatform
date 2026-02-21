import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InteractionCard from '../InteractionCard';

jest.mock('../../../context/PreferencesContext', () => {
  const React = require('react');
  const defaultValue = {
    preferences: { preferredLanguage: 'english' },
    loading: false,
    updatePreferences: jest.fn(),
  };
  const PreferencesContext = React.createContext(defaultValue);
  return {
    PreferencesContext,
    usePreferences: () => ({
      preferences: { preferredLanguage: 'english' },
      loading: false,
      updatePreferences: jest.fn(),
    }),
  };
});

const baseInteraction = {
  id: 'interaction-1',
  type: 'true_false',
  question: 'Is the sky blue?',
  options: ['True', 'False'],
  correctAnswer: 'True',
  feedback: {
    correct: 'Correct',
    incorrect: 'Incorrect',
  },
};

describe('InteractionCard spoken instructions (EPIC 3.7)', () => {
  beforeEach(() => {
    jest.restoreAllMocks();

    global.fetch = jest.fn();

    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel: jest.fn(),
        speak: jest.fn(),
      },
      configurable: true,
    });

    global.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
      this.text = text;
      this.rate = 1;
      this.lang = '';
      this.volume = 1;
    };

    global.URL.createObjectURL = jest.fn(() => 'blob:mock-audio');
    global.URL.revokeObjectURL = jest.fn();

    global.Audio = jest.fn(() => ({
      play: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      onended: null,
      onerror: null,
    }));
  });

  it('opens an instructions dialog and can play/replay spoken instructions via backend TTS', async () => {
    const user = userEvent.setup();

    fetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['FAKE'], { type: 'audio/mpeg' }),
    });

    render(
      <InteractionCard
        lessonId="lesson-1"
        interaction={baseInteraction}
        enableTimer={false}
        enableTts={true}
        autoPlayNarration={false}
        disableAutoSpeak={true}
      />
    );

    await user.click(screen.getByRole('button', { name: /open instructions/i }));

    expect(screen.getByRole('dialog', { name: /instructions/i })).toBeInTheDocument();

    const instructionText = screen.getByTestId('instructions-text').textContent;
    expect(instructionText).toMatch(/instructions\./i);

    await user.click(screen.getByRole('button', { name: /play \/ replay/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/tts/speak');

    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.text.trim()).toBe(instructionText.trim());
    expect(parsedBody.speed).toBe(0.85);
  });

  it('allows closing the dialog with Escape', async () => {
    const user = userEvent.setup();

    render(
      <InteractionCard
        lessonId="lesson-1"
        interaction={baseInteraction}
        enableTimer={false}
        enableTts={true}
        autoPlayNarration={false}
        disableAutoSpeak={true}
      />
    );

    await user.click(screen.getByRole('button', { name: /open instructions/i }));
    expect(screen.getByRole('dialog', { name: /instructions/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /instructions/i })).not.toBeInTheDocument();
  });
});
