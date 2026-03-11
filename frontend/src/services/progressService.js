/**
 * Progress Service Module
 * 
 * Handles all progress-related API operations for tracking learner advancement:
 * - Fetching saved lesson progress for state restoration
 * - Updating progress as learners complete sections
 * - Retrieving progress summaries and statistics
 * 
 * This service is critical for implementing EPIC 6 features including:
 * - Automatic progress saving (6.4.1)
 * - Lesson state restoration (6.4.2)
 * - Progress percentage calculation (6.1.2)
 * - Remaining lesson counts (6.6.1-6.6.2)
 * 
 * All requests are authenticated via the API utility which includes auth tokens.
 * 
 * @module services/progressService
 * @requires utils/api
 * @author SE_Team11
 * @version 1.0.0
 */

// Service for progress-related API calls (fetching, updating, and summarizing user progress)
import api from '../utils/api';

/**
 * Fetch saved progress for a specific lesson
 * 
 * Retrieves the user's saved progress state for a lesson, enabling restoration
 * of their position when returning to incomplete lessons. Returns information
 * about completed sections, current position, and interaction states.
 * 
 * Used primarily for implementing EPIC 6.4.2 (Reliable Lesson Loading).
 * 
 * @async
 * @function getProgress
 * @param {string} lessonId - MongoDB ObjectId of the lesson
 * @returns {Promise<Object>} Progress object containing currentSectionId, completedSections, etc.
 * @throws {Error} If lesson not found or network error occurs
 */
/**
 * Fetch saved progress for a specific lesson for the current user.
 * Used to restore lesson state (EPIC 6.4.2).
 * @param {string} lessonId
 * @returns {Promise<Object>} progress payload
 */
export const getProgress = async (lessonId) => {
  const response = await api.get(`/progress/${lessonId}`);
  return response.data.progress;
};

/**
 * Update and persist user progress for a lesson
 * 
 * Saves the learner's current state as they progress through a lesson.
 * This function is called automatically as users complete sections and
 * interact with lesson content (EPIC 6.4.1 - Automatic Progress Saving).
 * 
 * Progress data includes:
 * - Current section ID (last active section)
 * - Array of completed section IDs
 * - Interaction states (quiz answers, practice attempts, etc.)
 * - Replay flag (indicates if user is reviewing completed content)
 * 
 * @async
 * @function updateProgress
 * @param {Object} payload - Progress update data
 * @param {string} payload.lessonId - MongoDB ObjectId of the lesson
 * @param {string} [payload.currentSectionId] - ID of current active section
 * @param {string[]} [payload.completedSections] - Array of completed section IDs
 * @param {Object} [payload.interactionStates] - State data for interactive elements
 * @param {boolean} [payload.isReplay] - Whether user is in replay mode
 * @returns {Promise<Object>} Updated progress object from server
 * @throws {Error} If update fails or network error occurs
 */
/**
 * Persist progress as the learner moves forward (EPIC 6.4.1).
 * @param {{lessonId: string, currentSectionId?: string, completedSections?: string[], interactionStates?: any, isReplay?: boolean}} payload
 * @returns {Promise<Object>} updated progress payload
 */
export const updateProgress = async ({
  lessonId,
  currentSectionId,
  completedSections,
  interactionStates,
  isReplay,
}) => {
  const response = await api.post('/progress/update', {
    lessonId,
    currentSectionId,
    completedSections,
    interactionStates,
    isReplay,
  });
  return response.data.progress;
};

/**
 * Fetch progress summary and statistics for the current user
 * 
 * Retrieves aggregated progress data including:
 * - Overall progress percentage across all lessons
 * - Count of completed lessons
 * - Count of in-progress lessons
 * - Count of remaining/not-started lessons
 * 
 * Used for implementing EPIC 6 dashboard features:
 * - Progress percentage display (6.1.2)
 * - Remaining lesson counts (6.6.1-6.6.2)
 * - Overall learning statistics
 * 
 * @async
 * @function getSummary
 * @returns {Promise<Object>} Summary object with progress statistics
 * @returns {number} return.progressPercentage - Overall completion percentage (0-100)
 * @returns {number} return.completedCount - Number of completed lessons
 * @returns {number} return.inProgressCount - Number of started but incomplete lessons
 * @returns {number} return.remainingCount - Number of not-started lessons
 * @throws {Error} If network error occurs
 */
// Fetch summary totals for progress percentage and remaining count (EPIC 6.1.2, 6.6.1-6.6.2)
export const getSummary = async () => {
  const response = await api.get('/progress/summary');
  return response.data;
};
