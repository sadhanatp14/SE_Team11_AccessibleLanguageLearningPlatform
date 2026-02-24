const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const authRouter = require('../auth');
const User = require('../../models/User');
const Preferences = require('../../models/Preferences');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Authentication Routes', () => {
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

            // admin key tests
            const adminData = {
                name: 'AdminUser',
                email: 'adminkey@example.com',
                password: 'password123',
                learningCondition: 'none',
                role: 'admin',
                adminKey: 'wrong',
            };
            // attempt with wrong key
            const badRes = await request(app).post('/api/auth/register').send(adminData).expect(403);
            expect(badRes.body.success).toBe(false);

            // now set secret and try again
            process.env.ADMIN_REG_SECRET = 'secret123';
            adminData.adminKey = 'secret123';
            const goodRes = await request(app).post('/api/auth/register').send(adminData).expect(201);
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
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already exists');
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
            const adminData = {
                name: 'Admin User',
                email: 'adminrole@example.com',
                password: 'password123',
                learningCondition: 'none',
                role: 'admin',
            };

            const response = await request(app)
                .post('/api/auth/register')
                .send(adminData)
                .expect(201);

            expect(response.body.user.role).toBe('admin');

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

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Create a test user before each login test
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

            // Wait a bit to ensure timestamp difference
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
            // Deactivate the user
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
            // JWT tokens have 3 parts separated by dots
            expect(token.split('.').length).toBe(3);
        });
    });

    describe('GET /api/auth/me', () => {
        let authToken;
        let userId;

        beforeEach(async () => {
            // Register and login to get a token
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

    describe('POST /api/auth/logout', () => {
        let authToken;

        beforeEach(async () => {
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
