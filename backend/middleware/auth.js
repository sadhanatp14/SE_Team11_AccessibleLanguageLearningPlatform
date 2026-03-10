/**
 * auth.js — Express authentication & authorisation middleware
 *
 * Exports three middleware functions for use on protected routes:
 *  - protect                  — verifies JWT bearer token; attaches req.user (password excluded)
 *  - requireParentalApproval  — blocks minor accounts that lack the x-parental-approval header
 *  - authorize(...roles)      — role-based access control; must run after `protect`
 *
 * Contracts:
 *  - Any handler downstream of `protect` may safely read req.user.
 *  - `authorize` reads req.user.role; calling it without `protect` first will throw.
 *  - `requireParentalApproval` uses a simple header gate as a placeholder; replace
 *    with a real approval workflow before production use.
 */

// jsonwebtoken — signs and verifies JWT bearer tokens
const jwt = require('jsonwebtoken');
// User model — used to resolve the decoded token ID to a full user document
const User = require('../models/User');

/**
 * Auth Middleware
 * --------------
 * Shared authentication/authorization helpers for Express routes.
 *
 * Contracts:
 * - `protect` sets `req.user` (User doc, password excluded)
 * - Downstream handlers can assume `req.user` exists on protected routes
 * - `authorize` checks `req.user.role` against an allowed list
 * - `requireParentalApproval` is a lightweight gate for minor accounts
 */

/**
 * Verify the JWT bearer token and attach the authenticated user to `req.user`.
 *
 * Reads:  Authorization: Bearer <token>
 * Writes: req.user (User document, password field excluded via schema select:false)
 *
 * Rejection cases:
 *  - Missing or malformed header  → 401 Not authorized
 *  - Invalid or expired token     → 401 Not authorized (jwt.verify throws)
 *  - No matching user in DB       → 404 User not found
 *  - User account is deactivated  → 403 Account deactivated
 *
 * EPIC 1.2.3: Token verification middleware to protect private routes.
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    // NOTE: password is excluded because schema uses `select:false` and we also select -password.
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated',
      });
    }

    next();
  } catch (error) {
    // jwt.verify() throws JsonWebTokenError (bad signature) or TokenExpiredError —
    // both are treated as 401 so callers cannot distinguish between the two cases
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message,
    });
  }
};

/**
 * Guard routes that require parental consent for minor accounts.
 *
 * Passes through (calls next()) when:
 *  (a) The user is not flagged as a minor, OR
 *  (b) The `x-parental-approval: true` request header is present.
 *
 * Rejects with 403 when a minor user makes a request without the approval header.
 *
 * NOTE: The header-based check is a placeholder suitable for development/testing.
 *       Replace with a verified approval token or a real out-of-band workflow
 *       before production use.
 *
 * EPIC 1.1.4 / 1.2: Parental approval gate.
 *
 * @param {import('express').Request}      req - req.user must be set by `protect` first.
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
exports.requireParentalApproval = async (req, res, next) => {
  if (req.user.isMinor && req.user.requiresParentalApproval) {
    // Check for the parental-approval signal in the request headers
    // TODO: replace with a verified approval token or database flag lookup
    const hasApproval = req.headers['x-parental-approval'];
    
    if (!hasApproval) {
      return res.status(403).json({
        success: false,
        message: 'This action requires parental approval',
        requiresParentalApproval: true,
      });
    }
  }
  
  next();
};

/**
 * Role-based access control middleware factory.
 *
 * Returns a middleware that passes through only when req.user.role is listed
 * in the variadic `roles` argument.  All other roles receive a 403 response.
 *
 * Usage (in a route definition):
 *   router.delete('/users/:id', protect, authorize('admin'), handler);
 *   router.get('/reports',      protect, authorize('admin', 'parent'), handler);
 *
 * IMPORTANT: Must be composed after `protect` so req.user is already populated.
 *
 * @param {...string} roles - One or more allowed role names ('admin', 'parent', 'learner').
 * @returns {import('express').RequestHandler} Express middleware function.
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Reject immediately if the user's role is not in the allow-list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
