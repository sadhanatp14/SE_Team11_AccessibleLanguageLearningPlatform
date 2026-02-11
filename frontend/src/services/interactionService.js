
// Service for interaction-related API calls (submitting answers, requesting help)
import api from '../utils/api';

// Submit an answer for a specific interaction in a lesson
export const submitInteraction = async ({ lessonId, interactionId, selectedAnswer }) => {
  const response = await api.post('/interactions/submit', {
    lessonId,
    interactionId,
    selectedAnswer,
  });
  return response.data;
};

// Request help for a specific interaction in a lesson
export const requestInteractionHelp = async ({ lessonId, interactionId }) => {
  const response = await api.post('/interactions/help', {
    lessonId,
    interactionId,
  });
  return response.data;
};
