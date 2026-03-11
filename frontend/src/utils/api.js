/**
 * API Utility Module
 * 
 * Configures and exports an Axios instance for all backend API communication.
 * Provides centralized configuration for:
 * - Base URL handling (environment-aware)
 * - Request timeout settings
 * - Authentication token injection
 * - Automatic token expiration handling
 * 
 * Key Features:
 * 
 * 1. Environment Configuration:
 *    - Production: Uses REACT_APP_API_URL from environment
 *    - Development: Uses proxy-relative path (/api)
 * 
 * 2. Request Interceptor:
 *    - Automatically attaches JWT Bearer token from localStorage
 *    - Ensures all authenticated requests include authorization header
 * 
 * 3. Response Interceptor:
 *    - Detects 401 Unauthorized responses (token expiration)
 *    - Automatically clears auth state and redirects to login
 *    - Prevents redirect loops on login page
 * 
 * 4. Standard Configuration:
 *    - 15-second timeout for all requests
 *    - JSON content-type header
 *    - Consistent error handling
 * 
 * Usage:
 *   import api from '../utils/api';
 *   const response = await api.get('/lessons/123');
 *   const data = await api.post('/progress/update', payload);
 * 
 * @module utils/api
 * @requires axios
 * @author SE_Team11
 * @version 1.0.0
 */

import axios from 'axios';

// Use REACT_APP_API_URL if provided (for production/testing), otherwise use the proxy-relative path
const API_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Configured Axios instance for API communication
 * Pre-configured with baseURL, timeout, and interceptors
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * 
 * Automatically injects JWT Bearer token into request headers
 * for authenticated API calls. Token is retrieved from localStorage
 * where it's stored upon successful login.
 */
// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * 
 * Handles authentication errors globally:
 * - Detects 401 Unauthorized responses (expired/invalid tokens)
 * - Clears authentication state from localStorage
 * - Redirects to login page for re-authentication
 * - Prevents redirect loops by checking current location
 * 
 * This ensures users are automatically logged out when their
 * session expires, maintaining security without manual intervention.
 */
// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we are already on the login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
