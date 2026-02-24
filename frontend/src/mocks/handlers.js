import { rest } from 'msw';

// Match both absolute and relative URLs
const handlers = [
    // Registration endpoint
    rest.post('*/api/auth/register', (req, res, ctx) => {
        const { email, password, name } = req.body;

        // Simulate validation errors
        if (!email || !password || !name) {
            return res(
                ctx.status(400),
                ctx.json({
                    success: false,
                    errors: [{ msg: 'Missing required fields' }],
                })
            );
        }

        // Simulate duplicate email
        if (email === 'existing@example.com') {
            return res(
                ctx.status(400),
                ctx.json({
                    success: false,
                    message: 'User already exists with this email',
                })
            );
        }

        // Successful registration
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                message: 'Registration successful',
                token: 'mock-jwt-token',
                user: {
                    id: 'mock-user-id',
                    name,
                    email,
                    learningCondition: req.body.learningCondition,
                    requiresParentalApproval: req.body.isMinor || false,
                    role: req.body.role || 'learner',
                },
            })
        );
    }),

    // Login endpoint
    rest.post('*/api/auth/login', (req, res, ctx) => {
        const { email, password } = req.body;

        // Simulate invalid credentials
        if (email !== 'test@example.com' || password !== 'password123') {
            return res(
                ctx.status(401),
                ctx.json({
                    success: false,
                    message: 'Invalid credentials',
                    error: 'Invalid credentials',
                })
            );
        }

        // Successful login
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                message: 'Login successful',
                token: 'mock-jwt-token',
                user: {
                    id: 'mock-user-id',
                    name: 'Test User',
                    email,
                    learningCondition: 'dyslexia',
                    preferences: {
                        fontSize: 'medium',
                        fontFamily: 'opendyslexic',
                    },
                },
            })
        );
    }),

    // Get current user
    rest.get('*/api/auth/me', (req, res, ctx) => {
        const authHeader = req.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res(
                ctx.status(401),
                ctx.json({
                    success: false,
                    message: 'Not authorized to access this route',
                })
            );
        }

        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                user: {
                    id: 'mock-user-id',
                    name: 'Test User',
                    email: 'test@example.com',
                    learningCondition: 'dyslexia',
                    preferences: {
                        fontSize: 'medium',
                        fontFamily: 'opendyslexic',
                    },
                },
            })
        );
    }),

    // Logout endpoint
    rest.post('*/api/auth/logout', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                message: 'Logged out successfully',
            })
        );
    }),

    // Get preferences
    rest.get('*/api/preferences', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                preferences: {
                    fontSize: 'medium',
                    fontFamily: 'opendyslexic',
                    contrastTheme: 'default',
                    letterSpacing: 'wide',
                    learningPace: 'normal',
                },
            })
        );
    }),

    // Update preferences
    rest.put('*/api/preferences', (req, res, ctx) => {
        return res(
            ctx.status(200),
            ctx.json({
                success: true,
                message: 'Preferences updated successfully',
                preferences: {
                    fontSize: 'medium',
                    fontFamily: 'opendyslexic',
                    ...req.body,
                },
            })
        );
    }),
];

export { handlers };
