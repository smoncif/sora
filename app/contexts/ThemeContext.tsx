import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Theme } from '@mui/material/styles';
import { lightTheme, darkTheme } from '@/config/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'sora-theme-mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Détecter la préférence système
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Charger le mode depuis le localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
      setMode(savedMode);
    }
  }, []);

  // Sauvegarder le mode dans le localStorage
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  // Basculer entre clair et sombre
  const toggleTheme = useCallback(() => {
    const currentIsDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);
    setThemeMode(currentIsDark ? 'light' : 'dark');
  }, [mode, systemPrefersDark, setThemeMode]);

  // Déterminer si le thème actuel est sombre
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);

  // Sélectionner le thème approprié
  const theme = isDark ? darkTheme : lightTheme;

  const value: ThemeContextValue = {
    theme,
    mode,
    isDark,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext doit être utilisé dans ThemeProvider');
  return ctx;
}; 

