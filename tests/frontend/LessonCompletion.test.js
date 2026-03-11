// Unit tests for LessonCompletion (EPIC-6)
// Uses Jest and React Testing Library

import React from 'react'; // React library for functional components
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // Testing utilities for component rendering and interaction
import LessonCompletion from '../../frontend/src/components/LessonCompletion'; // Component under test

// Mock the progress service module to return fixed dummy records instead of actual API calls
jest.mock('../../frontend/src/services/progressService', () => ({
  completeLesson: jest.fn(() => Promise.resolve({ success: true })), // Mock successful lesson completion submission
}));

describe('LessonCompletion (EPIC-6)', () => { // Defines the testing block for evaluating lesson completion feedback
  it('calls progress API automatically', async () => {
    // Render the LessonCompletion component
    render(<LessonCompletion lessonId="lesson1" />);
    // Verify that the completion API is triggered automatically leading to a success message
    expect(await screen.findByText(/Success/i)).toBeInTheDocument();
  });

  it('shows encouraging success message', async () => {
    // Render the LessonCompletion component
    render(<LessonCompletion lessonId="lesson2" />);
    // Verify that the success message uses an encouraging tone
    expect(await screen.findByText(/Congratulations|Well done|Success/i)).toBeInTheDocument();
  });

  it('does not show negative messages', async () => {
    // Render the LessonCompletion component
    render(<LessonCompletion lessonId="lesson3" />);
    // Verify the absence of discouraging failure-oriented terms assuming typical flow
    expect(screen.queryByText(/Failed|Error|Try again/i)).toBeNull();
  });

  it('shows “Loading…” while lesson loads', async () => {
    // Render the LessonCompletion component
    render(<LessonCompletion lessonId="lesson4" />);
    // Ensure that a loading indicator is shown initially
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows error message on failure', async () => {
    // Override the mocked service purely for this one test to simulate an API failure
    jest.spyOn(require('../../frontend/src/services/progressService'), 'completeLesson').mockImplementationOnce(() => Promise.reject(new Error('fail')));
    // Render the LessonCompletion component
    render(<LessonCompletion lessonId="lesson5" />);
    // Assert that the component correctly handles API failures by showing an error message
    expect(await screen.findByText(/Error/i)).toBeInTheDocument();
  });

  it('retry button refetches lesson', async () => {
    // Render the LessonCompletion component
    const { getByText } = render(<LessonCompletion lessonId="lesson6" />);
    // Simulate a user clicking the 'Retry' button
    fireEvent.click(getByText(/Retry/i));
    // Verify that the component returns back to a loading state during the refetch
    await waitFor(() => expect(screen.getByText(/Loading/i)).toBeInTheDocument());
  });
});
