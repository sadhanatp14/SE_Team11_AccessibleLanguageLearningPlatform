/**
 * @file admin_routes.test.js
 * @description Integration tests for the admin-only routes mounted at /api/admin.
 *
 * Tests cover the three core access-control and data scenarios:
 *   1. Unauthenticated request   → 401
 *   2. Authenticated non-admin   → 403
 *   3. Admin user                → 200 (list all users + fetch user detail with summary)
 *
 * JWT tokens are minted directly with `jsonwebtoken` (bypassing the register
 * flow) so tests control the exact `role` embedded in each token.
 *
 * In-memory MongoDB is provided by the global Jest setup in `backend/__tests__/setup.js`.
 */
const request = require('supertest');                          // HTTP assertion library for Express
const express = require('express');                            // Express — used to build the test app
const mongoose = require('mongoose');                          // Available for ObjectId helpers
const { ObjectId } = require('mongoose').Types;                // ObjectId constructor for seed data
const jwt = require('jsonwebtoken');                           // Direct token minting (bypasses auth route)
const adminRouter = require('../admin');                        // Router under test
const authRouter = require('../auth');                          // Auth router (used for app wiring)
const User = require('../../models/User');                     // User model — seeded and cleared per test
const UserProgress = require('../../models/UserProgress');     // Progress model — seeded for detail test
const UserInteraction = require('../../models/UserInteraction'); // Interaction model — seeded for detail test

// Minimal Express app wiring the two routers needed for these tests
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

beforeAll(() => {
    // Set JWT_SECRET so tokens minted with jwt.sign() are accepted by the protect middleware
    process.env.JWT_SECRET = 'testsecret';
});

afterEach(async () => {
    // Clear all collections after each test to prevent state leakage between assertions
    await User.deleteMany({});
    await UserProgress.deleteMany({});
    await UserInteraction.deleteMany({});
});

/**
 * Admin Routes
 * ------------
 * Verifies the three authentication/authorisation tiers for admin endpoints:
 *   - No token         → 401 Unauthorised
 *   - Non-admin token  → 403 Forbidden
 *   - Admin token      → 200 with correct payload
 */
describe('Admin Routes', () => {
    it('returns 401 when not authenticated', async () => {
        // No Authorization header — the protect middleware should reject with 401
        const res = await request(app).get('/api/admin/users');
        expect(res.statusCode).toBe(401);
    });

    it('returns 403 for authenticated non-admin user', async () => {
        // Create a learner account and sign a JWT for it.
        // The authorize('admin') middleware should reject the request with 403
        // because the user's role is 'learner', not 'admin'.
        const user = await User.create({
            name: 'Learner',
            email: 'learner@example.com',
            password: 'password123',
            learningCondition: 'none',
            role: 'learner',
        });

        // Mint a token directly — id embedded in payload is enough for protect middleware
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        const res = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toBe(403);
    });

    it('allows admin to list users and view details', async () => {
        // Seed an admin and a regular learner user
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

        // Mint an admin JWT — role is embedded in the User document, not the token payload
        const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);

        // --- Part 1: List all users ---
        const listRes = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(Array.isArray(listRes.body.users)).toBe(true);
        // Both the admin and the learner should appear in the list
        expect(listRes.body.users).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: 'Admin', learningCondition: 'none' }),
                expect.objectContaining({ name: 'Normal', learningCondition: 'adhd' }),
            ])
        );

        // --- Part 2: Seed progress and interactions for the learner ---
        // These records are created so the detail endpoint has data to aggregate
        await UserProgress.create({
            userId: new ObjectId(normalUser._id),
            lessonId: new ObjectId(),
            completed: true,
        });
        await UserInteraction.create({
            userId: normalUser._id,
            lessonId: new ObjectId(),
            interactionId: 'int1',
            attempts: 2,
            isCorrect: true,
        });

        // --- Part 3: Fetch the detail view for the learner ---
        const detailRes = await request(app)
            .get(`/api/admin/users/${normalUser._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(detailRes.body.user.name).toBe('Normal');
        expect(detailRes.body.summary).toBeDefined();             // Progress summary should be present
        expect(Array.isArray(detailRes.body.interactions)).toBe(true); // Interaction list should be an array
    });
});
