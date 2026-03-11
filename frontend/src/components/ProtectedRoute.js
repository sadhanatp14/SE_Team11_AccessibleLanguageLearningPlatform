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
