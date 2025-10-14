/**
 * Hook pour gérer les optimistic updates des actions SOD
 * Améliore la réactivité de l'interface utilisateur
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export interface SodOptimisticUpdatesConfig {
  userId: string;
  sessionId?: string;
}

export interface SodOptimisticUpdates {
  deleteAction: (roleName: string, actionCode: string, resources?: any[]) => Promise<void>;
  restrictAction: (roleName: string, actionCode: string, resources?: any[]) => Promise<void>;
  restrictResource: (roleName: string, resourceCode: string, externalResourceCode: string, values: string[]) => Promise<void>;
  isPending: boolean;
}

export const useSodOptimisticUpdates = (config: SodOptimisticUpdatesConfig): SodOptimisticUpdates => {
  const queryClient = useQueryClient();

  // 🔄 MUTATION : Supprimer une action (optimistic update)
  const deleteActionMutation = useMutation({
    mutationFn: async ({ roleName, actionCode, resources }: { roleName: string; actionCode: string; resources?: any[] }) => {
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        roleName,
        actionCode,
        resources: resources || [],
        timestamp: new Date().toISOString(),
      };
    },
    onMutate: async ({ roleName, actionCode, resources }) => {
      // Annuler les queries en cours pour éviter les conflits
      await queryClient.cancelQueries({ queryKey: ['sod-session', config.userId] });

      // Snapshot de la valeur précédente
      const previousSession = queryClient.getQueryData(['sod-session', config.userId]);

      // Mise à jour optimiste
      queryClient.setQueryData(['sod-session', config.userId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          simpleRoles: {
            ...old.simpleRoles,
            roles: old.simpleRoles?.roles?.map((role: any) => {
              if (role.roleName === roleName) {
                return {
                  ...role,
                  actions: role.actions?.filter((action: any) => action.actionCode !== actionCode),
                };
              }
              return role;
            }) || [],
          },
        };
      });

      // Retourner le contexte pour rollback
      return { previousSession };
    },
    onError: (err, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousSession) {
        queryClient.setQueryData(['sod-session', config.userId], context.previousSession);
      }
      console.error('❌ Erreur lors de la suppression d\'action:', err);
    },
    onSettled: () => {
      // Invalider pour synchroniser avec le serveur
      queryClient.invalidateQueries({ queryKey: ['sod-session', config.userId] });
    },
  });

  // 🔄 MUTATION : Restreindre une action (optimistic update)
  const restrictActionMutation = useMutation({
    mutationFn: async ({ roleName, actionCode, resources }: { roleName: string; actionCode: string; resources?: any[] }) => {
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        roleName,
        actionCode,
        resources: resources || [],
        timestamp: new Date().toISOString(),
      };
    },
    onMutate: async ({ roleName, actionCode, resources }) => {
      // Annuler les queries en cours
      await queryClient.cancelQueries({ queryKey: ['sod-session', config.userId] });

      // Snapshot de la valeur précédente
      const previousSession = queryClient.getQueryData(['sod-session', config.userId]);

      // Mise à jour optimiste
      queryClient.setQueryData(['sod-session', config.userId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          simpleRoles: {
            ...old.simpleRoles,
            roles: old.simpleRoles?.roles?.map((role: any) => {
              if (role.roleName === roleName) {
                return {
                  ...role,
                  actions: role.actions?.map((action: any) => {
                    if (action.actionCode === actionCode) {
                      return {
                        ...action,
                        restricted: true,
                        restrictedResources: resources || [],
                        restrictedAt: new Date().toISOString(),
                      };
                    }
                    return action;
                  }),
                };
              }
              return role;
            }) || [],
          },
        };
      });

      return { previousSession };
    },
    onError: (err, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousSession) {
        queryClient.setQueryData(['sod-session', config.userId], context.previousSession);
      }
      console.error('❌ Erreur lors de la restriction d\'action:', err);
    },
    onSettled: () => {
      // Invalider pour synchroniser
      queryClient.invalidateQueries({ queryKey: ['sod-session', config.userId] });
    },
  });

  // 🔄 MUTATION : Restreindre une ressource (optimistic update)
  const restrictResourceMutation = useMutation({
    mutationFn: async ({ roleName, resourceCode, externalResourceCode, values }: { 
      roleName: string; 
      resourceCode: string; 
      externalResourceCode: string; 
      values: string[] 
    }) => {
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        roleName,
        resourceCode,
        externalResourceCode,
        values,
        timestamp: new Date().toISOString(),
      };
    },
    onMutate: async ({ roleName, resourceCode, externalResourceCode, values }) => {
      // Annuler les queries en cours
      await queryClient.cancelQueries({ queryKey: ['sod-session', config.userId] });

      // Snapshot de la valeur précédente
      const previousSession = queryClient.getQueryData(['sod-session', config.userId]);

      // Mise à jour optimiste
      queryClient.setQueryData(['sod-session', config.userId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          simpleRoles: {
            ...old.simpleRoles,
            roles: old.simpleRoles?.roles?.map((role: any) => {
              if (role.roleName === roleName) {
                return {
                  ...role,
                  actions: role.actions?.map((action: any) => {
                    if (action.actionCode === resourceCode) {
                      return {
                        ...action,
                        restrictedResources: [
                          ...(action.restrictedResources || []),
                          {
                            resourceCode: externalResourceCode,
                            values,
                            restrictedAt: new Date().toISOString(),
                          },
                        ],
                      };
                    }
                    return action;
                  }),
                };
              }
              return role;
            }) || [],
          },
        };
      });

      return { previousSession };
    },
    onError: (err, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousSession) {
        queryClient.setQueryData(['sod-session', config.userId], context.previousSession);
      }
      console.error('❌ Erreur lors de la restriction de ressource:', err);
    },
    onSettled: () => {
      // Invalider pour synchroniser
      queryClient.invalidateQueries({ queryKey: ['sod-session', config.userId] });
    },
  });

  // Wrappers pour les callbacks
  const deleteAction = useCallback(async (roleName: string, actionCode: string, resources?: any[]) => {
    deleteActionMutation.mutate({ roleName, actionCode, resources });
  }, [deleteActionMutation]);

  const restrictAction = useCallback(async (roleName: string, actionCode: string, resources?: any[]) => {
    restrictActionMutation.mutate({ roleName, actionCode, resources });
  }, [restrictActionMutation]);

  const restrictResource = useCallback(async (
    roleName: string, 
    resourceCode: string, 
    externalResourceCode: string, 
    values: string[]
  ) => {
    restrictResourceMutation.mutate({ roleName, resourceCode, externalResourceCode, values });
  }, [restrictResourceMutation]);

  return {
    deleteAction,
    restrictAction,
    restrictResource,
    isPending: deleteActionMutation.isPending || restrictActionMutation.isPending || restrictResourceMutation.isPending,
  };
};

