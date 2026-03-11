// Unit tests for ProgressDashboard (EPIC-6)
// Uses Jest and React Testing Library

import React from 'react'; // React library for functional components
import { render, screen } from '@testing-library/react'; // Testing utilities for component rendering and interaction
import ProgressDashboard from '../../frontend/src/components/ProgressDashboard'; // Component under test

// Mock the progress service module to return fixed dummy records instead of actual API calls
jest.mock('../../frontend/src/services/progressService', () => ({
  getProgressSummary: jest.fn(() => Promise.resolve({
    totalLessons: 10,
    completedLessons: 7,
    remainingLessons: 3,
    percentage: 70,
  })), // Returns consistent metrics for test reliability
}));

describe('ProgressDashboard (EPIC-6)', () => { // Defines the testing block for evaluating the progress dashboard
  it('renders progress summary text', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Verify that the title indicating the summary section renders
    expect(await screen.findByText(/Progress Summary/i)).toBeInTheDocument();
  });

  it('shows completed / total lessons', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Verify that the UI correctly calculates and displays the completed metric
    expect(await screen.findByText(/7 \/ 10 lessons completed/i)).toBeInTheDocument();
  });

  it('shows remaining lessons', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Verify that the UI calculates and displays the remaining metric correctly
    expect(await screen.findByText(/3 lessons remaining/i)).toBeInTheDocument();
  });

  it('does not render charts', async () => {
    // Render the ProgressDashboard component
    render(<ProgressDashboard />);
    // Explicitly confirm the absence of any data visualization charts like progress wheels
    expect(screen.queryByTestId('progress-chart')).toBeNull();
  });
});
