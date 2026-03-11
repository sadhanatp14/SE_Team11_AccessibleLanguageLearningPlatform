const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    fingerprintEnabled: {
      type: Boolean,
      default: false,
    },
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
    role: {
      type: String,
      enum: ['learner', 'parent', 'admin'],
      default: 'learner',
    },
    // Parental control fields
    parentEmail: {
      type: String,
      lowercase: true,
    },
    requiresParentalApproval: {
      type: Boolean,
      default: false,
    },
    isMinor: {
      type: Boolean,
      default: false,
    },
    age: {
      type: Number,
      min: 3,
      max: 100,
    },
    // Learning condition
    learningCondition: {
      type: String,
      enum: ['dyslexia', 'adhd', 'autism', 'none'],
      required: true,
    },
    // Reference to preferences
    preferences: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Preferences',
    },
    // Progress tracking
    lastLogin: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Completed lessons tracking (simple list of keys)
    // Keys may be DB ObjectId strings (for DB-backed lessons) or logical keys
    // like `autism-lesson-1` (for hard-coded lesson centers).
    completedLessons: {
      type: [String],
      default: []
    },
    // Metadata for completed lessons (preserve timestamps for non-DB/sample completions)
    // When keys aren't tied to a Lesson document, meta preserves completion timestamps.
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

// EPIC 1.1.3: Secure password hashing (bcrypt) before persisting users
// Hash password before saving
/**
 * Pre-save hook: hash password when it changes.
 * This ensures `password` is never stored in plaintext.
 */
UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.isModified('patternHash') && this.patternHash) {
    const salt = await bcrypt.genSalt(10);
    this.patternHash = await bcrypt.hash(this.patternHash, salt);
  }

  next();
});

// EPIC 1.2.2: Credential verification during login
// Method to compare password
/**
 * Compares a candidate password to the stored bcrypt hash.
 * @param {string} enteredPassword
 * @returns {Promise<boolean>}
 */
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

/**
 * Compares candidate pattern to stored bcrypt pattern hash.
 * @param {string} enteredPattern
 * @returns {Promise<boolean>}
 */
UserSchema.methods.matchPattern = async function (enteredPattern) {
  if (!this.patternHash) return false;
  return await bcrypt.compare(enteredPattern, this.patternHash);
};

module.exports = mongoose.model('User', UserSchema);
