/**
 * Contexte global pour gérer l'état des actions SoD
 * 
 * Architecture :
 * - Dérivé des données TanStack Query (source unique de vérité)
 * - Synchronisé avec les mutations TanStack Query
 * - État visuel cohérent avec les données de session
 * 
 * Performance :
 * - Pas de double gestion d'état
 * - Synchronisation automatique avec TanStack Query
 * - Re-renders optimisés
 */

'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { extractExternalResourceValues, normalizeValue } from 'lib/utils/sodResourceUtils';
import type { SodAnalysisSession } from 'lib/types/sodAnalysis';

/**
 * Map globale des restrictions par valeurs
 * Key: "roleName|resourceCode|externalResourceCode"
 * Value: Set de valeurs restreintes
 */
type RestrictionMap = Map<string, Set<string>>;

/**
 * Map des actions supprimées
 * Key: "roleName|actionCode"
 * Value: true
 */
type DeletedActionsMap = Map<string, boolean>;

/**
 * Map des actions restreintes
 * Key: "roleName|actionCode"
 * Value: { restrictedByAction: boolean }
 */
type RestrictedActionsMap = Map<string, { restrictedByAction: boolean }>;

interface SodActionsState {
  /** Actions supprimées */
  deletedActions: DeletedActionsMap;
  
  /** Actions restreintes */
  restrictedActions: RestrictedActionsMap;
  
  /** Ressources restreintes avec leurs valeurs */
  restrictedResources: RestrictionMap;
}

interface SodActionsContextValue {
  /** Actions supprimées */
  deletedActions: DeletedActionsMap;
  
  /** Actions restreintes */
  restrictedActions: RestrictedActionsMap;
  
  /** Ressources restreintes avec leurs valeurs */
  restrictedResources: RestrictionMap;
  
  /** Version pour forcer les re-renders */
  version: number;
  
  /** Fonctions de basculement (dépréciées - utiliser les mutations TanStack Query) */
  toggleDeleteAction: (roleName: string, actionCode: string, resources: any[]) => void;
  toggleRestrictAction: (roleName: string, actionCode: string, resources: any[]) => void;
  toggleRestrictResource: (roleName: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
  
  /** Fonctions de vérification */
  isActionDeleted: (roleName: string, actionCode: string) => boolean;
  isActionRestricted: (roleName: string, actionCode: string, resources?: any[]) => { isRestricted: boolean; restrictedByAction: boolean };
  isResourceRestricted: (roleName: string, resourceCode: string, externalResourceCode: string, values: string[]) => boolean;
  
  /** Fonctions utilitaires */
  getDeletedActionsCount: () => number;
  getRestrictedActionsCount: () => number;
  getRestrictedResourcesCount: () => number;
  
  /** État dérivé des données TanStack Query */
  state: SodActionsState;
}

const SodActionsContext = createContext<SodActionsContextValue | undefined>(undefined);

interface SodActionsProviderProps {
  children: React.ReactNode;
  sessionId?: string;
}

/**
 * Provider pour le contexte des actions SoD
 * 
 * NOUVELLE ARCHITECTURE :
 * - État dérivé des données TanStack Query
 * - Synchronisation automatique avec les mutations
 * - Source unique de vérité
 */
export const SodActionsProvider: React.FC<SodActionsProviderProps> = ({ children, sessionId }) => {
  const queryClient = useQueryClient();
  
  // Dériver l'état depuis les données TanStack Query
  const state = useMemo(() => {
    if (!sessionId) {
      return {
        deletedActions: new Map(),
        restrictedActions: new Map(),
        restrictedResources: new Map()
      };
    }
    
    const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
    if (!session) {
      console.warn('⚠️ [SOD CONTEXT] Session non trouvée pour dérivation de l\'état:', sessionId);
      return {
        deletedActions: new Map(),
        restrictedActions: new Map(),
        restrictedResources: new Map()
      };
    }
    
    console.log('🔄 [SOD CONTEXT] Dérivation de l\'état depuis TanStack Query');
    
    // Extraire l'état depuis la session
    const deletedActions = new Map<string, boolean>();
    const restrictedActions = new Map<string, { restrictedByAction: boolean }>();
    const restrictedResources = new Map<string, Set<string>>();
    
    // Parcourir les rôles simples
    session.simpleRoles?.roles?.forEach(role => {
      role.risks.forEach(risk => {
        risk.functions.forEach(func => {
          func.actions.forEach(action => {
            const key = `${role.roleName}|${action.code}`;
            
            if (action.isDeleted) {
              deletedActions.set(key, true);
            }
            
            if (action.isRestricted) {
              restrictedActions.set(key, { restrictedByAction: true });
            }
            
            // Parcourir les ressources
            action.resources.forEach(resource => {
              if (resource.isRestricted) {
                const resourceKey = `${role.roleName}|${resource.code}|${resource.externalResourceCode || ''}`;
                const values = extractExternalResourceValues(resource);
                const normalizedValues = values.map(v => normalizeValue(v));
                
                if (!restrictedResources.has(resourceKey)) {
                  restrictedResources.set(resourceKey, new Set());
                }
                
                normalizedValues.forEach(value => {
                  restrictedResources.get(resourceKey)!.add(value);
                });
              }
            });
          });
        });
      });
    });
    
    // Parcourir les rôles composites
    session.compositeRoles?.roles?.forEach(role => {
      role.risks.forEach(risk => {
        risk.functions.forEach(func => {
          func.simpleRoles.forEach(simpleRole => {
            simpleRole.actions.forEach(action => {
              const key = `${simpleRole.roleName}|${action.code}`;
              
              if (action.isDeleted) {
                deletedActions.set(key, true);
              }
              
              if (action.isRestricted) {
                restrictedActions.set(key, { restrictedByAction: true });
              }
              
              // Parcourir les ressources
              action.resources.forEach(resource => {
                if (resource.isRestricted) {
                  const resourceKey = `${simpleRole.roleName}|${resource.code}|${resource.externalResourceCode || ''}`;
                  const values = extractExternalResourceValues(resource);
                  const normalizedValues = values.map(v => normalizeValue(v));
                  
                  if (!restrictedResources.has(resourceKey)) {
                    restrictedResources.set(resourceKey, new Set());
                  }
                  
                  normalizedValues.forEach(value => {
                    restrictedResources.get(resourceKey)!.add(value);
                  });
                }
              });
            });
          });
        });
      });
    });
    
    console.log('✅ [SOD CONTEXT] État dérivé:', {
      deletedActions: deletedActions.size,
      restrictedActions: restrictedActions.size,
      restrictedResources: restrictedResources.size
    });
    
    return {
      deletedActions,
      restrictedActions,
      restrictedResources
    };
  }, [sessionId, queryClient]);
  
  // Version pour forcer les re-renders (basée sur la session)
  const version = useMemo(() => {
    if (!sessionId) return 0;
    
    const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
    return session ? new Date(session.updatedAt).getTime() : 0;
  }, [sessionId, queryClient]);
  
  // Fonctions de vérification
  const isActionDeleted = useCallback((roleName: string, actionCode: string): boolean => {
    const key = `${roleName}|${actionCode}`;
    return state.deletedActions.has(key);
  }, [state.deletedActions]);
  
  const isActionRestricted = useCallback((roleName: string, actionCode: string, resources?: any[]): { isRestricted: boolean; restrictedByAction: boolean } => {
    const key = `${roleName}|${actionCode}`;
    const restricted = state.restrictedActions.get(key);
    
    if (restricted) {
      return { isRestricted: true, restrictedByAction: restricted.restrictedByAction };
    }
    
    // Vérifier si toutes les ressources non-S_TCODE sont restreintes
    if (resources && resources.length > 0) {
      const nonTCodeResources = resources.filter(r => r.code !== 'S_TCODE');
      if (nonTCodeResources.length > 0) {
        const allRestricted = nonTCodeResources.every(resource => {
          const resourceKey = `${roleName}|${resource.code}|${resource.externalResourceCode || ''}`;
          return state.restrictedResources.has(resourceKey);
        });
        
        if (allRestricted) {
          return { isRestricted: true, restrictedByAction: false };
        }
      }
    }
    
    return { isRestricted: false, restrictedByAction: false };
  }, [state.restrictedActions, state.restrictedResources]);
  
  const isResourceRestricted = useCallback((roleName: string, resourceCode: string, externalResourceCode: string, values: string[]): boolean => {
    const resourceKey = `${roleName}|${resourceCode}|${externalResourceCode}`;
    const restrictedValues = state.restrictedResources.get(resourceKey);
    
    if (!restrictedValues) return false;
    
    const normalizedValues = values.map(v => normalizeValue(v));
    return normalizedValues.some(value => restrictedValues.has(value));
  }, [state.restrictedResources]);
  
  // Fonctions utilitaires
  const getDeletedActionsCount = useCallback(() => {
    return state.deletedActions.size;
  }, [state.deletedActions]);
  
  const getRestrictedActionsCount = useCallback(() => {
    return state.restrictedActions.size;
  }, [state.restrictedActions]);
  
  const getRestrictedResourcesCount = useCallback(() => {
    return state.restrictedResources.size;
  }, [state.restrictedResources]);
  
  // Fonctions de basculement (dépréciées - utiliser les mutations TanStack Query)
  const toggleDeleteAction = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    console.warn('⚠️ [SOD CONTEXT] toggleDeleteAction est déprécié. Utilisez les mutations TanStack Query.');
  }, []);
  
  const toggleRestrictAction = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    console.warn('⚠️ [SOD CONTEXT] toggleRestrictAction est déprécié. Utilisez les mutations TanStack Query.');
  }, []);
  
  const toggleRestrictResource = useCallback((roleName: string, resourceCode: string, externalResourceCode: string, values: string[]) => {
    console.warn('⚠️ [SOD CONTEXT] toggleRestrictResource est déprécié. Utilisez les mutations TanStack Query.');
  }, []);
  
  const value: SodActionsContextValue = {
    deletedActions: state.deletedActions,
    restrictedActions: state.restrictedActions,
    restrictedResources: state.restrictedResources,
    version,
    toggleDeleteAction,
    toggleRestrictAction,
    toggleRestrictResource,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
    getDeletedActionsCount,
    getRestrictedActionsCount,
    getRestrictedResourcesCount,
    state
  };
  
  return (
    <SodActionsContext.Provider value={value}>
      {children}
    </SodActionsContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte des actions SoD
 */
export const useSodActionsContext = (): SodActionsContextValue => {
  const context = useContext(SodActionsContext);
  if (!context) {
    throw new Error('useSodActionsContext must be used within a SodActionsProvider');
  }
  return context;
};
