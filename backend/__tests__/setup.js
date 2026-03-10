/**
 * setup.js — Global Jest test setup
 *
 * This file is executed once per Jest worker before any test suite runs.
 * It is referenced via the `globalSetup` / `setupFilesAfterFramework` entry
 * in jest.config.js (or the `jest` field in package.json).
 *
 * Responsibilities:
 *  1. Load test-specific environment variables from backend/.env.test so that
 *     JWT secrets, feature flags, and other config are available to all tests.
 *  2. Spin up an in-memory MongoDB instance (MongoMemoryServer) so tests never
 *     touch the real database and can run offline without any external services.
 *  3. Wipe every collection after each individual test to guarantee isolation —
 *     no test can pollute the state seen by a later test.
 *  4. Tear down the Mongoose connection and the memory server after the full
 *     suite finishes to release OS resources cleanly.
 *  5. Suppress noisy console output (log/debug/info/warn) during test runs
 *     while keeping console.error visible for debugging failing tests.
 */

const mongoose = require('mongoose');
// MongoMemoryServer spins up a real mongod binary in memory — no external DB needed
const { MongoMemoryServer } = require('mongodb-memory-server');
const dotenv = require('dotenv');
const path = require('path');

// ─── 1. Load test environment variables ──────────────────────────────────────
// .env.test can override JWT_SECRET, GEMINI_API_KEY, etc. with safe test values
// so tests never accidentally use production credentials
dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

// Holds the MongoMemoryServer instance so it can be stopped in afterAll
let mongoServer;

// ─── 2. Start in-memory MongoDB before any tests run ─────────────────────────
beforeAll(async () => {
    // Create a fresh in-memory MongoDB instance for this worker process.
    // MongoMemoryServer downloads a mongod binary on first use and caches it.
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect Mongoose to the ephemeral instance; all models share this connection
    await mongoose.connect(mongoUri);
});

// ─── 3. Clear all collections after each individual test ─────────────────────
afterEach(async () => {
    // Iterate over every registered Mongoose collection and delete all documents.
    // This resets state between tests without restarting the server, keeping
    // the suite fast while still ensuring full isolation.
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// ─── 4. Tear down after the full suite finishes ───────────────────────────────
afterAll(async () => {
    // Close the Mongoose connection first, then stop the memory server so the
    // mongod process exits cleanly and its temp files are removed
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// ─── 5. Suppress noisy console output during test runs ───────────────────────
// Replace log/debug/info/warn with Jest mock functions so test output stays
// readable. console.error is intentionally preserved so genuine errors and
// assertion failures remain visible in the terminal.
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    // Keep error for debugging
    error: console.error,
};

