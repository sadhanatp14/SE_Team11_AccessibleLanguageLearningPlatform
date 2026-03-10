/**
 * @module models/User
 * @description Mongoose model for the core user identity record.
 *
 * Each document represents one registered learner (or admin/parent) and stores:
 *   - Authentication credentials: email/password (bcrypt), dot-pattern hash, WebAuthn credentials
 *   - Learning profile: `learningCondition` (dyslexia | adhd | autism | none)
 *   - Parental-control flags: `isMinor`, `requiresParentalApproval`, `parentEmail`
 *   - Lightweight progress: `completedLessons` (string key array) + `completedLessonsMeta` (timestamps)
 *   - A soft-delete flag (`isActive`) used by the `protect` middleware to block inactive accounts
 *
 * Security notes:
 *   - `password` and `patternHash` both have `select: false` so they are never returned
 *     by default in query results — callers must explicitly `.select('+password')` when needed.
 *   - The pre-save hook bcrypt-hashes both fields whenever they are modified.
 *   - WebAuthn credential IDs are stored in plain text (they are public values); the
 *     cryptographic verification happens in the auth route using the Web Authentication API.
 */
const mongoose = require('mongoose');  // MongoDB ODM
const bcrypt = require('bcryptjs');    // bcrypt password hashing library

/**
 * User Model
 * ----------
 * Core identity record for the platform.
 * Includes:
 * - authentication fields (email/password hash)
 * - learningCondition selection (dyslexia/adhd/autism/none)
 * - parental-control flags for minors
 * - completed lesson keys for lightweight progress tracking across modules
 */

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [
        function requiredPassword() {
          return (this.authMethod || 'password') === 'password';
        },
        'Please provide a password',
      ],
      minlength: 6,
      select: false, // Don't return password by default
    },
    authMethod: {
      type: String,
      enum: ['password', 'pattern'],
      default: 'password',
    },
    /**
     * bcrypt hash of the learner's dot-pattern secret.
     * `select: false` mirrors the password field — never returned unless explicitly requested.
     * Conditionally required: only when `authMethod` is 'pattern'.
     */
    patternHash: {
      type: String,
      required: [
        function requiredPattern() {
          return this.authMethod === 'pattern';
        },
        'Please provide a pattern',
      ],
      select: false,
    },
    /** Whether this account has registered at least one WebAuthn (fingerprint/face) credential. */
    fingerprintEnabled: {
      type: Boolean,
      default: false,
    },
    /**
     * Array of registered WebAuthn credential descriptors.
     * Each entry stores the public `credentialId` (safe to store in plain text),
     * the transports the authenticator supports, and the registration timestamp.
     * `_id: false` prevents Mongoose from adding sub-document IDs.
     */
    webAuthnCredentials: {
      type: [
        new mongoose.Schema(
          {
            credentialId: { type: String, required: true },
            transports: { type: [String], default: [] },
            createdAt: { type: Date, default: Date.now },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    /** RBAC role controlling which routes and resources the account can access. */
    role: {
      type: String,
      enum: ['learner', 'parent', 'admin'],
      default: 'learner',
    },

    // --- Parental Control ---
    /** Email address of the parent/guardian linked to this minor's account. */
    parentEmail: {
      type: String,
      lowercase: true,
    },
    /**
     * When `true`, certain actions (e.g. resetting progress) require a parent
     * to approve before they take effect. Enforced by the `requireParentalApproval`
     * middleware in `backend/middleware/auth.js`.
     */
    requiresParentalApproval: {
      type: Boolean,
      default: false,
    },
    /** Marks the account as belonging to a minor; drives `requiresParentalApproval` logic. */
    isMinor: {
      type: Boolean,
      default: false,
    },
    /** Learner's age (3–100); used to auto-set `isMinor` during registration. */
    age: {
      type: Number,
      min: 3,
      max: 100,
    },
    /**
     * The primary accessibility profile selected during onboarding.
     * Controls which defaults are applied on the `/api/preferences/reset` route
     * and determines which lesson content pool the recommendation engine targets.
     */
    learningCondition: {
      type: String,
      enum: ['dyslexia', 'adhd', 'autism', 'none'],
      required: true,
    },
    /** ObjectId reference to the user's `Preferences` document (one-to-one). */
    preferences: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Preferences',
    },

    // --- Account State ---
    /** Timestamp of the most recent successful login; updated by the login route. */
    lastLogin: {
      type: Date,
    },
    /**
     * Soft-delete / suspension flag.
     * The `protect` middleware returns 401 and blocks access when this is `false`,
     * without physically removing the document from the database.
     */
    isActive: {
      type: Boolean,
      default: true,
    },

    // --- Completed Lessons (Lightweight Progress) ---
    /**
     * Flat array of completed lesson keys (EPIC 6.1.1).
     * Keys may be:
     *   - 24-character hex ObjectId strings for DB-backed Lesson documents
     *   - Logical string keys like `'autism-lesson-1'` for hard-coded lesson centres
     * Used for quick membership checks (`includes()`) without a DB query.
     */
    completedLessons: {
      type: [String],
      default: []
    },
    /**
     * Completion timestamp metadata parallel to `completedLessons` (EPIC 6.3.1–6.3.4).
     * Stored separately so that completions not tied to a `Lesson` document still
     * preserve their `completedAt` timestamps for the learning history view.
     * `_id: false` prevents sub-document IDs on each entry.
     */
    completedLessonsMeta: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            completedAt: { type: Date, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook: bcrypt-hash credentials before persisting (EPIC 1.1.3).
 *
 * Both `password` and `patternHash` are hashed with a cost factor of 10 whenever
 * they are modified (new user or explicit credential change). Using `isModified`
 * prevents redundant re-hashing on unrelated field updates.
 *
 * bcrypt.genSalt(10) produces a random 10-round salt; the resulting hash is
 * 60 characters long and is safe to store in MongoDB.
 */
UserSchema.pre('save', async function (next) {
  // Only re-hash when the password field itself has changed
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Only re-hash when the pattern field itself has changed
  if (this.isModified('patternHash') && this.patternHash) {
    const salt = await bcrypt.genSalt(10);
    this.patternHash = await bcrypt.hash(this.patternHash, salt);
  }

  next();
});

/**
 * Instance method: verify a plaintext password against the stored bcrypt hash (EPIC 1.2.2).
 * Returns `false` immediately when `password` was not selected in the query
 * (i.e. the caller forgot `.select('+password')`) to avoid a misleading bcrypt error.
 *
 * @param {string} enteredPassword - The plaintext password submitted by the user.
 * @returns {Promise<boolean>} `true` if the password matches, `false` otherwise.
 */
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Instance method: verify a plaintext dot-pattern string against the stored bcrypt hash.
 * Guards against missing `patternHash` in the same way as `matchPassword`.
 *
 * @param {string} enteredPattern - The plaintext pattern string submitted by the user.
 * @returns {Promise<boolean>} `true` if the pattern matches, `false` otherwise.
 */
UserSchema.methods.matchPattern = async function (enteredPattern) {
  if (!this.patternHash) return false;
  return await bcrypt.compare(enteredPattern, this.patternHash);
};

// Export the compiled Mongoose model; Mongoose caches it internally by the name 'User'.
module.exports = mongoose.model('User', UserSchema);
