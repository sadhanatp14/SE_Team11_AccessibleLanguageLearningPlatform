/**
 * tts.test.js
 *
 * Unit tests for the POST /api/tts/speak endpoint.
 *
 * Strategy:
 *  - `child_process.spawn` is fully mocked so no Python process is ever spawned
 *    and no real network calls are made. Tests run offline and deterministically.
 *  - `google-tts-api` is NOT mocked here; the Google fallback is suppressed
 *    automatically because NODE_ENV='test' disables it inside isGoogleFallbackEnabled().
 *  - The tts router is re-required inside each beforeEach AFTER the mock is
 *    configured so Jest's module registry picks up the mock correctly.
 *  - A fresh Express app is built before each test to prevent state leaking
 *    between runs.
 *
 * Covered scenarios:
 *  1. Missing `text` field          → 400 with validation error
 *  2. Python emits audio bytes      → 200 audio/mpeg stream
 *  3. spawn emits an error event    → 500 service-unavailable
 *  4. Python exits with non-zero code before any audio → 500 generation-failed
 */

const request = require('supertest');
const express = require('express');
// EventEmitter is used to build fake child-process objects that mimic the real
// stdout / stderr / error / close event interface that tts.js listens to
const { EventEmitter } = require('events');

// ─── Mock child_process.spawn ─────────────────────────────────────────────────
// Replace the real spawn with a Jest mock so no Python process is ever launched.
// Individual tests configure the mock's behaviour via spawn.mockImplementation().
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const { spawn } = require('child_process');

// ─── Mock process factory ─────────────────────────────────────────────────────
/**
 * createMockProcess
 * Creates a minimal fake child-process object that emits the same events as a
 * real spawned process: stdout data, stderr data, process error, and close.
 * Tests fire these events via process.nextTick to simulate async behaviour.
 *
 * @returns {{ stdout: EventEmitter, stderr: EventEmitter } & EventEmitter}
 */
const createMockProcess = () => {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
};

// ─── Test suite ───────────────────────────────────────────────────────────────
describe('TTS Routes', () => {
  // Fresh app instance rebuilt before every test
  let app;

  beforeEach(() => {
    // Reset all mock state so call counts / implementations don't bleed between tests
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Re-require the router AFTER mocks are configured so the module registry
    // returns the version that uses the mocked spawn
    // eslint-disable-next-line global-require
    const ttsRouter = require('../tts');
    app.use('/api/tts', ttsRouter);
  });

  // ── Test 1: Missing text body field ─────────────────────────────────────────
  it('returns 400 when text is missing', async () => {
    // Sending only `speed` (no `text`) should be rejected before spawn is called
    const response = await request(app)
      .post('/api/tts/speak')
      .send({ speed: 1.0 })
      .expect(400);

    expect(response.body).toEqual({ message: 'Text is required' });
    // spawn must never be called when validation fails early
    expect(spawn).not.toHaveBeenCalled();
  });

  // ── Test 2: Successful audio stream ─────────────────────────────────────────
  it('streams audio/mpeg when python emits audio', async () => {
    const proc = createMockProcess();

    // Configure spawn to return our fake process and emit audio data asynchronously.
    // process.nextTick defers the events until after the route handler has attached
    // its stdout listener, mimicking the real async behaviour of a child process.
    spawn.mockImplementation(() => {
      process.nextTick(() => {
        proc.stdout.emit('data', Buffer.from('FAKE_MP3_DATA'));
        proc.emit('close', 0); // exit code 0 = success
      });
      return proc;
    });

    // Use supertest's custom parser to collect the raw binary response body
    // (the default parser would try to JSON-decode audio/mpeg, which fails)
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

    // Response must carry the correct MIME type
    expect(response.headers['content-type']).toMatch(/audio\/mpeg/);
    // Body must be a non-empty binary buffer containing our fake MP3 data
    expect(Buffer.isBuffer(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    // Exactly one spawn call should have been made
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  // ── Test 3: spawn error before any audio is written ─────────────────────────
  it('returns 500 when spawn errors before sending audio', async () => {
    const proc = createMockProcess();

    // Simulate a spawn-level error (e.g. permission denied, unknown executable)
    // that fires before any stdout data is emitted
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

  // ── Test 4: Python exits non-zero without emitting audio ────────────────────
  it('returns 500 when python exits non-zero without sending audio', async () => {
    const proc = createMockProcess();

    // Simulate a Python script that exits with a failure code (e.g. import error,
    // gTTS network failure) without writing any bytes to stdout
    spawn.mockImplementation(() => {
      process.nextTick(() => {
        proc.emit('close', 1); // non-zero exit code
      });
      return proc;
    });

    const response = await request(app)
      .post('/api/tts/speak')
      .send({ text: 'Hello' })
      .expect(500);

    // Different message from Test 3: distinguishes a generation failure from a
    // spawn/executable error so operators can diagnose the root cause
    expect(response.body).toEqual({ message: 'TTS generation failed' });
  });
});

