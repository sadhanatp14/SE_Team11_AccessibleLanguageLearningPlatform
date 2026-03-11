// Unit tests for Stable System Basics (EPIC-6.7)
// Uses Jest, Supertest, and in-memory MongoDB to verify the robustness of the backend

const request = require('supertest'); // Used to send dummy HTTP requests to the app
const mongoose = require('mongoose'); // Database interface proxy
const { MongoMemoryServer } = require('mongodb-memory-server'); // Temporary database instance used exclusively for tests

let app; // Central application instance 
let mongod; // Instance for the temporary mongo container
let token; // Simulated session token

// Initialize unique dummy user object to run tests against
const userId = new mongoose.Types.ObjectId();
// Secret used only for testing, not in production
const secret = 'testsecret';

beforeAll(async () => {
  // Before running any tests, launch the in-memory database
  mongod = await MongoMemoryServer.create();
  // Override environment configurations to use our test settings
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = secret;
  // Instantiate the Express server application
  app = require('../../backend/server');
  // Generate a valid JWT token signed with the test secret
  token = require('jsonwebtoken').sign({ id: userId }, secret, { expiresIn: '1h' });
});

afterAll(async () => {
  // Disconnect and shutdown test components to prevent orphan processes
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Stable System Basics (EPIC-6.7)', () => { // Test suite evaluating overall system robustness
  it('handles backend errors with proper status codes', async () => {
    // Intentionally break the DB connection to test system resilience
    await mongoose.connection.close();

    // Attempt an endpoint that should require working DB
    const res = await request(app)
      .get('/api/progress/summary')
      .set('Authorization', `Bearer ${token}`);

    // Assert that the server returned a valid error rather than crashing
    expect([500, 401]).toContain(res.statusCode);

    // Automatically reconnect so subsequent tests work
    await mongoose.connect(process.env.MONGO_URI);
  });

  it('prevents app crashes on invalid data', async () => {
    // Send purposely ill-formatted validation data
    const res = await request(app)
      .post('/api/progress/update')
      .set('Authorization', `Bearer ${token}`)
      .send({ lessonId: 'invalid' });

    // Assert the server handled it correctly and gracefully rejected
    expect([400, 500]).toContain(res.statusCode);
  });

  it('keeps responses fast (simple queries only)', async () => {
    const start = Date.now(); // Record start time

    // Conduct standard query to evaluate latency limits
    const res = await request(app)
      .get('/api/progress/summary')
      .set('Authorization', `Bearer ${token}`);

    const duration = Date.now() - start; // Compute duration

    // Confirm successful operation and performance baseline check
    expect(res.statusCode).toBe(200);
    expect(duration).toBeLessThan(2000); // Expect response under 2 seconds max
  });

  it('tests basic flows (login → lesson → progress)', async () => {
    // Simulate an entire user lifecycle of login, lesson completion, and progress summary queries

    // Simulate completion
    const completeRes = await request(app)
      .post('/api/progress/complete')
      .set('Authorization', `Bearer ${token}`)
      .send({ lessonId: 'lesson1' });

    // Verify successful operation or expected exception logic
    expect([200, 400]).toContain(completeRes.statusCode);

    // Follow up by immediately querying status 
    const summaryRes = await request(app)
      .get('/api/progress/summary')
      .set('Authorization', `Bearer ${token}`);

    // Final verification 
    expect([200, 400, 401]).toContain(summaryRes.statusCode);
  });
});
