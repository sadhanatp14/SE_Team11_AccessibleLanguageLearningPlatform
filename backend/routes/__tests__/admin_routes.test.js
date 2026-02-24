const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const adminRouter = require('../admin');
const authRouter = require('../auth');
const User = require('../../models/User');
const UserProgress = require('../../models/UserProgress');
const UserInteraction = require('../../models/UserInteraction');

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

beforeAll(() => {
    // ensure JWT secret is defined for token generation
    process.env.JWT_SECRET = 'testsecret';
});

afterEach(async () => {
    await User.deleteMany({});
    await UserProgress.deleteMany({});
    await UserInteraction.deleteMany({});
});

describe('Admin Routes', () => {
    it('returns 401 when not authenticated', async () => {
        const res = await request(app).get('/api/admin/users');
        expect(res.statusCode).toBe(401);
    });

    it('returns 403 for authenticated non-admin user', async () => {
        const user = await User.create({
            name: 'Learner',
            email: 'learner@example.com',
            password: 'password123',
            learningCondition: 'none',
            role: 'learner',
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
    });

    it('allows admin to list users and view details', async () => {
        const adminUser = await User.create({
            name: 'Admin',
            email: 'admin@example.com',
            password: 'password123',
            learningCondition: 'none',
            role: 'admin',
        });

        const normalUser = await User.create({
            name: 'Normal',
            email: 'normal@example.com',
            password: 'password123',
            learningCondition: 'adhd',
            role: 'learner',
        });

        const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);

        const listRes = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(Array.isArray(listRes.body.users)).toBe(true);
        expect(listRes.body.users).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'Admin', learningCondition: 'none' }),
                expect.objectContaining({ name: 'Normal', learningCondition: 'adhd' }),
            ])
        );

        // add some progress and interactions for the normal user
        await UserProgress.create({
            userId: normalUser._id,
            lessonId: mongoose.Types.ObjectId(),
            completed: true,
        });
        await UserInteraction.create({
            userId: normalUser._id,
            lessonId: mongoose.Types.ObjectId(),
            interactionId: 'int1',
            attempts: 2,
            isCorrect: true,
        });

        const detailRes = await request(app)
            .get(`/api/admin/users/${normalUser._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(detailRes.body.user.name).toBe('Normal');
        expect(detailRes.body.summary).toBeDefined();
        expect(Array.isArray(detailRes.body.interactions)).toBe(true);
    });
});
