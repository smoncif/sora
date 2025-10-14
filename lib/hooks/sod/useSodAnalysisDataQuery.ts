'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook TanStack Query pour l'analyse SoD (cohérent avec useRoleAnalysisData et useUserAnalysisData)
 */
export function useSodAnalysisData() {
  return useQuery({
    queryKey: ['analysis', 'sod'],
    queryFn: async () => {
      // Simulation de données d'analyse SoD
      // TODO: Remplacer par un vrai appel API
      await new Promise(resolve => setTimeout(resolve, 100)); // Simule un délai réseau court
      
      return {
        sessions: [
          { id: 1, name: 'Session Admin 2024', status: 'completed', risksFound: 15, lastUpdated: '2024-01-15' },
          { id: 2, name: 'Session User 2024', status: 'in_progress', risksFound: 8, lastUpdated: '2024-01-14' },
          { id: 3, name: 'Session Editor 2024', status: 'pending', risksFound: 0, lastUpdated: '2024-01-13' },
        ],
        totalSessions: 3,
        totalRisks: 23,
        lastUpdated: new Date().toISOString(),
      };
    },
    enabled: true, // ✅ Toujours activé pour éviter les refetches
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // ✅ Pas de refetch au focus
    refetchOnMount: false, // ✅ Pas de refetch au mount
    refetchOnReconnect: false, // ✅ Pas de refetch au reconnect
  });
}

/**
 * Hook pour prefetch l'analyse SoD (cohérent avec usePrefetchRoleAnalysis et usePrefetchUserAnalysis)
 */
export function usePrefetchSodAnalysis() {
  const queryClient = useQueryClient();

  const prefetchSodAnalysis = () => {
    queryClient.prefetchQuery({
      queryKey: ['analysis', 'sod'],
      queryFn: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          sessions: [
            { id: 1, name: 'Session Admin 2024', status: 'completed', risksFound: 15, lastUpdated: '2024-01-15' },
            { id: 2, name: 'Session User 2024', status: 'in_progress', risksFound: 8, lastUpdated: '2024-01-14' },
            { id: 3, name: 'Session Editor 2024', status: 'pending', risksFound: 0, lastUpdated: '2024-01-13' },
          ],
          totalSessions: 3,
          totalRisks: 23,
          lastUpdated: new Date().toISOString(),
        };
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchSodAnalysis };
}
