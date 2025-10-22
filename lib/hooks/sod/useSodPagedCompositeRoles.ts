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

export interface UseSodPagedCompositeRolesParams {
  /** ID de la session SoD */
  sessionId: string | undefined;
  
  /** Numéro de page (0-based) */
  page: number;
  
  /** Nombre de rôles par page */
  pageSize: number;
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
    queryKey: ['sod', sessionId, 'roles', 'composite', 'page', page, pageSize],
    queryFn: async () => {
      const queryStart = performance.now();
      // Query composite calculation removed
      
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

      // Query composite extraction removed

      // 3. ✅ NOUVELLE LOGIQUE : Retourner directement les données de la session
      // La session TanStack Query contient déjà les bonnes valeurs isDeleted/isRestricted
      // Plus besoin d'appliquer l'état depuis SodActionsContext
      
      const queryDuration = performance.now() - queryStart;
      // Query composite completion removed

      return {
        roles: pageRoles,
        totalCount: allRoles.length,
        page,
        pageSize,
        totalPages: Math.ceil(allRoles.length / pageSize),
        cacheKey: `${sessionId}-composite-${page}-${pageSize}`,
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
        // Cache composite placeholder removed
      } else if (!isFetching) {
        // Cache hit composite removed
      } else {
        // Cache composite miss removed
      }
    }
  }, [data, isPlaceholderData, isFetching, page, isLoading]);

  // ⚡ Prefetch pages adjacentes
  const prefetchAdjacentPages = useCallback(() => {
    if (!sessionId || !data) return;

    const totalPages = data.totalPages;

    // Prefetch page suivante
    if (page + 1 < totalPages) {
      const nextQueryKey = ['sod', sessionId, 'roles', 'composite', 'page', page + 1, pageSize];
      
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
          // ✅ NOUVELLE LOGIQUE : Retourner directement les données de la session
          // La session TanStack Query contient déjà les bonnes valeurs isDeleted/isRestricted

          return {
            roles: pageRoles,
            totalCount: allRoles.length,
            page: page + 1,
            pageSize,
            totalPages: Math.ceil(allRoles.length / pageSize),
            cacheKey: `${sessionId}-composite-${page + 1}-${pageSize}`,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }

    // Prefetch page précédente
    if (page > 0) {
      const prevQueryKey = ['sod', sessionId, 'roles', 'composite', 'page', page - 1, pageSize];
      
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
          // ✅ NOUVELLE LOGIQUE : Retourner directement les données de la session
          // La session TanStack Query contient déjà les bonnes valeurs isDeleted/isRestricted

          return {
            roles: pageRoles,
            totalCount: allRoles.length,
            page: page - 1,
            pageSize,
            totalPages: Math.ceil(allRoles.length / pageSize),
            cacheKey: `${sessionId}-composite-${page - 1}-${pageSize}`,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [sessionId, page, pageSize, data, queryClient]);

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

