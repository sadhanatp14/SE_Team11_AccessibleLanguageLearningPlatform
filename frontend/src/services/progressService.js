
// Service for progress-related API calls (fetching, updating, and summarizing user progress)
import api from '../utils/api';

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

// Fetch summary totals for progress percentage and remaining count (EPIC 6.1.2, 6.6.1-6.6.2)
export const getSummary = async () => {
  const response = await api.get('/progress/summary');
  return response.data;
};
