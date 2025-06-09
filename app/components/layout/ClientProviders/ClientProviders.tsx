'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { MUIProvider } from '@/components/layout/MUIProvider';
import { AuthProvider } from '@/contexts/AuthContext';

export interface ClientProvidersProps {
  children: ReactNode;
}

/**
 * Fournit les providers côté client nécessaires à l'application
 */
const ClientProviders = ({ children }: ClientProvidersProps) => {
  return (
    <ThemeProvider>
    <MUIProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </MUIProvider>
    </ThemeProvider>
  );
};

export default ClientProviders; 


