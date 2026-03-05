
// Service for lesson section-related API calls (fetching lesson sections)
import api from '../utils/api';

/**
 * Fetch all sections for a given lesson.
 * @param {string} lessonId
 * @returns {Promise<Array>} ordered lesson section objects
 */
export const getLessonSections = async (lessonId, uiLanguage) => {
  const response = await api.get(`/lessons/${lessonId}/sections`, {
    params: { lang: uiLanguage },
  });
  return response.data.sections || [];
};

/**
 * Fetch all sections for a given lesson with separate UI/content languages.
 */
export const getLessonSectionsWithContentLang = async (lessonId, uiLanguage, contentLanguage) => {
  const response = await api.get(`/lessons/${lessonId}/sections`, {
    params: { lang: uiLanguage, contentLang: contentLanguage },
  });
  return response.data.sections || [];
};
