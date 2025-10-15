/**
 * Hook TanStack Query pour pagination des rôles composites SoD avec cache
 * 
 * Identique à useSodPagedRoles mais pour les rôles composites.
 * Utilise applyStateToCompositeRoles au lieu de applyStateToSimpleRoles.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import type { SodAnalysisSession, SodCompositeRole } from 'lib/types/sodAnalysis';
import { applyStateToCompositeRoles } from 'lib/utils/sodStateApplication';
import type { SodActionsState } from 'lib/utils/sodStateApplication';

export interface UseSodPagedCompositeRolesParams {
  /** ID de la session SoD */
  sessionId: string | undefined;
  
  /** Numéro de page (0-based) */
  page: number;
  
  /** Nombre de rôles par page */
  pageSize: number;
  
  /** État des actions (suppressions/restrictions) */
  actionsState: SodActionsState;
  
  /** Version de l'état (pour invalidation du cache) */
  version: number;
}

export interface UseSodPagedCompositeRolesReturn {
  /** Rôles composites de la page actuelle (avec état appliqué) */
  roles: SodCompositeRole[];
  
  /** Nombre total de rôles composites */
  totalCount: number;
  
  /** Nombre total de pages */
  totalPages: number;
  
  /** Chargement initial */
  isLoading: boolean;
  
  /** Rechargement en cours */
  isFetching: boolean;
  
  /** Erreur */
  error: Error | null;
  
  /** Fonction pour prefetch les pages adjacentes */
  prefetchAdjacentPages: () => void;
}

/**
 * Hook pour pagination des rôles composites avec cache TanStack Query
 */
export function useSodPagedCompositeRoles({
  sessionId,
  page,
  pageSize,
  actionsState,
  version,
}: UseSodPagedCompositeRolesParams): UseSodPagedCompositeRolesReturn {
  const queryClient = useQueryClient();

  // 🎯 Query pour la page actuelle
  const {
    data,
    isLoading,
    isFetching,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['sod', sessionId, 'roles', 'composite', 'page', page, pageSize, version],
    queryFn: async () => {
      const queryStart = performance.now();
      console.log('🔄 [QUERY COMPOSITE] CALCUL DES DONNÉES - Page:', page, 'Version:', version);
      
      // 1. Récupérer la session complète depuis le cache
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      
      if (!session) {
        console.error('❌ [QUERY COMPOSITE] Session non trouvée dans cache:', sessionId);
        throw new Error('Session non trouvée dans le cache TanStack Query');
      }

      // 2. Extraire la page demandée
      const allRoles = (session.compositeRoles?.roles || []) as SodCompositeRole[];
      const start = page * pageSize;
      const end = start + pageSize;
      const pageRoles = allRoles.slice(start, end);

      console.log('📊 [QUERY COMPOSITE] Extraction:', {
        totalRoles: allRoles.length,
        page,
        start,
        end,
        pageRoles: pageRoles.length,
      });

      // 3. Appliquer l'état (une seule fois, puis mis en cache)
      const applyStart = performance.now();
      const rolesWithState = applyStateToCompositeRoles(pageRoles, actionsState);
      const applyDuration = performance.now() - applyStart;

      const queryDuration = performance.now() - queryStart;
      console.log('✅ [QUERY COMPOSITE] Données calculées en:', queryDuration.toFixed(2), 'ms', {
        applyDuration: applyDuration.toFixed(2) + 'ms',
        rolesProcessed: rolesWithState.length,
      });

      return {
        roles: rolesWithState,
        totalCount: allRoles.length,
        page,
        pageSize,
        totalPages: Math.ceil(allRoles.length / pageSize),
        cacheKey: `${sessionId}-composite-${page}-${pageSize}-${version}`,
      };
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  // 🔍 LOG : Source des données (CACHE HIT/MISS)
  useEffect(() => {
    if (data && !isLoading) {
      if (isPlaceholderData) {
        console.log('📦 [CACHE COMPOSITE] Données placeholder (cache vide) - Page:', page);
      } else if (!isFetching) {
        console.log('⚡ [CACHE HIT COMPOSITE] Données depuis cache - Page:', page, {
          cacheKey: data.cacheKey,
          rolesCount: data.roles.length,
          version,
        });
      } else {
        console.log('🔄 [CACHE MISS COMPOSITE] Rechargement - Page:', page);
      }
    }
  }, [data, isPlaceholderData, isFetching, page, isLoading, version]);

  // ⚡ Prefetch pages adjacentes
  const prefetchAdjacentPages = useCallback(() => {
    if (!sessionId || !data) return;

    const totalPages = data.totalPages;

    // Prefetch page suivante
    if (page + 1 < totalPages) {
      const nextQueryKey = ['sod', sessionId, 'roles', 'composite', 'page', page + 1, pageSize, version];
      
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: async () => {
          console.log('📥 [PREFETCH COMPOSITE] Page suivante:', page + 1);
          
          const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
          if (!session) return null;

          const allRoles = (session.compositeRoles?.roles || []) as SodCompositeRole[];
          const start = (page + 1) * pageSize;
          const end = start + pageSize;
          const pageRoles = allRoles.slice(start, end);
          const rolesWithState = applyStateToCompositeRoles(pageRoles, actionsState);

          return {
            roles: rolesWithState,
            totalCount: allRoles.length,
            page: page + 1,
            pageSize,
            totalPages: Math.ceil(allRoles.length / pageSize),
            cacheKey: `${sessionId}-composite-${page + 1}-${pageSize}-${version}`,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }

    // Prefetch page précédente
    if (page > 0) {
      const prevQueryKey = ['sod', sessionId, 'roles', 'composite', 'page', page - 1, pageSize, version];
      
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: async () => {
          console.log('📥 [PREFETCH COMPOSITE] Page précédente:', page - 1);
          
          const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
          if (!session) return null;

          const allRoles = (session.compositeRoles?.roles || []) as SodCompositeRole[];
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const pageRoles = allRoles.slice(start, end);
          const rolesWithState = applyStateToCompositeRoles(pageRoles, actionsState);

          return {
            roles: rolesWithState,
            totalCount: allRoles.length,
            page: page - 1,
            pageSize,
            totalPages: Math.ceil(allRoles.length / pageSize),
            cacheKey: `${sessionId}-composite-${page - 1}-${pageSize}-${version}`,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [sessionId, page, pageSize, data, queryClient, actionsState, version]);

  return {
    roles: data?.roles || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    isFetching,
    error: error as Error | null,
    prefetchAdjacentPages,
  };
}

