'use client';

import { ReactNode } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useTheme } from '@/hooks/useTheme';

export interface MUIProviderProps {
  children: ReactNode;
}

/**
 * Fournit le contexte de thème Material-UI à l'application
 * Supporte automatiquement le basculement entre thème clair et sombre
 */
const MUIProvider = ({ children }: MUIProviderProps) => {
  const { theme } = useTheme();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default MUIProvider; 

