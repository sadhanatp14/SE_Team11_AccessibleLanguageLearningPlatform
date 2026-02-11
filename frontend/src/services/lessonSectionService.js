
// Service for lesson section-related API calls (fetching lesson sections)
import api from '../utils/api';

  // Fetch all sections for a given lesson
  const response = await api.get(`/lessons/${lessonId}/sections`);
  return response.data.sections || [];
};
