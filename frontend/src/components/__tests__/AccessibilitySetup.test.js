import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AccessibilitySetup from '../AccessibilitySetup';

// Mock auth + preferences hooks so tests can control the active learning condition
// without depending on AuthProvider localStorage + network side effects.
const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth(),
}));

global.__accessibilitySetupUpdatePreferencesMock = global.__accessibilitySetupUpdatePreferencesMock || jest.fn();
const mockUpdatePreferences = global.__accessibilitySetupUpdatePreferencesMock;
jest.mock('../../context/PreferencesContext', () => {
    const React = require('react');
    const defaultValue = {
        preferences: { preferredLanguage: 'english' },
    };
    const PreferencesContext = React.createContext(defaultValue);
    return {
        PreferencesContext,
        usePreferences: () => ({ updatePreferences: mockUpdatePreferences }),
    };
});

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

const renderAccessibilitySetup = (userCondition = 'dyslexia') => {
    mockUseAuth.mockReturnValue({
        user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
            learningCondition: userCondition,
        },
    });

    return render(
        <BrowserRouter>
            <AccessibilitySetup />
        </BrowserRouter>
    );
};

describe('AccessibilitySetup Component', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
        mockUpdatePreferences.mockReset();
        mockUpdatePreferences.mockResolvedValue({ success: true });
    });

    it('should render setup wizard', () => {
        renderAccessibilitySetup();

        expect(screen.getByText(/customize your experience/i)).toBeInTheDocument();
        expect(screen.getByText(/visual settings/i)).toBeInTheDocument();
    });

    it('should display progress bar', () => {
        const { container } = renderAccessibilitySetup();
        const progressSteps = container.querySelectorAll('.progress-step');
        expect(progressSteps.length).toBeGreaterThan(0);
    });

    it('should show visual settings on first step', () => {
        renderAccessibilitySetup();

        expect(screen.getByText(/text size/i)).toBeInTheDocument();
        expect(screen.getByText(/color theme/i)).toBeInTheDocument();
    });

    it('should show dyslexia-specific options for dyslexia users', () => {
        renderAccessibilitySetup('dyslexia');

        expect(screen.getByText(/font style/i)).toBeInTheDocument();
        expect(screen.getByText(/letter spacing/i)).toBeInTheDocument();
    });

    it('should not show dyslexia options for non-dyslexia users', () => {
        renderAccessibilitySetup('adhd');

        expect(screen.queryByText(/font style/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/letter spacing/i)).not.toBeInTheDocument();
    });

    it('should allow selecting text size', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup();

        // Use exact match to avoid matching both "Large" and "Extra large".
        const largeButton = screen.getByRole('button', { name: /^large$/i });
        await user.click(largeButton);

        expect(largeButton).toHaveClass('active');
    });

    it('should allow selecting color theme', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup();

        const highContrastButton = screen.getByRole('button', {
            name: /high contrast/i,
        });
        await user.click(highContrastButton);

        expect(highContrastButton).toHaveClass('active');
    });

    it('should navigate to next step', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup('adhd'); // ADHD users have multiple steps

        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);

        // Should show learning preferences step
        expect(screen.getByText(/learning preferences/i)).toBeInTheDocument();
    });

    it('should navigate back to previous step', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup('adhd');

        // Go to next step
        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);

        // Go back
        const backButton = screen.getByRole('button', { name: /back/i });
        await user.click(backButton);

        // Should be back on visual settings
        expect(screen.getByText(/text size/i)).toBeInTheDocument();
    });

    it('should show ADHD-specific options for ADHD users', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup('adhd');

        // Navigate to learning preferences step
        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);

        expect(screen.getByText(/learning pace/i)).toBeInTheDocument();
    });

    it('should show autism-specific options for autism users', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup('autism');

        // Navigate to focus & environment step
        const nextButton = screen.getByRole('button', { name: /next/i });
        await user.click(nextButton);

        expect(screen.getByText(/focus & environment/i)).toBeInTheDocument();
        expect(screen.getByText(/distraction-free mode/i)).toBeInTheDocument();
        expect(screen.getByText(/reduce animations/i)).toBeInTheDocument();
    });

    it('should allow toggling checkboxes for autism settings', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup('autism');

        // Navigate to focus step
        await user.click(screen.getByRole('button', { name: /next/i }));

        const distractionCheckbox = screen.getByRole('checkbox', {
            name: /enable distraction-free mode/i,
        });

        // Should be checked by default for autism users
        expect(distractionCheckbox).toBeChecked();

        // Uncheck it
        await user.click(distractionCheckbox);
        expect(distractionCheckbox).not.toBeChecked();
    });

    it('should save preferences on completion', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup('dyslexia');

        // Select some preferences
        await user.click(screen.getByRole('button', { name: /^large$/i }));

        // Complete setup
        const continueButton = screen.getByRole('button', { name: /continue/i });
        await user.click(continueButton);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('should allow skipping setup', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup();

        const skipButton = screen.getByRole('button', { name: /skip setup/i });
        await user.click(skipButton);

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('should show correct number of steps for each condition', () => {
        // Dyslexia: 1 step (visual only)
        const { container: c1, unmount: unmount1 } = renderAccessibilitySetup('dyslexia');
        expect(c1.querySelectorAll('.progress-step')).toHaveLength(1);
        unmount1();

        // ADHD: 2 steps (visual + learning)
        const { container: c2, unmount: unmount2 } = renderAccessibilitySetup('adhd');
        expect(c2.querySelectorAll('.progress-step')).toHaveLength(2);
        unmount2();

        // Autism: 2 steps (visual + focus)
        const { container: c3 } = renderAccessibilitySetup('autism');
        expect(c3.querySelectorAll('.progress-step')).toHaveLength(2);
    });

    it('should show save button on final step', async () => {
        const user = userEvent.setup();
        renderAccessibilitySetup('adhd');

        // Navigate to final step
        await user.click(screen.getByRole('button', { name: /next/i }));

        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('should not show back button on first step', () => {
        renderAccessibilitySetup();

        expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    });

    it('should have default values based on learning condition', () => {
        renderAccessibilitySetup('dyslexia');

        // OpenDyslexic should be selected by default for dyslexia users
        const opendyslexicButton = screen.getByRole('button', {
            name: /opendyslexic/i,
        });
        expect(opendyslexicButton).toHaveClass('active');
    });
});
