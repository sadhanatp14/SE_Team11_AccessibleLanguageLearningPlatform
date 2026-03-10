const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protect, requireParentalApproval, authorize } = require('../auth');
const User = require('../../models/User');

// Mock Express request and response
const mockRequest = (headers = {}, user = null) => ({
    headers,
    user,
});

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockNext = jest.fn();

describe('Auth Middleware', () => {
    describe('protect middleware', () => {
        let testUser;
        let validToken;

        beforeEach(async () => {
            // Create a test user
            testUser = await User.create({
                name: 'Middleware Test User',
                email: 'middleware@example.com',
                password: 'password123',
                learningCondition: 'none',
            });

            // Generate a valid token
            validToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            // Clear mock calls
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
            // Create an expired token
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
            // Create token with non-existent user ID
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
            // Deactivate the user
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
