/**
 * Hook TanStack Query pour infinite scroll des rôles SoD avec cache
 * 
 * Ce hook utilise useInfiniteQuery pour charger progressivement les rôles
 * au scroll, ce qui est optimal pour les pages avec beaucoup de données.
 * 
 * Avantages :
 * - ✅ Chargement progressif (scroll to load)
 * - ✅ Meilleure UX pour grandes listes (pas d'attente)
 * - ✅ Cache TanStack Query utilisé
 * - ✅ Prefetch automatique de la page suivante
 * - ✅ Performance optimale pour pages lourdes
 */

'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import type { SodAnalysisSession, SodSimpleRole } from 'lib/types/sodAnalysis';
import { applyStateToSimpleRoles } from 'lib/utils/sodStateApplication';
import type { SodActionsState } from 'lib/utils/sodStateApplication';

export interface UseSodInfiniteRolesParams {
  /** ID de la session SoD */
  sessionId: string | undefined;
  
  /** Nombre de rôles par page/chunk */
  pageSize: number;
  
  /** État des actions (suppressions/restrictions) */
  actionsState: SodActionsState;
  
  /** Version de l'état (pour invalidation du cache) */
  version: number;
}

export interface UseSodInfiniteRolesReturn {
  /** Tous les rôles chargés jusqu'à maintenant (aplatis) */
  roles: SodSimpleRole[];
  
  /** Fonction pour charger la page suivante */
  loadMore: () => void;
  
  /** Y a-t-il encore des pages à charger ? */
  hasMore: boolean;
  
  /** Chargement de la page suivante en cours */
  isLoadingMore: boolean;
  
  /** Chargement initial */
  isLoading: boolean;
  
  /** Rechargement en cours */
  isFetching: boolean;
  
  /** Erreur */
  error: Error | null;
  
  /** Nombre total de rôles disponibles */
  totalCount: number;
  
  /** Nombre de pages chargées */
  loadedPagesCount: number;
}

/**
 * Hook pour infinite scroll des rôles simples avec cache TanStack Query
 */
export function useSodInfiniteRoles({
  sessionId,
  pageSize,
  actionsState,
  version,
}: UseSodInfiniteRolesParams): UseSodInfiniteRolesReturn {
  const queryClient = useQueryClient();

  // 🎯 Infinite Query pour chargement progressif
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    error,
  } = useInfiniteQuery({
    queryKey: ['sod', sessionId, 'roles', 'simple', 'infinite', pageSize, version],
    queryFn: async ({ pageParam = 0 }) => {
      const queryStart = performance.now();
      console.log('🔄 [INFINITE QUERY] Chargement page:', pageParam, 'Version:', version);
      
      // 1. Récupérer la session complète depuis le cache
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      
      if (!session) {
        console.error('❌ [INFINITE QUERY] Session non trouvée dans cache:', sessionId);
        throw new Error('Session non trouvée dans le cache TanStack Query');
      }

      // 2. Extraire la page demandée
      const allRoles = (session.simpleRoles?.roles || []) as SodSimpleRole[];
      const start = pageParam * pageSize;
      const end = start + pageSize;
      const pageRoles = allRoles.slice(start, end);

      console.log('📊 [INFINITE QUERY] Extraction:', {
        totalRoles: allRoles.length,
        pageParam,
        start,
        end,
        pageRoles: pageRoles.length,
      });

      // 3. Appliquer l'état (une seule fois, puis mis en cache)
      const applyStart = performance.now();
      const rolesWithState = applyStateToSimpleRoles(pageRoles, actionsState);
      const applyDuration = performance.now() - applyStart;

      const queryDuration = performance.now() - queryStart;
      console.log('✅ [INFINITE QUERY] Page chargée en:', queryDuration.toFixed(2), 'ms', {
        applyDuration: applyDuration.toFixed(2) + 'ms',
        rolesProcessed: rolesWithState.length,
        pageParam,
      });

      return {
        roles: rolesWithState,
        nextCursor: end < allRoles.length ? pageParam + 1 : undefined,
        totalCount: allRoles.length,
        pageParam,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // ✅ Aplatir toutes les pages chargées en un seul tableau
  const allLoadedRoles = useMemo(() => {
    if (!data) return [];
    const roles = data.pages.flatMap(page => page.roles);
    console.log('📦 [INFINITE] Rôles chargés:', {
      pagesLoaded: data.pages.length,
      rolesLoaded: roles.length,
      totalAvailable: data.pages[0]?.totalCount || 0,
    });
    return roles;
  }, [data]);

  // 🔍 LOG : Cache hit/miss
  useEffect(() => {
    if (data && !isLoading) {
      if (!isFetching && !isFetchingNextPage) {
        console.log('⚡ [INFINITE CACHE HIT] Données depuis cache', {
          pagesInCache: data.pages.length,
          rolesInCache: allLoadedRoles.length,
        });
      }
    }
  }, [data, isLoading, isFetching, isFetchingNextPage, allLoadedRoles.length]);

  return {
    roles: allLoadedRoles,
    loadMore: fetchNextPage,
    hasMore: hasNextPage ?? false,
    isLoadingMore: isFetchingNextPage,
    isLoading,
    isFetching,
    error: error as Error | null,
    totalCount: data?.pages[0]?.totalCount || 0,
    loadedPagesCount: data?.pages.length || 0,
  };
}

