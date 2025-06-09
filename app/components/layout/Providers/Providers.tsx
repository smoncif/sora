import { ReactNode } from 'react';
import ClientProviders from '@/components/layout/ClientProviders/ClientProviders';

export interface ProvidersProps {
  children: ReactNode;
}

/**
 * Composant wrapper pour fournir les providers nécessaires à l'application
 */
const Providers = ({ children }: ProvidersProps) => {
  return (
    <ClientProviders>
      {children}
    </ClientProviders>
  );
};

export default Providers; 

