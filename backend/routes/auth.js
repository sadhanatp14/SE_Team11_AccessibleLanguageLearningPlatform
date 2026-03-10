/**
 * routes/auth.js
 *
 * Authentication router — mounted at /api/auth.
 *
 * Public routes (no token required):
 *  POST /register                    — Create a new user account + seed Preferences
 *  POST /login                       — Validate credentials and issue a JWT
 *  POST /fingerprint/login/options   — Retrieve WebAuthn assertion challenge
 *  POST /fingerprint/login/verify    — Verify WebAuthn assertion and issue a JWT
 *
 * Private routes (Bearer token required via `protect` middleware):
 *  GET  /me                          — Return authenticated user's full profile
 *  POST /logout                      — Acknowledge client-side session teardown
 *  POST /fingerprint/register/options — Retrieve WebAuthn registration challenge
 *  POST /fingerprint/register/verify  — Verify attestation and store credential
 *
 * Key design notes:
 *  - Passwords are hashed in the User model's pre-save hook (EPIC 1.1.3).
 *  - Condition-specific Preferences are seeded immediately after User creation (EPIC 1.3.3).
 *  - WebAuthn challenges are held in an in-memory Map; replace with a shared store
 *    (e.g. Redis) for multi-instance / horizontally-scaled deployments.
 */

// express + Router — standard route definition scaffolding
const express = require('express');
const router = express.Router();
// express-validator — declarative input sanitisation and validation rule chains
const { body, validationResult } = require('express-validator');
// jsonwebtoken — JWT signing for session token issuance
const jwt = require('jsonwebtoken');
// crypto — cryptographically random challenge bytes and UUID request IDs for WebAuthn
const crypto = require('crypto');
// User model — primary user document read/write target
const User = require('../models/User');
// Preferences model — condition-specific UI settings seeded at registration
const Preferences = require('../models/Preferences');
// protect middleware — JWT verification; injects req.user on private routes
const { protect } = require('../middleware/auth');

/**
 * Sign a JWT encoding the user's MongoDB ID.
 * Token lifetime is controlled by the JWT_EXPIRE environment variable.
 * EPIC 1.2.2: JWT issuance for authenticated sessions.
 *
 * @param {string} id - MongoDB ObjectId string of the authenticated user.
 * @returns {string} Signed JWT token.
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

/**
 * Normalise a raw pattern credential: coerce to string and trim whitespace.
 * @param {*} raw - Value from req.body.pattern.
 * @returns {string} Trimmed string representation.
 */
const normalizePattern = (raw) => String(raw || '').trim();

/**
 * Validate a dot-pattern credential string.
 *
 * A valid pattern must:
 *  - Contain at least 4 segments separated by '-' (e.g. "0-3-6-7")
 *  - Use only unique segments — no repeated dot positions
 *  - Use single digits 0–8 (the nine positions on a 3×3 grid)
 *
 * @param {*} raw - Value from req.body.pattern (before normalisation).
 * @returns {boolean} true when the pattern satisfies all rules.
 */
const isValidPattern = (raw) => {
  const parts = normalizePattern(raw).split('-').filter(Boolean);
  if (parts.length < 4) return false;
  const unique = new Set(parts);
  if (unique.size !== parts.length) return false;
  return parts.every((p) => /^[0-8]$/.test(p));
};

/**
 * Encode a Buffer to base64url (RFC 4648 §5) as required by the WebAuthn spec.
 * Replaces standard base64 '+' → '-' and '/' → '_', and strips '=' padding.
 *
 * @param {Buffer} buffer - Binary data to encode.
 * @returns {string} base64url-encoded string.
 */
const toBase64Url = (buffer) => Buffer.from(buffer)
  .toString('base64')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

/**
 * Decode a base64url string back to a Buffer.
 * Used when parsing `clientDataJSON` returned by the WebAuthn authenticator.
 *
 * @param {string} value - base64url-encoded string.
 * @returns {Buffer} Decoded binary data.
 */
const fromBase64Url = (value) => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64');
};

/** Generate a cryptographically random 32-byte WebAuthn challenge in base64url encoding. */
const createChallenge = () => toBase64Url(crypto.randomBytes(32));

/**
 * In-memory pending-challenge store.
 * Key:   requestId (UUID string)
 * Value: { challenge, type, email, userId, expiresAt }
 *
 * NOTE: Suitable for single-instance deployments only.
 *       Replace with a shared store (e.g. Redis) for horizontal scaling.
 */
const challengeStore = new Map();

/** How long a challenge remains valid after issuance — 5 minutes. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Persist a new WebAuthn challenge entry in the in-memory store.
 *
 * @param {{ requestId: string, challenge: string, type: string, email: string, userId: string }} opts
 */
const storeChallenge = ({ requestId, challenge, type, email, userId }) => {
  challengeStore.set(requestId, {
    challenge,
    type,
    email,
    userId,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
};

/**
 * Retrieve, validate, and atomically delete a challenge entry (one-time use).
 * Always removes the entry — even when validation fails — to prevent replay attacks.
 *
 * @param {{ requestId: string, type: string, email?: string, userId?: string }} opts
 * @returns {{ ok: boolean, challenge?: string, reason?: string }}
 */
const consumeChallenge = ({ requestId, type, email, userId }) => {
  const item = challengeStore.get(requestId);
  // Always delete first — challenges are single-use regardless of validation outcome
  challengeStore.delete(requestId);
  if (!item) return { ok: false, reason: 'Missing challenge state' };
  if (item.type !== type) return { ok: false, reason: 'Challenge type mismatch' };
  if (Date.now() > item.expiresAt) return { ok: false, reason: 'Challenge expired' };
  if (email && item.email !== email) return { ok: false, reason: 'Challenge email mismatch' };
  if (userId && item.userId !== String(userId)) return { ok: false, reason: 'Challenge user mismatch' };
  return { ok: true, challenge: item.challenge };
};

/**
 * POST /api/auth/register
 *
 * Create a new user account with condition-specific Preferences.
 *
 * Steps:
 *  1. Run express-validator rules (name, email, password/pattern, learningCondition,
 *     age, isMinor, parentEmail, role, adminKey) — EPIC 1.1.2.
 *  2. Enforce admin-registration secret when role === 'admin'.
 *  3. Enforce parental-approval rules for minors (age < 13 or isMinor flag) — EPIC 1.1.4.
 *  4. Create the User document (password hashed in pre-save hook — EPIC 1.1.3).
 *  5. Seed condition-specific Preferences and link them to the new user — EPIC 1.3.3.
 *  6. Issue a JWT and return the sanitised user object.
 *
 * @access Public
 */
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

/**
 * POST /api/auth/login
 *
 * Authenticate an existing user and issue a JWT session token.
 *
 * Steps:
 *  1. Validate email + credential (password or pattern) via express-validator — EPIC 1.2.2.
 *  2. Load the User document (including hashed credential) and populated Preferences.
 *  3. Confirm the submitted authMethod matches the account's registered method.
 *  4. Verify the credential using User.matchPassword() or User.matchPattern().
 *  5. Reject deactivated accounts with 403.
 *  6. Update User.lastLogin and issue a JWT.
 *
 * @access Public
 */
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

/**
 * POST /api/auth/fingerprint/register/options
 *
 * Return WebAuthn PublicKeyCredentialCreationOptions so the browser can prompt
 * the user to register a platform authenticator (fingerprint / Face ID).
 *
 * Steps:
 *  1. Load the authenticated user's existing WebAuthn credentials.
 *  2. Generate a random challenge and persist it keyed by a new UUID requestId.
 *  3. Return PublicKeyCredentialCreationOptions including the challenge, relying-party
 *     info, user handle, and excludeCredentials to prevent double-registration.
 *
 * @access Private (requires `protect`)
 */
router.post('/fingerprint/register/options', protect, async (req, res) => {
  try {
    // Step 1: Load user fields needed to build the options response
    const user = await User.findById(req.user.id).select('name email webAuthnCredentials');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Step 2: Generate a one-time challenge and bind it to this user + operation type
    const requestId = crypto.randomUUID();
    const challenge = createChallenge();
    storeChallenge({
      requestId,
      challenge,
      type: 'register-fingerprint',
      userId: String(user._id),
      email: user.email,
    });

    // Listed in excludeCredentials so the authenticator won't register the same device twice
    const existingCredentials = Array.isArray(user.webAuthnCredentials) ? user.webAuthnCredentials : [];

    // Step 3: Return the full PublicKeyCredentialCreationOptions
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

/**
 * POST /api/auth/fingerprint/register/verify
 *
 * Verify the WebAuthn attestation response from the browser and persist the
 * new credential so the user can authenticate with fingerprint / Face ID.
 *
 * Steps:
 *  1. Validate the incoming payload structure.
 *  2. Consume and verify the stored challenge (one-time use, bound to user + type).
 *  3. Decode clientDataJSON — type must be 'webauthn.create', challenge must match.
 *  4. Store the new credentialId (idempotent — skip if already registered).
 *  5. Set fingerprintEnabled = true and save.
 *
 * @access Private (requires `protect`)
 */
router.post('/fingerprint/register/verify', protect, async (req, res) => {
  try {
    // Step 1: Basic payload presence check before touching the challenge store
    const { requestId, credential } = req.body;
    if (!requestId || !credential?.id || !credential?.response?.clientDataJSON) {
      return res.status(400).json({ success: false, message: 'Invalid registration payload' });
    }

    // Step 2: Consume the challenge — always deletes the entry (replay prevention)
    const challengeResult = consumeChallenge({
      requestId,
      type: 'register-fingerprint',
      userId: String(req.user.id),
    });

    if (!challengeResult.ok) {
      return res.status(400).json({ success: false, message: challengeResult.reason || 'Invalid challenge state' });
    }

    // Step 3: Decode clientDataJSON and verify ceremony type + challenge value
    const clientData = JSON.parse(fromBase64Url(credential.response.clientDataJSON).toString('utf8'));
    if (clientData.type !== 'webauthn.create') {
      return res.status(400).json({ success: false, message: 'Invalid attestation type' });
    }
    if (clientData.challenge !== challengeResult.challenge) {
      return res.status(400).json({ success: false, message: 'Challenge verification failed' });
    }

    // Step 4: Persist the new credentialId (idempotent — skip if already present)
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

    // Step 5: Enable fingerprint login flag and persist
    user.fingerprintEnabled = user.webAuthnCredentials.length > 0;
    await user.save();

    return res.json({ success: true, message: 'Fingerprint registered successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to verify fingerprint registration', error: error.message });
  }
});

/**
 * POST /api/auth/fingerprint/login/options
 *
 * Return WebAuthn PublicKeyCredentialRequestOptions so the browser can prompt
 * the user to authenticate with a previously registered platform authenticator.
 *
 * Steps:
 *  1. Resolve user by email; reject if no WebAuthn credentials are registered.
 *  2. Generate a random challenge and persist it keyed by a new UUID requestId.
 *  3. Return PublicKeyCredentialRequestOptions including the allowCredentials list.
 *
 * @access Public (email is the only input — no Bearer token required)
 */
router.post('/fingerprint/login/options', async (req, res) => {
  try {
    // Step 1: Look up user and confirm at least one credential is registered
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email }).select('email webAuthnCredentials');
    if (!user || !Array.isArray(user.webAuthnCredentials) || user.webAuthnCredentials.length === 0) {
      return res.status(404).json({ success: false, message: 'No fingerprint is configured for this account' });
    }

    // Step 2: Generate a one-time challenge bound to this user and login operation
    const requestId = crypto.randomUUID();
    const challenge = createChallenge();
    storeChallenge({
      requestId,
      challenge,
      type: 'login-fingerprint',
      userId: String(user._id),
      email: user.email,
    });

    // Step 3: Return assertion options with the registered allowCredentials hint list
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

/**
 * POST /api/auth/fingerprint/login/verify
 *
 * Verify the WebAuthn assertion from the browser, match the credentialId against
 * the user's stored credentials, and issue a JWT session token on success.
 *
 * Steps:
 *  1. Validate the incoming payload structure.
 *  2. Load the user by email (with preferences); reject unknown accounts.
 *  3. Consume and verify the stored challenge (single-use).
 *  4. Decode clientDataJSON — type must be 'webauthn.get', challenge must match.
 *  5. Confirm the presented credentialId is in the user's registered list.
 *  6. Reject deactivated accounts (checked after credential verification).
 *  7. Update lastLogin, issue JWT, and return the session response.
 *
 * @access Public
 */
router.post('/fingerprint/login/verify', async (req, res) => {
  try {
    // Step 1: Basic payload validation before any DB or challenge-store access
    const email = String(req.body?.email || '').trim().toLowerCase();
    const { requestId, credential } = req.body;

    if (!email || !requestId || !credential?.id || !credential?.response?.clientDataJSON) {
      return res.status(400).json({ success: false, message: 'Invalid fingerprint login payload' });
    }

    // Step 2: Load user with preferences (needed for session response shape)
    const user = await User.findOne({ email }).populate('preferences');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid account' });
    }

    // Step 3: Consume challenge — always deletes entry regardless of outcome (replay prevention)
    const challengeResult = consumeChallenge({
      requestId,
      type: 'login-fingerprint',
      userId: String(user._id),
      email,
    });

    if (!challengeResult.ok) {
      return res.status(400).json({ success: false, message: challengeResult.reason || 'Invalid challenge state' });
    }

    // Step 4: Decode clientDataJSON — type must be 'webauthn.get' for an assertion ceremony
    const clientData = JSON.parse(fromBase64Url(credential.response.clientDataJSON).toString('utf8'));
    if (clientData.type !== 'webauthn.get') {
      return res.status(400).json({ success: false, message: 'Invalid assertion type' });
    }
    if (clientData.challenge !== challengeResult.challenge) {
      return res.status(400).json({ success: false, message: 'Challenge verification failed' });
    }

    // Step 5: Match the presented credentialId against the user's registered credentials
    const credentialId = String(credential.id);
    const hasCredential = Array.isArray(user.webAuthnCredentials)
      && user.webAuthnCredentials.some((item) => item.credentialId === credentialId);

    if (!hasCredential) {
      return res.status(401).json({ success: false, message: 'Fingerprint is not recognized for this account' });
    }

    // Step 6: Reject deactivated accounts (checked after credential verification to avoid enumeration)
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated' });
    }

    // Step 7: Record the login timestamp, issue JWT, return session response
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

/**
 * GET /api/auth/me
 *
 * Return the full profile of the currently authenticated user, including their
 * linked Preferences document.  Used by the frontend on page load to rehydrate
 * auth and UI-settings state without requiring a new login.
 *
 * EPIC 1.2.4 / 1.7.4: Session validation endpoint used to refresh user state on reload.
 *
 * @access Private (requires `protect`)
 */
router.get('/me', protect, async (req, res) => {
  try {
    // Populate preferences so the UI can apply condition-specific settings immediately
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

/**
 * POST /api/auth/logout
 *
 * Acknowledge a logout request and confirm session teardown.
 *
 * NOTE: JWTs are stateless — actual token invalidation is the client's responsibility
 * (discard the stored token).  This endpoint exists so the frontend has a consistent
 * API call to make on logout, and provides a hook for future server-side token
 * blacklisting to be added without a client-side change.
 *
 * @access Private (requires `protect`)
 */
router.post('/logout', protect, async (req, res) => {
  // JWT logout is client-side: the client must discard the stored token.
  // Add audit logging or token-revocation logic here if required in future.
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;
