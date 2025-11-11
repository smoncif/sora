import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { lightTheme, darkTheme } from '@/config/theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: typeof lightTheme;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const THEME_STORAGE_KEY = 'sora-theme-mode';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  // Charger le mode depuis le localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (savedMode && ['light', 'dark'].includes(savedMode)) {
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
    setThemeMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setThemeMode]);

  // Déterminer si le thème actuel est sombre
  const isDark = mode === 'dark';

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



