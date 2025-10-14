'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook TanStack Query pour l'analyse des rôles
 */
export function useRoleAnalysisData() {
  return useQuery({
    queryKey: ['analysis', 'roles'],
    queryFn: async () => {
      // Simulation de données d'analyse des rôles
      // TODO: Remplacer par un vrai appel API
      await new Promise(resolve => setTimeout(resolve, 100)); // Simule un délai réseau court
      
      return {
        roles: [
          { id: 1, name: 'Admin', description: 'Rôle administrateur', permissions: 25 },
          { id: 2, name: 'User', description: 'Rôle utilisateur standard', permissions: 8 },
          { id: 3, name: 'Editor', description: 'Rôle éditeur', permissions: 15 },
        ],
        totalRoles: 3,
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
 * Hook pour prefetch l'analyse des rôles
 */
export function usePrefetchRoleAnalysis() {
  const queryClient = useQueryClient();

  const prefetchRoleAnalysis = () => {
    queryClient.prefetchQuery({
      queryKey: ['analysis', 'roles'],
      queryFn: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          roles: [
            { id: 1, name: 'Admin', description: 'Rôle administrateur', permissions: 25 },
            { id: 2, name: 'User', description: 'Rôle utilisateur standard', permissions: 8 },
            { id: 3, name: 'Editor', description: 'Rôle éditeur', permissions: 15 },
          ],
          totalRoles: 3,
          lastUpdated: new Date().toISOString(),
        };
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchRoleAnalysis };
}
