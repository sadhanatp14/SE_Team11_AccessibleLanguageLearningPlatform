/**
 * @file adhd_routes.test.js
 * @description Integration tests for ADHD-specific preference routes.
 *
 * Tests cover:
 *   PATCH  /api/preferences/adhd    — Update ADHD pacing and session settings (EPIC 1.5)
 *   DELETE /api/preferences/reset   — Reset preferences to ADHD condition defaults (EPIC 1.3.3 / 1.7)
 *
 * Each test suite registers a fresh ADHD user via the auth router before each
 * test and tears down both User and Preferences collections afterwards, so
 * tests are fully isolated from one another.
 *
 * In-memory MongoDB is provided by the global Jest setup in `backend/__tests__/setup.js`.
 */
const request = require('supertest');          // HTTP assertion library for Express
const express = require('express');            // Express — used to build the test app
const mongoose = require('mongoose');          // Available for ObjectId helpers if needed
const preferencesRouter = require('../preferences'); // Router under test
const authRouter = require('../auth');               // Auth router (register/login for token)
const User = require('../../models/User');           // User model — cleared between tests
const Preferences = require('../../models/Preferences'); // Preferences model — cleared between tests

// Minimal Express app wiring the two routers needed for these tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/preferences', preferencesRouter);

describe('ADHD Specific Preference Routes', () => {
    let authToken; // JWT returned by /api/auth/register, reused across all tests in the suite
    let userId;    // Mongo ObjectId string of the registered test user

    beforeEach(async () => {
        // Register a fresh ADHD user before each test so each test starts with
        // a clean user document and a new preferences record.
        const registerResponse = await request(app).post('/api/auth/register').send({
            name: 'ADHD Test User',
            email: 'adhd_test@example.com',
            password: 'password123',
            learningCondition: 'adhd',
        });

        authToken = registerResponse.body.token;
        userId = registerResponse.body.user.id;
    });

    afterEach(async () => {
        // Remove all users and preferences after each test to prevent state leakage
        await User.deleteMany({});
        await Preferences.deleteMany({});
    });

    /**
     * PATCH /api/preferences/adhd
     * Tests that ADHD-specific preference fields are persisted correctly and
     * that the route accepts valid enum/range values without validation errors.
     */
    describe('PATCH /api/preferences/adhd', () => {
        it('should update ADHD-specific settings (learningPace, sessionDuration)', async () => {
            // All three ADHD fields sent in one request
            const updates = {
                learningPace: 'fast',
                sessionDuration: 25,
                breakReminders: true,
            };

            const response = await request(app)
                .patch('/api/preferences/adhd')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('ADHD settings updated');

            // Read back from DB to confirm the controller actually persisted the values
            const prefs = await Preferences.findOne({ user: userId });
            expect(prefs.learningPace).toBe('fast');
            expect(prefs.sessionDuration).toBe(25);
            expect(prefs.breakReminders).toBe(true);
        });

        it('should validate inputs for ADHD settings', async () => {
            // Sends a valid learningPace enum value and an in-range sessionDuration (5–60 min).
            // Verifies the route accepts partial updates and returns the updated value in the response.
            const updates = {
                learningPace: 'normal',
                sessionDuration: 45 // 45 minutes — within the schema's min:5 max:60 range
            };

            const response = await request(app)
                .patch('/api/preferences/adhd')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.preferences.sessionDuration).toBe(45);
        });
    });

    /**
     * DELETE /api/preferences/reset
     * Verifies that resetting an ADHD user's preferences restores the
     * condition-specific defaults defined in the reset route:
     *   distractionFreeMode: true, learningPace: 'normal', breakReminders: true
     */
    describe('DELETE /api/preferences/reset', () => {
        it('should reset to ADHD defaults for an ADHD user', async () => {
            // Step 1: Modify preferences to non-default values so the reset has visible effect
            await request(app)
                .patch('/api/preferences/adhd')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    learningPace: 'slow',
                    distractionFreeMode: false
                });

            // Step 2: Reset — the route reads user.learningCondition ('adhd') and
            // applies the ADHD-specific defaults defined in the reset handler
            const response = await request(app)
                .delete('/api/preferences/reset')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            // ADHD reset defaults: distractionFreeMode on, normal pace, break reminders on
            expect(response.body.preferences.distractionFreeMode).toBe(true);
            expect(response.body.preferences.learningPace).toBe('normal');
            expect(response.body.preferences.breakReminders).toBe(true);
        });
    });
});
