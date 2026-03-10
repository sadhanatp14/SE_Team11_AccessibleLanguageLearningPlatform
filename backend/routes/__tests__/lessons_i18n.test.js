const request = require('supertest');
const express = require('express');

const authRouter = require('../auth');
const lessonsRouter = require('../lessons');
const Lesson = require('../../models/Lesson');
const LessonSection = require('../../models/LessonSection');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/lessons', lessonsRouter);

describe('Lessons i18n', () => {
  let authToken;

  beforeEach(async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({
      name: 'Lesson i18n User',
      email: 'lesson-i18n@example.com',
      password: 'password123',
      learningCondition: 'dyslexia',
    });

    authToken = registerResponse.body.token;
  });

  it('localizes Lesson title/textContent and interactions using ?lang=', async () => {
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

    const response = await request(app)
      .get(`/api/lessons/${lesson._id}?lang=tamil`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.lesson.title).toBe('வாழ்த்துகள்');
    expect(response.body.lesson.textContent).toBe('வணக்கம். ஹாய்.');
    expect(response.body.lesson.interactions[0].question).toBe('எது வணக்கம் என்று பொருள்?');
    expect(response.body.lesson.interactions[0].options).toEqual(['பிரியாவிடை', 'வணக்கம்']);
  });

  it('keeps interaction options in contentLang when provided', async () => {
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

    const response = await request(app)
      .get(`/api/lessons/${lesson._id}?lang=tamil&contentLang=english`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.lesson.title).toBe('வாழ்த்துகள்');
    expect(response.body.lesson.textContent).toBe('Hello. ஹாய்.');
    expect(response.body.lesson.interactions[0].question).toBe('எது Hello என்று பொருள்?');
    expect(response.body.lesson.interactions[0].options).toEqual(['Goodbye', 'Hello']);
  });

  it('localizes LessonSection title/textContent and interaction strings using ?lang=', async () => {
    const lesson = await Lesson.create({ title: 'Test', textContent: 'Test' });

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

    const response = await request(app)
      .get(`/api/lessons/${lesson._id}/sections?lang=hindi`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.sections[0].title).toBe('भाग 1');
    expect(response.body.sections[0].textContent).toBe('इसे पढ़ें।');
    expect(response.body.sections[0].interactions[0].question).toBe('सही या गलत?');
    expect(response.body.sections[0].interactions[0].feedback.correct).toBe('अच्छा');
  });
});
