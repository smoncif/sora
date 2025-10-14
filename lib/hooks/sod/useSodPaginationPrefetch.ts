'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook pour prefetch les données de pagination SoD
 * Option 1 : Prefetch simple des données de page
 */
export function useSodPaginationPrefetch() {
  const queryClient = useQueryClient();

  const prefetchSodPage = useCallback((page: number, pageSize: number = 5, actualRoles?: any[]) => {
    const queryKey = ['analysis', 'sod', 'page', page, pageSize];
    

    // ✅ Prefetch les données de la page spécifique
    queryClient.prefetchQuery({
      queryKey,
      queryFn: async () => {

        // ✅ Utiliser les vraies données si disponibles, sinon simulation rapide
        if (actualRoles && actualRoles.length > 0) {
          const start = page * pageSize;
          const end = start + pageSize;
          const rolesSlice = actualRoles.slice(start, end);
          
          
          return {
            roles: rolesSlice,
            totalCount: actualRoles.length,
            page,
            pageSize,
            totalPages: Math.ceil(actualRoles.length / pageSize),
            lastUpdated: new Date().toISOString(),
          };
        }
        
        // Fallback : simulation rapide (seulement si pas de vraies données)
        await new Promise(resolve => setTimeout(resolve, 10)); // Très court délai
        
        const start = page * pageSize;
        const end = start + pageSize;
        
        // Simulation légère pour les cas où on n'a pas encore les vraies données
        const mockRoles = Array.from({ length: 40 }, (_, i) => ({
          id: i + 1,
          name: `Mock Role ${i + 1}`,
          description: `Description mock ${i + 1}`,
          actions: [`mock_action_${i}`],
          resources: [`mock_resource_${i}`],
        }));

        const result = {
          roles: mockRoles.slice(start, end),
          totalCount: mockRoles.length,
          page,
          pageSize,
          totalPages: Math.ceil(mockRoles.length / pageSize),
          lastUpdated: new Date().toISOString(),
        };


        return result;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    });
  }, [queryClient]);

  const prefetchAdjacentPages = useCallback((
    currentPage: number, 
    pageSize: number = 5, 
    prefetchRange: number = 2,
    actualRoles?: any[]
  ) => {
    // ✅ Prefetch les pages adjacentes (avant et après)
    const pagesToPrefetch = [];
    
    // Pages précédentes
    for (let i = Math.max(0, currentPage - prefetchRange); i < currentPage; i++) {
      pagesToPrefetch.push(i);
    }
    
    // Pages suivantes
    for (let i = currentPage + 1; i <= currentPage + prefetchRange; i++) {
      pagesToPrefetch.push(i);
    }
    
    // Prefetch toutes les pages en parallèle
    pagesToPrefetch.forEach(page => {
      prefetchSodPage(page, pageSize, actualRoles);
    });
  }, [prefetchSodPage]);

  const prefetchNextPage = useCallback((currentPage: number, pageSize: number = 5, actualRoles?: any[]) => {
    const nextPage = currentPage + 1;
    // ✅ Prefetch seulement la page suivante (plus léger)
    prefetchSodPage(nextPage, pageSize, actualRoles);
  }, [prefetchSodPage]);

  const prefetchPreviousPage = useCallback((currentPage: number, pageSize: number = 5, actualRoles?: any[]) => {
    // ✅ Prefetch seulement la page précédente
    if (currentPage > 0) {
      const prevPage = currentPage - 1;
      prefetchSodPage(prevPage, pageSize, actualRoles);
    }
  }, [prefetchSodPage]);

  return {
    prefetchSodPage,
    prefetchAdjacentPages,
    prefetchNextPage,
    prefetchPreviousPage,
  };
}
