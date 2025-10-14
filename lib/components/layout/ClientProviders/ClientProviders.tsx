'use client';

import { ReactNode } from 'react';
import { QueryProvider } from 'lib/components/providers/QueryProvider';
import { ThemeProvider } from 'lib/contexts/ThemeContext';
import { MUIProvider } from '../MUIProvider';
import { AuthProvider } from 'lib/contexts/AuthContext';

export interface ClientProvidersProps {
  children: ReactNode;
}

/**
 * Fournit les providers côté client nécessaires à l'application
 * 
 * 🚀 Ordre des providers (important) :
 * 1. QueryProvider (cache global) - En premier pour être disponible partout
 * 2. ThemeProvider (thème global)
 * 3. MUIProvider (Material-UI)
 * 4. AuthProvider (authentification)
 */
const ClientProviders = ({ children }: ClientProvidersProps) => {
  return (
    <QueryProvider>
      <ThemeProvider>
        <MUIProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </MUIProvider>
      </ThemeProvider>
    </QueryProvider>
  );
};

export default ClientProviders; 


