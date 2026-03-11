// Unit tests for Learning History (EPIC-6.3)
// Uses Jest and React Testing Library

import React from 'react'; // React library for functional components
import { render, screen } from '@testing-library/react'; // Utilities for rendering components and querying DOM nodes
import ProgressPage from '../../frontend/src/components/ProgressPage'; // Component under test

// Mock the progress service module to return fixed dummy records instead of actual API calls
jest.mock('../../frontend/src/services/progressService', () => ({
  getSummary: jest.fn(() => Promise.resolve({
    success: true, // Simulation of successful API response
    completedLessons: [
      { id: 'lesson1', title: 'Lesson 1', completedAt: '2026-02-10T10:00:00Z' }, // First mocked lesson completion
      { id: 'lesson2', title: 'Lesson 2', completedAt: '2026-02-11T10:00:00Z' }  // Second mocked lesson completion
    ],
    totalLessons: 10,
    completedCount: 2,
    remaining: 8,
    percentage: 20
  }))
}));

describe('Learning History (EPIC-6.3)', () => { // Defines the testing block for evaluating learning history UI
  it('displays list of completed lessons', async () => {
    // Render the progress page component
    render(<ProgressPage />);
    // Verify that the mocked lesson histories are parsed and displayed
    expect(await screen.findByText(/Lesson 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/Lesson 2/i)).toBeInTheDocument();
  });

  it('shows lessons in order', async () => {
    // Render the progress page component
    render(<ProgressPage />);
    // Collect all rendered nodes matching the lesson pattern
    const lessons = await screen.findAllByText(/Lesson \d/i);
    // Ascertain that history preserves correctly sorted chronological sequence
    expect(lessons[0]).toHaveTextContent('Lesson 1');
    expect(lessons[1]).toHaveTextContent('Lesson 2');
  });

  it('keeps history read-only (no edits)', async () => {
    // Render the progress page component
    render(<ProgressPage />);
    // Ensure that no controls for editing records are surfaced to learners
    expect(screen.queryByText(/Edit/i)).toBeNull();
  });
});
