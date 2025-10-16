/**
 * Hook pour les sélecteurs TanStack Query des actions SoD
 * 
 * Ce hook fournit des sélecteurs ciblés pour extraire l'état des actions et rôles
 * depuis les données TanStack Query, permettant des re-renders optimisés.
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { extractActionState, extractRoleState } from 'lib/utils/sodRulesApplication';
import type { SodAnalysisSession } from 'lib/types/sodAnalysis';

/**
 * Configuration du hook
 */
export interface UseSodSelectorsConfig {
  /** ID de la session SoD */
  sessionId: string;
}

/**
 * État d'une action
 */
export interface ActionState {
  isDeleted: boolean;
  isRestricted: boolean;
  restrictedByAction: boolean;
}

/**
 * État d'un rôle
 */
export interface RoleState {
  isDeleted: boolean;
  isRestricted: boolean;
}

/**
 * Hook pour obtenir l'état d'une action spécifique
 * 
 * @param roleName - Nom du rôle
 * @param actionCode - Code de l'action
 * @param config - Configuration du hook
 * @returns État de l'action avec cache TanStack Query
 */
export const useActionState = (
  roleName: string, 
  actionCode: string, 
  config: UseSodSelectorsConfig
) => {
  const queryClient = useQueryClient();
  const { sessionId } = config;

  return useQuery({
    queryKey: ['sod', 'session', sessionId, 'action-state', roleName, actionCode],
    queryFn: () => {
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      if (!session) {
        console.warn('⚠️ [SOD SELECTOR] Session non trouvée pour action:', { roleName, actionCode });
        return {
          isDeleted: false,
          isRestricted: false,
          restrictedByAction: false
        } as ActionState;
      }
      
      return extractActionState(session, roleName, actionCode);
    },
    enabled: !!sessionId && !!roleName && !!actionCode,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Garde en mémoire 10 minutes
  });
};

/**
 * Hook pour obtenir l'état d'un rôle spécifique
 * 
 * @param roleName - Nom du rôle
 * @param config - Configuration du hook
 * @returns État du rôle avec cache TanStack Query
 */
export const useRoleState = (
  roleName: string, 
  config: UseSodSelectorsConfig
) => {
  const queryClient = useQueryClient();
  const { sessionId } = config;

  return useQuery({
    queryKey: ['sod', 'session', sessionId, 'role-state', roleName],
    queryFn: () => {
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      if (!session) {
        console.warn('⚠️ [SOD SELECTOR] Session non trouvée pour rôle:', roleName);
        return {
          isDeleted: false,
          isRestricted: false
        } as RoleState;
      }
      
      return extractRoleState(session, roleName);
    },
    enabled: !!sessionId && !!roleName,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Garde en mémoire 10 minutes
  });
};

/**
 * Hook pour obtenir l'état de toutes les actions d'un rôle
 * 
 * @param roleName - Nom du rôle
 * @param config - Configuration du hook
 * @returns Map des états d'actions avec cache TanStack Query
 */
export const useRoleActionsState = (
  roleName: string, 
  config: UseSodSelectorsConfig
) => {
  const queryClient = useQueryClient();
  const { sessionId } = config;

  return useQuery({
    queryKey: ['sod', 'session', sessionId, 'role-actions-state', roleName],
    queryFn: () => {
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      if (!session) {
        console.warn('⚠️ [SOD SELECTOR] Session non trouvée pour actions du rôle:', roleName);
        return new Map<string, ActionState>();
      }
      
      // Extraire tous les états d'actions du rôle
      const actionsState = new Map<string, ActionState>();
      
      // Parcourir les rôles simples
      session.simpleRoles?.roles?.forEach(role => {
        if (role.roleName === roleName) {
          role.risks.forEach(risk => {
            risk.functions.forEach(func => {
              func.actions.forEach(action => {
                const actionState = extractActionState(session, roleName, action.code);
                actionsState.set(action.code, actionState);
              });
            });
          });
        }
      });
      
      // Parcourir les rôles composites
      session.compositeRoles?.roles?.forEach(role => {
        role.risks.forEach(risk => {
          risk.functions.forEach(func => {
            func.simpleRoles.forEach(simpleRole => {
              if (simpleRole.roleName === roleName) {
                simpleRole.actions.forEach(action => {
                  const actionState = extractActionState(session, roleName, action.code);
                  actionsState.set(action.code, actionState);
                });
              }
            });
          });
        });
      });
      
      return actionsState;
    },
    enabled: !!sessionId && !!roleName,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Garde en mémoire 10 minutes
  });
};

/**
 * Hook pour obtenir l'état de toutes les ressources d'une action
 * 
 * @param roleName - Nom du rôle
 * @param actionCode - Code de l'action
 * @param config - Configuration du hook
 * @returns Map des états de ressources avec cache TanStack Query
 */
export const useActionResourcesState = (
  roleName: string, 
  actionCode: string, 
  config: UseSodSelectorsConfig
) => {
  const queryClient = useQueryClient();
  const { sessionId } = config;

  return useQuery({
    queryKey: ['sod', 'session', sessionId, 'action-resources-state', roleName, actionCode],
    queryFn: () => {
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      if (!session) {
        console.warn('⚠️ [SOD SELECTOR] Session non trouvée pour ressources de l\'action:', { roleName, actionCode });
        return new Map<string, { isDeleted: boolean; isRestricted: boolean }>();
      }
      
      // TODO: Implémenter l'extraction des états de ressources
      // Pour l'instant, retourner une Map vide
      return new Map<string, { isDeleted: boolean; isRestricted: boolean }>();
    },
    enabled: !!sessionId && !!roleName && !!actionCode,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 10 * 60 * 1000, // Garde en mémoire 10 minutes
  });
};
