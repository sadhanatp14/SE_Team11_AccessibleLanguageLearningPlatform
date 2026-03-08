const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

const normalizePattern = (raw) => String(raw || '').trim();

const isValidPattern = (raw) => {
  const parts = normalizePattern(raw).split('-').filter(Boolean);
  if (parts.length < 4) return false;
  const unique = new Set(parts);
  if (unique.size !== parts.length) return false;
  return parts.every((p) => /^[0-8]$/.test(p));
};

const toBase64Url = (buffer) => Buffer.from(buffer)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

const fromBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64');
};

const createChallenge = () => toBase64Url(crypto.randomBytes(32));
const challengeStore = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const storeChallenge = ({ requestId, challenge, type, email, userId }) => {
  challengeStore.set(requestId, {
    challenge,
    type,
    email,
    userId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
};

const consumeChallenge = ({ requestId, type, email, userId }) => {
  const item = challengeStore.get(requestId);
  challengeStore.delete(requestId);
  if (!item) return { ok: false, reason: 'Missing challenge state' };
  if (item.type !== type) return { ok: false, reason: 'Challenge type mismatch' };
  if (Date.now() > item.expiresAt) return { ok: false, reason: 'Challenge expired' };
  if (email && item.email !== email) return { ok: false, reason: 'Challenge email mismatch' };
  if (userId && item.userId !== String(userId)) return { ok: false, reason: 'Challenge user mismatch' };
  return { ok: true, challenge: item.challenge };
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
    body('authMethod')
      .optional()
      .isIn(['password', 'pattern'])
      .withMessage('Invalid authentication method'),
    body('password')
      .custom((val, { req }) => {
        const method = req.body.authMethod || 'password';
        if (method === 'password') {
          if (!val || String(val).length < 6) {
            throw new Error('Password must be at least 6 characters');
          }
        }
        return true;
      }),
    body('pattern')
      .custom((val, { req }) => {
        const method = req.body.authMethod || 'password';
        if (method === 'pattern' && !isValidPattern(val)) {
          throw new Error('Pattern must connect at least 4 unique dots (0-8 grid)');
        }
        return true;
      }),
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
    body('adminKey')
      .optional()
      .custom((val, { req }) => {
        if (req.body.role === 'admin' && !val) {
          throw new Error('Admin key is required');
        }
        return true;
      }),
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
      authMethod: incomingAuthMethod,
      pattern,
      learningCondition: lc,
      age,
      parentEmail,
      isMinor,
      role,
      adminKey,
    } = req.body;

    const authMethod = incomingAuthMethod || 'password';

    // Admin registration requires a secret key
    if (role === 'admin') {
      if (!process.env.ADMIN_REG_SECRET) {
        console.warn('Admin registration attempted but no secret configured');
        return res.status(500).json({ success: false, message: 'Admin registration not configured' });
      }
      if (adminKey !== process.env.ADMIN_REG_SECRET) {
        return res.status(403).json({ success: false, message: 'Invalid admin key' });
      }
    }

    // EPIC 1.1.4: Parental control support for minors (age/isMinor + parentEmail)
    // Determine if parental approval is required (only for non-admins)
    const requiresParentalApproval = (role !== 'admin') && (isMinor || (age && age < 13));

    // Enforce consent checkbox when age indicates under 13
    if (role !== 'admin' && age && age < 13 && !isMinor) {
      return res.status(400).json({
        success: false,
        message: 'Under 13 requires parental approval. Please check the under 13 box.',
      });
    }

    if (role !== 'admin' && requiresParentalApproval && !parentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Parent email is required for minor accounts',
      });
    }

    try {
      const learningCondition = role === 'admin' ? 'none' : lc;

      // Create user
      // EPIC 1.1.3: Secure password hashing occurs in User model pre-save hook
      const user = await User.create({
        name,
        email,
        authMethod,
        password: authMethod === 'password' ? password : undefined,
        patternHash: authMethod === 'pattern' ? normalizePattern(pattern) : undefined,
        learningCondition,
        age: role === 'admin' ? undefined : age,
        parentEmail: role === 'admin' ? undefined : parentEmail,
        isMinor: role === 'admin' ? false : requiresParentalApproval,
        requiresParentalApproval,
        role: role || 'learner',
      });

      // EPIC 1.3.3 / 1.4 / 1.5 / 1.6: Condition-specific default preferences on registration
      const defaultPreferences = await Preferences.create({
        user: user._id,
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
          authMethod: user.authMethod,
          fingerprintEnabled: user.fingerprintEnabled,
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
    body('authMethod')
      .optional()
      .isIn(['password', 'pattern'])
      .withMessage('Invalid authentication method'),
    body('password')
      .custom((val, { req }) => {
        const method = req.body.authMethod || 'password';
        if (method === 'password' && !val) {
          throw new Error('Password is required');
        }
        return true;
      }),
    body('pattern')
      .custom((val, { req }) => {
        const method = req.body.authMethod || 'password';
        if (method === 'pattern' && !isValidPattern(val)) {
          throw new Error('Valid pattern is required');
        }
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password, pattern, authMethod: incomingAuthMethod } = req.body;

    try {
      // Find user and include password
      const user = await User.findOne({ email })
        .select('+password +patternHash')
        .populate('preferences');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const loginMethod = incomingAuthMethod || 'password';
      const accountMethod = user.authMethod || 'password';

      if (loginMethod !== accountMethod) {
        return res.status(400).json({
          success: false,
          message: `This account uses ${accountMethod} login`,
        });
      }

      // Check credential using selected method
      let isMatch = false;
      if (accountMethod === 'pattern') {
        isMatch = await user.matchPattern(normalizePattern(pattern));
      } else {
        isMatch = await user.matchPassword(password);
      }

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
          authMethod: user.authMethod || 'password',
          fingerprintEnabled: user.fingerprintEnabled,
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

// @route   POST /api/auth/fingerprint/register/options
// @desc    Get WebAuthn registration options for authenticated user
// @access  Private
router.post('/fingerprint/register/options', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('name email webAuthnCredentials');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const requestId = crypto.randomUUID();
    const challenge = createChallenge();
    storeChallenge({
      requestId,
      challenge,
      type: 'register-fingerprint',
      userId: String(user._id),
      email: user.email,
    });

    const existingCredentials = Array.isArray(user.webAuthnCredentials) ? user.webAuthnCredentials : [];

    return res.json({
      success: true,
      requestId,
      publicKey: {
        challenge,
        rp: {
          name: 'Accessible Language Learning Platform',
        },
        user: {
          id: toBase64Url(Buffer.from(String(user._id))),
          name: user.email,
          displayName: user.name,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        timeout: 60000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        attestation: 'none',
        excludeCredentials: existingCredentials.map((cred) => ({
          type: 'public-key',
          id: cred.credentialId,
          transports: cred.transports || [],
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to prepare fingerprint setup', error: error.message });
  }
});

// @route   POST /api/auth/fingerprint/register/verify
// @desc    Verify WebAuthn registration response and store fingerprint credential
// @access  Private
router.post('/fingerprint/register/verify', protect, async (req, res) => {
  try {
    const { requestId, credential } = req.body;
    if (!requestId || !credential?.id || !credential?.response?.clientDataJSON) {
      return res.status(400).json({ success: false, message: 'Invalid registration payload' });
    }

    const challengeResult = consumeChallenge({
      requestId,
      type: 'register-fingerprint',
      userId: String(req.user.id),
    });

    if (!challengeResult.ok) {
      return res.status(400).json({ success: false, message: challengeResult.reason || 'Invalid challenge state' });
    }

    const clientData = JSON.parse(fromBase64Url(credential.response.clientDataJSON).toString('utf8'));
    if (clientData.type !== 'webauthn.create') {
      return res.status(400).json({ success: false, message: 'Invalid attestation type' });
    }
    if (clientData.challenge !== challengeResult.challenge) {
      return res.status(400).json({ success: false, message: 'Challenge verification failed' });
    }

    const user = await User.findById(req.user.id).select('webAuthnCredentials fingerprintEnabled');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const credentialId = String(credential.id);
    const exists = (user.webAuthnCredentials || []).some((item) => item.credentialId === credentialId);
    if (!exists) {
      user.webAuthnCredentials.push({
        credentialId,
        transports: Array.isArray(credential.response.transports) ? credential.response.transports : [],
      });
    }
    user.fingerprintEnabled = user.webAuthnCredentials.length > 0;
    await user.save();

    return res.json({ success: true, message: 'Fingerprint registered successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to verify fingerprint registration', error: error.message });
  }
});

// @route   POST /api/auth/fingerprint/login/options
// @desc    Get WebAuthn login options by email
// @access  Public
router.post('/fingerprint/login/options', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('email webAuthnCredentials');
    if (!user || !Array.isArray(user.webAuthnCredentials) || user.webAuthnCredentials.length === 0) {
      return res.status(404).json({ success: false, message: 'No fingerprint is configured for this account' });
    }

    const requestId = crypto.randomUUID();
    const challenge = createChallenge();
    storeChallenge({
      requestId,
      challenge,
      type: 'login-fingerprint',
      userId: String(user._id),
      email: user.email,
    });

    return res.json({
      success: true,
      requestId,
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials: user.webAuthnCredentials.map((cred) => ({
          type: 'public-key',
          id: cred.credentialId,
          transports: cred.transports || [],
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to prepare fingerprint login', error: error.message });
  }
});

// @route   POST /api/auth/fingerprint/login/verify
// @desc    Verify fingerprint login assertion and issue JWT session
// @access  Public
router.post('/fingerprint/login/verify', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const { requestId, credential } = req.body;

    if (!email || !requestId || !credential?.id || !credential?.response?.clientDataJSON) {
      return res.status(400).json({ success: false, message: 'Invalid fingerprint login payload' });
    }

    const user = await User.findOne({ email }).populate('preferences');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid account' });
    }

    const challengeResult = consumeChallenge({
      requestId,
      type: 'login-fingerprint',
      userId: String(user._id),
      email,
    });

    if (!challengeResult.ok) {
      return res.status(400).json({ success: false, message: challengeResult.reason || 'Invalid challenge state' });
    }

    const clientData = JSON.parse(fromBase64Url(credential.response.clientDataJSON).toString('utf8'));
    if (clientData.type !== 'webauthn.get') {
      return res.status(400).json({ success: false, message: 'Invalid assertion type' });
    }
    if (clientData.challenge !== challengeResult.challenge) {
      return res.status(400).json({ success: false, message: 'Challenge verification failed' });
    }

    const credentialId = String(credential.id);
    const hasCredential = Array.isArray(user.webAuthnCredentials)
      && user.webAuthnCredentials.some((item) => item.credentialId === credentialId);

    if (!hasCredential) {
      return res.status(401).json({ success: false, message: 'Fingerprint is not recognized for this account' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(user._id);
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authMethod: user.authMethod || 'password',
        fingerprintEnabled: user.fingerprintEnabled,
        learningCondition: user.learningCondition,
        requiresParentalApproval: user.requiresParentalApproval,
        preferences: user.preferences,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to verify fingerprint login', error: error.message });
  }
});

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
        authMethod: user.authMethod || 'password',
        fingerprintEnabled: user.fingerprintEnabled,
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
