// Unit tests for Reliable Lesson Loading (EPIC-6.5)
// Uses Jest and React Testing Library

import React from 'react'; // React library for functional components
import { render, screen, fireEvent } from '@testing-library/react'; // Testing utilities for component rendering and interaction
import LessonPage from '../../frontend/src/components/learning/LessonPage'; // Component under test

// Mock the progress service module to return fixed dummy records instead of actual API calls
jest.mock('../../frontend/src/services/progressService', () => ({
  getProgress: jest.fn(() => Promise.resolve({ completed: false })), // Simulate retrieving an incomplete lesson state
  updateProgress: jest.fn(() => Promise.resolve({ completed: true })) // Simulate a successful progress update operation
}));

// Mock the lesson service to supply dummy content instead of fetching from the backend
jest.mock('../../frontend/src/services/lessonService', () => ({
  getLessonById: jest.fn((id) => Promise.resolve({ id, title: `Lesson ${id}` })) // Returns predictable titles based on requested IDs
}));

describe('Reliable Lesson Loading (EPIC-6.5)', () => { // Defines the testing block for evaluating lesson data retrieval
  it('loads lesson content from backend correctly', async () => {
    // Render the LessonPage component
    render(<LessonPage lessonId="lesson1" />);
    // Verify that the mocked lesson response data surfaces within the UI
    expect(await screen.findByText(/Lesson 1/i)).toBeInTheDocument();
  });

  it('shows “Loading…” while lesson loads', async () => {
    // Render the LessonPage component
    render(<LessonPage lessonId="lesson1" />);
    // Ensure that users observe a loading indicator rather than a blank screen during initial fetch
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('shows friendly error message if lesson fails', async () => {
    // Temporarily overwrite the behavior of one function to simulate a simulated network or server failure
    jest.spyOn(require('../../frontend/src/services/lessonService'), 'getLessonById').mockImplementationOnce(() => Promise.reject(new Error('fail')));
    // Render the LessonPage component expecting failure
    render(<LessonPage lessonId="lesson2" />);
    // Confirm that the UI communicates the problem delicately rather than crashing
    expect(await screen.findByText(/Unable to load/i)).toBeInTheDocument();
  });

  it('provides a retry button', async () => {
    // Render the LessonPage component
    render(<LessonPage lessonId="lesson3" />);
    // Assuming the component presents a retry option due to default state or error injection, acquire reference
    const retryBtn = screen.getByText(/Retry/i);
    // Simulate a user attempting to resolve the failure by retrying
    fireEvent.click(retryBtn);
    // Check if the component transitions back to a loading state to reattempt the operation
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});
