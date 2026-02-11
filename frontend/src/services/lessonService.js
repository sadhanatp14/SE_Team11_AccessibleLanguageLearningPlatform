
// Service for lesson-related API calls (fetching and searching lessons)
import api from '../utils/api';

  // Fetch a lesson by its ID
  const response = await api.get(`/lessons/${lessonId}`);
  return response.data.lesson;
};

  // Search for lessons matching a query string
  const response = await api.get('/lessons/search', {
    params: { q: query },
  });
  return response.data.lessons || [];
};
