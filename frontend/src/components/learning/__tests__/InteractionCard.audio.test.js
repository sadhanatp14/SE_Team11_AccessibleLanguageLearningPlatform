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

describe('InteractionCard audio/TTS replay (EPIC 3.5)', () => {
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

  it('requests backend TTS with slow speed (0.85) and plays audio', async () => {
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

    const listenBtn = screen.getByRole('button', { name: /replay narration/i });
    await user.click(listenBtn);

    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/tts/speak');
    expect(options.method).toBe('POST');

    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.text).toBe(baseInteraction.question);
    expect(parsedBody.speed).toBe(0.85);

    expect(global.Audio).toHaveBeenCalledWith('blob:mock-audio');
    const audioInstance = global.Audio.mock.results[0].value;
    expect(audioInstance.play).toHaveBeenCalled();
  });

  it('falls back to browser speechSynthesis when backend TTS fails', async () => {
    const user = userEvent.setup();

    fetch.mockResolvedValue({ ok: false });

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

    const listenBtn = screen.getByRole('button', { name: /replay narration/i });
    await user.click(listenBtn);

    await waitFor(() => expect(window.speechSynthesis.speak).toHaveBeenCalled());

    const utterance = window.speechSynthesis.speak.mock.calls[0][0];
    expect(utterance.text).toBe(baseInteraction.question);
    expect(utterance.rate).toBe(0.85);
    expect(utterance.lang).toBe('en-US');
  });

  it('replay does not mark the interaction as answered', async () => {
    const user = userEvent.setup();
    const onAnswered = jest.fn();

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
        onAnswered={onAnswered}
      />
    );

    const listenBtn = screen.getByRole('button', { name: /replay narration/i });
    await user.click(listenBtn);
    await user.click(listenBtn);

    expect(onAnswered).not.toHaveBeenCalled();

    // No result feedback should appear just from listening.
    expect(screen.queryByText(/correct/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/incorrect/i)).not.toBeInTheDocument();
  });
});
