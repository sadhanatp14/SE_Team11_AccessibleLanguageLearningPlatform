
// Service for lesson-related API calls (fetching and searching lessons)
import api from '../utils/api';

/**
 * Fetch a lesson by MongoDB ObjectId.
 * @param {string} lessonId
 * @returns {Promise<Object>} lesson payload
 */
export const getLessonById = async (lessonId) => {
  const response = await api.get(`/lessons/${lessonId}`);
  return response.data.lesson;
};

/**
 * Search lessons by query string.
 * @param {string} query
 * @returns {Promise<Array>} lesson list
 */
export const searchLessons = async (query) => {
  const response = await api.get('/lessons/search', {
    params: { q: query },
  });
  return response.data.lessons || [];
};
