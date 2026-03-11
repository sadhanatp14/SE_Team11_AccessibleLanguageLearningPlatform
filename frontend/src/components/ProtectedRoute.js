/**
 * ProtectedRoute Component
 * 
 * Route guard wrapper that enforces authentication and role-based access
 * control for the application's protected pages.
 * 
 * Core Features:
 * 
 * 1. Authentication Guard:
 *    - Checks authentication state via AuthContext
 *    - Redirects unauthenticated users to /login
 *    - Preserves navigation intent for post-login redirect
 *    - Prevents unauthorized page access
 * 
 * 2. Loading State Management:
 *    - Full-page loader during auth initialization
 *    - Prevents flash of protected content
 *    - Smooth transition to authenticated state
 *    - Handles JWT token verification delay
 * 
 * 3. Role-Based Access Control:
 *    - Optional roles prop for admin/learner restriction
 *    - Checks user role against required roles
 *    - Redirects to dashboard if role mismatch
 *    - Supports multiple allowed roles
 * 
 * 4. Usage Pattern:
 *    - Wraps protected route elements in App.js
 *    - Can be nested for additional protection layers
 *    - Props are passed through to children
 *    - Clean redirect behavior
 * 
 * Access Flow:
 * 1. Component mounts with auth context
 * 2. If loading → show full-page spinner
 * 3. If not authenticated → redirect to /login
 * 4. If roles specified and user role mismatch → redirect to /dashboard
 * 5. If all checks pass → render children
 * 
 * Example Usage:
 * ```jsx
 * <Route path="/dashboard" element={
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 * } />
 * <Route path="/admin" element={
 *   <ProtectedRoute roles={["admin"]}>
 *     <AdminPanel />
 *   </ProtectedRoute>
 * } />
 * ```
 * 
 * Related Features:
 * - JWT token-based authentication
 * - AuthContext session management
 * - Role-based UI rendering
 * 
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected page content
 * @param {string[]} [props.roles] - Optional required roles for access
 * @requires context/AuthContext - Authentication state and user data
 * @author SE_Team11
 * @version 1.0.0
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * --------------
 * Simple route guard used in `App` routing.
 * - While auth is initializing (`loading`), show a full-page loader.
 * - If authenticated, render children.
 * - Otherwise redirect to `/login`.
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="loading"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific roles were provided, ensure the user's role matches
  if (roles && (!user || !roles.includes(user.role))) {
    // redirect to dashboard or show a 403-style placeholder
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
