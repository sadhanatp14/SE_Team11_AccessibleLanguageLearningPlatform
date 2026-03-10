const request = require('supertest');
const express = require('express');

const authRouter = require('../auth');
const usersRouter = require('../users');
const badgesRouter = require('../badges');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/badges', badgesRouter);

describe('Badges Routes', () => {
  let authToken;

  beforeEach(async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Badges Test User',
      email: 'badgestest@example.com',
      password: 'password123',
      learningCondition: 'adhd',
    });

    authToken = registerResponse.body.token;
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/badges').expect(401);
    expect(res.body.success).toBe(false);
  });

  it('should return computed badges list', async () => {
    const res = await request(app)
      .get('/api/badges')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.badges)).toBe(true);
    expect(res.body.badges.length).toBeGreaterThan(0);

    const first = res.body.badges[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('earned');
    expect(first).toHaveProperty('progress');

    // Badge set expectations
    const badgeIds = res.body.badges.map((b) => b.id);
    expect(badgeIds).not.toContain('ten_lessons');
    expect(badgeIds).toContain('halfway');
    expect(badgeIds).toContain('practice_starter');
  });

  it('should mark First Lesson badge earned after completing one lesson key', async () => {
    await request(app)
      .post('/api/users/complete-lesson')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ lessonKey: 'adhd-lesson-1' })
      .expect(200);

    const res = await request(app)
      .get('/api/badges')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const badge = res.body.badges.find((b) => b.id === 'first_lesson');
    expect(badge).toBeTruthy();
    expect(badge.earned).toBe(true);
  });
});
