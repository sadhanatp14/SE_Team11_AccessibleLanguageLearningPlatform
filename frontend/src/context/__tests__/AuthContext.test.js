import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { server } from '../../mocks/server';
import { rest } from 'msw';

// Test component to access context
const TestComponent = () => {
    const { user, loading, register, login, logout, isAuthenticated } = useAuth();

    return (
        <div>
            <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
            <div data-testid="authenticated">{isAuthenticated ? 'Yes' : 'No'}</div>
            <div data-testid="user">{user ? user.email : 'No User'}</div>
            <button onClick={() => register({ name: 'Test', email: 'test@example.com', password: 'password123', learningCondition: 'none', role: 'admin', adminKey: 'mock-secret' })}>
                Register
            </button>
            <button onClick={() => login({ email: 'test@example.com', password: 'password123' })}>
                Login
            </button>
            <button onClick={logout}>Logout</button>
        </div>
    );
};

const renderWithAuth = () => {
    return render(
        <BrowserRouter>
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();

        // Default: nothing in storage unless a test provides values
        localStorage.getItem.mockReturnValue(null);
    });

    it('should provide initial state', () => {
        renderWithAuth();

        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
        expect(screen.getByTestId('user')).toHaveTextContent('No User');
    });

    it('should register user and store token', async () => {
        const user = userEvent.setup();
        renderWithAuth();

        const registerButton = screen.getByRole('button', { name: /register/i });
        await user.click(registerButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
        });

        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'user',
            expect.stringContaining('test@example.com')
        );
        // user object should include role
        const saved = JSON.parse(localStorage.setItem.mock.calls.find(c => c[0] === 'user')[1]);
        expect(saved.role).toBe('admin');
    });

    it('should fail to register admin without key', async () => {
        const user = userEvent.setup();
        server.use(
            rest.post('*/api/auth/register', (req, res, ctx) => {
                return res(
                    ctx.status(403),
                    ctx.json({ success: false, message: 'Invalid admin key' })
                );
            })
        );
        renderWithAuth();

        const registerButton = screen.getByRole('button', { name: /register/i });
        await user.click(registerButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
        });
    });


    it('should login user and store token', async () => {
        const user = userEvent.setup();
        renderWithAuth();

        const loginButton = screen.getByRole('button', { name: /login/i });
        await user.click(loginButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
            expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        });

        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token');
    });

    it('should logout user and clear token', async () => {
        const user = userEvent.setup();
        renderWithAuth();

        // First login
        const loginButton = screen.getByRole('button', { name: /login/i });
        await user.click(loginButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
        });

        // Then logout
        const logoutButton = screen.getByRole('button', { name: /logout/i });
        await user.click(logoutButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
            expect(screen.getByTestId('user')).toHaveTextContent('No User');
        });

        expect(localStorage.removeItem).toHaveBeenCalledWith('token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should load user from localStorage on mount', async () => {
        // Set up localStorage with user data
        localStorage.getItem.mockImplementation((key) => {
            if (key === 'token') return 'mock-jwt-token';
            if (key === 'user') return JSON.stringify({ email: 'stored@example.com', id: 'stored-id' });
            return null;
        });

        renderWithAuth();

        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        });

        // Should validate token with server
        await waitFor(() => {
            expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        });
    });

    it('should clear invalid token from localStorage', async () => {
        // Set up invalid token
        localStorage.getItem.mockImplementation((key) => {
            if (key === 'token') return 'invalid-token';
            if (key === 'user') return JSON.stringify({ email: 'test@example.com' });
            return null;
        });

        // Avoid JSDOM navigation errors if the axios interceptor tries to redirect on 401
        window.history.pushState({}, 'Login', '/login');

        // Mock server to reject invalid token
        server.use(
            rest.get('*/api/auth/me', (req, res, ctx) => {
                return res(
                    ctx.status(401),
                    ctx.json({ success: false, message: 'Invalid token' })
                );
            })
        );

        renderWithAuth();

        await waitFor(() => {
            expect(localStorage.removeItem).toHaveBeenCalledWith('token');
            expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('No User');
    });

    it('should handle registration errors', async () => {
        const user = userEvent.setup();
        // Mock registration error
        server.use(
            rest.post('*/api/auth/register', (req, res, ctx) => {
                return res(
                    ctx.status(400),
                    ctx.json({ success: false, message: 'Email already exists' })
                );
            })
        );

        renderWithAuth();

        const registerButton = screen.getByRole('button', { name: /register/i });
        await user.click(registerButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
        });

        // MSW may use localStorage internally; ensure app auth keys were not set.
        expect(localStorage.setItem).not.toHaveBeenCalledWith('token', expect.anything());
        expect(localStorage.setItem).not.toHaveBeenCalledWith('user', expect.anything());
    });

    it('should handle login errors', async () => {
        const user = userEvent.setup();

        // Force login to fail even for the default credentials used by TestComponent
        server.use(
            rest.post('*/api/auth/login', (req, res, ctx) => {
                return res(
                    ctx.status(401),
                    ctx.json({ success: false, message: 'Invalid credentials' })
                );
            })
        );

        renderWithAuth();

        const loginButton = screen.getByRole('button', { name: /login/i });
        await user.click(loginButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
        });
    });

    it('should set loading state during operations', async () => {
        const user = userEvent.setup();
        renderWithAuth();

        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');

        const loginButton = screen.getByRole('button', { name: /login/i });
        await user.click(loginButton);

        // Eventually should finish loading
        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
        });
    });

    it('should throw error when useAuth is used outside provider', () => {
        // Suppress console.error for this test
        const originalError = console.error;
        console.error = jest.fn();

        expect(() => {
            render(<TestComponent />);
        }).toThrow('useAuth must be used within an AuthProvider');

        console.error = originalError;
    });

    it('should update isAuthenticated based on user state', async () => {
        const user = userEvent.setup();
        renderWithAuth();

        expect(screen.getByTestId('authenticated')).toHaveTextContent('No');

        const loginButton = screen.getByRole('button', { name: /login/i });
        await user.click(loginButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('Yes');
        });
    });

    it('should handle network errors gracefully', async () => {
        const user = userEvent.setup();
        // Mock network error
        server.use(
            rest.post('*/api/auth/login', (req, res) => {
                return res.networkError('Failed to connect');
            })
        );

        renderWithAuth();

        const loginButton = screen.getByRole('button', { name: /login/i });
        await user.click(loginButton);

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('No');
        });
    });
});
