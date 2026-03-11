/**
 * Dyslexia Progress Service Module
 * 
 * Client-side progress tracking service using localStorage for dyslexia learners.
 * Provides offline-first progress persistence without backend dependencies.
 * 
 * Core Features:
 * 
 * 1. LocalStorage-Based Persistence:
 *    - Stores progress data in browser localStorage
 *    - Survives page refreshes and browser restarts
 *    - No network requests required
 *    - Instant read/write operations
 *    - Privacy-friendly (data stays on device)
 * 
 * 2. Multi-User Support:
 *    - Separate progress tracking per user
 *    - User key-based data isolation
 *    - Fallback to 'anonymous' for guest users
 *    - Prevents data mixing between users
 * 
 * 3. Lesson Progress Tracking:
 *    - Status: Not Started, In Progress, Completed
 *    - Correct answer count
 *    - Correct interaction IDs array
 *    - Total interactions in lesson
 *    - Last updated timestamp
 *    - Percentage completion calculation
 * 
 * 4. Progress Operations:
 *    - Get all lesson progress for user
 *    - Get progress for specific lesson
 *    - Save/update lesson progress
 *    - Mark lesson as completed
 *    - Track individual interaction results
 * 
 * 5. Data Structure:
 *    Storage format: { [userKey]: { [lessonId]: progressObject } }
 *    Progress object: {
 *      status: string,
 *      correctCount: number,
 *      correctIds: array,
 *      totalInteractions: number,
 *      updatedAt: timestamp
 *    }
 * 
 * 6. Error Handling:
 *    - Graceful fallback on localStorage errors
 *    - Silent failure for storage quota exceeded
 *    - Returns empty objects on read errors
 *    - Continues operation despite failures
 * 
 * Design Rationale:
 * - Dyslexia learners benefit from immediate feedback
 * - No network latency for progress updates
 * - Works completely offline
 * - Simple, predictable data model
 * - No server-side complexity
 * 
 * Usage Pattern:
 * 1. Normalize user identifier
 * 2. Read existing progress from localStorage
 * 3. Update progress data
 * 4. Write back to localStorage
 * 5. UI reflects changes immediately
 * 
 * Related Features:
 * - DyslexiaView lesson display
 * - Next lesson recommendations
 * - Progress page visualization
 * - Offline learning support
 * 
 * @module services/dyslexiaProgressService
 * @author SE_Team11
 * @version 1.0.0
 */

// Service for managing dyslexia lesson progress in localStorage
const STORAGE_KEY = 'dyslexiaLessonProgress';

/**
 * Read the complete progress store from localStorage
 * @returns {Object} Progress data for all users
 */
// Read the progress store from localStorage
const readStore = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
};

// Write the progress store to localStorage
const writeStore = (data) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    // Ignore storage failures silently
  }
};

// Normalize user key for storage (fallback to 'anonymous')
const normalizeUserKey = (userKey) => {
  if (!userKey) return 'anonymous';
  return String(userKey);
};

// Get all lesson progress for a user
export const getAllLessonProgress = (userKey) => {
  const store = readStore();
  const key = normalizeUserKey(userKey);
  return store[key] || {};
};

// Get progress for a specific lesson for a user
export const getLessonProgress = (userKey, lessonId) => {
  const all = getAllLessonProgress(userKey);
  if (!lessonId) return null;
  return (
    all[lessonId] || {
      status: 'Not Started',
      correctCount: 0,
      correctIds: [],
      totalInteractions: 0,
      updatedAt: null,
    }
  );
};

// Save progress for a specific lesson for a user
export const saveLessonProgress = (userKey, lessonId, payload) => {
  if (!lessonId) return null;
  const store = readStore();
  const key = normalizeUserKey(userKey);
  const userProgress = store[key] || {};
  const next = {
    ...userProgress[lessonId],
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  store[key] = {
    ...userProgress,
    [lessonId]: next,
  };

  writeStore(store);
  return next;
};

// Reset (remove) progress for a specific lesson for a user
export const resetLessonProgress = (userKey, lessonId) => {
  if (!lessonId) return null;
  const store = readStore();
  const key = normalizeUserKey(userKey);
  const userProgress = store[key] || {};
  delete userProgress[lessonId];
  store[key] = { ...userProgress };
  writeStore(store);
  return true;
};

// Normalize user object to a string user ID
export const normalizeUserId = (user) => {
  if (!user) return 'anonymous';
  return user.id || user._id || user.email || user.username || 'anonymous';
};
