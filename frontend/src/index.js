/**
 * Main Entry Point for Accessible Language Learning Platform
 * 
 * This file initializes the React application and sets up the root render tree.
 * It wraps the application with necessary providers for global state management.
 * 
 * Dependencies:
 * - React 18+ with StrictMode for development checks
 * - ThemeProvider for accessibility theme management
 * 
 * @author SE_Team11
 * @version 1.0.0
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';

// Create the root DOM node for React rendering
// Using React 18's createRoot API for concurrent features
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the application with StrictMode for development warnings
// ThemeProvider wraps the app to provide accessibility theme context
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
