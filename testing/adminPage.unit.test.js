import React from 'react'; // Import React for component rendering
import { render, screen, waitFor, fireEvent } from '@testing-library/react'; // Import React Testing Library utilities
import '@testing-library/jest-dom'; // Import custom jest matchers for DOM testing

// simple mocks for router
const mockNavigate = jest.fn(); // Mock function for navigation
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'), // Keep original implementations for other exports
    useNavigate: () => mockNavigate, // Mock the useNavigate hook
    BrowserRouter: ({ children }) => <div>{children}</div>, // Mock BrowserRouter to just render children
}));

// mock api module used by admin components
jest.mock('../../src/utils/api', () => ({
    get: jest.fn(), // Mock the GET method of the API utility
}));

import AdminUsersList from '../../src/components/admin/AdminUsersList'; // Import the AdminUsersList component
import AdminUserDetail from '../../src/components/admin/AdminUserDetail'; // Import the AdminUserDetail component
import ProtectedRoute from '../../src/components/ProtectedRoute'; // Import the ProtectedRoute component
import { useAuth } from '../../src/context/AuthContext'; // Import the useAuth hook for testing authentication states

// mock auth context for role checking
jest.mock('../frontend/src/context/AuthContext', () => ({
    useAuth: jest.fn(), // Mock the useAuth hook globally
}));
//using an array of objects
const sampleUsers = [
    { id: '1', name: 'Alice', learningCondition: 'dyslexia' }, // Sample user 1
    { id: '2', name: 'Bob', learningCondition: 'adhd' }, // Sample user 2
];

//storing sample details here
const sampleDetail = {
    user: { id: '1', name: 'Alice', learningCondition: 'dyslexia' }, // User details
    summary: { totalLessons: 5, completedCount: 2, remaining: 3, completedLessons: [] }, // Learning summary
    interactions: [], // Empty interactions array for testing fallback
};

describe('Admin pages', () => { // Test suite for Admin pages
    beforeEach(() => {
        mockNavigate.mockClear(); // Clear the mock navigation before each test
    });

    it('ProtectedRoute blocks non-admin users', () => { // Test case for access control
        // Mock a learner user trying to access an admin route
        useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'learner' }, loading: false });
        const { container } = render(
            <ProtectedRoute roles={["admin"]}>
                <div>secret</div>
            </ProtectedRoute>
        );
        // since learner not allowed, should redirect (navigate called by wrapper)
        // Verify that the restricted content ('secret') is not rendered
        expect(container.innerHTML).not.toContain('secret');
    });

    it('AdminUsersList renders users from API', async () => { // Test case for user list rendering
        // Mock an admin user successfully authenticated
        useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'admin' }, loading: false });
        const api = require('../frontend/src/utils/api');

        // Mock the API response to return the sample users
        api.get.mockResolvedValue({ data: { users: sampleUsers } });

        render(<AdminUsersList />); // Render the AdminUsersList component

        // Wait for the components to update and check if the user names are displayed
        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });
    });

    it('AdminUserDetail shows fallback when no interactions', async () => { // Test case for user details 
        // Mock an admin user successfully authenticated
        useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'admin' }, loading: false });
        const api = require('../frontend/src/utils/api');

        // Mock the API response to return the sample detail (with empty interactions)
        api.get.mockResolvedValue({ data: sampleDetail });

        // override useParams helper to supply id
        const rrd = require('react-router-dom');
        rrd.useParams = () => ({ id: '1' }); // Mock the URL parameter ID

        render(<AdminUserDetail />); // Render the AdminUserDetail component

        // Wait for the specific detail label to be in the document
        await waitFor(() => expect(screen.getByText('Disability:')).toBeInTheDocument());
    });
});
