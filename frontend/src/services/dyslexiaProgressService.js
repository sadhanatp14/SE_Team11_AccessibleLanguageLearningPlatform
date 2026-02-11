
// Service for managing dyslexia lesson progress in localStorage
const STORAGE_KEY = 'dyslexiaLessonProgress';

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
