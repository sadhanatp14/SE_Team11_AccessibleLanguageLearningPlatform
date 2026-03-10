const jwt = require('jsonwebtoken');
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

// EPIC 1.2.3: Token verification middleware to protect private routes
// Protect routes - verify JWT token
/**
 * Verifies JWT from `Authorization: Bearer <token>` header.
 * Failure cases:
 * - missing token -> 401
 * - invalid/expired token -> 401
 * - user not found -> 404
 * - user is deactivated -> 403
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
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message,
    });
  }
};

// Check parental approval for minors
/**
 * Simple minor gate.
 * Current implementation uses `x-parental-approval` header as a placeholder.
 * In a production system this would be replaced with a real approval workflow.
 */
exports.requireParentalApproval = async (req, res, next) => {
  // EPIC 1.1.4 / 1.2: Parental approval gate (placeholder header-based check)
  if (req.user.isMinor && req.user.requiresParentalApproval) {
    // Check if this action requires parental approval
    // This is a placeholder - implement actual parental approval logic
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

// Authorize specific roles
/**
 * Role-based authorization.
 * Usage: `authorize('admin')` or `authorize('admin', 'parent')`.
 * Assumes `protect` already ran and set `req.user`.
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};
