import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// simple mocks for router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }) => <div>{children}</div>,
}));

// mock api module used by admin components
jest.mock('../../src/utils/api', () => ({
    get: jest.fn(),
}));

import AdminUsersList from '../../src/components/admin/AdminUsersList';
import AdminUserDetail from '../../src/components/admin/AdminUserDetail';
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { useAuth } from '../../src/context/AuthContext';

// mock auth context for role checking
jest.mock('../frontend/src/context/AuthContext', () => ({
    useAuth: jest.fn(),
}));

const sampleUsers = [
    { id: '1', name: 'Alice', learningCondition: 'dyslexia' },
    { id: '2', name: 'Bob', learningCondition: 'adhd' },
];

const sampleDetail = {
    user: { id: '1', name: 'Alice', learningCondition: 'dyslexia' },
    summary: { totalLessons: 5, completedCount: 2, remaining: 3, completedLessons: [] },
    interactions: [],
};

describe('Admin pages', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('ProtectedRoute blocks non-admin users', () => {
        useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'learner' }, loading: false });
        const { container } = render(
            <ProtectedRoute roles={["admin"]}>
                <div>secret</div>
            </ProtectedRoute>
        );
        // since learner not allowed, should redirect (navigate called by wrapper)
        expect(container.innerHTML).not.toContain('secret');
    });

    it('AdminUsersList renders users from API', async () => {
        useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'admin' }, loading: false });
        const api = require('../frontend/src/utils/api');
        api.get.mockResolvedValue({ data: { users: sampleUsers } });

        render(<AdminUsersList />);
        await waitFor(() => {
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
        });
    });

    it('AdminUserDetail shows fallback when no interactions', async () => {
        useAuth.mockReturnValue({ isAuthenticated: true, user: { role: 'admin' }, loading: false });
        const api = require('../frontend/src/utils/api');
        api.get.mockResolvedValue({ data: sampleDetail });

        // override useParams helper to supply id
        const rrd = require('react-router-dom');
        rrd.useParams = () => ({ id: '1' });

        render(<AdminUserDetail />);
        await waitFor(() => expect(screen.getByText('Disability:')).toBeInTheDocument());
    });
});
