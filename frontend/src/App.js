/**
 * Main Application Component for Accessible Language Learning Platform
 * 
 * This component serves as the root of the React application, managing:
 * - Client-side routing with React Router
 * - Authentication context for user sessions
 * - User preferences and accessibility settings
 * - System compatibility checks for browser features
 * 
 * Routes Structure:
 * - Public: /login, /register
 * - Protected: /dashboard, /lessons/:id, /progress, /accessibility-setup, /language
 * - Admin: /admin/users, /admin/users/:id
 * 
 * @component
 * @author SE_Team11
 * @version 2.0.0
 */

// Main application entry point for the frontend
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // Provides authentication context
import { PreferencesProvider } from './context/PreferencesContext'; // Provides user preferences context
import Login from './components/Login'; // Login page
import Register from './components/Register'; // Registration page
import AccessibilitySetup from './components/AccessibilitySetup'; // Accessibility setup wizard
import LanguageSelection from './components/LanguageSelection'; // Language selection screen (EPIC 5.1)
import Dashboard from './components/Dashboard'; // Main dashboard after login
import ProtectedRoute from './components/ProtectedRoute'; // Wrapper for protected routes
import LessonPage from './components/learning/LessonPage'; // Individual lesson view
import LessonLibraryPage from './components/learning/LessonLibraryPage'; // Dedicated page to browse all lessons
import ProgressPage from './components/ProgressPage'; // Progress tracking page
import BadgesPage from './components/BadgesPage';
import GamesPage from './components/learning/GamesPage';
import AdminUsersList from './components/admin/AdminUsersList';
import AdminUserDetail from './components/admin/AdminUserDetail';
import { useI18n } from './utils/i18n';

/**
 * SystemCheck Component
 * 
 * Diagnostic component that monitors and displays warnings for missing browser features.
 * Shows dismissible alerts for:
 * - Missing Text-to-Speech (TTS) support
 * - Missing Voice Recognition support
 * - No available TTS voices
 * 
 * The component automatically updates when TTS voices become available and can be
 * dismissed by the user. Positioned fixed at bottom-right for non-intrusive display.
 * 
 * @component
 * @returns {JSX.Element|null} Warning banner or null if no warnings or dismissed
 */
// Diagnostic Component: Shows system warnings for missing browser features (TTS, voice recognition)
const SystemCheck = () => {
  const [visible, setVisible] = React.useState(true);
  const [warnings, setWarnings] = React.useState([]);
  const { t } = useI18n();

  React.useEffect(() => {
    const updateWarnings = () => {
      const currentWarnings = [];

      // Check for browser support of TTS and voice recognition
      if (!('speechSynthesis' in window)) {
        currentWarnings.push(t('app.ttsNotSupported'));
      }
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        currentWarnings.push(t('app.voiceNotSupported'));
      }

      // Check if any TTS voices are available
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
          currentWarnings.push(t('app.noVoicesWarning'));
        }
      }

      setWarnings(currentWarnings);
    };

    // Initial check
    updateWarnings();

    // Listen for voice changes
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateWarnings;
    }

    // Cleanup
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [t]);

  if (warnings.length === 0 || !visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px',
      background: '#fff3cd', border: '1px solid #ffeeba',
      padding: '15px', borderRadius: '8px', zIndex: 9999,
      maxWidth: '320px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, color: '#856404', fontSize: '14px', fontWeight: '600' }}>{t('app.systemWarnings')}</h4>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none', border: 'none', color: '#856404',
            cursor: 'pointer', fontSize: '16px', padding: '0 4px',
            lineHeight: 1, marginLeft: '10px', opacity: 0.6
          }}
          onMouseOver={e => e.target.style.opacity = 1}
          onMouseOut={e => e.target.style.opacity = 0.6}
        >
          ×
        </button>
      </div>
      {warnings.map((w, i) => (
        <p key={i} style={{ margin: '4px 0', fontSize: '13px', color: '#856404' }}>{w}</p>
      ))}
    </div>
  );
};


/**
 * App Component
 * 
 * Root application component that sets up the entire application structure:
 * 
 * Context Providers (nested order):
 * 1. Router - Handles client-side routing
 * 2. AuthProvider - Manages user authentication state
 * 3. PreferencesProvider - Manages user preferences and accessibility settings
 * 
 * Route Protection:
 * - Public routes: login, register
 * - Protected routes: require authentication
 * - Admin routes: require admin role
 * 
 * System Features:
 * - SystemCheck component monitors browser compatibility
 * - Fallback redirects to login for unmatched routes
 * 
 * @component
 * @returns {JSX.Element} The complete application with routing and providers
 */
// Main App component: Sets up routing and context providers
function App() {
  return (
    <Router>
      {/* Provide authentication context to all children */}
      <AuthProvider>
        {/* Provide user preferences context to all children */}
        <PreferencesProvider>
          {/* Show system warnings if browser features are missing */}
          <SystemCheck />
          <Routes>
            {/* Public Routes (no authentication required) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes (require authentication) */}
            {/* Language selection screen (EPIC 5.1) */}
            <Route
              path="/language"
              element={
                <ProtectedRoute>
                  <LanguageSelection />
                </ProtectedRoute>
              }
            />
            {/* Accessibility setup wizard (EPIC 1.3) */}
            <Route
              path="/accessibility-setup"
              element={
                <ProtectedRoute>
                  <AccessibilitySetup />
                </ProtectedRoute>
              }
            />
            {/* Main dashboard (EPIC 1.4-1.6) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            {/* Progress review page (EPIC 1.7) */}
            <Route
              path="/progress"
              element={
                <ProtectedRoute>
                  <ProgressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/badges"
              element={
                <ProtectedRoute>
                  <BadgesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/games"
              element={
                <ProtectedRoute>
                  <GamesPage />
                </ProtectedRoute>
              }
            />
            {/* Individual lesson page (EPIC 1.4) */}
            <Route
              path="/lessons/:lessonId"
              element={
                <ProtectedRoute>
                  <LessonPage />
                </ProtectedRoute>
              }
            />
            {/* Dedicated all-lessons page */}
            <Route
              path="/lesson-library"
              element={
                <ProtectedRoute>
                  <LessonLibraryPage />
                </ProtectedRoute>
              }
            />
            {/* Admin area */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminUsersList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users/:id"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminUserDetail />
                </ProtectedRoute>
              }
            />

            {/* Default Route: Redirect to login if no match */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </PreferencesProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
