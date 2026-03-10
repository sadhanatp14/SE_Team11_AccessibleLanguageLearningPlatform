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

describe('Preferences Routes', () => {
    let authToken;
    let userId;
    let preferencesId;

    beforeEach(async () => {
        // Register a user and get auth token
        const registerResponse = await request(app).post('/api/auth/register').send({
            name: 'Preferences Test User',
            email: 'preftest@example.com',
            password: 'password123',
            learningCondition: 'dyslexia',
        });

        authToken = registerResponse.body.token;
        userId = registerResponse.body.user.id;

        // Get the preferences ID
        const user = await User.findById(userId);
        preferencesId = user.preferences;
    });

    describe('GET /api/preferences', () => {
        it('should get user preferences with valid token', async () => {
            const response = await request(app)
                .get('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.preferences).toBeDefined();
            expect(response.body.preferences._id).toBe(preferencesId.toString());
            expect(response.body.preferences.user).toBe(userId);
        });

        it('should return dyslexia-specific defaults for dyslexia users', async () => {
            const response = await request(app)
                .get('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.preferences.fontFamily).toBe('opendyslexic');
            expect(response.body.preferences.letterSpacing).toBe('wide');
            expect(response.body.preferences.lineHeight).toBe('relaxed');
        });

        it('should require authentication', async () => {
            const response = await request(app).get('/api/preferences').expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should return 404 if preferences not found', async () => {
            // Delete preferences
            await Preferences.findByIdAndDelete(preferencesId);

            const response = await request(app)
                .get('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Preferences not found');
        });
    });

    describe('PUT /api/preferences', () => {
        it('should update general preferences', async () => {
            const updates = {
                fontSize: 'large',
                contrastTheme: 'high-contrast',
                wordSpacing: 'wide',
            };

            const response = await request(app)
                .put('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Preferences updated successfully');
            expect(response.body.preferences.fontSize).toBe('large');
            expect(response.body.preferences.contrastTheme).toBe('high-contrast');
            expect(response.body.preferences.wordSpacing).toBe('wide');
        });

        it('should update dyslexia-specific preferences', async () => {
            const updates = {
                fontFamily: 'comic-sans',
                letterSpacing: 'extra-wide',
                colorOverlay: 'blue',
            };

            const response = await request(app)
                .put('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.preferences.fontFamily).toBe('comic-sans');
            expect(response.body.preferences.letterSpacing).toBe('extra-wide');
            expect(response.body.preferences.colorOverlay).toBe('blue');
        });

        it('should update ADHD-specific preferences', async () => {
            const updates = {
                learningPace: 'slow',
                sessionDuration: 15,
                breakReminders: false,
            };

            const response = await request(app)
                .put('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.preferences.learningPace).toBe('slow');
            expect(response.body.preferences.sessionDuration).toBe(15);
            expect(response.body.preferences.breakReminders).toBe(false);
        });

        it('should update autism-specific preferences', async () => {
            const updates = {
                distractionFreeMode: true,
                reduceAnimations: true,
                simplifiedLayout: false,
                soundEffects: false,
            };

            const response = await request(app)
                .put('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.preferences.distractionFreeMode).toBe(true);
            expect(response.body.preferences.reduceAnimations).toBe(true);
            expect(response.body.preferences.simplifiedLayout).toBe(false);
            expect(response.body.preferences.soundEffects).toBe(false);
        });

        it('should create preferences if they do not exist', async () => {
            // Delete existing preferences
            await Preferences.findByIdAndDelete(preferencesId);

            const updates = {
                fontSize: 'extra-large',
                contrastTheme: 'dark',
            };

            const response = await request(app)
                .put('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.preferences.fontSize).toBe('extra-large');
            expect(response.body.preferences.contrastTheme).toBe('dark');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .put('/api/preferences')
                .send({ fontSize: 'large' })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should update lastModified timestamp', async () => {
            const prefsBefore = await Preferences.findById(preferencesId);
            const lastModifiedBefore = prefsBefore.lastModified;

            await new Promise((resolve) => setTimeout(resolve, 100));

            await request(app)
                .put('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ fontSize: 'large' })
                .expect(200);

            const prefsAfter = await Preferences.findById(preferencesId);
            expect(prefsAfter.lastModified.getTime()).toBeGreaterThanOrEqual(
                lastModifiedBefore.getTime()
            );
            // Verify the update actually happened
            expect(prefsAfter.fontSize).toBe('large');
        });
    });

    describe('PATCH /api/preferences/accessibility', () => {
        it('should update specific accessibility settings', async () => {
            const updates = {
                fontSize: 'extra-large',
                contrastTheme: 'yellow-black',
                learningPace: 'fast',
                // uiLanguage changes are ignored while bilingual mode is enabled.
                uiLanguage: 'tamil',
                bilingualTextMode: 'english_tamil',
            };

            const response = await request(app)
                .patch('/api/preferences/accessibility')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Accessibility settings updated');
            expect(response.body.preferences.fontSize).toBe('extra-large');
            expect(response.body.preferences.contrastTheme).toBe('yellow-black');
            expect(response.body.preferences.learningPace).toBe('fast');
            expect(response.body.preferences.uiLanguage).toBe('english');
            expect(response.body.preferences.bilingualTextMode).toBe('english_tamil');
        });

        it('should allow updating uiLanguage when bilingual text is off', async () => {
            // First ensure bilingual is off
            await request(app)
                .patch('/api/preferences/accessibility')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ bilingualTextMode: 'off' })
                .expect(200);

            const response = await request(app)
                .patch('/api/preferences/accessibility')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ uiLanguage: 'tamil' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.preferences.bilingualTextMode).toBe('off');
            expect(response.body.preferences.uiLanguage).toBe('tamil');
        });

        it('should only update provided fields', async () => {
            const originalPrefs = await Preferences.findById(preferencesId);

            const updates = {
                fontSize: 'small',
            };

            const response = await request(app)
                .patch('/api/preferences/accessibility')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.preferences.fontSize).toBe('small');
            // Other fields should remain unchanged
            expect(response.body.preferences.contrastTheme).toBe(originalPrefs.contrastTheme);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch('/api/preferences/accessibility')
                .send({ fontSize: 'large' })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PATCH /api/preferences/dyslexia', () => {
        it('should update dyslexia-specific settings', async () => {
            const updates = {
                fontFamily: 'arial',
                letterSpacing: 'normal',
                wordSpacing: 'extra-wide',
                lineHeight: 'loose',
                colorOverlay: 'green',
            };

            const response = await request(app)
                .patch('/api/preferences/dyslexia')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Dyslexia settings updated');
            expect(response.body.preferences.fontFamily).toBe('arial');
            expect(response.body.preferences.letterSpacing).toBe('normal');
            expect(response.body.preferences.wordSpacing).toBe('extra-wide');
            expect(response.body.preferences.lineHeight).toBe('loose');
            expect(response.body.preferences.colorOverlay).toBe('green');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch('/api/preferences/dyslexia')
                .send({ fontFamily: 'arial' })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PATCH /api/preferences/adhd', () => {
        it('should update ADHD-specific settings', async () => {
            const updates = {
                learningPace: 'fast',
                sessionDuration: 30,
                breakReminders: true,
            };

            const response = await request(app)
                .patch('/api/preferences/adhd')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('ADHD settings updated');
            expect(response.body.preferences.learningPace).toBe('fast');
            expect(response.body.preferences.sessionDuration).toBe(30);
            expect(response.body.preferences.breakReminders).toBe(true);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch('/api/preferences/adhd')
                .send({ learningPace: 'slow' })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('PATCH /api/preferences/autism', () => {
        it('should update autism-specific settings', async () => {
            const updates = {
                distractionFreeMode: false,
                reduceAnimations: false,
                simplifiedLayout: true,
                soundEffects: true,
            };

            const response = await request(app)
                .patch('/api/preferences/autism')
                .set('Authorization', `Bearer ${authToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Autism settings updated');
            expect(response.body.preferences.distractionFreeMode).toBe(false);
            expect(response.body.preferences.reduceAnimations).toBe(false);
            expect(response.body.preferences.simplifiedLayout).toBe(true);
            expect(response.body.preferences.soundEffects).toBe(true);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .patch('/api/preferences/autism')
                .send({ distractionFreeMode: true })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/preferences/reset', () => {
        it('should reset preferences to dyslexia defaults', async () => {
            // First, modify preferences
            await request(app)
                .put('/api/preferences')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    fontFamily: 'arial',
                    letterSpacing: 'normal',
                    lineHeight: 'normal',
                });

            // Reset to defaults
            const response = await request(app)
                .delete('/api/preferences/reset')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Preferences reset to defaults');
            expect(response.body.preferences.fontFamily).toBe('opendyslexic');
            expect(response.body.preferences.letterSpacing).toBe('wide');
            expect(response.body.preferences.lineHeight).toBe('relaxed');
        });

        it('should reset to ADHD defaults for ADHD users', async () => {
            // Create ADHD user
            const adhdResponse = await request(app).post('/api/auth/register').send({
                name: 'ADHD User',
                email: 'adhd@example.com',
                password: 'password123',
                learningCondition: 'adhd',
            });

            const adhdToken = adhdResponse.body.token;

            const response = await request(app)
                .delete('/api/preferences/reset')
                .set('Authorization', `Bearer ${adhdToken}`)
                .expect(200);

            expect(response.body.preferences.distractionFreeMode).toBe(true);
            expect(response.body.preferences.learningPace).toBe('normal');
            expect(response.body.preferences.breakReminders).toBe(true);
        });

        it('should reset to autism defaults for autism users', async () => {
            // Create autism user
            const autismResponse = await request(app).post('/api/auth/register').send({
                name: 'Autism User',
                email: 'autism@example.com',
                password: 'password123',
                learningCondition: 'autism',
            });

            const autismToken = autismResponse.body.token;

            const response = await request(app)
                .delete('/api/preferences/reset')
                .set('Authorization', `Bearer ${autismToken}`)
                .expect(200);

            expect(response.body.preferences.distractionFreeMode).toBe(true);
            expect(response.body.preferences.simplifiedLayout).toBe(true);
            expect(response.body.preferences.reduceAnimations).toBe(true);
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .delete('/api/preferences/reset')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
