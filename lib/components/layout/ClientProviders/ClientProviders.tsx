'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'lib/contexts/ThemeContext';
import { MUIProvider } from '../MUIProvider';
import { AuthProvider } from 'lib/contexts/AuthContext';

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


