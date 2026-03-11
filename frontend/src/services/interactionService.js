
// Service for interaction-related API calls (submitting answers, requesting help)
import api from '../utils/api';

/**
 * Submit a user's answer for an interaction.
 * @param {{ lessonId: string, interactionId: string, selectedAnswer: any }} params
 * @returns {Promise<any>} API response payload (typically {isCorrect, feedback, ...})
 */
export const submitInteraction = async ({ lessonId, interactionId, selectedAnswer, uiLanguage }) => {
  const response = await api.post('/interactions/submit', {
    lessonId,
    interactionId,
    selectedAnswer,
    uiLanguage,
  });
  return response.data;
};

/**
 * Request help (hint/explanation) for an interaction.
 * @param {{ lessonId: string, interactionId: string }} params
 * @returns {Promise<any>} API response payload
 */
export const requestInteractionHelp = async ({ lessonId, interactionId, uiLanguage }) => {
  const response = await api.post('/interactions/help', {
    lessonId,
    interactionId,
    uiLanguage,
  });
  return response.data;
};
