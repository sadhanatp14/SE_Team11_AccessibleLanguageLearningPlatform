const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Preferences = require('../models/Preferences');
const { protect } = require('../middleware/auth');

// EPIC 1.2.2: JWT issuance for authenticated sessions
// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user (1.1)
// @access  Public
router.post(
  '/register',
  [
    // EPIC 1.1.2: Backend validation for registration inputs
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('learningCondition')
      .isIn(['dyslexia', 'adhd', 'autism', 'none'])
      .withMessage('Invalid learning condition'),
    body('age').optional().isInt({ min: 3, max: 100 }),
    body('isMinor').optional().isBoolean().withMessage('isMinor must be a boolean'),
    body('parentEmail')
      .optional({ checkFalsy: true })
      .isEmail()
      .withMessage('Please provide a valid parent email'),
    // New field to support role-based registration (admin/parent/learner)
    body('role')
      .optional()
      .isIn(['learner', 'parent', 'admin'])
      .withMessage('Invalid role'),
  ],
  async (req, res) => {
    console.log('Registration endpoint hit with:', {
      name: req.body.name,
      email: req.body.email,
      learningCondition: req.body.learningCondition,
      age: req.body.age,
      isMinor: req.body.isMinor,
      parentEmail: req.body.parentEmail,
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Log validation errors and sanitized input for debugging (do not log password)
      console.warn('Registration validation failed:', errors.array(), {
        name: req.body.name,
        email: req.body.email,
        learningCondition: req.body.learningCondition,
        age: req.body.age,
        isMinor: req.body.isMinor,
        parentEmail: req.body.parentEmail,
      });
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      name,
      email,
      password,
      learningCondition,
      age,
      parentEmail,
      isMinor,
      role,
      message: 'User already exists with this email',
    });
      }

// EPIC 1.1.4: Parental control support for minors (age/isMinor + parentEmail)
// Determine if parental approval is required
const requiresParentalApproval = isMinor || (age && age < 13);

// Enforce consent checkbox when age indicates under 13
if (age && age < 13 && !isMinor) {
  return res.status(400).json({
    success: false,
    message: 'Under 13 requires parental approval. Please check the under 13 box.',
  });
}

if (requiresParentalApproval && !parentEmail) {
  return res.status(400).json({
    success: false,
    message: 'Parent email is required for minor accounts',
  });
}

// Create user
// EPIC 1.1.3: Secure password hashing occurs in User model pre-save hook
user = await User.create({
  name,
  email,
  password,
  learningCondition,
  age,
  parentEmail,
  isMinor: requiresParentalApproval,
  requiresParentalApproval,
  role: role || 'learner', // allow explicit role, default learner
});

// EPIC 1.3.3 / 1.4 / 1.5 / 1.6: Condition-specific default preferences on registration
const defaultPreferences = await Preferences.create({
  user: user._id,
  // Set defaults based on condition
  ...(learningCondition === 'dyslexia' && {
    fontFamily: 'opendyslexic',
    letterSpacing: 'wide',
    lineHeight: 'relaxed',
  }),
  ...(learningCondition === 'adhd' && {
    distractionFreeMode: true,
    learningPace: 'normal',
    breakReminders: true,
  }),
  ...(learningCondition === 'autism' && {
    distractionFreeMode: true,
    simplifiedLayout: true,
    reduceAnimations: true,
  }),
});

// Link preferences to user
user.preferences = defaultPreferences._id;
await user.save();

// Generate token
const token = generateToken(user._id);

res.status(201).json({
  success: true,
  message: 'Registration successful',
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    learningCondition: user.learningCondition,
    requiresParentalApproval: user.requiresParentalApproval,
    role: user.role,
  },
});
    } catch (error) {
  console.error('Registration error:', error);
  // Handle duplicate key (race condition) with 409
  if (error && error.code === 11000) {
    return res.status(409).json({ success: false, message: 'Email already in use' });
  }
  res.status(500).json({
    success: false,
    message: 'Server error during registration',
    error: error.message,
  });
}
  }
);

// @route   POST /api/auth/login
// @desc    Login user (1.2)
// @access  Public
router.post(
  '/login',
  [
    // EPIC 1.2.2: Backend credential validation for login
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    try {
      // Find user and include password
      const user = await User.findOne({ email })
        .select('+password')
        .populate('preferences');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check password
      // EPIC 1.2.2: Compare entered password to stored bcrypt hash
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account has been deactivated',
        });
      }

      // Update last login
      user.lastLogin = Date.now();
      await user.save();

      // Generate token
      const token = generateToken(user._id);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          learningCondition: user.learningCondition,
          requiresParentalApproval: user.requiresParentalApproval,
          preferences: user.preferences,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: error.message,
      });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  // EPIC 1.2.4 / 1.7.4: Session validation endpoint used to refresh user state on reload
  try {
    const user = await User.findById(req.user.id).populate('preferences');

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        learningCondition: user.learningCondition,
        age: user.age,
        isMinor: user.isMinor,
        requiresParentalApproval: user.requiresParentalApproval,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (clear client-side token)
// @access  Private
router.post('/logout', protect, async (req, res) => {
  // With JWT, logout is handled client-side by removing the token
  // We can log this event if needed
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;
