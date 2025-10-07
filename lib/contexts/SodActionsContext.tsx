/**
 * Contexte global pour gérer l'état des actions SoD
 * 
 * Architecture :
 * - Sépare l'état (suppressions/restrictions) de la pagination
 * - Permet une navigation instantanée entre les pages
 * - Persiste l'état entre les changements de page
 * 
 * Performance :
 * - Pas de re-calcul lors de la pagination
 * - Références stables pour React.memo
 * - État centralisé et optimisé
 */

'use client';

import React, { createContext, useContext, useCallback, useRef, useMemo } from 'react';
import { extractExternalResourceValues, normalizeValue } from 'lib/utils/sodResourceUtils';

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

interface SodActionsContextValue extends SodActionsState {
  /** Compteur de version pour forcer le re-calcul des useMemo */
  version: number;
  
  /** Construire la Map globale des ressources par action */
  buildActionResourcesMap: (simpleRoles: any[], compositeRoles: any[]) => void;
  
  /** Supprimer/restaurer une action */
  toggleDeleteAction: (roleName: string, actionCode: string, resources: any[]) => void;
  
  /** Restreindre une action directement (sans toggle) */
  restrictAction: (roleName: string, actionCode: string, resources: any[]) => void;
  
  /** Restreindre/dé-restreindre une action */
  toggleRestrictAction: (roleName: string, actionCode: string, resources: any[]) => void;
  
  /** Restreindre/dé-restreindre une ressource avec ses valeurs */
  toggleRestrictResource: (
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => void;
  
  /** Réinitialiser tout l'état (nouveau fichier) */
  resetState: () => void;
  
  /** Vérifier si une action est supprimée */
  isActionDeleted: (roleName: string, actionCode: string) => boolean;
  
  /** Vérifier si une action est restreinte */
  isActionRestricted: (roleName: string, actionCode: string) => { isRestricted: boolean; restrictedByAction: boolean };
  
  /** Vérifier si une ressource est restreinte */
  isResourceRestricted: (
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => boolean;
  
  /** Exclure/restaurer un rôle simple dans un rôle composite (toutes fonctions) */
  toggleExcludeSimpleRole: (compositeRoleName: string, simpleRoleName: string) => void;
  
  /** Vérifier si un rôle simple est exclu dans un rôle composite */
  isSimpleRoleExcluded: (compositeRoleName: string, simpleRoleName: string) => boolean;
  
  /** Calculer le statut de remédiation d'une fonction */
  calculateFunctionRemediation: (roleName: string, actions: any[]) => {
    isRemediated: boolean;
    totalActions: number;
    remediatedActions: number;
  };
  
  /** Calculer le statut de remédiation d'un risque */
  calculateRiskRemediation: (roleName: string, functions: any[]) => {
    isRemediated: boolean;
    totalFunctions: number;
    remediatedFunctions: number;
    remediationPercentage: number;
  };
  
  /** Calculer le statut de remédiation d'un rôle */
  calculateRoleRemediation: (roleName: string, risks: any[]) => {
    isRemediated: boolean;
    totalRisks: number;
    remediatedRisks: number;
    remediationPercentage: number;
  };
}

const SodActionsContext = createContext<SodActionsContextValue | undefined>(undefined);

/**
 * Provider pour l'état global des actions SoD
 */
export const SodActionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Utiliser useRef pour des Maps mutables (performance optimale)
  const deletedActionsRef = useRef<DeletedActionsMap>(new Map());
  const restrictedActionsRef = useRef<RestrictedActionsMap>(new Map());
  const restrictedResourcesRef = useRef<RestrictionMap>(new Map());
  
  // 🆕 Map globale : toutes les ressources d'une action dans un rôle (avec leurs données complètes)
  // Clé : "roleName|actionCode|resourceCode", Valeur : resource complète avec externalResources
  const actionResourcesMapRef = useRef<Map<string, any>>(new Map());
  
  // 🆕 Map des rôles simples exclus dans les rôles composites
  // Clé : "compositeRoleName|functionCode|simpleRoleName"
  const excludedSimpleRolesRef = useRef<Map<string, boolean>>(new Map());
  
  // ✅ Fonction utilitaire pour créer une clé de ressource d'action
  const getActionResourceKey = useCallback((
    roleName: string,
    actionCode: string,
    resourceCode: string
  ): string => {
    return `${roleName}|${actionCode}|${resourceCode}`;
  }, []);
  
  // ✅ Fonction utilitaire pour créer une clé de rôle simple exclu
  // Clé : compositeRoleName|simpleRoleName (sans functionCode pour propager dans tout le composite)
  const getExcludedRoleKey = useCallback((
    compositeRoleName: string,
    simpleRoleName: string
  ): string => {
    return `${compositeRoleName}|${simpleRoleName}`;
  }, []);
  
  // ✅ Compteur de version pour forcer le re-calcul des useMemo
  const [version, setVersion] = React.useState(0);
  
  // Incrémenter la version au lieu de forceUpdate
  const incrementVersion = React.useCallback(() => {
    setVersion(v => v + 1);
  }, []);
  
  /**
   * Génère une clé unique pour une action
   */
  const getActionKey = useCallback((roleName: string, actionCode: string): string => {
    return `${roleName}|${actionCode}`;
  }, []);
  
  /**
   * Génère une clé unique pour une ressource
   */
  const getResourceKey = useCallback((
    roleName: string,
    resourceCode: string,
    externalResourceCode: string
  ): string => {
    return `${roleName}|${resourceCode}|${externalResourceCode || 'NULL'}`;
  }, []);
  
  
  /**
   * Construit la Map globale de toutes les ressources par action (avec données complètes)
   * ✅ Appelé UNE SEULE FOIS au chargement des données
   * ✅ Performance : O(n) où n = nombre total d'actions × ressources
   * ✅ Stocke les ressources COMPLÈTES avec leurs externalResources pour extraire les valeurs plus tard
   */
  const buildActionResourcesMap = useCallback((simpleRoles: any[], compositeRoles: any[]) => {
    const map = new Map<string, any>();
    
    // Parcourir les rôles simples (Étape 1)
    simpleRoles.forEach((role: any) => {
      role.risks?.forEach((risk: any) => {
        risk.functions?.forEach((func: any) => {
          func.actions?.forEach((action: any) => {
            action.resources?.forEach((resource: any) => {
              if (resource.code !== 'S_TCODE') {
                const key = getActionResourceKey(role.roleName, action.code, resource.code);
                // Stocker la ressource complète (avec externalResources)
                map.set(key, resource);
              }
            });
          });
        });
      });
    });
    
    // Parcourir les rôles composites (Étape 2)
    compositeRoles.forEach((compositeRole: any) => {
      compositeRole.risks?.forEach((risk: any) => {
        risk.functions?.forEach((func: any) => {
          func.simpleRoles?.forEach((simpleRole: any) => {
            simpleRole.actions?.forEach((action: any) => {
              action.resources?.forEach((resource: any) => {
                if (resource.code !== 'S_TCODE') {
                  const key = getActionResourceKey(simpleRole.roleName, action.code, resource.code);
                  // Stocker la ressource complète (avec externalResources)
                  map.set(key, resource);
                }
              });
            });
          });
        });
      });
    });
    
    actionResourcesMapRef.current = map;
    
    console.log('🗺️ [BUILD ACTION RESOURCES MAP]', {
      totalEntries: map.size,
      sample: Array.from(map.entries()).slice(0, 3).map(([k, v]) => ({ 
        key: k, 
        resourceCode: v.code,
        externalResourcesCount: v.externalResources?.length || 0
      }))
    });
  }, [getActionResourceKey]);
  
  /**
   * Toggle suppression d'une action
   * ✅ PROPAGATION GLOBALE : Restreindre TOUTES les ressources de l'action (toutes fonctions) au niveau VALEURS
   */
  const toggleDeleteAction = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    const key = getActionKey(roleName, actionCode);
    const isDeleted = deletedActionsRef.current.get(key);
    
    if (isDeleted) {
      // ♻️ RESTAURER l'action
      deletedActionsRef.current.delete(key);
      
      // ✅ Parcourir TOUTES les ressources de cette action dans la Map globale
      let restoredCount = 0;
      actionResourcesMapRef.current.forEach((resource, mapKey) => {
        const [mapRoleName, mapActionCode, ] = mapKey.split('|');
        if (mapRoleName === roleName && mapActionCode === actionCode) {
          // Retirer les restrictions de cette ressource (toutes ses valeurs)
          resource.externalResources?.forEach((extRes: any) => {
            const values = extractExternalResourceValues(extRes);
            const resKey = getResourceKey(roleName, resource.code, extRes.code);
            const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
            
            if (restrictedValuesSet) {
              values.forEach(v => restrictedValuesSet.delete(v));
              if (restrictedValuesSet.size === 0) {
                restrictedResourcesRef.current.delete(resKey);
              }
              restoredCount++;
            }
          });
        }
      });
    } else {
      // 🗑️ SUPPRIMER l'action
      deletedActionsRef.current.set(key, true);
      restrictedActionsRef.current.delete(key);
      
      // ✅ Parcourir TOUTES les ressources de cette action dans la Map globale
      const restrictedResources: string[] = [];
      actionResourcesMapRef.current.forEach((resource, mapKey) => {
        const [mapRoleName, mapActionCode, ] = mapKey.split('|');
        if (mapRoleName === roleName && mapActionCode === actionCode) {
          // Restreindre TOUTES les valeurs de cette ressource
          resource.externalResources?.forEach((extRes: any) => {
            const values = extractExternalResourceValues(extRes);
            const resKey = getResourceKey(roleName, resource.code, extRes.code);
            const restrictedValuesSet = restrictedResourcesRef.current.get(resKey) || new Set<string>();
            
            values.forEach(v => restrictedValuesSet.add(v));
            restrictedResourcesRef.current.set(resKey, restrictedValuesSet);
            
            restrictedResources.push(`${resource.code} (${values.length} valeurs)`);
          });
        }
      });
    }
    
    incrementVersion();
  }, [getActionKey, getResourceKey, incrementVersion]);
  
  // ✅ Fonctions utilitaires importées depuis sodResourceUtils.ts
  
  /**
   * Nettoie une action de restrictedActionsRef si elle n'a plus de ressources restreintes
   * ✅ Maintient la cohérence entre l'état du contexte et l'état visuel
   * ⚠️  Doit être déclaré AVANT toggleRestrictAction qui l'utilise
   */
  const cleanupActionIfNeeded = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    const key = getActionKey(roleName, actionCode);
    const restriction = restrictedActionsRef.current.get(key);
    
    // Si l'action n'est pas marquée comme restreinte directement, pas besoin de nettoyer
    if (!restriction || !restriction.restrictedByAction) {
      return;
    }
    
    // Vérifier si l'action a encore des ressources non-S_TCODE réellement restreintes
    const hasRestrictedResource = resources.some(resource => {
      if (resource.code === 'S_TCODE') return false;
      
      return resource.externalResources?.some((extRes: any) => {
        const values = extractExternalResourceValues(extRes);
        const resKey = getResourceKey(roleName, resource.code, extRes.code);
        const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
        
        if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
          return false;
        }
        
        // Toutes les valeurs doivent être dans le set
        return values.length > 0 && values.every(v => restrictedValuesSet.has(v));
      });
    });
    
      // Si l'action n'a plus de ressources restreintes, la nettoyer
      if (!hasRestrictedResource) {
        restrictedActionsRef.current.delete(key);
      }
  }, [getActionKey, getResourceKey]);
  
  /**
   * Restreindre une action directement (sans toggle)
   * ✅ Utilisé pour "Restreindre tout" - force la restriction sans vérifier l'état
   * ✅ PROPAGATION : Restreint automatiquement toutes les ressources non-S_TCODE
   */
  const restrictAction = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    const key = getActionKey(roleName, actionCode);
    
    // ✅ Restreindre directement (pas de toggle)
    restrictedActionsRef.current.set(key, { restrictedByAction: true });
    
    // Si on restreint, on retire la suppression
    deletedActionsRef.current.delete(key);
    
    // Restreindre toutes les ressources non-S_TCODE
    resources.forEach(resource => {
      if (resource.code !== 'S_TCODE') {
        resource.externalResources?.forEach((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          const resKey = getResourceKey(roleName, resource.code, extRes.code);
          const restrictedValuesSet = restrictedResourcesRef.current.get(resKey) || new Set<string>();
          
          // Ajouter ces valeurs
          values.forEach(v => restrictedValuesSet.add(v));
          restrictedResourcesRef.current.set(resKey, restrictedValuesSet);
        });
      }
    });
    
    incrementVersion();
  }, [getActionKey, getResourceKey, incrementVersion]);

  /**
   * Toggle restriction d'une action
   * ✅ PROPAGATION : Restreint automatiquement toutes les ressources non-S_TCODE
   * ✅ FIX : Vérifie l'état visuel réel (action peut être restreinte via ses ressources)
   * ✅ CLEANUP : Nettoie l'action si elle n'a plus de ressources restreintes AVANT de vérifier l'état
   */
  const toggleRestrictAction = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    const key = getActionKey(roleName, actionCode);
    
    // ✅ CLEANUP PRÉALABLE : Nettoyer l'action si elle n'a plus de ressources restreintes
    cleanupActionIfNeeded(roleName, actionCode, resources);
    
    const actionDirectlyRestricted = restrictedActionsRef.current.get(key);
    
    // ✅ Vérifier si l'action est visuellement restreinte (via ses ressources)
    const hasRestrictedResource = resources.some(resource => {
      if (resource.code === 'S_TCODE') return false;
      
      return resource.externalResources?.some((extRes: any) => {
        const values = extractExternalResourceValues(extRes);
        const resKey = getResourceKey(roleName, resource.code, extRes.code);
        const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
        
        if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
          return false;
        }
        
        // Toutes les valeurs doivent être dans le set
        return values.length > 0 && values.every(v => restrictedValuesSet.has(v));
      });
    });
    
    const isCurrentlyRestricted = !!actionDirectlyRestricted || hasRestrictedResource;
    
    if (isCurrentlyRestricted) {
      // Dé-restreindre : retirer l'action ET les ressources
      restrictedActionsRef.current.delete(key);
      
      // Retirer les valeurs des ressources non-S_TCODE
      resources.forEach(resource => {
        if (resource.code !== 'S_TCODE') {
          resource.externalResources?.forEach((extRes: any) => {
            const values = extractExternalResourceValues(extRes);
            const resKey = getResourceKey(roleName, resource.code, extRes.code);
            const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
            
            if (restrictedValuesSet) {
              // Retirer ces valeurs
              values.forEach(v => restrictedValuesSet.delete(v));
              if (restrictedValuesSet.size === 0) {
                restrictedResourcesRef.current.delete(resKey);
              }
            }
          });
        }
      });
    } else {
      // Restreindre : ajouter l'action ET les ressources
      restrictedActionsRef.current.set(key, { restrictedByAction: true });
      
      // Si on restreint, on retire la suppression
      deletedActionsRef.current.delete(key);
      
      // Ajouter les valeurs des ressources non-S_TCODE
      resources.forEach(resource => {
        if (resource.code !== 'S_TCODE') {
          resource.externalResources?.forEach((extRes: any) => {
            const values = extractExternalResourceValues(extRes);
            const resKey = getResourceKey(roleName, resource.code, extRes.code);
            const restrictedValuesSet = restrictedResourcesRef.current.get(resKey) || new Set<string>();
            
            // Ajouter ces valeurs
            values.forEach(v => restrictedValuesSet.add(v));
            restrictedResourcesRef.current.set(resKey, restrictedValuesSet);
          });
        }
      });
    }
    
    incrementVersion();
  }, [getActionKey, getResourceKey, cleanupActionIfNeeded, incrementVersion]);
  
  /**
   * Toggle restriction d'une ressource avec ses valeurs
   */
  const toggleRestrictResource = useCallback((
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => {
    const key = getResourceKey(roleName, resourceCode, externalResourceCode);
    const restrictedValuesSet = restrictedResourcesRef.current.get(key) || new Set<string>();
    
    // Vérifier si ces valeurs sont déjà restreintes
    const alreadyRestricted = values.every(v => restrictedValuesSet.has(v));
    
    if (alreadyRestricted) {
      // ✅ DÉ-RESTREINDRE : Retirer les valeurs
      values.forEach(v => restrictedValuesSet.delete(v));
      if (restrictedValuesSet.size === 0) {
        restrictedResourcesRef.current.delete(key);
      }
    } else {
      // ✅ RESTREINDRE : Ajouter les valeurs
      values.forEach(v => restrictedValuesSet.add(v));
      restrictedResourcesRef.current.set(key, restrictedValuesSet);
    }
    
    incrementVersion();
  }, [getResourceKey, incrementVersion]);
  
  
  /**
   * Toggle l'exclusion d'un rôle simple dans un rôle composite
   * L'exclusion est propagée à toutes les fonctions du composite
   * ✅ OPTIMISÉ : Utilisation de Map pour O(1) lookup et modification
   */
  const toggleExcludeSimpleRole = useCallback((
    compositeRoleName: string,
    simpleRoleName: string
  ) => {
    const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
    const isExcluded = excludedSimpleRolesRef.current.get(key);
    
    if (isExcluded) {
      excludedSimpleRolesRef.current.delete(key);
    } else {
      excludedSimpleRolesRef.current.set(key, true);
    }
    
    incrementVersion();
  }, [getExcludedRoleKey, incrementVersion]);
  
  /**
   * Vérifier si un rôle simple est exclu
   * Vérifie au niveau du composite (toutes fonctions confondues)
   * ✅ OPTIMISÉ : O(1) lookup dans Map, pas d'itération
   */
  const isSimpleRoleExcluded = useCallback((
    compositeRoleName: string,
    simpleRoleName: string
  ): boolean => {
    const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
    return excludedSimpleRolesRef.current.get(key) || false;
  }, [getExcludedRoleKey]);
  
  /**
   * Réinitialiser tout l'état
   */
  const resetState = useCallback(() => {
    deletedActionsRef.current.clear();
    restrictedActionsRef.current.clear();
    restrictedResourcesRef.current.clear();
    actionResourcesMapRef.current.clear();
    excludedSimpleRolesRef.current.clear();
    console.log('🔄 [RESET STATE] État SoD réinitialisé');
    incrementVersion();
  }, [incrementVersion]);
  
  /**
   * Vérifier si une action est supprimée
   */
  const isActionDeleted = useCallback((roleName: string, actionCode: string): boolean => {
    const key = getActionKey(roleName, actionCode);
    return deletedActionsRef.current.get(key) || false;
  }, [getActionKey]);
  
  /**
   * Vérifier si une action est restreinte
   * 
   * Note : Le lazy cleanup a été retiré car il n'était pas assez précis.
   * La logique de restriction se base maintenant uniquement sur applyStateToAction
   * qui vérifie correctement si les ressources de l'action sont restreintes.
   * restrictedActionsRef sert uniquement à marquer qu'une action a été restreinte
   * directement via son bouton (pour la propagation aux ressources).
   */
  const isActionRestricted = useCallback((roleName: string, actionCode: string) => {
    const key = getActionKey(roleName, actionCode);
    const restriction = restrictedActionsRef.current.get(key);
    
    return {
      isRestricted: !!restriction,
      restrictedByAction: restriction?.restrictedByAction || false
    };
  }, [getActionKey]);
  
  /**
   * Vérifier si une ressource est restreinte (toutes les valeurs)
   */
  const isResourceRestricted = useCallback((
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ): boolean => {
    const key = getResourceKey(roleName, resourceCode, externalResourceCode);
    const restrictedValuesSet = restrictedResourcesRef.current.get(key);
    
    if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
      return false;
    }
    
    // Toutes les valeurs doivent être dans le set
    return values.length > 0 && values.every(v => restrictedValuesSet.has(v));
  }, [getResourceKey]);
  
  // ============================================
  // FONCTIONS DE CALCUL DE REMÉDIATION
  // ============================================
  
  /**
   * Calcule si une fonction est remediée
   * 
   * ✅ Une fonction est REMEDIEE si AU MOINS UNE de ces conditions est vraie :
   *    1. Toutes les actions SUPPRIMABLES (avec S_TCODE) sont supprimées
   *    2. Toutes les actions RESTRAINABLES (avec ressources non-S_TCODE) sont restreintes
   * 
   * ✅ Une action est REMEDIABLE si elle a au moins :
   *    - Une ressource S_TCODE (peut être supprimée) OU
   *    - Une ressource non-S_TCODE (peut être restreinte)
   */
  const calculateFunctionRemediation = useCallback((
    roleName: string, 
    actions: any[] // SodAction[]
  ) => {
    let suppressableCount = 0;   // Actions avec S_TCODE
    let suppressedCount = 0;     // Actions supprimées
    let restrainableCount = 0;   // Actions avec ressources non-S_TCODE
    let restrictedCount = 0;     // Actions restreintes
    
    actions.forEach(action => {
      const hasTCode = action.resources?.some((r: any) => r.code === 'S_TCODE') || false;
      const hasOtherResources = action.resources?.some((r: any) => r.code !== 'S_TCODE') || false;
      
      // ❌ Si l'action n'a NI S_TCODE NI autres ressources → NON remediable
      if (!hasTCode && !hasOtherResources) {
        return; // Ignorer cette action
      }
      
      const actionKey = getActionKey(roleName, action.code);
      const isDeleted = deletedActionsRef.current.get(actionKey) || false;
      const restriction = restrictedActionsRef.current.get(actionKey);
      const isActionDirectlyRestricted = !!restriction;
      
      // ✅ Vérifier si au moins une ressource non-S_TCODE est restreinte
      let hasRestrictedResource = false;
      if (hasOtherResources && action.resources && Array.isArray(action.resources)) {
        for (const resource of action.resources) {
          // Ignorer S_TCODE
          if (resource.code === 'S_TCODE') continue;
          
          // Vérifier si cette ressource a des externalResources restreintes
          if (resource.externalResources && Array.isArray(resource.externalResources)) {
            for (const extRes of resource.externalResources) {
              // Extraire les valeurs de cette externalResource
              const values = extractExternalResourceValues(extRes);
              
              // Vérifier si cette externalResource est restreinte
              const resKey = getResourceKey(roleName, resource.code, extRes.code);
              const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
              
              if (restrictedValuesSet && restrictedValuesSet.size > 0) {
                // Toutes les valeurs doivent être dans le set
                const allValuesRestricted = values.length > 0 && values.every(v => restrictedValuesSet.has(v));
                if (allValuesRestricted) {
                  hasRestrictedResource = true;
                  break;
                }
              }
            }
          }
          
          if (hasRestrictedResource) break;
        }
      }
      
      const isRestricted = isActionDirectlyRestricted || hasRestrictedResource;
      
      // Compter les actions supprimables et restrainables
      if (hasTCode) {
        suppressableCount++;
        if (isDeleted) {
          suppressedCount++;
        }
      }
      
      if (hasOtherResources) {
        restrainableCount++;
        if (isRestricted) {
          restrictedCount++;
        }
      }
    });
    
    // ✅ Fonction remediée si AU MOINS UNE condition est vraie :
    // 1. Toutes les actions supprimables sont supprimées
    const allSuppressablesSuppressed = suppressableCount > 0 && suppressedCount === suppressableCount;
    
    // 2. Toutes les actions restrainables sont restreintes
    const allRestrainablesRestricted = restrainableCount > 0 && restrictedCount === restrainableCount;
    
    const isRemediated = allSuppressablesSuppressed || allRestrainablesRestricted;
    
    // Pour l'affichage : compter le nombre total d'actions remediables
    const totalRemediable = Math.max(suppressableCount, restrainableCount);
    const totalRemediated = Math.max(suppressedCount, restrictedCount);
    
    return {
      isRemediated,
      totalActions: totalRemediable,
      remediatedActions: totalRemediated
    };
  }, [getActionKey, getResourceKey]);
  
  /**
   * Calcule si un risque est remedié
   * Un risque est remedié si AU MOINS une de ses fonctions est remediée
   */
  const calculateRiskRemediation = useCallback((
    roleName: string,
    functions: any[] // SodSimpleRoleFunction[]
  ) => {
    let remediatedFunctions = 0;
    
    functions.forEach(func => {
      const funcStatus = calculateFunctionRemediation(roleName, func.actions);
      if (funcStatus.isRemediated) {
        remediatedFunctions++;
      }
    });
    
    const totalFunctions = functions.length;
    
    return {
      isRemediated: remediatedFunctions > 0, // AU MOINS UNE fonction remediée
      totalFunctions,
      remediatedFunctions,
      remediationPercentage: totalFunctions > 0 
        ? Math.round((remediatedFunctions / totalFunctions) * 100) 
        : 0
    };
  }, [calculateFunctionRemediation]);
  
  /**
   * Calcule si un rôle simple est remedié
   * Un rôle est remedié si TOUS ses risques sont remediés
   */
  const calculateRoleRemediation = useCallback((
    roleName: string,
    risks: any[] // SodSimpleRoleRiskItem[]
  ) => {
    let remediatedRisks = 0;
    
    risks.forEach(risk => {
      const riskStatus = calculateRiskRemediation(roleName, risk.functions);
      if (riskStatus.isRemediated) {
        remediatedRisks++;
      }
    });
    
    const totalRisks = risks.length;
    
    return {
      isRemediated: remediatedRisks === totalRisks && totalRisks > 0,
      totalRisks,
      remediatedRisks,
      remediationPercentage: totalRisks > 0 
        ? Math.round((remediatedRisks / totalRisks) * 100) 
        : 0
    };
  }, [calculateRiskRemediation]);
  
  // ✅ useMemo pour stabiliser la référence du contexte
  // La version change à chaque modification → force le re-calcul des useMemo dépendants
  const value: SodActionsContextValue = useMemo(() => ({
    deletedActions: deletedActionsRef.current,
    restrictedActions: restrictedActionsRef.current,
    restrictedResources: restrictedResourcesRef.current,
    version, // ✅ Inclure la version pour forcer le re-calcul
    buildActionResourcesMap,
    toggleDeleteAction,
    restrictAction,
    toggleRestrictAction,
    toggleRestrictResource,
    toggleExcludeSimpleRole,
    resetState,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
    isSimpleRoleExcluded,
    calculateFunctionRemediation,
    calculateRiskRemediation,
    calculateRoleRemediation,
  }), [
    version, // ✅ Dépendre de la version
    buildActionResourcesMap,
    toggleDeleteAction,
    restrictAction,
    toggleRestrictAction,
    toggleRestrictResource,
    toggleExcludeSimpleRole,
    resetState,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
    isSimpleRoleExcluded,
    calculateFunctionRemediation,
    calculateRiskRemediation,
    calculateRoleRemediation,
  ]);
  
  return (
    <SodActionsContext.Provider value={value}>
      {children}
    </SodActionsContext.Provider>
  );
};

/**
 * Hook pour accéder au contexte des actions SoD
 */
export const useSodActionsContext = (): SodActionsContextValue => {
  const context = useContext(SodActionsContext);
  
  if (!context) {
    throw new Error('useSodActionsContext must be used within SodActionsProvider');
  }
  
  return context;
};
