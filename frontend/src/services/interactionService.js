/**
 * Interaction Service Module
 * 
 * Manages user interactions within lessons including:
 * - Submitting answers for interactive elements (quizzes, exercises)
 * - Requesting contextual help and hints
 * - Processing feedback responses
 * 
 * Interactive elements include:
 * - Multiple choice questions
 * - Fill-in-the-blank exercises
 * - Pronunciation practice
 * - Matching activities
 * 
 * All interactions are tracked for progress monitoring and difficulty adjustment.
 * 
 * @module services/interactionService
 * @requires utils/api
 * @author SE_Team11
 * @version 1.0.0
 */

// Service for interaction-related API calls (submitting answers, requesting help)
import api from '../utils/api';

/**
 * Submit a user's answer for an interactive element
 * 
 * Sends the learner's response to the backend for evaluation and feedback.
 * The backend validates the answer, tracks the interaction for progress,
 * and may adjust difficulty based on performance patterns.
 * 
 * Response includes:
 * - isCorrect: boolean indicating if answer was correct
 * - feedback: localized feedback message
 * - explanation: detailed explanation (if applicable)
 * - score: numerical score (for graded interactions)
 * 
 * @async
 * @function submitInteraction
 * @param {Object} params - Interaction submission parameters
 * @param {string} params.lessonId - MongoDB ObjectId of the lesson
 * @param {string} params.interactionId - ID of the specific interaction element
 * @param {*} params.selectedAnswer - User's answer (type varies by interaction type)
 * @param {string} params.uiLanguage - Language code for localized feedback
 * @returns {Promise<Object>} Response with isCorrect, feedback, and additional data
 * @throws {Error} If submission fails or network error occurs
 */
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
 * Request contextual help for an interactive element
 * 
 * Allows learners to request hints or explanations when struggling with
 * an interaction. This supports the guided learning approach by providing
 * scaffolded assistance without directly revealing answers.
 * 
 * Help content is localized based on uiLanguage parameter and may include:
 * - Progressive hints (from subtle to more explicit)
 * - Concept explanations
 * - Example solutions
 * - Strategy suggestions
 * 
 * Help requests are tracked but typically don't negatively impact scoring,
 * encouraging learners to seek assistance when needed.
 * 
 * @async
 * @function requestInteractionHelp
 * @param {Object} params - Help request parameters
 * @param {string} params.lessonId - MongoDB ObjectId of the lesson
 * @param {string} params.interactionId - ID of the interaction needing help
 * @param {string} params.uiLanguage - Language code for localized help content
 * @returns {Promise<Object>} Response with hint/help content
 * @throws {Error} If request fails or network error occurs
 */
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
