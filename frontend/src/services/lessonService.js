
// Service for lesson-related API calls (fetching and searching lessons)
import api from '../utils/api';

/**
 * Fetch a lesson by MongoDB ObjectId.
 * @param {string} lessonId
 * @returns {Promise<Object>} lesson payload
 */
export const getLessonById = async (lessonId, uiLanguage) => {
  const response = await api.get(`/lessons/${lessonId}`, {
    params: { lang: uiLanguage },
  });
  return response.data.lesson;
};

/**
 * Fetch a lesson by MongoDB ObjectId with separate UI/content languages.
 * `lang` localizes scaffolding text (titles, questions, hints), while `contentLang`
 * localizes teaching content (e.g., multiple-choice options).
 */
export const getLessonByIdWithContentLang = async (lessonId, uiLanguage, contentLanguage) => {
  const response = await api.get(`/lessons/${lessonId}`, {
    params: { lang: uiLanguage, contentLang: contentLanguage },
  });
  return response.data.lesson;
};

/**
 * Search lessons by query string.
 * @param {string} query
 * @returns {Promise<Array>} lesson list
 */
export const searchLessons = async (query, uiLanguage) => {
  const response = await api.get('/lessons/search', {
    params: { q: query, lang: uiLanguage },
  });
  return response.data.lessons || [];
};
