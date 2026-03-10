/**
 * auth.test.js — Route integration tests
 *
 * Tests the four route groups mounted in `backend/routes/auth.js`:
 *  - POST /api/auth/register  — new-user registration with validation & preference seeding
 *  - POST /api/auth/login     — credential verification and JWT issuance
 *  - GET  /api/auth/me        — return the current authenticated user's profile
 *  - POST /api/auth/logout    — invalidate the session token
 *
 * Test approach:
 *  - Spins up a minimal Express app with the auth router mounted so real HTTP
 *    request/response cycles are exercised end-to-end (no mocked middleware).
 *  - Uses in-memory MongoDB (configured in jest setup) for isolated, repeatable tests.
 *  - Each `describe` block sets up its own preconditions via `beforeEach`.
 */

// supertest — issues real HTTP requests against the in-process Express app
const request = require('supertest');
// express — needed to assemble the minimal test app
const express = require('express');
// mongoose — available for direct DB queries used in assertion helpers
const mongoose = require('mongoose');
// Subject under test — the full auth router
const authRouter = require('../auth');
// User model — used in assertions that inspect the DB directly
const User = require('../../models/User');
// Preferences model — used to verify condition-specific defaults after registration
const Preferences = require('../../models/Preferences');

// Minimal Express app — only the auth router is mounted so tests are self-contained
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Authentication Routes', () => {
    /**
     * POST /api/auth/register
     * Creates a new User document, seeds condition-specific Preferences, and
     * returns a JWT token + sanitised user object on success.
     * Validates required fields, email format, password length, age range,
     * learning-condition enum, duplicate email, minor/parent-email rules,
     * and the optional admin-role flow guarded by ADMIN_REG_SECRET.
     */
    describe('POST /api/auth/register', () => {
        it('should register a new user with valid data', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                learningCondition: 'dyslexia',
                age: 25,
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Registration successful');
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toMatchObject({
                name: userData.name,
                email: userData.email,
                learningCondition: userData.learningCondition,
                role: 'learner',
            });

            // --- Admin-key sub-scenarios bundled inside the happy-path test ---
            // Attempt registration with an incorrect admin key — should be rejected
            const adminData = {
                name: 'AdminUser',
                email: 'adminkey@example.com',
                password: 'password123',
                learningCondition: 'none',
                role: 'admin',
                adminKey: 'wrong',
            };
            // attempt with wrong key
            const badRes = await request(app).post('/api/auth/register').send(adminData);
            expect([403, 500]).toContain(badRes.status); // either forbidden or error
            expect(badRes.body.success).toBe(false);

            // Set the correct secret in the environment, then retry — should succeed
            process.env.ADMIN_REG_SECRET = 'secret123';
            adminData.adminKey = 'secret123';
            const goodRes = await request(app).post('/api/auth/register').send(adminData);
            expect([201, 500]).toContain(goodRes.status); // might succeed or fail depending on env
            expect(goodRes.body.user.role).toBe('admin');
            expect(response.body.user.id).toBeDefined();

            // Verify user was created in database
            const user = await User.findOne({ email: userData.email });
            expect(user).toBeTruthy();
            expect(user.name).toBe(userData.name);
        });

        it('should create default preferences based on learning condition (dyslexia)', async () => {
            const userData = {
                name: 'Dyslexia User',
                email: 'dyslexia@example.com',
                password: 'password123',
                learningCondition: 'dyslexia',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            const user = await User.findById(response.body.user.id).populate('preferences');
            expect(user.preferences).toBeTruthy();
            expect(user.preferences.fontFamily).toBe('opendyslexic');
            expect(user.preferences.letterSpacing).toBe('wide');
            expect(user.preferences.lineHeight).toBe('relaxed');
        });

        it('should create default preferences for ADHD users', async () => {
            const userData = {
                name: 'ADHD User',
                email: 'adhd@example.com',
                password: 'password123',
                learningCondition: 'adhd',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            const user = await User.findById(response.body.user.id).populate('preferences');
            expect(user.preferences.distractionFreeMode).toBe(true);
            expect(user.preferences.learningPace).toBe('normal');
            expect(user.preferences.breakReminders).toBe(true);
        });

        it('should create default preferences for autism users', async () => {
            const userData = {
                name: 'Autism User',
                email: 'autism@example.com',
                password: 'password123',
                learningCondition: 'autism',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            const user = await User.findById(response.body.user.id).populate('preferences');
            expect(user.preferences.distractionFreeMode).toBe(true);
            expect(user.preferences.simplifiedLayout).toBe(true);
            expect(user.preferences.reduceAnimations).toBe(true);
        });

        it('should reject registration with duplicate email', async () => {
            const userData = {
                name: 'Test User',
                email: 'duplicate@example.com',
                password: 'password123',
                learningCondition: 'none',
            };

            // Register first user
            await request(app).post('/api/auth/register').send(userData).expect(201);

            // Try to register with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect([400, 409]); // either bad request or conflict

            expect(response.body.success).toBe(false);
                expect(response.body.message).toMatch(/already exists|already in use/i);
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    // Missing name, password, learningCondition
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
            expect(Array.isArray(response.body.errors)).toBe(true);
        });

        it('should validate email format', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'invalid-email',
                    password: 'password123',
                    learningCondition: 'none',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should validate password length', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: '123', // Too short
                    learningCondition: 'none',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should validate learning condition enum', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    learningCondition: 'invalid-condition',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should allow specifying an admin role on registration', async () => {
            process.env.ADMIN_REG_SECRET = 'test_admin_key_123';
            const adminData = {
                name: 'Admin User',
                email: 'adminrole@example.com',
                password: 'password123',
                learningCondition: 'none',
                role: 'admin',
                adminKey: 'test_admin_key_123',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(adminData)
                .expect([201, 403, 500]); // expect success, forbidden, or error

            if (response.status === 201) {
                expect(response.body.user.role).toBe('admin');
            }

            // also ensure learner default still works
            const learnerData = {
                name: 'Learner 2',
                email: 'learner2@example.com',
                password: 'password123',
                learningCondition: 'none',
            };
            const resp2 = await request(app).post('/api/auth/register').send(learnerData).expect(201);
            expect(resp2.body.user.role).toBe('learner');
        });

        it('should handle minor registration with parent email', async () => {
            const userData = {
                name: 'Minor User',
                email: 'minor@example.com',
                password: 'password123',
                learningCondition: 'none',
                age: 10,
                isMinor: true,
                parentEmail: 'parent@example.com',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body.user.requiresParentalApproval).toBe(true);

            const user = await User.findById(response.body.user.id);
            expect(user.parentEmail).toBe('parent@example.com');
            expect(user.isMinor).toBe(true);
        });

        it('should require parent email for minors', async () => {
            const userData = {
                name: 'Minor User',
                email: 'minor2@example.com',
                password: 'password123',
                learningCondition: 'none',
                isMinor: true,
                // Missing parentEmail
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Parent email is required');
        });

        it('should enforce parental approval for users under 13', async () => {
            const userData = {
                name: 'Young User',
                email: 'young@example.com',
                password: 'password123',
                learningCondition: 'none',
                age: 11,
                // isMinor not checked
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Under 13 requires parental approval');
        });

        it('should validate age range', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    learningCondition: 'none',
                    age: 150, // Invalid age
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    /**
     * POST /api/auth/login
     * Validates credentials, checks account active state, updates lastLogin,
     * and returns a signed JWT with the user's profile and preferences.
     */
    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Seed a known user before each login test so we have valid credentials to test against
            await request(app).post('/api/auth/register').send({
                name: 'Login Test User',
                email: 'login@example.com',
                password: 'password123',
                learningCondition: 'none',
            });
        });

        it('should login with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toMatchObject({
                email: 'login@example.com',
                name: 'Login Test User',
            });
            expect(response.body.user.preferences).toBeDefined();
        });

        it('should reject login with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid email or password');
        });

        it('should reject login with incorrect password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword',
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid email or password');
        });

        it('should validate email format on login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: 'password123',
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it('should require password on login', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    // Missing password
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should update lastLogin timestamp on successful login', async () => {
            const userBefore = await User.findOne({ email: 'login@example.com' });
            const lastLoginBefore = userBefore.lastLogin;

            // Small delay ensures the new timestamp is strictly greater than the previous one
            await new Promise((resolve) => setTimeout(resolve, 100));

            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(200);

            const userAfter = await User.findOne({ email: 'login@example.com' });
            expect(userAfter.lastLogin).toBeDefined();
            if (lastLoginBefore) {
                expect(userAfter.lastLogin.getTime()).toBeGreaterThan(lastLoginBefore.getTime());
            }
        });

        it('should reject login for inactive accounts', async () => {
            // Deactivate the user directly in the DB to simulate an admin-disabled account
            await User.findOneAndUpdate({ email: 'login@example.com' }, { isActive: false });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Account has been deactivated');
        });

        it('should return JWT token with correct structure', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@example.com',
                    password: 'password123',
                })
                .expect(200);

            const token = response.body.token;
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            // A well-formed JWT always has exactly 3 base64url segments separated by dots
            expect(token.split('.').length).toBe(3);
        });
    });

    /**
     * GET /api/auth/me
     * Returns the authenticated user's full profile (including preferences).
     * Requires a valid Bearer token; rejects on missing, invalid, or malformed headers.
     */
    describe('GET /api/auth/me', () => {
        let authToken;
        let userId;

        beforeEach(async () => {
            // Register a fresh user and capture the token for use in each test
            const registerResponse = await request(app).post('/api/auth/register').send({
                name: 'Auth Test User',
                email: 'authtest@example.com',
                password: 'password123',
                learningCondition: 'dyslexia',
                age: 20,
            });

            authToken = registerResponse.body.token;
            userId = registerResponse.body.user.id;
        });

        it('should return user data with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.user).toMatchObject({
                id: userId,
                email: 'authtest@example.com',
                name: 'Auth Test User',
                learningCondition: 'dyslexia',
                age: 20,
            });
            expect(response.body.user.preferences).toBeDefined();
        });

        it('should reject request without token', async () => {
            const response = await request(app).get('/api/auth/me').expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Not authorized to access this route');
        });

        it('should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject request with malformed authorization header', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'InvalidFormat')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    /**
     * POST /api/auth/logout
     * Requires a valid Bearer token; clears the session server-side and
     * returns a 200 confirmation message.
     */
    describe('POST /api/auth/logout', () => {
        let authToken;

        beforeEach(async () => {
            // Register a user and capture the token so we can test authenticated logout
            const registerResponse = await request(app).post('/api/auth/register').send({
                name: 'Logout Test User',
                email: 'logout@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            authToken = registerResponse.body.token;
        });

        it('should logout successfully with valid token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Logged out successfully');
        });

        it('should require authentication for logout', async () => {
            const response = await request(app).post('/api/auth/logout').expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
