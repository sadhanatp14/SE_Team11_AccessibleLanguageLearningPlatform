/**
 * Lesson Service Module
 * 
 * Provides API service functions for lesson-related operations including:
 * - Fetching individual lessons by ID
 * - Multi-language support for UI and content
 * - Lesson search functionality
 * 
 * This service handles communication with the backend /api/lessons endpoints
 * and supports internationalization (i18n) for accessible language learning.
 * 
 * Key Features:
 * - Separate UI and content language parameters
 * - MongoDB ObjectId-based lesson retrieval
 * - Query-based lesson search
 * 
 * @module services/lessonService
 * @requires utils/api
 * @author SE_Team11
 * @version 1.0.0
 */

// Service for lesson-related API calls (fetching and searching lessons)
import api from '../utils/api';

/**
 * Fetch a lesson by MongoDB ObjectId with UI language localization
 * 
 * Retrieves a complete lesson object including all sections, interactions,
 * and metadata. The UI language parameter localizes interface elements.
 * 
 * @async
 * @function getLessonById
 * @param {string} lessonId - MongoDB ObjectId of the lesson
 * @param {string} uiLanguage - Language code for UI localization (e.g., 'en', 'es')
 * @returns {Promise<Object>} Lesson payload with localized UI elements
 * @throws {Error} If lesson not found or network error occurs
 */
export const getLessonById = async (lessonId, uiLanguage) => {
  const response = await api.get(`/lessons/${lessonId}`, {
    params: { lang: uiLanguage },
  });
  return response.data.lesson;
};

/**
 * Fetch a lesson with separate UI and content language parameters
 * 
 * Advanced lesson retrieval that supports dual-language localization:
 * - `uiLanguage` (lang): Localizes scaffolding text like titles, questions, hints
 * - `contentLanguage` (contentLang): Localizes teaching content like multiple-choice options
 * 
 * This is particularly useful for language learning scenarios where the UI
 * should be in the user's native language while the lesson content is in
 * the target learning language.
 * 
 * @async
 * @function getLessonByIdWithContentLang
 * @param {string} lessonId - MongoDB ObjectId of the lesson
 * @param {string} uiLanguage - Language code for UI scaffolding (e.g., 'en')
 * @param {string} contentLanguage - Language code for lesson content (e.g., 'es')
 * @returns {Promise<Object>} Lesson payload with dual-language localization
 * @throws {Error} If lesson not found or network error occurs
 * @example
 * // UI in English, content in Spanish for Spanish learners
 * const lesson = await getLessonByIdWithContentLang('507f1f77bcf86cd799439011', 'en', 'es');
 */
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
 * Search for lessons using a query string
 * 
 * Performs a search across lesson titles, descriptions, and metadata
 * to find relevant lessons matching the query. Results are localized
 * based on the UI language parameter.
 * 
 * Search is typically implemented using text indexes on the backend
 * for efficient full-text search capabilities.
 * 
 * @async
 * @function searchLessons
 * @param {string} query - Search query string (e.g., "basic greetings")
 * @param {string} uiLanguage - Language code for result localization
 * @returns {Promise<Array<Object>>} Array of matching lesson objects, empty array if none found
 * @throws {Error} If network error occurs
 * @example
 * // Search for greeting lessons in English
 * const results = await searchLessons('hello greetings', 'en');
 */
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
