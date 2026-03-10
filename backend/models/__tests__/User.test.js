const mongoose = require('mongoose');
const User = require('../User');

describe('User Model', () => {
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
            expect(user.password.length).toBeGreaterThan(20); // Bcrypt hashes are long
        });

        it('should not rehash password if not modified', async () => {
            const user = await User.create({
                name: 'Test User',
                email: 'nohash@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            const originalHash = user.password;

            // Update a different field
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

            // Update password
            user.password = 'newPassword456';
            await user.save();

            expect(user.password).not.toBe(originalHash);
            expect(user.password).not.toBe('newPassword456');
        });
    });

    describe('matchPassword Method', () => {
        let user;

        beforeEach(async () => {
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

            // Try to create another user with same email
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
