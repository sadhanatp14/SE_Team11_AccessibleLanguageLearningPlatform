// Unit tests for Basic Performance Insight (EPIC-6.6)
// Uses Jest and React Testing Library

import React from 'react'; // React library for functional components
import { render, screen } from '@testing-library/react'; // Testing utilities for React components
import ProgressDashboard from '../../frontend/src/components/ProgressDashboard'; // Component under test

// Mock the progress service to provide a deterministic set of data for testing insights
jest.mock('../../frontend/src/services/progressService', () => ({
  getProgressSummary: jest.fn(() => Promise.resolve({
    totalLessons: 10,
    completedLessons: 7,
    remainingLessons: 3,
    percentage: 70,
  })), // Provides stable progress statistics for consistent assertions
}));

describe('Basic Performance Insight (EPIC-6.6)', () => { // Test suite for evaluating insight performance
  it('shows total lessons completed', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Verify that the UI correctly interpolates mock data for completed lessons
    expect(await screen.findByText(/7 \/ 10 lessons completed/i)).toBeInTheDocument();
  });

  it('shows remaining lessons', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Verify that the UI correctly interpolates mock data for remaining lessons
    expect(await screen.findByText(/3 lessons remaining/i)).toBeInTheDocument();
  });

  it('keeps insight text-based (no charts)', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Confirm the absence of visual chart representations to adhere to simplified design logic
    expect(screen.queryByTestId('progress-chart')).toBeNull();
  });

  it('avoids complex analytics', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Confirm the absence of the 'Analytics' terminology to ensure non-complex wording 
    expect(screen.queryByText(/Analytics/i)).toBeNull();
  });
});
