/**
 * AI Routes
 *
 * Exposes AI-powered and personalization endpoints backed by the Google
 * Gemini generative AI API. Every endpoint gracefully degrades to static
 * mock data when the API key is absent or invalid, so the app remains
 * functional in local / CI environments without a live key.
 *
 * Base path: /api/ai
 *
 * Sections:
 *  1. Gemini setup & helpers
 *  2. Mock-data fallbacks  (getMockData)
 *  3. AI content generation  (POST /generate-questions, POST /story-quiz)
 *  4. ADHD personalization   (GET /adhd/recommendations/*)
 *  5. Autism personalization (GET /autism/recommendations/*)
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── 1. Gemini setup ─────────────────────────────────────────────────────────

// Read the API key from the environment. A placeholder is supplied so that
// instantiating GoogleGenerativeAI doesn't throw immediately; the real
// validity check happens inside isKeyValid() before any API call is made.
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || 'mock-key');

// Allow overriding the Gemini model via GEMINI_MODEL in backend/.env.
// Defaults to 'gemini-2.5-flash' when not set (see resolveModelName).
// Note: available models are not queried at runtime to keep startup fast.
const configuredModel = process.env.GEMINI_MODEL;

// ─── 2. Mock-data fallbacks ───────────────────────────────────────────────────

/**
 * getMockData
 *
 * Returns pre-defined quiz questions used as a fallback whenever the Gemini
 * API is unavailable (missing key, quota exceeded, network error, etc.).
 *
 * @param {string} type  - 'story-quiz' | 'questions'
 * @param {string} topic - Lesson topic (used for topic-specific questions)
 * @returns {Array}      - Array of quiz question objects
 */
const getMockData = (type, topic) => {
    // 1. Story Quizzes – generic questions about a story's ending and lesson
    if (type === 'story-quiz') {
        return [
            {
                type: 'quiz',
                question: 'How did the story end?',
                options: ['Happy ending', 'Sad ending', 'No ending'],
                correct: 'Happy ending',
                hint: 'Most stories for friends end well!'
            },
            {
                type: 'quiz',
                question: 'What was the main lesson?',
                options: ['To be kind', 'To be angry', 'To run fast'],
                correct: 'To be kind',
                hint: 'Being nice is important.'
            }
        ];
    }

    // 2. Standard lesson quizzes – topic-specific sets where possible
    if (type === 'questions') {
        const lowerTopic = (topic || '').toLowerCase();

        // Greetings lesson mock questions
        if (lowerTopic.includes('greetings')) {
            return [
                {
                    type: 'quiz',
                    question: 'What do you say when you go to sleep?',
                    options: ['Good Morning', 'Good Night', 'Hello'],
                    correct: 'Good Night',
                    hint: 'Say this at bedtime.'
                },
                {
                    type: 'quiz',
                    question: 'How do you greet a friend?',
                    options: ['Walk away', 'Say Hi', 'Sleep'],
                    correct: 'Say Hi',
                    hint: 'Be friendly!'
                },
                {
                    type: 'quiz',
                    question: 'What implies checking on someone?',
                    options: ['How are you?', 'Goodbye', 'Apple'],
                    correct: 'How are you?',
                    hint: 'Asking about their feelings.'
                }
            ];
        // Basic words lesson mock questions
        } else if (lowerTopic.includes('basic words')) {
            return [
                {
                    type: 'quiz',
                    question: 'Which of these is a color?',
                    options: ['Cat', 'Blue', 'Run'],
                    correct: 'Blue',
                    hint: 'Like the sky.'
                },
                {
                    type: 'quiz',
                    question: 'What is the opposite of "Big"?',
                    options: ['Small', 'Huge', 'Tall'],
                    correct: 'Small',
                    hint: 'Tiny like a mouse.'
                },
                {
                    type: 'quiz',
                    question: 'Which word describes water?',
                    options: ['Dry', 'Wet', 'Hard'],
                    correct: 'Wet',
                    hint: 'Like rain.'
                }
            ];
        // Numbers lesson mock questions
        } else if (lowerTopic.includes('numbers')) {
            return [
                {
                    type: 'quiz',
                    question: 'What comes after 3?',
                    options: ['2', '4', '5'],
                    correct: '4',
                    hint: 'One two three...'
                },
                {
                    type: 'quiz',
                    question: 'How many fingers on one hand?',
                    options: ['5', '10', '2'],
                    correct: '5',
                    hint: 'Count your thumb too!'
                },
                {
                    type: 'quiz',
                    question: 'What is 1 + 1?',
                    options: ['11', '2', '3'],
                    correct: '2',
                    hint: 'One and another one.'
                }
            ];
        }
    }

    // 3. Generic fallback for any unrecognised topic
    return [
        {
            type: 'quiz',
            question: `What is related to ${topic}?`,
            options: ['Option A', 'Option B', 'Option C'],
            correct: 'Option A',
            hint: 'This is a sample question.'
        }
    ];
};

// ─── Helper utilities ─────────────────────────────────────────────────────────

/**
 * isKeyValid
 * Returns true only when the supplied key looks like a real API key.
 * Rejects the placeholder strings that developers typically leave in .env
 * files before setting a proper key.
 *
 * @param {string} key
 * @returns {boolean}
 */
const isKeyValid = (key) => {
    return key && key !== 'your_gemini_api_key_here' && key !== 'mock-key' && !key.startsWith('your_');
};

/**
 * normalizeModelName
 * Strips the "models/" prefix that the Gemini API sometimes includes in
 * model names so that both "models/gemini-2.0-flash" and "gemini-2.0-flash"
 * are treated identically.
 *
 * @param {string} name
 * @returns {string}
 */
const normalizeModelName = (name) => {
    if (!name) return '';
    // Accept either "models/gemini-2.0-flash" or "gemini-2.0-flash"
    return name.startsWith('models/') ? name.slice('models/'.length) : name;
};

/**
 * resolveModelName
 * Returns the Gemini model to use for content generation.
 * Reads GEMINI_MODEL from the environment (normalized), and falls back to
 * 'gemini-2.5-flash' when the variable is unset.
 *
 * @returns {string}
 */
const resolveModelName = () => {
    // Default to a modern Flash model; override via GEMINI_MODEL in backend/.env
    return normalizeModelName(configuredModel) || 'gemini-2.5-flash';
};

// ─── 3. AI content generation ────────────────────────────────────────────────

/**
 * POST /api/ai/generate-questions
 *
 * Uses Gemini to produce 3 ADHD-friendly multiple-choice quiz questions for
 * a given lesson topic. Falls back to getMockData if the key is invalid or
 * the API call fails (e.g. quota exceeded, 400 bad request).
 *
 * Body: { topic: string, context?: string }
 */
router.post('/generate-questions', async (req, res) => {
    const { topic, context } = req.body;

    // Return mock data immediately when no valid API key is configured
    if (!isKeyValid(apiKey)) {
        console.warn("GEMINI_API_KEY invalid or not set. Returning mock data.");
        return res.json({ questions: getMockData('questions', topic) });
    }

    try {
        const modelName = resolveModelName();
        const model = genAI.getGenerativeModel({ model: modelName });

        // Build a structured prompt that instructs Gemini to output raw JSON only,
        // which makes the response easier to parse without extra sanitisation steps
        const prompt = `
      Create 3 multiple-choice quiz questions for an ADHD-friendly language learning app.
      Topic: ${topic}.
      Context: ${context || 'General beginners level'}.
      
      Requirements:
      1. Questions should be clear, concise, and engaging.
      2. Provide 3 options for each question.
      3. Clearly mark the correct answer.
      4. Provide a short, helpful hint that guides them without giving the answer away.
      5. Output ONLY valid JSON array with objects in this format:
      [
        {
          "type": "quiz",
          "question": "Question text here",
          "options": ["Option 1", "Option 2", "Option 3"],
          "correct": "Option 1",
          "hint": "Hint text"
        }
      ]
      Do not include markdown formatting.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Strip any accidental markdown code fences before parsing as JSON
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(jsonStr);

        res.json({ questions });
    } catch (error) {
        console.error('Error generating questions (Falling back to mock):', error.message);
        // Graceful degradation: serve mock questions so the UI never breaks
        res.json({ questions: getMockData('questions', topic) });
    }
});

/**
 * POST /api/ai/story-quiz
 *
 * Generates 2 comprehension quiz questions based on a short story passage.
 * Designed for the ADHD learner profile (concise, clear questions).
 * Falls back to getMockData on API failure.
 *
 * Body: { storyText: string }
 */
router.post('/story-quiz', async (req, res) => {
    const { storyText } = req.body;

    // Return mock data immediately when no valid API key is configured
    if (!isKeyValid(apiKey)) {
        console.warn("GEMINI_API_KEY invalid or not set. Returning mock data.");
        return res.json({ questions: getMockData('story-quiz') });
    }

    try {
        // Resolve the model name and create a Gemini model instance
        const modelName = resolveModelName();
        const model = genAI.getGenerativeModel({ model: modelName });

        // Prompt asks for raw JSON only to simplify parsing
        const prompt = `
          Based on the following short story: "${storyText}"
          
          Create 2 simple multiple-choice quiz questions suitable for someone with ADHD.
          Format as JSON array with objects:
          {
            "type": "quiz",
            "question": "...",
            "options": ["...", "...", "..."],
            "correct": "...",
            "hint": "..."
          }
          Return ONLY JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Strip any markdown code fences before parsing
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(jsonStr);

        res.json({ questions });

    } catch (error) {
        console.error('Error generating story quiz (Falling back to mock):', error.message);
        // Graceful degradation: serve mock questions so the UI never breaks
        res.json({ questions: getMockData('story-quiz') });
    }
});

// ─── 4. ADHD personalization endpoints ───────────────────────────────────────
// These endpoints serve recommendation and motivational data tailored to
// learners with ADHD. Currently backed by static mock data; can be wired to
// a real recommendation engine in future iterations.

/**
 * GET /api/ai/adhd/recommendations/next
 * Returns a randomly selected next-lesson recommendation for the ADHD learner.
 */
router.get('/adhd/recommendations/next', async (req, res) => {
    try {
        const { user } = req;
        
        // Mock data for next lesson recommendation
        const nextLessons = ['Greetings', 'Numbers 1-10', 'Common Objects', 'Food Words', 'Family Members'];
        const randomLesson = nextLessons[Math.floor(Math.random() * nextLessons.length)];
        
        res.json({
            success: true,
            recommendation: {
                lessonTitle: randomLesson,
                message: `Let's learn about "${randomLesson}"! This lesson will help you build your vocabulary.`,
                difficulty: 'Beginner'
            }
        });
    } catch (error) {
        console.error('Error fetching next recommendation:', error.message);
        res.json({
            success: false,
            message: 'Could not fetch recommendation'
        });
    }
});

/**
 * GET /api/ai/adhd/recommendations/learning-path
 * Returns a mock 5-step learning path and the learner's current progress
 * through it (completed count, total, and percentage).
 */
router.get('/adhd/recommendations/learning-path', async (req, res) => {
    try {
        const { user } = req;
        
        // Mock learning path data
        const learningPath = [
            'Start with Greetings',
            'Learn Basic Numbers',
            'Practice Common Objects',
            'Explore Food Vocabulary',
            'Master Family Words'
        ];
        
        res.json({
            success: true,
            learningPath: learningPath,
            progress: {
                completed: 2,
                total: 5,
                percentage: 40
            }
        });
    } catch (error) {
        console.error('Error fetching learning path:', error.message);
        res.json({
            success: false,
            message: 'Could not fetch learning path'
        });
    }
});

/**
 * GET /api/ai/adhd/recommendations/motivation
 * Returns a randomly selected motivational message tailored for ADHD learners.
 * Messages are upbeat and action-oriented to support focus and engagement.
 */
router.get('/adhd/recommendations/motivation', async (req, res) => {
    try {
        const { user } = req;
        
        // Pool of ADHD-friendly motivational messages (energetic, positive tone)
        const messages = [
            'Great job! You\'re making excellent progress! 🌟',
            'Keep up the amazing work! Every lesson brings you closer to fluency. 💪',
            'You\'re doing fantastic! Your dedication will pay off! 🎉',
            'Fantastic effort! You\'re learning faster than expected! 🚀',
            'Wonderful progress! Stay focused and keep learning! 📚'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        res.json({
            success: true,
            message: randomMessage,
            type: 'encouragement'
        });
    } catch (error) {
        console.error('Error fetching motivation:', error.message);
        res.json({
            success: false,
            message: 'Could not fetch motivation'
        });
    }
});

// ─── 5. Autism personalization endpoints ─────────────────────────────────────
// Mirrors the ADHD personalization section but with messaging and pacing
// adapted for autism spectrum learners (calm tone, self-paced framing).

/**
 * GET /api/ai/autism/recommendations/next
 * Returns a randomly selected next-lesson recommendation for autism learners.
 * Messaging emphasises self-paced exploration rather than urgency.
 */
router.get('/autism/recommendations/next', async (req, res) => {
    try {
        const { user } = req;
        
        // Mock data for next lesson recommendation
        const nextLessons = ['Greetings', 'Numbers 1-10', 'Common Objects', 'Food Words', 'Family Members'];
        const randomLesson = nextLessons[Math.floor(Math.random() * nextLessons.length)];
        
        res.json({
            success: true,
            recommendation: {
                lessonTitle: randomLesson,
                message: `Explore "${randomLesson}" next. Take your time to learn at your own pace.`,
                difficulty: 'Beginner'
            }
        });
    } catch (error) {
        console.error('Error fetching autism next recommendation:', error.message);
        res.json({
            success: false,
            message: 'Could not fetch recommendation'
        });
    }
});

/**
 * GET /api/ai/autism/recommendations/learning-path
 * Returns the same 5-step learning path structure as the ADHD variant.
 * Separated into its own endpoint to allow independent customisation later.
 */
router.get('/autism/recommendations/learning-path', async (req, res) => {
    try {
        const { user } = req;
        
        // Mock learning path data
        const learningPath = [
            'Start with Greetings',
            'Learn Basic Numbers',
            'Practice Common Objects',
            'Explore Food Vocabulary',
            'Master Family Words'
        ];
        
        res.json({
            success: true,
            learningPath: learningPath,
            progress: {
                completed: 2,
                total: 5,
                percentage: 40
            }
        });
    } catch (error) {
        console.error('Error fetching autism learning path:', error.message);
        res.json({
            success: false,
            message: 'Could not fetch learning path'
        });
    }
});

/**
 * GET /api/ai/autism/recommendations/motivation
 * Returns a randomly selected motivational message tailored for autism learners.
 * Messages use calm, reassuring language and avoid time-pressure framing.
 */
router.get('/autism/recommendations/motivation', async (req, res) => {
    try {
        const { user } = req;
        
        // Pool of autism-friendly motivational messages (calm, reassuring tone)
        const messages = [
            'You\'re doing great! Take breaks when you need them. 🌟',
            'Every step counts. Learn at your own comfortable pace. 💙',
            'You\'re learning well! Keep exploring new words. 📚',
            'Great focus! You\'re building strong language skills. 🎯',
            'Wonderful work! Your progress is meaningful. ✨'
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        res.json({
            success: true,
            message: randomMessage,
            type: 'encouragement'
        });
    } catch (error) {
        console.error('Error fetching autism motivation:', error.message);
        res.json({
            success: false,
            message: 'Could not fetch motivation'
        });
    }
});

module.exports = router;