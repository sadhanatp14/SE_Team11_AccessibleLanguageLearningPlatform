import React from 'react'; // Import React to render components
import { render, screen, fireEvent } from '@testing-library/react'; // Import Testing Library functions for DOM interaction
import '@testing-library/jest-dom'; // Import standard jest-dom matchers

// Mock the react-router-dom navigation hook
const mockNavigate = jest.fn(); // Create a jest mock function to track navigation attempts
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // Spread actual implementations to not break other router features
    useNavigate: () => mockNavigate, // Replace useNavigate with our mock function
    BrowserRouter: ({ children }) => <div>{children}</div>, // Provide a dummy BrowserRouter to wrap components during tests
}));

// Mock the AuthContext so we can control user roles dynamically in tests
jest.mock('../frontend/src/context/AuthContext', () => ({
    useAuth: jest.fn(), // Mock the useAuth hook exported by AuthContext
}));

import Dashboard from '../frontend/src/components/Dashboard'; // Import the Dashboard component to test
import { useAuth } from '../frontend/src/context/AuthContext'; // Import the mocked context hook for setup

describe('Dashboard', () => { // Start of the Dashboard component test suite
    it('renders admin panel button for admins', () => { // Test to ensure admins see the Admin Panel logic
        // Mock the auth state to simulate an authenticated admin user
        useAuth.mockReturnValue({ user: { role: 'admin', learningCondition: 'none' } });

        // Render the Dashboard component in our virtual DOM
        render(<Dashboard />);

        // Verify that the 'Admin Panel' text/button is present in the document
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();

        // Simulate a user click on the 'Admin Panel' button
        fireEvent.click(screen.getByText('Admin Panel'));

        // Assert that clicking the button triggered navigation to the correct admin users list route
        expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });

    it('does not show admin button for learners', () => { // Test to ensure learners cannot see admin controls
        // Mock the auth state to simulate a typical learner user with a condition
        useAuth.mockReturnValue({ user: { role: 'learner', learningCondition: 'dyslexia' } });

        // Render the Dashboard component
        render(<Dashboard />);

        // Check that 'Admin Panel' text/button is missing, queryByText returns null if not found
        expect(screen.queryByText('Admin Panel')).toBeNull();
    });
});
