/**
 * lessons_i18n.test.js
 *
 * Integration tests for the internationalisation (i18n) layer applied to
 * lesson and lesson-section responses.
 *
 * Strategy:
 *  - A minimal in-process Express app mounts the real auth and lessons routers
 *    so the full middleware → controller → i18n pipeline is exercised.
 *  - Lesson and LessonSection documents are created directly via Mongoose
 *    (bypassing the API) to give each test precise control over i18n fields.
 *  - A fresh user is registered in beforeEach to obtain a valid JWT; the
 *    in-memory MongoDB provided by the global Jest setup ensures isolation.
 *
 * Covered scenarios:
 *  1. ?lang=tamil          → lesson title, textContent, and interaction strings
 *                            are replaced by their Tamil i18n equivalents.
 *  2. ?lang=tamil&contentLang=english
 *                          → UI language is Tamil but content (options) stays
 *                            in English; bilingual mode is exercised.
 *  3. ?lang=hindi (sections) → LessonSection title, textContent, and
 *                            interaction feedback are localised to Hindi.
 */

const request = require('supertest');
const express = require('express');

// Routers under test
const authRouter = require('../auth');
const lessonsRouter = require('../lessons');

// Mongoose models used to seed test data directly
const Lesson = require('../../models/Lesson');
const LessonSection = require('../../models/LessonSection');

// ─── Test app setup ───────────────────────────────────────────────────────────
// Mirror the relevant routes from server.js in a self-contained app instance
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/lessons', lessonsRouter);

// ─── Test suite ───────────────────────────────────────────────────────────────
describe('Lessons i18n', () => {
  // JWT from /api/auth/register; reused within the test run
  let authToken;

  // Register a new user before each test to obtain a fresh JWT
  beforeEach(async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Lesson i18n User',
      email: 'lesson-i18n@example.com',
      password: 'password123',
      learningCondition: 'dyslexia',
    });

    authToken = registerResponse.body.token;
  });

  // ── Test 1: Full lesson localisation via ?lang= ───────────────────────────
  it('localizes Lesson title/textContent and interactions using ?lang=', async () => {
    // Seed a lesson with Tamil and Hindi translations for all i18n fields
    const lesson = await Lesson.create({
      title: 'Greetings',
      titleI18n: { tamil: 'வாழ்த்துகள்', hindi: 'अभिवादन' },
      textContent: 'Hello. Hi.',
      textContentI18n: { tamil: 'வணக்கம். ஹாய்.', hindi: 'नमस्ते। हाय।' },
      interactions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'Which means hello?',
          questionI18n: { tamil: 'எது வணக்கம் என்று பொருள்?', hindi: 'कौन सा नमस्ते का अर्थ है?' },
          options: ['Goodbye', 'Hello'],
          // Each element in optionsI18n maps to the option at the same index
          optionsI18n: [
            { tamil: 'பிரியாவிடை', hindi: 'अलविदा' },
            { tamil: 'வணக்கம்', hindi: 'नमस्ते' },
          ],
          correctAnswer: 1,
          feedback: { correct: 'Correct!', incorrect: 'Try again.' },
          feedbackI18n: {
            correct: { tamil: 'சரி!', hindi: 'सही!' },
            incorrect: { tamil: 'மீண்டும் முயற்சிக்கவும்.', hindi: 'फिर से कोशिश करें।' },
          },
          position: 0,
        },
      ],
    });

    // Request the lesson with ?lang=tamil; all i18n fields should be substituted
    const response = await request(app)
      .get(`/api/lessons/${lesson._id}?lang=tamil`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    // Lesson-level fields localised to Tamil
    expect(response.body.lesson.title).toBe('வாழ்த்துகள்');
    expect(response.body.lesson.textContent).toBe('வணக்கம். ஹாய்.');
    // Interaction fields localised to Tamil
    expect(response.body.lesson.interactions[0].question).toBe('எது வணக்கம் என்று பொருள்?');
    expect(response.body.lesson.interactions[0].options).toEqual(['பிரியாவிடை', 'வணக்கம்']);
  });

  // ── Test 2: Bilingual mode — UI in Tamil, content options in English ───────
  it('keeps interaction options in contentLang when provided', async () => {
    // Seed a lesson with Tamil translations only (no Hindi needed for this test)
    const lesson = await Lesson.create({
      title: 'Greetings',
      titleI18n: { tamil: 'வாழ்த்துகள்' },
      textContent: 'Hello. Hi.',
      textContentI18n: { tamil: 'வணக்கம். ஹாய்.' },
      interactions: [
        {
          id: 'q1',
          type: 'multiple_choice',
          question: 'Which means hello?',
          questionI18n: { tamil: 'எது வணக்கம் என்று பொருள்?' },
          options: ['Goodbye', 'Hello'],
          optionsI18n: [
            { tamil: 'பிரியாவிடை' },
            { tamil: 'வணக்கம்' },
          ],
          correctAnswer: 1,
          feedback: { correct: 'Correct!', incorrect: 'Try again.' },
          feedbackI18n: {
            correct: { tamil: 'சரி!' },
            incorrect: { tamil: 'மீண்டும் முயற்சிக்கவும்.' },
          },
          position: 0,
        },
      ],
    });

    // ?lang=tamil localises UI strings; ?contentLang=english keeps option text
    // in English — this simulates the bilingual learning mode
    const response = await request(app)
      .get(`/api/lessons/${lesson._id}?lang=tamil&contentLang=english`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    // Title and body text should be in Tamil (UI language)
    expect(response.body.lesson.title).toBe('வாழ்த்துகள்');
    // textContent uses a mixed bilingual result (Tamil + English interleaved)
    expect(response.body.lesson.textContent).toBe('Hello. ஹாய்.');
    // Question uses Tamil UI language but mixes in English content words
    expect(response.body.lesson.interactions[0].question).toBe('எது Hello என்று பொருள்?');
    // Options remain in English because contentLang=english overrides the option localisation
    expect(response.body.lesson.interactions[0].options).toEqual(['Goodbye', 'Hello']);
  });

  // ── Test 3: LessonSection localisation via ?lang= ─────────────────────────
  it('localizes LessonSection title/textContent and interaction strings using ?lang=', async () => {
    // Parent lesson doesn't need i18n fields for this test
    const lesson = await Lesson.create({ title: 'Test', textContent: 'Test' });

    // Seed one section with Hindi translations for title, textContent, and feedback
    await LessonSection.create({
      lessonId: lesson._id,
      title: 'Part 1',
      titleI18n: { hindi: 'भाग 1' },
      textContent: 'Read this.',
      textContentI18n: { hindi: 'इसे पढ़ें।' },
      order: 0,
      interactions: [
        {
          id: 's1q1',
          type: 'true_false',
          question: 'True or false?',
          questionI18n: { hindi: 'सही या गलत?' },
          correctAnswer: true,
          feedback: { correct: 'Nice', incorrect: 'Nope' },
          feedbackI18n: {
            correct: { hindi: 'अच्छा' },
            incorrect: { hindi: 'नहीं' },
          },
          position: 0,
        },
      ],
    });

    // Fetch sections with ?lang=hindi; all section i18n fields should be substituted
    const response = await request(app)
      .get(`/api/lessons/${lesson._id}/sections?lang=hindi`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    // Section-level fields localised to Hindi
    expect(response.body.sections[0].title).toBe('भाग 1');
    expect(response.body.sections[0].textContent).toBe('इसे पढ़ें।');
    // Section interaction fields localised to Hindi
    expect(response.body.sections[0].interactions[0].question).toBe('सही या गलत?');
    expect(response.body.sections[0].interactions[0].feedback.correct).toBe('अच्छा');
  });
});

