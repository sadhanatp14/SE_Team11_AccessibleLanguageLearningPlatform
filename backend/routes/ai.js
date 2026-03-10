const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
// Use a placeholder if missing to prevent immediate crash on listener, but validate before call
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || 'mock-key');

// Allow selecting a specific Gemini model via env.
// Note: we do not attempt to list available models at runtime.
// Set GEMINI_MODEL in backend/.env to a model your key can access.
const configuredModel = process.env.GEMINI_MODEL;

// Helper to generate mock data to ensure app functionality when AI fails
const getMockData = (type, topic) => {
    // 1. Story Quizzes (fallback if AI fails)
    if (type === 'story-quiz') {
        // We can try to guess the story based on content if passed, or just be generic but relevant
        // Since we don't pass content into this helper nicely, let's assume standard stories
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

    // 2. Lesson Quizzes (Standard Lessons)
    if (type === 'questions') {
        const lowerTopic = (topic || '').toLowerCase();

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

    // Default Fallback
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

// Middleware-like check for valid key
const isKeyValid = (key) => {
    return key && key !== 'your_gemini_api_key_here' && key !== 'mock-key' && !key.startsWith('your_');
};

const normalizeModelName = (name) => {
    if (!name) return '';
    // Accept either "models/gemini-2.0-flash" or "gemini-2.0-flash"
    return name.startsWith('models/') ? name.slice('models/'.length) : name;
};

const resolveModelName = () => {
    // Default to a modern Flash model; override via GEMINI_MODEL in backend/.env
    return normalizeModelName(configuredModel) || 'gemini-2.5-flash';
};

router.post('/generate-questions', async (req, res) => {
    const { topic, context } = req.body;

    // 1. Immediate fallback if key is obviously invalid
    if (!isKeyValid(apiKey)) {
        console.warn("GEMINI_API_KEY invalid or not set. Returning mock data.");
        return res.json({ questions: getMockData('questions', topic) });
    }

    try {
        const modelName = resolveModelName();
        const model = genAI.getGenerativeModel({ model: modelName });

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
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(jsonStr);

        res.json({ questions });
    } catch (error) {
        console.error('Error generating questions (Falling back to mock):', error.message);
        // 2. Fallback on API failure (e.g., quota exceeded, 400 bad request)
        res.json({ questions: getMockData('questions', topic) });
    }
});

router.post('/story-quiz', async (req, res) => {
    const { storyText } = req.body;

    if (!isKeyValid(apiKey)) {
        console.warn("GEMINI_API_KEY invalid or not set. Returning mock data.");
        return res.json({ questions: getMockData('story-quiz') });
    }

    try {
                const modelName = resolveModelName();
                const model = genAI.getGenerativeModel({ model: modelName });
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
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(jsonStr);

        res.json({ questions });

    } catch (error) {
        console.error('Error generating story quiz (Falling back to mock):', error.message);
        res.json({ questions: getMockData('story-quiz') });
    }
});

// ADHD Personalization Endpoints

// GET /adhd/recommendations/next - Next lesson recommendation
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

// GET /adhd/recommendations/learning-path - Personalized learning path
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

// GET /adhd/recommendations/motivation - Motivational feedback
router.get('/adhd/recommendations/motivation', async (req, res) => {
    try {
        const { user } = req;
        
        // Mock motivational messages
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

// Autism Personalization Endpoints

// GET /autism/recommendations/next - Next lesson recommendation for Autism
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

// GET /autism/recommendations/learning-path - Personalized learning path for Autism
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

// GET /autism/recommendations/motivation - Motivational feedback for Autism
router.get('/autism/recommendations/motivation', async (req, res) => {
    try {
        const { user } = req;
        
        // Mock motivational messages tailored for autism learners
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