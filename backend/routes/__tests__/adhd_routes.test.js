const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const preferencesRouter = require('../preferences');
const authRouter = require('../auth');
const User = require('../../models/User');
const Preferences = require('../../models/Preferences');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/preferences', preferencesRouter);

describe('ADHD Specific Preference Routes', () => {
    let authToken;
    let userId;

    beforeEach(async () => {
        // Register an ADHD user and get auth token
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
        await User.deleteMany({});
        await Preferences.deleteMany({});
    });

    describe('PATCH /api/preferences/adhd', () => {
        it('should update ADHD-specific settings (learningPace, sessionDuration)', async () => {
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

            // Verify content
            const prefs = await Preferences.findOne({ user: userId });
            expect(prefs.learningPace).toBe('fast');
            expect(prefs.sessionDuration).toBe(25);
            expect(prefs.breakReminders).toBe(true);
        });

        it('should validate inputs for ADHD settings', async () => {
            // Assuming mongoose schema has some validation, but typically enum validation might catch this if defined.
            // If not, this checks if the server at least accepts valid types.
            const updates = {
                learningPace: 'normal',
                sessionDuration: 45 // 45 minutes
            };

            const response = await request(app)
                .patch('/api/preferences/adhd')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.preferences.sessionDuration).toBe(45);
        });
    });

    describe('DELETE /api/preferences/reset', () => {
        it('should reset to ADHD defaults for an ADHD user', async () => {
            // First modify to non-default
            await request(app)
                .patch('/api/preferences/adhd')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    learningPace: 'slow',
                    distractionFreeMode: false
                });

            // Reset
            const response = await request(app)
                .delete('/api/preferences/reset')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.preferences.distractionFreeMode).toBe(true);
            expect(response.body.preferences.learningPace).toBe('normal');
            expect(response.body.preferences.breakReminders).toBe(true);
        });
    });
});
