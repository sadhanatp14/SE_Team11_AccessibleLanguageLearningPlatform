/**
 * auth.test.js — Middleware unit tests
 *
 * Tests the three auth middleware functions exported from `backend/middleware/auth.js`:
 *  - protect               — validates JWT bearer tokens and attaches req.user
 *  - requireParentalApproval — blocks minor users who lack the x-parental-approval header
 *  - authorize             — role-based access control (variadic allowed-roles check)
 *
 * Test approach:
 *  - Uses in-memory MongoDB (configured in jest setup) so real User documents can be
 *    created and looked up without a running server.
 *  - Express request / response objects are replaced with lightweight mock factories
 *    so middleware can be called directly without spinning up an HTTP server.
 */

// jsonwebtoken — used to forge valid, expired, and fake tokens for test scenarios
const jwt = require('jsonwebtoken');
// mongoose — used to generate a fake ObjectId for the non-existent-user test
const mongoose = require('mongoose');
// Subject under test — the three middleware functions
const { protect, requireParentalApproval, authorize } = require('../auth');
// User model — used to create real DB documents that the middleware looks up
const User = require('../../models/User');

/**
 * Minimal Express request mock.
 * @param {object} headers - Request headers map (e.g. { authorization: 'Bearer ...' }).
 * @param {object|null} user  - Pre-populated req.user (used for tests that skip `protect`).
 */
const mockRequest = (headers = {}, user = null) => ({
    headers,
    user,
});

/**
 * Minimal Express response mock.
 * Chains are supported (res.status(x).json(y)) via mockReturnValue(res).
 */
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Shared next() spy — cleared in each beforeEach to prevent cross-test bleed
const mockNext = jest.fn();

describe('Auth Middleware', () => {
    /**
     * protect middleware
     * Verifies the Authorization: Bearer <token> header, decodes the JWT,
     * fetches the matching User, and attaches it to req.user.
     * Rejects with 401/403/404 on any failure.
     */
    describe('protect middleware', () => {
        let testUser;
        let validToken;

        beforeEach(async () => {
            // Create a fresh test user for each case
            testUser = await User.create({
                name: 'Middleware Test User',
                email: 'middleware@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            // Sign a token that is valid for 1 hour using the same secret as the middleware
            validToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            // Reset the shared spy so previous test calls don't bleed
            mockNext.mockClear();
        });

        it('should allow access with valid token', async () => {
            const req = mockRequest({
                authorization: `Bearer ${validToken}`,
            });
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(req.user).toBeDefined();
            expect(req.user._id.toString()).toBe(testUser._id.toString());
            expect(req.user.email).toBe('middleware@example.com');
        });

        it('should reject request without token', async () => {
            const req = mockRequest();
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Not authorized to access this route',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request with invalid token', async () => {
            const req = mockRequest({
                authorization: 'Bearer invalid-token-string',
            });
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request with expired token', async () => {
            // Forge a token with a negative expiry so it is already expired on creation
            const expiredToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, {
                expiresIn: '-1h', // Expired 1 hour ago
            });

            const req = mockRequest({
                authorization: `Bearer ${expiredToken}`,
            });
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request for non-existent user', async () => {
            // Generate a valid-looking token whose payload ID has no matching DB document
            const fakeId = new mongoose.Types.ObjectId();
            const fakeToken = jwt.sign({ id: fakeId }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            const req = mockRequest({
                authorization: `Bearer ${fakeToken}`,
            });
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'User not found',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request for inactive user', async () => {
            // Deactivate the user mid-test to simulate a disabled account
            testUser.isActive = false;
            await testUser.save();

            const req = mockRequest({
                authorization: `Bearer ${validToken}`,
            });
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'Account has been deactivated',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should not include password in user object', async () => {
            const req = mockRequest({
                authorization: `Bearer ${validToken}`,
            });
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(req.user.password).toBeUndefined();
        });

        it('should handle malformed authorization header', async () => {
            const req = mockRequest({
                authorization: 'InvalidFormat',
            });
            const res = mockResponse();

            await protect(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    /**
     * requireParentalApproval middleware
     * Runs after `protect`. Allows the request through when:
     *  (a) the user is not flagged as a minor, OR
     *  (b) the x-parental-approval: true header is present.
     * Otherwise returns 403.
     */
    describe('requireParentalApproval middleware', () => {
        beforeEach(() => {
            mockNext.mockClear();
        });

        it('should allow non-minor users', async () => {
            const req = mockRequest({}, {
                isMinor: false,
                requiresParentalApproval: false,
            });
            const res = mockResponse();

            await requireParentalApproval(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should allow minors with approval header', async () => {
            const req = mockRequest(
                {
                    'x-parental-approval': 'true',
                },
                {
                    isMinor: true,
                    requiresParentalApproval: true,
                }
            );
            const res = mockResponse();

            await requireParentalApproval(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject minors without approval header', async () => {
            const req = mockRequest({}, {
                isMinor: true,
                requiresParentalApproval: true,
            });
            const res = mockResponse();

            await requireParentalApproval(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'This action requires parental approval',
                requiresParentalApproval: true,
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    /**
     * authorize(...roles) middleware factory
     * Returns a middleware that allows the request only when req.user.role
     * is included in the variadic `roles` list.  Otherwise returns 403.
     */
    describe('authorize middleware', () => {
        beforeEach(() => {
            mockNext.mockClear();
        });

        it('should allow user with correct role', () => {
            const middleware = authorize('admin', 'parent');
            const req = mockRequest({}, { role: 'admin' });
            const res = mockResponse();

            middleware(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should reject user with incorrect role', () => {
            const middleware = authorize('admin');
            const req = mockRequest({}, { role: 'learner' });
            const res = mockResponse();

            middleware(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: "User role 'learner' is not authorized to access this route",
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow multiple roles', () => {
            const middleware = authorize('admin', 'parent', 'learner');
            const req = mockRequest({}, { role: 'learner' });
            const res = mockResponse();

            middleware(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });
});
