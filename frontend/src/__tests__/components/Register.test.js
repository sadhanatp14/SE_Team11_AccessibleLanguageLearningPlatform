import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../components/Register';
import { AuthProvider } from '../../context/AuthContext';

// Simple smoke test for the registration form (admin role is not selectable)

describe('Register component', () => {
    it('renders registration form without admin role selector', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Register />
                </AuthProvider>
            </BrowserRouter>
        );

        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/learning condition/i)).toBeInTheDocument();

        expect(screen.queryByLabelText(/role/i)).toBeNull();
        expect(screen.queryByLabelText(/admin key/i)).toBeNull();
    });
});
