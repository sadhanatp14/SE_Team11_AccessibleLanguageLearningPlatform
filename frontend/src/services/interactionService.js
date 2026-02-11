
// Service for interaction-related API calls (submitting answers, requesting help)
import api from '../utils/api';

/**
 * Submit a user's answer for an interaction.
 * @param {{ lessonId: string, interactionId: string, selectedAnswer: any }} params
 * @returns {Promise<any>} API response payload (typically {isCorrect, feedback, ...})
 */
export const submitInteraction = async ({ lessonId, interactionId, selectedAnswer }) => {
  const response = await api.post('/interactions/submit', {
    lessonId,
    interactionId,
    selectedAnswer,
  });
  return response.data;
};

/**
 * Request help (hint/explanation) for an interaction.
 * @param {{ lessonId: string, interactionId: string }} params
 * @returns {Promise<any>} API response payload
 */
export const requestInteractionHelp = async ({ lessonId, interactionId }) => {
  const response = await api.post('/interactions/help', {
    lessonId,
    interactionId,
  });
  return response.data;
};
