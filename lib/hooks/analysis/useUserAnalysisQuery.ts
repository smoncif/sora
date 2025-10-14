'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook TanStack Query pour l'analyse des utilisateurs
 */
export function useUserAnalysisData() {
  return useQuery({
    queryKey: ['analysis', 'users'],
    queryFn: async () => {
      // Simulation de données d'analyse des utilisateurs
      // TODO: Remplacer par un vrai appel API
      await new Promise(resolve => setTimeout(resolve, 100)); // Simule un délai réseau court
      
      return {
        users: [
          { id: 1, name: 'Jean Dupont', email: 'jean@example.com', roles: ['Admin', 'Editor'], lastLogin: '2024-01-15' },
          { id: 2, name: 'Marie Martin', email: 'marie@example.com', roles: ['User'], lastLogin: '2024-01-14' },
          { id: 3, name: 'Pierre Durand', email: 'pierre@example.com', roles: ['Editor', 'User'], lastLogin: '2024-01-13' },
        ],
        totalUsers: 3,
        lastUpdated: new Date().toISOString(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // ✅ Pas de refetch au focus
    refetchOnMount: false, // ✅ Pas de refetch au mount
    refetchOnReconnect: false, // ✅ Pas de refetch au reconnect
  });
}

/**
 * Hook pour prefetch l'analyse des utilisateurs
 */
export function usePrefetchUserAnalysis() {
  const queryClient = useQueryClient();

  const prefetchUserAnalysis = () => {
    queryClient.prefetchQuery({
      queryKey: ['analysis', 'users'],
      queryFn: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          users: [
            { id: 1, name: 'Jean Dupont', email: 'jean@example.com', roles: ['Admin', 'Editor'], lastLogin: '2024-01-15' },
            { id: 2, name: 'Marie Martin', email: 'marie@example.com', roles: ['User'], lastLogin: '2024-01-14' },
            { id: 3, name: 'Pierre Durand', email: 'pierre@example.com', roles: ['Editor', 'User'], lastLogin: '2024-01-13' },
          ],
          totalUsers: 3,
          lastUpdated: new Date().toISOString(),
        };
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchUserAnalysis };
}
