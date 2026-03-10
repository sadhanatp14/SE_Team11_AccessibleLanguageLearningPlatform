/**
 * User.test.js — Model unit tests
 *
 * Tests the User Mongoose model defined in `backend/models/User.js`.
 *
 * Covers five areas:
 *  1. Password Hashing    — bcrypt pre-save hook: hash on create, skip if unchanged, rehash on change
 *  2. matchPassword       — bcrypt comparison helper: correct/incorrect/case-sensitive checks
 *  3. Schema Validation   — required fields, format rules, enum values, age range, defaults
 *  4. Default Values      — field defaults: requiresParentalApproval, isMinor, completedLessons
 *  5. Password Selection  — schema `select: false` ensures password is never returned by default
 *
 * Test approach:
 *  - Uses in-memory MongoDB (configured in jest setup) for fast, isolated tests.
 *  - All User.create() calls use unique email addresses to avoid unique-index collisions.
 */

// mongoose — available for ObjectId or schema-level assertions if needed
const mongoose = require('mongoose');
// Subject under test — the User Mongoose model
const User = require('../User');

/** Top-level suite wrapping all User model test groups. */
describe('User Model', () => {
    /**
     * Password Hashing
     * Verifies the Mongoose pre-save hook that bcrypt-hashes the password field.
     *  - On create: the stored value must differ from the plain-text input.
     *  - On unrelated field save: the hash must remain identical (no unnecessary rehash).
     *  - On password change: a new hash must be produced and must not equal the plain text.
     */
    describe('Password Hashing', () => {
        it('should hash password on user creation', async () => {
            const userData = {
                name: 'Test User',
                email: 'hash@example.com',
                password: 'plainPassword123',
                learningCondition: 'none',
            };

            const user = await User.create(userData);

            expect(user.password).toBeDefined();
            expect(user.password).not.toBe('plainPassword123');
            // bcrypt hashes are at least 60 characters; > 20 is a pragmatic lower bound
            expect(user.password.length).toBeGreaterThan(20);
        });

        it('should not rehash password if not modified', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'nohash@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            const originalHash = user.password;

            // Save a non-password field — the pre-save hook should skip hashing
            user.name = 'Updated Name';
            await user.save();

            expect(user.password).toBe(originalHash);
        });

        it('should rehash password when modified', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'rehash@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            const originalHash = user.password;

            // Assign a new plain-text password — pre-save hook must produce a fresh hash
            user.password = 'newPassword456';
            await user.save();

            expect(user.password).not.toBe(originalHash);
            expect(user.password).not.toBe('newPassword456');
        });
    });

    /**
     * matchPassword Method
     * Verifies the User instance method that compares a plain-text candidate against
     * the stored bcrypt hash.  bcrypt comparisons are inherently case-sensitive.
     */
    describe('matchPassword Method', () => {
        let user;

        beforeEach(async () => {
            // Create a fresh user before each test so all three cases share the same hash
            user = await User.create({
                name: 'Test User',
                email: 'match@example.com',
                password: 'correctPassword',
                learningCondition: 'none',
            });
        });

        it('should return true for correct password', async () => {
            const isMatch = await user.matchPassword('correctPassword');
            expect(isMatch).toBe(true);
        });

        it('should return false for incorrect password', async () => {
            const isMatch = await user.matchPassword('wrongPassword');
            expect(isMatch).toBe(false);
        });

        it('should be case-sensitive', async () => {
            const isMatch = await user.matchPassword('CORRECTPASSWORD');
            expect(isMatch).toBe(false);
        });
    });

    /**
     * Schema Validation
     * Confirms that the User schema enforces all field-level constraints:
     *  - Required fields: name, email, password, learningCondition
     *  - Format: email must be a valid address
     *  - Uniqueness: duplicate emails are rejected (MongoDB unique index)
     *  - Enum: learningCondition must be one of ['dyslexia','adhd','autism','none']
     *  - Enum: role must be one of ['learner','parent','admin']
     *  - Range: age must be between 3 and 100 inclusive
     *  - Transform: email is lower-cased; name is trimmed
     *  - Defaults: role defaults to 'learner'; isActive defaults to true
     */
    describe('Schema Validation', () => {
        it('should require name', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                learningCondition: 'none',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should require email', async () => {
            const userData = {
                name: 'Test User',
                password: 'password123',
                learningCondition: 'none',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should require password', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                learningCondition: 'none',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should require learning condition', async () => {
            const userData = {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should validate email format', async () => {
            const userData = {
                name: 'Test User',
                email: 'invalid-email',
                password: 'password123',
                learningCondition: 'none',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should enforce unique email', async () => {
            const userData = {
                name: 'Test User',
                email: 'unique@example.com',
                password: 'password123',
                learningCondition: 'none',
            };

            await User.create(userData);

            // Second create with the same email must throw a MongoDB duplicate-key (E11000) error
            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should validate learning condition enum', async () => {
            const userData = {
                name: 'Test User',
                email: 'enum@example.com',
                password: 'password123',
                learningCondition: 'invalid-condition',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should accept valid learning conditions', async () => {
            // All four allowed enum values must be accepted without throwing
            const conditions = ['dyslexia', 'adhd', 'autism', 'none'];

            for (const condition of conditions) {
                const user = await User.create({
                    name: 'Test User',
                    email: `${condition}@example.com`,
                    password: 'password123',
                    learningCondition: condition,
                });

                expect(user.learningCondition).toBe(condition);
            }
        });

        it('should validate age range', async () => {
            // Ages outside the allowed min:3 / max:100 range must all be rejected
            const invalidAges = [2, 101, -5];

            for (const age of invalidAges) {
                await expect(
                    User.create({
                        name: 'Test User',
                        email: `age${age}@example.com`,
                        password: 'password123',
                        learningCondition: 'none',
                        age,
                    })
                ).rejects.toThrow();
            }
        });

        it('should accept valid ages', async () => {
            // Boundary and mid-range values must all be stored without error
            const validAges = [3, 10, 25, 50, 100];

            for (const age of validAges) {
                const user = await User.create({
                    name: 'Test User',
                    email: `age${age}@example.com`,
                    password: 'password123',
                    learningCondition: 'none',
                    age,
                });

                expect(user.age).toBe(age);
            }
        });

        it('should validate role enum', async () => {
            const userData = {
                name: 'Test User',
                email: 'role@example.com',
                password: 'password123',
                learningCondition: 'none',
                role: 'invalid-role',
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should set default role to learner', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'defaultrole@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            expect(user.role).toBe('learner');
        });

        it('should set default isActive to true', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'active@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            expect(user.isActive).toBe(true);
        });

        it('should convert email to lowercase', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'UPPERCASE@EXAMPLE.COM',
                password: 'password123',
                learningCondition: 'none',
            });

            expect(user.email).toBe('uppercase@example.com');
        });

        it('should trim name', async () => {
            const user = await User.create({
                name: '  Test User  ',
                email: 'trim@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            expect(user.name).toBe('Test User');
        });
    });

    /**
     * Default Values
     * Confirms that fields with schema-level defaults are populated correctly
     * when a new User document is created without explicitly providing those fields.
     */
    describe('Default Values', () => {
        it('should set requiresParentalApproval to false by default', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'default@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            expect(user.requiresParentalApproval).toBe(false);
        });

        it('should set isMinor to false by default', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'minor@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            expect(user.isMinor).toBe(false);
        });

        it('should initialize completedLessons as empty array', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'lessons@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            expect(user.completedLessons).toEqual([]);
        });
    });

    /**
     * Password Selection
     * Verifies the schema's `select: false` on the password field:
     *  - A standard findOne() must NOT include the password in the returned document.
     *  - A findOne() with `.select('+password')` MUST include it.
     * This prevents accidental password leakage in API responses.
     */
    describe('Password Selection', () => {
        it('should not return password by default', async () => {
            await User.create({
                name: 'Test User',
                email: 'select@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            const user = await User.findOne({ email: 'select@example.com' });
            expect(user.password).toBeUndefined();
        });

        it('should return password when explicitly selected', async () => {
            await User.create({
                name: 'Test User',
                email: 'selectpass@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            const user = await User.findOne({ email: 'selectpass@example.com' }).select(
                '+password'
            );
            expect(user.password).toBeDefined();
        });
    });
});
