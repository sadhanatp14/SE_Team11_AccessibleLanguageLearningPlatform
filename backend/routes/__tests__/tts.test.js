const request = require('supertest');
const express = require('express');
const { EventEmitter } = require('events');

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const { spawn } = require('child_process');

const createMockProcess = () => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
};

describe('TTS Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    // Require after mocks are set up
    // eslint-disable-next-line global-require
    const ttsRouter = require('../tts');
    app.use('/api/tts', ttsRouter);
  });

  it('returns 400 when text is missing', async () => {
    const response = await request(app)
      .post('/api/tts/speak')
      .send({ speed: 1.0 })
      .expect(400);

    expect(response.body).toEqual({ message: 'Text is required' });
    expect(spawn).not.toHaveBeenCalled();
  });

  it('streams audio/mpeg when python emits audio', async () => {
    const proc = createMockProcess();
    spawn.mockImplementation(() => {
      process.nextTick(() => {
        proc.stdout.emit('data', Buffer.from('FAKE_MP3_DATA'));
        proc.emit('close', 0);
      });
      return proc;
    });

    const response = await request(app)
      .post('/api/tts/speak')
      .send({ text: 'Hello', speed: 0.85 })
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(response.headers['content-type']).toMatch(/audio\/mpeg/);
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when spawn errors before sending audio', async () => {
    const proc = createMockProcess();
    spawn.mockImplementation(() => {
      process.nextTick(() => {
        proc.emit('error', new Error('spawn failed'));
      });
      return proc;
    });

    const response = await request(app)
      .post('/api/tts/speak')
      .send({ text: 'Hello' })
      .expect(500);

    expect(response.body).toEqual({ message: 'TTS service unavailable' });
  });

  it('returns 500 when python exits non-zero without sending audio', async () => {
    const proc = createMockProcess();
    spawn.mockImplementation(() => {
      process.nextTick(() => {
        proc.emit('close', 1);
      });
      return proc;
    });

    const response = await request(app)
      .post('/api/tts/speak')
      .send({ text: 'Hello' })
      .expect(500);

    expect(response.body).toEqual({ message: 'TTS generation failed' });
  });
});
