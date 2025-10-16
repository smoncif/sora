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
  deleteAction: (params: DeleteActionParams) => void;
  /** Restreindre une action */
  restrictAction: (params: RestrictActionParams) => void;
  /** Restreindre une ressource */
  restrictResource: (params: RestrictResourceParams) => void;
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
      console.log('🔄 [SOD MUTATION] Suppression d\'action en cours:', params);
      
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
      console.log('⚡ [SOD MUTATION] Mise à jour optimiste:', params);
      
      // Annuler les queries en cours pour éviter les conflits
      await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });

      // Snapshot de la valeur précédente pour rollback
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      // Mise à jour optimiste avec les règles de gestion
      queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
        if (!oldSession) {
          console.warn('⚠️ [SOD MUTATION] Session non trouvée pour mise à jour optimiste');
          return oldSession;
        }
        
        return applySodRulesToSession(oldSession, 'DELETE_ACTION', params);
      });

      // Retourner le contexte pour rollback
      return { previousSession };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SOD MUTATION] Erreur lors de la suppression:', err);
      
      // Rollback automatique en cas d'erreur
      if (context?.previousSession) {
        console.log('🔄 [SOD MUTATION] Rollback en cours...');
        queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
      console.log('✅ [SOD MUTATION] Suppression réussie:', data);
      
      // ✅ OPTIMISÉ : Synchronisation intelligente avec debounce pour éviter les cascades
      console.log('🔄 [SOD MUTATION] Synchronisation avec SodActionsContext');
      actionsContext.toggleDeleteAction(data.roleName, data.actionCode, data.resources);
    },
    onSettled: () => {
      console.log('🏁 [SOD MUTATION] Suppression terminée');
      
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
      console.log('🔄 [SOD MUTATION] Restriction d\'action en cours:', params);
      
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
      console.log('⚡ [SOD MUTATION] Mise à jour optimiste restriction:', params);
      
      await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
        if (!oldSession) {
          console.warn('⚠️ [SOD MUTATION] Session non trouvée pour mise à jour optimiste');
          return oldSession;
        }
        
        return applySodRulesToSession(oldSession, 'RESTRICT_ACTION', params);
      });

      return { previousSession };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SOD MUTATION] Erreur lors de la restriction:', err);
      
      if (context?.previousSession) {
        console.log('🔄 [SOD MUTATION] Rollback en cours...');
        queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
      console.log('✅ [SOD MUTATION] Restriction réussie:', data);
      
      // ✅ OPTIMISÉ : Synchronisation intelligente avec debounce pour éviter les cascades
      console.log('🔄 [SOD MUTATION] Synchronisation avec SodActionsContext');
      actionsContext.toggleRestrictAction(data.roleName, data.actionCode, data.resources);
    },
    onSettled: () => {
      console.log('🏁 [SOD MUTATION] Restriction terminée');
      
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
      console.log('🔄 [SOD MUTATION] Restriction de ressource en cours:', params);
      
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
      console.log('⚡ [SOD MUTATION] Mise à jour optimiste ressource:', params);
      
      await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      queryClient.setQueryData(['sod', 'session', sessionId], (oldSession: SodAnalysisSession | undefined) => {
        if (!oldSession) {
          console.warn('⚠️ [SOD MUTATION] Session non trouvée pour mise à jour optimiste');
          return oldSession;
        }
        
        return applySodRulesToSession(oldSession, 'RESTRICT_RESOURCE', params);
      });

      return { previousSession };
    },
    onError: (err, variables, context) => {
      console.error('❌ [SOD MUTATION] Erreur lors de la restriction de ressource:', err);
      
      if (context?.previousSession) {
        console.log('🔄 [SOD MUTATION] Rollback en cours...');
        queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
      console.log('✅ [SOD MUTATION] Restriction de ressource réussie:', data);
      
      // ✅ OPTIMISÉ : Synchronisation intelligente avec debounce pour éviter les cascades
      console.log('🔄 [SOD MUTATION] Synchronisation avec SodActionsContext');
      actionsContext.toggleRestrictResource(data.roleName, data.resourceCode, data.externalResourceCode, data.values);
    },
    onSettled: () => {
      console.log('🏁 [SOD MUTATION] Restriction de ressource terminée');
      
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
      console.log('🔄 [SOD MUTATION] Exclusion de rôle en cours:', params);
      
      // TODO: Appel API réel
      // await new Promise(resolve => setTimeout(resolve, 200));
      return { ...params, timestamp: new Date().toISOString() };
    },
    onMutate: async (params) => {
      console.log('⚡ [SOD MUTATION] Mise à jour optimiste exclusion:', params);

      await queryClient.cancelQueries({ queryKey: ['sod', 'session', sessionId] });
      const previousSession = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);

      // Pas de modification des données de session pour l'exclusion de rôle
      // L'exclusion est gérée uniquement par SodActionsContext

      return { previousSession };
    },
    onError: (err, params, context) => {
      console.error('❌ [SOD MUTATION] Erreur exclusion:', err);
      if (context?.previousSession) {
        console.log('🔄 [SOD MUTATION] Rollback en cours...');
        queryClient.setQueryData(['sod', 'session', sessionId], context.previousSession);
      }
    },
    onSuccess: (data) => {
      console.log('✅ [SOD MUTATION] Exclusion réussie:', data);
      
      // ✅ OPTIMISÉ : Synchronisation avec SodActionsContext
      console.log('🔄 [SOD MUTATION] Synchronisation avec SodActionsContext');
      actionsContext.toggleExcludeSimpleRole(data.compositeRoleName, data.simpleRoleName);
    },
    onSettled: () => {
      console.log('🏁 [SOD MUTATION] Exclusion terminée');
      
      // ✅ OPTIMISÉ : Invalidation granulaire pour l'exclusion de rôle
      queryClient.invalidateQueries({ 
        queryKey: ['sod', sessionId, 'roles'], 
        exact: false 
      });
    }
  });

  // Wrappers pour les callbacks
  const deleteAction = useCallback((roleName: string, riskId: string, actionCode: string, resources: any[]) => {
    console.log('🎯 [SOD MUTATION] Déclenchement suppression:', { roleName, riskId, actionCode, resources });
    deleteActionMutation.mutate({ roleName, actionCode, resources });
  }, [deleteActionMutation]);

  const restrictAction = useCallback((roleName: string, riskId: string, actionCode: string, resources: any[]) => {
    console.log('🎯 [SOD MUTATION] Déclenchement restriction action:', { roleName, riskId, actionCode, resources });
    restrictActionMutation.mutate({ roleName, actionCode, resources });
  }, [restrictActionMutation]);

  const restrictResource = useCallback((roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => {
    console.log('🎯 [SOD MUTATION] Déclenchement restriction ressource:', { roleName, riskId, actionCode, resourceCode, externalResourceCode, values });
    restrictResourceMutation.mutate({ roleName, resourceCode, externalResourceCode, values });
  }, [restrictResourceMutation]);

  const excludeRole = useCallback((compositeRoleName: string, simpleRoleName: string) => {
    console.log('🎯 [SOD MUTATION] Déclenchement exclusion rôle:', { compositeRoleName, simpleRoleName });
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
