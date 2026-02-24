import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../Register';

const mockRegister = jest.fn();
jest.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ register: mockRegister }),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const renderRegister = () => {
    return render(
        <BrowserRouter>
            <Register />
        </BrowserRouter>
    );
};

const createDeferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

describe('Register Component', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
        mockRegister.mockReset();
        localStorage.clear();
    });

    it('should render registration form', () => {
        renderRegister();

        expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/learning condition/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create.*account/i })).toBeInTheDocument();
    });

    it('should show parent email field when minor checkbox is checked', async () => {
        const user = userEvent.setup();
        renderRegister();

        const minorCheckbox = screen.getByRole('checkbox', {
            name: /i am under 13 years old/i,
        });

        await user.click(minorCheckbox);

        expect(screen.getByLabelText(/parent\/guardian email/i)).toBeInTheDocument();
    });

    it('should hide parent email field when minor checkbox is unchecked', async () => {
        const user = userEvent.setup();
        renderRegister();

        const minorCheckbox = screen.getByRole('checkbox', {
            name: /i am under 13 years old/i,
        });

        // Check and then uncheck
        await user.click(minorCheckbox);
        await user.click(minorCheckbox);

        expect(screen.queryByLabelText(/parent\/guardian email/i)).not.toBeInTheDocument();
    });

    it('should validate password matching', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValue({ success: false, error: 'Registration failed' });
        renderRegister();

        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });
    });

    it('should validate password length', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValue({ success: false, error: 'Registration failed' });
        renderRegister();

        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/^password/i), '123');
        await user.type(screen.getByLabelText(/confirm password/i), '123');
        await user.selectOptions(screen.getByLabelText(/learning condition/i), 'dyslexia');
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(
                screen.getByText(/password must be at least 6 characters/i)
            ).toBeInTheDocument();
        });
    });

    it('should require parent email for minors', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValue({ success: false, error: 'Registration failed' });
        renderRegister();

        await user.type(screen.getByLabelText(/full name/i), 'Minor User');
        await user.type(screen.getByLabelText(/email address/i), 'minor@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'password123');
        await user.selectOptions(screen.getByLabelText(/learning condition/i), 'dyslexia');
        await user.click(
            screen.getByRole('checkbox', { name: /i am under 13 years old/i })
        );
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(
                screen.getByText(/parent email is required for minor accounts/i)
            ).toBeInTheDocument();
        });
    });

    it('should handle successful registration', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValue({ success: true });
        renderRegister();

        await user.type(screen.getByLabelText(/full name/i), 'New User');
        await user.type(screen.getByLabelText(/email address/i), 'newuser@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'password123');
        await user.selectOptions(screen.getByLabelText(/learning condition/i), 'dyslexia');
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/language', { state: { next: '/accessibility-setup' } });
        });

        expect(mockRegister).toHaveBeenCalled();
    });

    it('should display error for duplicate email', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValue({
            success: false,
            error: 'User already exists with this email',
        });
        renderRegister();

        await user.type(screen.getByLabelText(/full name/i), 'Existing User');
        await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'password123');
        await user.selectOptions(screen.getByLabelText(/learning condition/i), 'dyslexia');
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(
                screen.getByText(/user already exists with this email/i)
            ).toBeInTheDocument();
        });
    });

    it('should disable submit button while loading', async () => {
        const user = userEvent.setup();
        const deferred = createDeferred();
        mockRegister.mockReturnValue(deferred.promise);
        renderRegister();

        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'password123');
        await user.selectOptions(screen.getByLabelText(/learning condition/i), 'dyslexia');

        const submitButton = screen.getByRole('button', { name: /create.*account/i });
        await user.click(submitButton);

        // Button should be disabled while the registration promise is pending
        await waitFor(() => expect(submitButton).toBeDisabled());

        deferred.resolve({ success: false, error: 'Registration failed' });
    });

    it('should clear error when user types', async () => {
        const user = userEvent.setup();
        renderRegister();

        // Trigger validation error
        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'different');
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        });

        // Type in a field to clear error
        await user.type(screen.getByLabelText(/full name/i), 'Test');

        await waitFor(() => {
            expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
        });
    });

    it('should validate age range', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValue({ success: false, error: 'Registration failed' });
        renderRegister();

        await user.type(screen.getByLabelText(/full name/i), 'Test User');
        await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'password123');
        await user.selectOptions(screen.getByLabelText(/learning condition/i), 'dyslexia');
        await user.type(screen.getByLabelText(/age/i), '150');
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(screen.getByText(/please enter a valid age/i)).toBeInTheDocument();
        });
    });

    it('should enforce parental approval for users under 13', async () => {
        const user = userEvent.setup();
        mockRegister.mockResolvedValue({ success: false, error: 'Registration failed' });
        renderRegister();

        await user.type(screen.getByLabelText(/full name/i), 'Young User');
        await user.type(screen.getByLabelText(/email address/i), 'young@example.com');
        await user.type(screen.getByLabelText(/^password/i), 'password123');
        await user.type(screen.getByLabelText(/confirm password/i), 'password123');
        await user.selectOptions(screen.getByLabelText(/learning condition/i), 'dyslexia');
        await user.type(screen.getByLabelText(/age/i), '11');
        await user.click(screen.getByRole('button', { name: /create.*account/i }));

        await waitFor(() => {
            expect(
                screen.getByText(/if you are under 13.*parental approval/i)
            ).toBeInTheDocument();
        });
    });

    it('should have link to login page', () => {
        renderRegister();

        const loginLink = screen.getByRole('link', { name: /log in/i });
        expect(loginLink).toBeInTheDocument();
        expect(loginLink).toHaveAttribute('href', '/login');
    });
});
