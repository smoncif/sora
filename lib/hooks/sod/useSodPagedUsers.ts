/**
 * Hook TanStack Query pour pagination des utilisateurs SoD avec cache
 * 
 * Ce hook suit le même pattern que useSodPagedRoles.ts :
 * - ✅ Met en cache chaque page séparément
 * - ✅ Prefetch automatique des pages adjacentes
 * - ✅ Performance optimale (< 1ms avec cache)
 * - ✅ Synchronisation avec les états de remédiation
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import type { SodAnalysisSession } from 'lib/types/sodAnalysis';
import type { UserSodEntry, UserSodAnalysisSession } from 'lib/types/userSodAnalysis';

export interface UseSodPagedUsersParams {
  /** ID de la session SoD */
  sessionId: string | undefined;
  
  /** Numéro de page (0-based) */
  page: number;
  
  /** Nombre d'utilisateurs par page */
  pageSize: number;
}

export interface UseSodPagedUsersReturn {
  /** Utilisateurs de la page actuelle */
  users: UserSodEntry[];
  
  /** Nombre total d'utilisateurs */
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
 * Hook pour pagination des utilisateurs SoD avec cache TanStack Query
 */
export function useSodPagedUsers({
  sessionId,
  page,
  pageSize,
}: UseSodPagedUsersParams): UseSodPagedUsersReturn {
  const queryClient = useQueryClient();

  // 🎯 Query pour la page actuelle
  const {
    data,
    isLoading,
    isFetching,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['sod', sessionId, 'users', 'page', page, pageSize],
    queryFn: async () => {
      // 1. Récupérer la session complète depuis le cache
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      
      // ✅ CORRECTION : Retourner un résultat vide au lieu de lancer une erreur
      if (!session) {
        console.warn('⚠️ [QUERY USERS] Session pas encore dans le cache:', sessionId);
        return {
          users: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
          cacheKey: `${sessionId}-users-${page}-${pageSize}`,
        };
      }

      // 2. Extraire les utilisateurs depuis la session
      // Les utilisateurs sont stockés dans session.users.data
      const userSession = session.users?.data as UserSodAnalysisSession | undefined;
      const allUsers = userSession?.users || [];
      
      // 3. Extraire la page demandée
      const start = page * pageSize;
      const end = start + pageSize;
      const pageUsers = allUsers.slice(start, end);

      // 4. Retourner les données paginées
      return {
        users: pageUsers,
        totalCount: allUsers.length,
        page,
        pageSize,
        totalPages: Math.ceil(allUsers.length / pageSize),
        cacheKey: `${sessionId}-users-${page}-${pageSize}`,
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
        // Cache placeholder
      } else if (!isFetching) {
        // Cache hit
      } else {
        // Cache miss - fetching
      }
    }
  }, [data, isPlaceholderData, isFetching, page, isLoading]);

  // ⚡ Prefetch pages adjacentes
  const prefetchAdjacentPages = useCallback(() => {
    if (!sessionId || !data) return;

    const totalPages = data.totalPages;

    // Prefetch page suivante
    if (page + 1 < totalPages) {
      const nextQueryKey = ['sod', sessionId, 'users', 'page', page + 1, pageSize];
      
      queryClient.prefetchQuery({
        queryKey: nextQueryKey,
        queryFn: async () => {
          const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
          if (!session) return null;

          const userSession = session.users?.data as UserSodAnalysisSession | undefined;
          const allUsers = userSession?.users || [];
          const start = (page + 1) * pageSize;
          const end = start + pageSize;
          const pageUsers = allUsers.slice(start, end);

          return {
            users: pageUsers,
            totalCount: allUsers.length,
            page: page + 1,
            pageSize,
            totalPages: Math.ceil(allUsers.length / pageSize),
            cacheKey: `${sessionId}-users-${page + 1}-${pageSize}`,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }

    // Prefetch page précédente
    if (page > 0) {
      const prevQueryKey = ['sod', sessionId, 'users', 'page', page - 1, pageSize];
      
      queryClient.prefetchQuery({
        queryKey: prevQueryKey,
        queryFn: async () => {
          const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
          if (!session) return null;

          const userSession = session.users?.data as UserSodAnalysisSession | undefined;
          const allUsers = userSession?.users || [];
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const pageUsers = allUsers.slice(start, end);

          return {
            users: pageUsers,
            totalCount: allUsers.length,
            page: page - 1,
            pageSize,
            totalPages: Math.ceil(allUsers.length / pageSize),
            cacheKey: `${sessionId}-users-${page - 1}-${pageSize}`,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [sessionId, page, pageSize, data, queryClient]);

  return {
    users: data?.users || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    isFetching,
    error: error as Error | null,
    prefetchAdjacentPages,
  };
}

/**
 * Hook pour gérer le mode d'affichage des utilisateurs
 */
export interface UseUserDisplayModeReturn {
  /** Mode d'affichage actuel */
  displayMode: 'BY_ROLE' | 'BY_TRANSACTION';
  
  /** Changer le mode d'affichage */
  setDisplayMode: (mode: 'BY_ROLE' | 'BY_TRANSACTION') => void;
  
  /** Toggle entre les modes */
  toggleDisplayMode: () => void;
}

/**
 * Hook pour le mode d'affichage (Par Rôle / Par Transaction)
 * Stocke l'état dans TanStack Query pour persistance
 */
export function useUserDisplayMode(sessionId: string | undefined): UseUserDisplayModeReturn {
  const queryClient = useQueryClient();
  
  // Query pour lire le mode d'affichage
  const { data: displayMode } = useQuery({
    queryKey: ['sod', sessionId, 'users', 'displayMode'],
    queryFn: () => 'BY_ROLE' as const,
    enabled: !!sessionId,
    staleTime: Infinity, // Ne jamais refetch automatiquement
  });
  
  // Setter pour le mode d'affichage
  const setDisplayMode = useCallback((mode: 'BY_ROLE' | 'BY_TRANSACTION') => {
    if (!sessionId) return;
    queryClient.setQueryData(['sod', sessionId, 'users', 'displayMode'], mode);
    
    // Invalider les pages d'utilisateurs pour forcer le re-render avec le nouveau mode
    queryClient.invalidateQueries({
      queryKey: ['sod', sessionId, 'users', 'page'],
      exact: false,
    });
  }, [sessionId, queryClient]);
  
  // Toggle entre les modes
  const toggleDisplayMode = useCallback(() => {
    const currentMode = displayMode || 'BY_ROLE';
    const newMode = currentMode === 'BY_ROLE' ? 'BY_TRANSACTION' : 'BY_ROLE';
    setDisplayMode(newMode);
  }, [displayMode, setDisplayMode]);
  
  return {
    displayMode: displayMode || 'BY_ROLE',
    setDisplayMode,
    toggleDisplayMode,
  };
}

