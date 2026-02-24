import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../../components/Register';
import { AuthProvider } from '../../../context/AuthContext';

// Simple smoke test for the registration form including role selector

describe('Register component', () => {
    it('renders role dropdown and allows selection', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Register />
                </AuthProvider>
            </BrowserRouter>
        );

        const roleSelect = screen.getByLabelText(/role/i);
        expect(roleSelect).toBeInTheDocument();

        // default value should be learner
        expect(roleSelect.value).toBe('learner');

        fireEvent.change(roleSelect, { target: { value: 'admin' } });
        expect(roleSelect.value).toBe('admin');
    });
});
