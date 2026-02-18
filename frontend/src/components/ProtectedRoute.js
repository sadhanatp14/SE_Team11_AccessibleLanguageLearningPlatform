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
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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

  // EPIC 1.2.3: Frontend route protection (redirect unauthenticated users to login)
  // `replace` avoids leaving a protected URL in browser history.
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
