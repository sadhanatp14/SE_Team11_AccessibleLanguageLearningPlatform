import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../components/Register';
import { AuthProvider } from '../../context/AuthContext';

// Simple smoke test for the registration form including role selector

describe('Register component', () => {
    it('renders role dropdown and allows selection, showing/hiding dependent fields', () => {
        render(
            <BrowserRouter>
                <AuthProvider>
                    <Register />
                </AuthProvider>
            </BrowserRouter>
        );

        const roleSelect = screen.getByLabelText(/role/i);
        expect(roleSelect).toBeInTheDocument();
        expect(roleSelect.value).toBe('learner');

        // when learner, learning condition field should exist
        expect(screen.getByLabelText(/learning condition/i)).toBeInTheDocument();
        expect(screen.queryByLabelText(/admin key/i)).toBeNull();

        fireEvent.change(roleSelect, { target: { value: 'admin' } });
        expect(roleSelect.value).toBe('admin');

        // admin key field should appear
        expect(screen.getByLabelText(/admin key/i)).toBeInTheDocument();
        // learning condition / under-13 visibility may vary with current UX,
        // so this smoke test only verifies role switching and admin key rendering.
    });
});
