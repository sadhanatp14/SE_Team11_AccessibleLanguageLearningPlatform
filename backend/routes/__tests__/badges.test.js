/**
 * badges.test.js
 *
 * Integration tests for the GET /api/badges endpoint.
 *
 * Strategy:
 *  - A minimal Express app is assembled in-process using the real auth, users,
 *    and badges routers so tests exercise the full middleware/controller stack
 *    without needing a running server.
 *  - Each test registers a fresh user via /api/auth/register and uses the
 *    returned JWT for authenticated requests, ensuring test isolation.
 *  - The in-memory MongoDB provided by the global Jest setup (setup.js) is
 *    used so no external database is required.
 *
 * Covered scenarios:
 *  1. Unauthenticated request → 401
 *  2. Authenticated request   → 200 with a valid badge catalogue
 *  3. Badge earned state after completing a lesson
 */

const request = require('supertest');
const express = require('express');

// Routers under test
const authRouter = require('../auth');
const usersRouter = require('../users');
const badgesRouter = require('../badges');

// ─── Test app setup ───────────────────────────────────────────────────────────
// Build a self-contained Express app that mirrors the relevant portion of
// the production server.js mount configuration.
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/badges', badgesRouter);

// ─── Test suite ───────────────────────────────────────────────────────────────
describe('Badges Routes', () => {
  // JWT obtained from /api/auth/register; reused across tests in the same run
  let authToken;

  // Register a fresh user before each test so badge state starts clean
  beforeEach(async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Badges Test User',
      email: 'badgestest@example.com',
      password: 'password123',
      learningCondition: 'adhd',
    });

    authToken = registerResponse.body.token;
  });

  // ── Test 1: Authentication guard ────────────────────────────────────────────
  it('should require authentication', async () => {
    // A request with no Authorization header must be rejected with 401
    const res = await request(app).get('/api/badges').expect(401);
    expect(res.body.success).toBe(false);
  });

  // ── Test 2: Badge catalogue structure ───────────────────────────────────────
  it('should return computed badges list', async () => {
    const res = await request(app)
      .get('/api/badges')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Response must include a non-empty badges array
    expect(Array.isArray(res.body.badges)).toBe(true);
    expect(res.body.badges.length).toBeGreaterThan(0);

    // Every badge object must expose the required fields consumed by the frontend
    const first = res.body.badges[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('earned');
    expect(first).toHaveProperty('progress');

    // Verify the current badge catalogue: 'ten_lessons' should not exist,
    // but 'halfway' and 'practice_starter' must be present
    const badgeIds = res.body.badges.map((b) => b.id);
    expect(badgeIds).not.toContain('ten_lessons');
    expect(badgeIds).toContain('halfway');
    expect(badgeIds).toContain('practice_starter');
  });

  // ── Test 3: Earned state after lesson completion ─────────────────────────────
  it('should mark First Lesson badge earned after completing one lesson key', async () => {
    // Complete a single lesson to trigger the 'first_lesson' badge threshold (target: 1)
    await request(app)
      .post('/api/users/complete-lesson')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ lessonKey: 'adhd-lesson-1' })
      .expect(200);

    // Re-fetch badges and assert the badge is now marked as earned
    const res = await request(app)
      .get('/api/badges')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const badge = res.body.badges.find((b) => b.id === 'first_lesson');
    expect(badge).toBeTruthy();
    expect(badge.earned).toBe(true);
  });
});

