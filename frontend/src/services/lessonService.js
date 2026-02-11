
// Service for lesson-related API calls (fetching and searching lessons)
import api from '../utils/api';

// Fetch a lesson by its ID
export const getLessonById = async (lessonId) => {
  const response = await api.get(`/lessons/${lessonId}`);
  return response.data.lesson;
};

// Search for lessons matching a query string
export const searchLessons = async (query) => {
  const response = await api.get('/lessons/search', {
    params: { q: query },
  });
  return response.data.lessons || [];
};
