// Unit tests for progress-related APIs (EPIC-6)
// Uses Jest, Supertest, mock JWT, and in-memory MongoDB

const request = require('supertest'); // Supertest is used for testing HTTP endpoints
const mongoose = require('mongoose'); // Mongoose is used for MongoDB object modeling
const jwt = require('jsonwebtoken'); // JSON Web Token for authentication
const { MongoMemoryServer } = require('mongodb-memory-server'); // In-memory MongoDB server for testing without a real database

let app; // The Express application instance
let mongod; // The in-memory MongoDB instance
let token; // The JWT token used for authenticating requests

// Mock user and JWT configurations
const userId = new mongoose.Types.ObjectId(); // Generate a random MongoDB ObjectId for the mock user
const mockUser = { _id: userId, email: 'test@example.com' };
const secret = 'testsecret'; // A dummy secret key for signing the JWT

describe('EPIC-6 Progress API', () => { // Main test suite for the Progress API
  beforeAll(async () => {
    // Setup the in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri(); // Set the URI so the app connects to the in-memory DB
    process.env.JWT_SECRET = secret; // Set the JWT secret for the app
    app = require('../../backend/server'); // Dynamically require the server after setting env vars
    // Sign a token for the mock user to use in authenticated requests
    token = jwt.sign({ id: userId }, secret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Cleanup the database connection and the in-memory server after all tests
    await mongoose.disconnect();
    await mongod.stop();
  });

  describe('POST /api/progress/complete', () => { // Test suite for saving lesson progress
    it('saves lesson progress and returns 200', async () => {
      // Simulate a valid authenticated request to complete a lesson
      const res = await request(app)
        .post('/api/progress/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ lessonId: 'lesson1' });
      expect(res.statusCode).toBe(200); // Expect a successful response code
      expect(res.body).toHaveProperty('success', true); // Expect a success flag in the response
    });

    it('returns 400 on missing lessonId', async () => {
      // Simulate a bad request with missing required fields
      const res = await request(app)
        .post('/api/progress/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({}); // Empty payload
      expect(res.statusCode).toBe(400); // Expect a bad request error code
    });

    it('returns 401 if not authenticated', async () => {
      // Simulate a request without an authorization header
      const res = await request(app)
        .post('/api/progress/complete')
        .send({ lessonId: 'lesson1' });
      expect(res.statusCode).toBe(401); // Expect an unauthorized error code
    });
  });

  describe('GET /api/progress/summary', () => { // Test suite for retrieving progress summary
    it('returns progress summary with correct fields', async () => {
      // Complete a lesson first so that there is data to retrieve
      await request(app)
        .post('/api/progress/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ lessonId: 'lesson2' });

      // Request the summary
      const res = await request(app)
        .get('/api/progress/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200); // Expect a success response
      // Assert that the response contains all required summary fields
      expect(res.body).toHaveProperty('totalLessons');
      expect(res.body).toHaveProperty('completedLessons');
      expect(res.body).toHaveProperty('remainingLessons');
      expect(res.body).toHaveProperty('percentage');
    });

    it('handles empty lesson list safely', async () => {
      // Simulate empty lessons (mock or clear DB as needed)
      // ...implementation depends on model structure
      // For now, just check it doesn't crash when requesting the summary
      const res = await request(app)
        .get('/api/progress/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200); // Should still return 200 OK
      expect(res.body).toHaveProperty('totalLessons'); // Should at least calculate total lessons safely
    });
  });

  describe('Error handling', () => { // Test suite for general error handling gracefully
    it('returns 500 on database failure', async () => {
      // Simulate DB failure by intentionally closing the connection
      await mongoose.connection.close();
      const res = await request(app)
        .get('/api/progress/summary')
        .set('Authorization', `Bearer ${token}`); // Request an endpoint that requires DB access
      expect(res.statusCode).toBe(500); // Expect an internal server error due to disconnected DB

      // Reconnect for other tests that might run after this
      await mongoose.connect(process.env.MONGO_URI);
    });

    it('never crashes server on error', async () => {
      // Simulate error and ensure server responds with an appropriate HTTP code rather than crashing
      await mongoose.connection.close();
      const res = await request(app)
        .post('/api/progress/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ lessonId: 'lesson3' });
      // The status code should be one of the handled error responses
      expect([500, 401, 400]).toContain(res.statusCode);

      // Restore the mock DB connection just in case
      await mongoose.connect(process.env.MONGO_URI);
    });
  });
});
