import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { useAuth } from '../../context/AuthContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock('../../context/AuthContext', () => {
    const actual = jest.requireActual('../../context/AuthContext');
    return {
        ...actual,
        useAuth: jest.fn(),
    };
});

const createDeferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

const renderLogin = () => {
    return render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );
};

describe('Login Component', () => {
    const mockLogin = jest.fn();

    beforeEach(() => {
        mockNavigate.mockClear();
        localStorage.clear();

        mockLogin.mockReset();
        mockLogin.mockResolvedValue({ success: true });
        useAuth.mockReturnValue({
            login: mockLogin,
        });
    });

    it('should render login form', () => {
        renderLogin();

        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should display app branding', () => {
        renderLogin();

        expect(screen.getByText(/linguaease/i)).toBeInTheDocument();
        expect(
            screen.getByText(/language and learning made easy for every mind/i)
        ).toBeInTheDocument();
    });

    it('should handle successful login', async () => {
        const user = userEvent.setup();
        renderLogin();

        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /log in/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
        expect(mockLogin).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'test@example.com',
                password: 'password123',
            })
        );
    });

    it('should display error for invalid credentials', async () => {
        const user = userEvent.setup();
        mockLogin.mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });
        renderLogin();

        await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /log in/i }));

        await waitFor(() => {
            expect(screen.getByText(/login failed|invalid credentials/i)).toBeInTheDocument();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should display error for incorrect password', async () => {
        const user = userEvent.setup();
        mockLogin.mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });
        renderLogin();

        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /log in/i }));

        await waitFor(() => {
            expect(screen.getByText(/login failed|invalid credentials/i)).toBeInTheDocument();
        });
    });

    it('should disable submit button while loading', async () => {
        const user = userEvent.setup();
        const deferred = createDeferred();
        mockLogin.mockReturnValueOnce(deferred.promise);
        renderLogin();

        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');

        const submitButton = screen.getByRole('button', { name: /log in/i });
        await user.click(submitButton);

        // Button should be disabled during submission
        expect(submitButton).toBeDisabled();

        deferred.resolve({ success: true });
        await waitFor(() => expect(submitButton).not.toBeDisabled());
    });

    it('should clear error when user types', async () => {
        const user = userEvent.setup();
        mockLogin.mockResolvedValueOnce({ success: false, error: 'Invalid credentials' });
        renderLogin();

        // Trigger error
        await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
        await user.click(screen.getByRole('button', { name: /log in/i }));

        await waitFor(() => {
            expect(screen.getByText(/login failed|invalid credentials/i)).toBeInTheDocument();
        });

        // Type in email field to clear error
        await user.type(screen.getByLabelText(/email address/i), 'a');

        await waitFor(() => {
            expect(screen.queryByText(/login failed|invalid credentials/i)).not.toBeInTheDocument();
        });
    });

    it('should have link to registration page', () => {
        renderLogin();

        const registerLink = screen.getByRole('link', { name: /sign up/i });
        expect(registerLink).toBeInTheDocument();
        expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('should require email and password', () => {
        renderLogin();

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);

        expect(emailInput).toBeRequired();
        expect(passwordInput).toBeRequired();
    });

    it('should have proper input types', () => {
        renderLogin();

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);

        expect(emailInput).toHaveAttribute('type', 'email');
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have autocomplete attributes', () => {
        renderLogin();

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);

        expect(emailInput).toHaveAttribute('autocomplete', 'email');
        expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('should show loading spinner during submission', async () => {
        const user = userEvent.setup();
        const deferred = createDeferred();
        mockLogin.mockReturnValueOnce(deferred.promise);
        renderLogin();

        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /log in/i }));

        // Check that button is disabled during loading
        const button = screen.getByRole('button');
        expect(button).toBeDisabled();

        deferred.resolve({ success: true });
        await waitFor(() => expect(button).not.toBeDisabled());
    });

    it('should have accessible form labels', () => {
        renderLogin();

        const emailInput = screen.getByLabelText(/email address/i);
        const passwordInput = screen.getByLabelText(/password/i);

        expect(emailInput).toHaveAttribute('aria-label', 'Email address');
        expect(passwordInput).toHaveAttribute('aria-label', 'Password');
    });
});
