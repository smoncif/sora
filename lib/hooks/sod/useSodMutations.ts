/**
 * Hook pour les mutations TanStack Query des actions SoD
 * 
 * Ce hook encapsule les mutations TanStack Query qui appliquent les règles de gestion
 * directement dans les données de session, évitant la double gestion d'état.
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { 
  applySodRulesToSession, 
  type DeleteActionParams, 
  type RestrictActionParams, 
  type RestrictResourceParams 
} from 'lib/utils/sodRulesApplication';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';
import type { SodAnalysisSession } from 'lib/types/sodAnalysis';

/**
 * Configuration du hook
 */
export interface UseSodMutationsConfig {
  /** ID de la session SoD */
  sessionId: string;
}

/**
 * Valeur retournée par le hook
 */
export interface UseSodMutationsReturn {
  /** Supprimer une action */
  deleteAction: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  /** Restreindre une action */
  restrictAction: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  /** Restreindre une ressource */
  restrictResource: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
  /** Exclure un rôle simple dans un rôle composite */
  excludeRole: (compositeRoleName: string, simpleRoleName: string) => void;
  /** Indique si une mutation est en cours */
  isPending: boolean;
}

/**
 * Hook pour les mutations TanStack Query des actions SoD
 */
export const useSodMutations = (config: UseSodMutationsConfig): UseSodMutationsReturn => {
  const queryClient = useQueryClient();
  const { sessionId } = config;
  
  // 🆕 Utiliser le contexte existant pour synchroniser l'état visuel
  const actionsContext = useSodActionsContext();

  /**
   * Mutation pour supprimer une action
   */
  const deleteActionMutation = useMutation({
    mutationFn: async (params: DeleteActionParams) => {
            // TODO: Appel API réel
      // Pour l'instant, simuler un délai
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        roleName: params.roleName,
        actionCode: params.actionCode,
        resources: params.resources,
        timestamp: new Date().toISOString(),
      };
    },
    onMutate: async (params: DeleteActionParams) => {
            // Annuler les queries en cours pour éviter les conflits
      await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });

      // Snapshot de la valeur précédente pour rollback
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      // Mise à jour optimiste avec les règles de gestion
      queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
        if (!oldSession) {
                    return oldSession;
        }
        
        return applySodRulesToSession(oldSession, 'DELETE_ACTION', params);
      });

      // Retourner le contexte pour rollback
      return { previousSession };
    },
    onError: (err, variables, context) => {
            // Rollback automatique en cas d'erreur
      if (context?.previousSession) {
                queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
            // ✅ OPTIMISÉ : Synchronisation intelligente avec debounce pour éviter les cascades
            actionsContext.toggleDeleteAction(data.roleName, data.actionCode, data.resources);
    },
    onSettled: () => {
            // ✅ OPTIMISÉ : Invalidation granulaire au lieu de toute la session
      // Invalider seulement les queries de pagination et sélecteurs affectés
      queryClient.invalidateQueries({ 
        queryKey: ['sod', sessionId, 'roles'], 
        exact: false 
      });
      
      // Invalider les sélecteurs d'actions pour les re-renders ciblés
      queryClient.invalidateQueries({ 
        queryKey: ['sod', 'session', sessionId, 'action-state'], 
        exact: false 
      });
    }
  });

  /**
   * Mutation pour restreindre une action
   */
  const restrictActionMutation = useMutation({
    mutationFn: async (params: RestrictActionParams) => {
            // TODO: Appel API réel
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        roleName: params.roleName,
        actionCode: params.actionCode,
        resources: params.resources,
        timestamp: new Date().toISOString(),
      };
    },
    onMutate: async (params: RestrictActionParams) => {
            await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
        if (!oldSession) {
                    return oldSession;
        }
        
        return applySodRulesToSession(oldSession, 'RESTRICT_ACTION', params);
      });

      return { previousSession };
    },
    onError: (err, variables, context) => {
            if (context?.previousSession) {
                queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
            // ✅ OPTIMISÉ : Synchronisation intelligente avec debounce pour éviter les cascades
            actionsContext.toggleRestrictAction(data.roleName, data.actionCode, data.resources);
    },
    onSettled: () => {
            // ✅ OPTIMISÉ : Invalidation granulaire pour la restriction d'action
      queryClient.invalidateQueries({ 
        queryKey: ['sod', sessionId, 'roles'], 
        exact: false 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['sod', 'session', sessionId, 'action-state'], 
        exact: false 
      });
    }
  });

  /**
   * Mutation pour restreindre une ressource
   */
  const restrictResourceMutation = useMutation({
    mutationFn: async (params: RestrictResourceParams) => {
            // TODO: Appel API réel
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        roleName: params.roleName,
        resourceCode: params.resourceCode,
        externalResourceCode: params.externalResourceCode,
        values: params.values,
        timestamp: new Date().toISOString(),
      };
    },
    onMutate: async (params: RestrictResourceParams) => {
            await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
        if (!oldSession) {
                    return oldSession;
        }
        
        return applySodRulesToSession(oldSession, 'RESTRICT_RESOURCE', params);
      });

      return { previousSession };
    },
    onError: (err, variables, context) => {
            if (context?.previousSession) {
                queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
            // ✅ OPTIMISÉ : Synchronisation intelligente avec debounce pour éviter les cascades
            actionsContext.toggleRestrictResource(data.roleName, data.resourceCode, data.externalResourceCode, data.values);
    },
    onSettled: () => {
            // ✅ OPTIMISÉ : Invalidation granulaire pour la restriction de ressource
      queryClient.invalidateQueries({ 
        queryKey: ['sod', sessionId, 'roles'], 
        exact: false 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['sod', 'session', sessionId, 'action-resources-state'], 
        exact: false 
      });
    }
  });

  /**
   * Mutation pour exclure un rôle simple dans un rôle composite
   */
  const excludeRoleMutation = useMutation({
    mutationFn: async (params: { compositeRoleName: string; simpleRoleName: string }) => {
            // TODO: Appel API réel
      // await new Promise(resolve => setTimeout(resolve, 200));
      return { ...params, timestamp: new Date().toISOString() };
    },
    onMutate: async (params) => {
            await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      // Pas de modification des données de session pour l'exclusion de rôle
      // L'exclusion est gérée uniquement par SodActionsContext

      return { previousSession };
    },
    onError: (err, params, context) => {
            if (context?.previousSession) {
                queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
            // ✅ OPTIMISÉ : Synchronisation avec SodActionsContext
            actionsContext.toggleExcludeSimpleRole(data.compositeRoleName, data.simpleRoleName);
    },
    onSettled: () => {
            // ✅ OPTIMISÉ : Invalidation granulaire pour l'exclusion de rôle
      queryClient.invalidateQueries({ 
        queryKey: ['sod', sessionId, 'roles'], 
        exact: false 
      });
    }
  });

  // Wrappers pour les callbacks
  const deleteAction = useCallback((roleName: string, riskId: string, actionCode: string, resources: any[]) => {
        deleteActionMutation.mutate({ roleName, actionCode, resources });
  }, [deleteActionMutation]);

  const restrictAction = useCallback((roleName: string, riskId: string, actionCode: string, resources: any[]) => {
        restrictActionMutation.mutate({ roleName, actionCode, resources });
  }, [restrictActionMutation]);

  const restrictResource = useCallback((roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => {
        restrictResourceMutation.mutate({ roleName, resourceCode, externalResourceCode, values });
  }, [restrictResourceMutation]);

  const excludeRole = useCallback((compositeRoleName: string, simpleRoleName: string) => {
        excludeRoleMutation.mutate({ compositeRoleName, simpleRoleName });
  }, [excludeRoleMutation]);

  return {
    deleteAction,
    restrictAction,
    restrictResource,
    excludeRole,
    isPending: deleteActionMutation.isPending || restrictActionMutation.isPending || restrictResourceMutation.isPending || excludeRoleMutation.isPending,
  };
};
