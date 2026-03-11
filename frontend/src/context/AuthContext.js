/**
 * AuthContext - Authentication State Provider
 * 
 * Global authentication context providing user session management
 * across the entire application via React Context API.
 * 
 * Core Features:
 * - JWT token-based authentication
 * - Login/Register/Logout flows
 * - Session persistence via localStorage
 * - Server-side token verification on mount
 * - User state broadcasting to all consumers
 * - Loading and error state management
 * 
 * Exposed via useAuth() hook:
 * - user: Current user object
 * - isAuthenticated: Boolean auth status
 * - loading: Auth loading state
 * - error: Auth error message
 * - login(email, password): Login handler
 * - register(userData): Registration handler
 * - logout(): Logout handler
 * 
 * Related EPICs:
 * - EPIC 1.2: User authentication
 * - EPIC 1.7: Session persistence
 * 
 * @module context/AuthContext
 * @requires utils/api - Axios HTTP client
 * @author SE_Team11
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import {
  isWebAuthnSupported,
  prepareCreationOptions,
  prepareRequestOptions,
  serializeLoginCredential,
  serializeRegistrationCredential,
} from '../utils/webauthn';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // EPIC 1.2.4 / 1.7.4: Session persistence via localStorage + server verification
  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Verify token is still valid
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (err) {
          console.error('Token validation failed:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const register = async (userData) => {
    try {
      setError(null);
      // EPIC 1.1.1: Registration UI delegates to backend registration endpoint
      const response = await api.post('/auth/register', userData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true, user };
    } catch (err) {
      // Prefer a server-provided message
      const resp = err.response?.data;
      let message = 'Registration failed';
      if (resp) {
        if (Array.isArray(resp.errors) && resp.errors.length > 0) {
          message = resp.errors.map((e) => e.msg || e.message).join(' - ');
        } else if (resp.message) {
          message = resp.message;
        }
      }
      setError(message);
      return { success: false, error: message };
    }
  };

  const setupFingerprint = async () => {
    try {
      if (!isWebAuthnSupported()) {
        return { success: false, error: 'Fingerprint authentication is not supported on this device' };
      }

      const optionsResponse = await api.post('/auth/fingerprint/register/options');
      const { requestId, publicKey } = optionsResponse.data;
      const credential = await navigator.credentials.create({
        publicKey: prepareCreationOptions(publicKey),
      });

      if (!credential) {
        return { success: false, error: 'Fingerprint setup was cancelled' };
      }

      await api.post('/auth/fingerprint/register/verify', {
        requestId,
        credential: serializeRegistrationCredential(credential),
      });

      const me = await api.get('/auth/me');
      const refreshedUser = me.data.user;
      setUser(refreshedUser);
      localStorage.setItem('user', JSON.stringify(refreshedUser));

      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Fingerprint setup failed';
      return { success: false, error: message };
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      // EPIC 1.2.1: Login UI delegates to backend login endpoint
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const loginWithFingerprint = async (email) => {
    try {
      if (!isWebAuthnSupported()) {
        return { success: false, error: 'Fingerprint authentication is not supported on this device' };
      }

      const optionsResponse = await api.post('/auth/fingerprint/login/options', { email });
      const { requestId, publicKey } = optionsResponse.data;
      const credential = await navigator.credentials.get({
        publicKey: prepareRequestOptions(publicKey),
      });

      if (!credential) {
        return { success: false, error: 'Fingerprint login was cancelled' };
      }

      const verifyResponse = await api.post('/auth/fingerprint/login/verify', {
        email,
        requestId,
        credential: serializeLoginCredential(credential),
      });

      const { token, user: authenticatedUser } = verifyResponse.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      setUser(authenticatedUser);

      return { success: true, user: authenticatedUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Fingerprint login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // EPIC 1.2: JWT logout is client-side (token removal); endpoint exists for auditing/consistency
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const isAdmin = user?.role === 'admin';

  const value = {
    user,
    loading,
    error,
    register,
    setupFingerprint,
    login,
    loginWithFingerprint,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
