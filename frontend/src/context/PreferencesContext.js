import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

export const PreferencesContext = createContext(null);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

export const PreferencesProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  // EPIC 1.7.2: Load persisted preferences after authentication
  // Load preferences when user is authenticated
  useEffect(() => {
    const loadPreferences = async () => {
      if (!isAuthenticated) {
        setPreferences(null);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/preferences');
        setPreferences(response.data.preferences);
        applyPreferences(response.data.preferences);
      } catch (err) {
        console.error('Error loading preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [isAuthenticated]);

  const applyPreferences = (prefs, options = {}) => {
    if (!prefs) return;

    // EPIC 1.3.4 / 1.7.3: Real-time preference application via scoped CSS classes

    // Only apply to learning container if it exists, not to body
    const { containerId = 'learning-container' } = options;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Reset only preference-related classes (preserve other app classes like 'dashboard')
    Array.from(container.classList).forEach((c) => {
      if (
        c.startsWith('theme-') ||
        c.startsWith('font-') ||
        c.startsWith('letter-spacing-') ||
        c.startsWith('word-spacing-') ||
        c.startsWith('line-height-') ||
        c === 'distraction-free' ||
        c === 'reduce-animations' ||
        c === 'motion-enabled'
      ) {
        container.classList.remove(c);
      }
    });
    // Ensure motion-enabled baseline is present
    container.classList.add('motion-enabled');

    // Apply theme
    if (prefs.contrastTheme && prefs.contrastTheme !== 'default') {
      container.classList.add(`theme-${prefs.contrastTheme}`);
    }

    // Apply font family
    if (prefs.fontFamily && prefs.fontFamily !== 'default') {
      container.classList.add(`font-${prefs.fontFamily}`);
    }

    // Apply font size
    if (prefs.fontSize) {
      container.classList.add(`font-${prefs.fontSize}`);
    }

    // Apply letter spacing
    if (prefs.letterSpacing) {
      container.classList.add(`letter-spacing-${prefs.letterSpacing}`);
    }

    // Apply word spacing
    if (prefs.wordSpacing) {
      container.classList.add(`word-spacing-${prefs.wordSpacing}`);
    }

    // Apply line height
    if (prefs.lineHeight) {
      container.classList.add(`line-height-${prefs.lineHeight}`);
    }

    // Apply distraction-free mode (Autism + ADHD)
    const userCondition = container.dataset.userCondition;
    const supportsDistractionFree = userCondition === 'autism' || userCondition === 'adhd';
    if (prefs.distractionFreeMode && supportsDistractionFree) {
      container.classList.add('distraction-free');
    }

    // Apply reduced animations (only meaningful when distraction-free is on)
    if (prefs.reduceAnimations && prefs.distractionFreeMode && supportsDistractionFree) {
      container.classList.add('reduce-animations');
    }

    // Apply simplified layout mode (Epic 5.5)
    if (prefs.simplifiedLayout) {
      container.classList.add('simplified-layout');
    }
  };

  const updatePreferences = async (updates) => {
    try {
      // EPIC 1.3.2 / 1.4.2 / 1.5.1 / 1.6.1: Persist preference changes to backend
      const response = await api.put('/preferences', updates);
      setPreferences(response.data.preferences);
      applyPreferences(response.data.preferences);
      return { success: true };
    } catch (err) {
      console.error('Error updating preferences:', err);
      return { success: false, error: err.response?.data?.message };
    }
  };

  const updateAccessibilitySettings = async (settings) => {
    try {
      const response = await api.patch('/preferences/accessibility', settings);
      setPreferences(response.data.preferences);
      applyPreferences(response.data.preferences);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  };

  const updateDyslexiaSettings = async (settings) => {
    try {
      const response = await api.patch('/preferences/dyslexia', settings);
      setPreferences(response.data.preferences);
      applyPreferences(response.data.preferences);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  };

  const updateADHDSettings = async (settings) => {
    try {
      const response = await api.patch('/preferences/adhd', settings);
      setPreferences(response.data.preferences);
      applyPreferences(response.data.preferences);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  };

  const updateAutismSettings = async (settings) => {
    try {
      const response = await api.patch('/preferences/autism', settings);
      setPreferences(response.data.preferences);
      applyPreferences(response.data.preferences);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  };

  const resetPreferences = async () => {
    try {
      const response = await api.delete('/preferences/reset');
      setPreferences(response.data.preferences);
      applyPreferences(response.data.preferences);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  };

  // EPIC 5.7: Reset language preferences to default
  const resetLanguage = async () => {
    try {
      const response = await api.delete('/preferences/language');
      setPreferences(response.data.preferences);
      applyPreferences(response.data.preferences);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message };
    }
  };

  const value = {
    preferences,
    loading,
    updatePreferences,
    updateAccessibilitySettings,
    updateDyslexiaSettings,
    updateADHDSettings,
    updateAutismSettings,
    resetPreferences,
    resetLanguage,
    applyPreferences,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};
