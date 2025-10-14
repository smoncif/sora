'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// 🚀 Configuration optimale pour navigation fluide
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ⚡ Données considérées fraîches pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // 🗑️ Garbage collection après 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // 🔄 Refetch automatique désactivé pour navigation fluide
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      
      // ⚠️ Gestion d'erreur améliorée
      retry: 1,
      retryDelay: 1000,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * 🚀 Provider TanStack Query pour optimisation des performances
 * 
 * **Stratégies d'optimisation :**
 * - Cache automatique avec `staleTime` de 5 minutes
 * - Prefetching intelligent pour navigation instantanée
 * - Stale-while-revalidate pour UX fluide
 * - DevTools pour monitoring (dev uniquement)
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* 🔧 DevTools uniquement en développement */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}

// Export pour utilisation dans les composants
export { queryClient };

