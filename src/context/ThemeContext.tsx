/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'alexandria_codex_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const setThemeMode = (mode: ThemeMode) => {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage errors
    }
    window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 320);
  };

  useEffect(() => {
    const updateTheme = () => {
      let resolved: EffectiveTheme = 'dark';
      if (themeMode === 'light') {
        resolved = 'light';
      } else if (themeMode === 'dark') {
        resolved = 'dark';
      } else {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      setEffectiveTheme(resolved);

      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.setAttribute('data-theme', resolved);
      root.style.colorScheme = resolved;
    };

    updateTheme();

    // Listen for OS system theme changes if in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (themeMode === 'system') {
        updateTheme();
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [themeMode]);

  return (
    <ThemeContext.Provider value={{ themeMode, effectiveTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
