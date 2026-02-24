const mongoose = require('mongoose');
const Preferences = require('../Preferences');
const User = require('../User');

describe('Preferences Model', () => {
    let testUser;

    beforeEach(async () => {
        // Create a test user for preferences
        testUser = await User.create({
            name: 'Preferences Test User',
            email: 'prefmodel@example.com',
            password: 'password123',
            learningCondition: 'dyslexia',
        });
    });

    describe('Schema Validation', () => {
        it('should create preferences with valid data', async () => {
            const preferences = await Preferences.create({
                user: testUser._id,
                fontSize: 'large',
                contrastTheme: 'high-contrast',
            });

            expect(preferences).toBeDefined();
            expect(preferences.user.toString()).toBe(testUser._id.toString());
            expect(preferences.fontSize).toBe('large');
            expect(preferences.contrastTheme).toBe('high-contrast');
        });

        it('should require user reference', async () => {
            await expect(
                Preferences.create({
                    fontSize: 'large',
                })
            ).rejects.toThrow();
        });

        it('should enforce unique user constraint', async () => {
            await Preferences.create({
                user: testUser._id,
            });

            // Try to create another preferences for same user
            await expect(
                Preferences.create({
                    user: testUser._id,
                })
            ).rejects.toThrow();
        });

        it('should validate fontSize enum', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    fontSize: 'invalid-size',
                })
            ).rejects.toThrow();
        });

        it('should accept valid fontSize values', async () => {
            const validSizes = ['small', 'medium', 'large', 'extra-large'];

            for (const size of validSizes) {
                const user = await User.create({
                    name: 'Test',
                    email: `size${size}@example.com`,
                    password: 'password123',
                    learningCondition: 'none',
                });

                const prefs = await Preferences.create({
                    user: user._id,
                    fontSize: size,
                });

                expect(prefs.fontSize).toBe(size);
            }
        });

        it('should validate fontFamily enum', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    fontFamily: 'invalid-font',
                })
            ).rejects.toThrow();
        });

        it('should validate contrastTheme enum', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    contrastTheme: 'invalid-theme',
                })
            ).rejects.toThrow();
        });

        it('should validate letterSpacing enum', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    letterSpacing: 'invalid-spacing',
                })
            ).rejects.toThrow();
        });

        it('should validate learningPace enum', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    learningPace: 'invalid-pace',
                })
            ).rejects.toThrow();
        });

        it('should validate sessionDuration range', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    sessionDuration: 3, // Below minimum
                })
            ).rejects.toThrow();

            await expect(
                Preferences.create({
                    user: testUser._id,
                    sessionDuration: 70, // Above maximum
                })
            ).rejects.toThrow();
        });

        it('should accept valid sessionDuration values', async () => {
            const validDurations = [5, 20, 45, 60];

            for (const duration of validDurations) {
                const user = await User.create({
                    name: 'Test',
                    email: `duration${duration}@example.com`,
                    password: 'password123',
                    learningCondition: 'none',
                });

                const prefs = await Preferences.create({
                    user: user._id,
                    sessionDuration: duration,
                });

                expect(prefs.sessionDuration).toBe(duration);
            }
        });

        it('should validate speechRate range', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    speechRate: 0.3, // Below minimum
                })
            ).rejects.toThrow();

            await expect(
                Preferences.create({
                    user: testUser._id,
                    speechRate: 2.5, // Above maximum
                })
            ).rejects.toThrow();
        });

        it('should validate speechPitch range', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    speechPitch: 0.3, // Below minimum
                })
            ).rejects.toThrow();

            await expect(
                Preferences.create({
                    user: testUser._id,
                    speechPitch: 2.5, // Above maximum
                })
            ).rejects.toThrow();
        });

        it('should validate preferredLanguage enum', async () => {
            await expect(
                Preferences.create({
                    user: testUser._id,
                    preferredLanguage: 'invalid-language',
                })
            ).rejects.toThrow();
        });
    });

    describe('Default Values', () => {
        it('should set default fontSize to medium', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.fontSize).toBe('medium');
        });

        it('should set default fontFamily to default', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.fontFamily).toBe('default');
        });

        it('should set default contrastTheme to default', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.contrastTheme).toBe('default');
        });

        it('should set default letterSpacing to normal', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.letterSpacing).toBe('normal');
        });

        it('should set default learningPace to normal', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.learningPace).toBe('normal');
        });

        it('should set default sessionDuration to 20', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.sessionDuration).toBe(20);
        });

        it('should set default breakReminders to true', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.breakReminders).toBe(true);
        });

        it('should set default distractionFreeMode to false', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.distractionFreeMode).toBe(false);
        });

        it('should set default soundEffects to true', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.soundEffects).toBe(true);
        });

        it('should set default enableTextToSpeech to false', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.enableTextToSpeech).toBe(false);
        });

        it('should set default speechRate to 1.0', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.speechRate).toBe(1.0);
        });

        it('should set default preferredLanguage to english', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.preferredLanguage).toBe('english');
        });

        it('should set default uiLanguage to english', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.uiLanguage).toBe('english');
        });

        it('should set default bilingualTextMode to off', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.bilingualTextMode).toBe('off');
        });

        it('should set default showProgressBar to true', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.showProgressBar).toBe(true);
        });
    });

    describe('lastModified Update', () => {
        it('should set lastModified on creation', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.lastModified).toBeDefined();
            expect(prefs.lastModified).toBeInstanceOf(Date);
        });

        it('should update lastModified on save', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
                fontSize: 'medium',
            });

            const originalLastModified = prefs.lastModified;

            // Wait a bit to ensure timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 100));

            prefs.fontSize = 'large';
            await prefs.save();

            expect(prefs.lastModified.getTime()).toBeGreaterThan(
                originalLastModified.getTime()
            );
        });
    });

    describe('Dyslexia-Specific Settings', () => {
        it('should store dyslexia font preferences', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
                fontFamily: 'opendyslexic',
                letterSpacing: 'wide',
                wordSpacing: 'extra-wide',
                lineHeight: 'relaxed',
                colorOverlay: 'blue',
            });

            expect(prefs.fontFamily).toBe('opendyslexic');
            expect(prefs.letterSpacing).toBe('wide');
            expect(prefs.wordSpacing).toBe('extra-wide');
            expect(prefs.lineHeight).toBe('relaxed');
            expect(prefs.colorOverlay).toBe('blue');
        });
    });

    describe('ADHD-Specific Settings', () => {
        it('should store ADHD learning preferences', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
                learningPace: 'slow',
                sessionDuration: 15,
                breakReminders: true,
            });

            expect(prefs.learningPace).toBe('slow');
            expect(prefs.sessionDuration).toBe(15);
            expect(prefs.breakReminders).toBe(true);
        });
    });

    describe('Autism-Specific Settings', () => {
        it('should store autism environment preferences', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
                distractionFreeMode: true,
                reduceAnimations: true,
                simplifiedLayout: true,
                soundEffects: false,
            });

            expect(prefs.distractionFreeMode).toBe(true);
            expect(prefs.reduceAnimations).toBe(true);
            expect(prefs.simplifiedLayout).toBe(true);
            expect(prefs.soundEffects).toBe(false);
        });
    });

    describe('Timestamps', () => {
        it('should have createdAt timestamp', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.createdAt).toBeDefined();
            expect(prefs.createdAt).toBeInstanceOf(Date);
        });

        it('should have updatedAt timestamp', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            expect(prefs.updatedAt).toBeDefined();
            expect(prefs.updatedAt).toBeInstanceOf(Date);
        });

        it('should update updatedAt on modification', async () => {
            const prefs = await Preferences.create({
                user: testUser._id,
            });

            const originalUpdatedAt = prefs.updatedAt;

            await new Promise((resolve) => setTimeout(resolve, 100));

            prefs.fontSize = 'large';
            await prefs.save();

            expect(prefs.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });
    });
});
