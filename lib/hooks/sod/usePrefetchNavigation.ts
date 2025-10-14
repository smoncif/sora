'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefetchRoleAnalysis } from 'lib/hooks/analysis/useRoleAnalysisQuery';
import { usePrefetchUserAnalysis } from 'lib/hooks/analysis/useUserAnalysisQuery';
import { usePrefetchSodAnalysis } from 'lib/hooks/sod/useSodAnalysisDataQuery';

/**
 * Hook pour prefetch les données nécessaires lors de la navigation
 */
export function usePrefetchNavigation() {
  const queryClient = useQueryClient();
  const { prefetchRoleAnalysis } = usePrefetchRoleAnalysis();
  const { prefetchUserAnalysis } = usePrefetchUserAnalysis();
  const { prefetchSodAnalysis } = usePrefetchSodAnalysis();

  const prefetchForRoute = useCallback((href: string) => {
    switch (href) {
      case '/dashboard/analysis/sod':
        // Prefetch l'analyse SoD (cohérent avec les autres pages)
        prefetchSodAnalysis();
        break;

      case '/dashboard/analysis/roles':
        // Prefetch l'analyse des rôles
        prefetchRoleAnalysis();
        break;

      case '/dashboard/analysis/users':
        // Prefetch l'analyse des utilisateurs
        prefetchUserAnalysis();
        break;

      default:
        // Pas de prefetch pour les autres routes
        break;
    }
  }, [queryClient, prefetchRoleAnalysis, prefetchUserAnalysis, prefetchSodAnalysis]);

  return { prefetchForRoute };
}
