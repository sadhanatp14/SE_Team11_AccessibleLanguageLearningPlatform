import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }) => <div>{children}</div>,
}));

jest.mock('../frontend/src/context/AuthContext', () => ({
    useAuth: jest.fn(),
}));

import Dashboard from '../frontend/src/components/Dashboard';
import { useAuth } from '../frontend/src/context/AuthContext';

describe('Dashboard', () => {
    it('renders admin panel button for admins', () => {
        useAuth.mockReturnValue({ user: { role: 'admin', learningCondition: 'none' } });
        render(<Dashboard />);
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Admin Panel'));
        expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
    });

    it('does not show admin button for learners', () => {
        useAuth.mockReturnValue({ user: { role: 'learner', learningCondition: 'dyslexia' } });
        render(<Dashboard />);
        expect(screen.queryByText('Admin Panel')).toBeNull();
    });
});
