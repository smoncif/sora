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
  
  /** Dérestreindre une action directement (sans toggle) */
  unrestrictAction: (roleName: string, actionCode: string, resources: any[]) => void;
  
  /** Restreindre/dé-restreindre une action */
  toggleRestrictAction: (roleName: string, actionCode: string, resources: any[]) => void;
  
  /** Restreindre/dé-restreindre une ressource avec ses valeurs */
  toggleRestrictResource: (
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => void;
  
  /** Restreindre une ressource directement (sans toggle) */
  restrictResource: (
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
  isActionRestricted: (roleName: string, actionCode: string, resources?: any[]) => { isRestricted: boolean; restrictedByAction: boolean };
  
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
  
  // ============================================
  // REMÉDIATION - RÔLES COMPOSITES (ÉTAPE 2)
  // ============================================
  
  /** Calculer le statut de remédiation d'une fonction composite */
  calculateCompositeFunctionRemediation: (compositeRoleName: string, func: any) => {
    isRemediated: boolean;
    totalSimpleRoles: number;
    remediatedSimpleRoles: number;
  };
  
  /** Calculer le statut de remédiation d'un risque composite */
  calculateCompositeRiskRemediation: (compositeRoleName: string, functions: any[]) => {
    isRemediated: boolean;
    totalFunctions: number;
    remediatedFunctions: number;
    remediationPercentage: number;
  };
  
  /** Calculer le statut de remédiation d'un rôle composite */
  calculateCompositeRoleRemediation: (compositeRoleName: string, risks: any[]) => {
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
    
    // ✅ VÉRIFICATION GLOBALE : Utiliser actionResourcesMapRef pour voir TOUTES les ressources
    let globalRestrictedResources: string[] = [];
    
    // Vérifier TOUTES les ressources globales de cette action
    actionResourcesMapRef.current.forEach((resource, mapKey) => {
      const [mapRoleName, mapActionCode, mapResourceCode] = mapKey.split('|');
      if (mapRoleName === roleName && mapActionCode === actionCode) {
        if (resource.code !== 'S_TCODE') {
          resource.externalResources?.forEach((extRes: any) => {
            const values = extractExternalResourceValues(extRes);
            const resKey = getResourceKey(roleName, resource.code, extRes.code);
            const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
            
            if (restrictedValuesSet && restrictedValuesSet.size > 0) {
              const isRestricted = values.length > 0 && values.every(v => restrictedValuesSet.has(v));
              if (isRestricted) {
                globalRestrictedResources.push(`${resource.code}|${extRes.code} (${values.length} valeurs)`);
              }
            }
          });
        }
      }
    });
    
    // Si l'action n'a plus de ressources restreintes GLOBALEMENT, la nettoyer
    if (globalRestrictedResources.length === 0) {
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
    
    // ✅ Vérifier l'état actuel avant restriction
    const wasAlreadyRestricted = restrictedActionsRef.current.has(key);
    
    if (wasAlreadyRestricted) {
      return;
    }
    
    // ✅ Ajouter l'action comme restreinte
    restrictedActionsRef.current.set(key, { restrictedByAction: true });
    
    // ✅ Si on restreint, on retire la suppression
    const wasDeleted = deletedActionsRef.current.has(key);
    if (wasDeleted) {
      deletedActionsRef.current.delete(key);
    }
    
    // ✅ Restreindre toutes les ressources non-S_TCODE
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
   * Dérestreindre une action directement (sans toggle)
   * ✅ Utilisé pour "Dérestreindre tout" - force la dérestriction sans vérifier l'état
   * ✅ PROPAGATION : Dérestreint automatiquement toutes les ressources non-S_TCODE
   */
  const unrestrictAction = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    const key = getActionKey(roleName, actionCode);
    
    // ✅ Marquer l'action comme non-restreinte directement
    restrictedActionsRef.current.delete(key);
    
    // ✅ PROPAGATION : Dérestreindre automatiquement toutes les ressources non-S_TCODE
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
    
    // ✅ CLEANUP PRÉALABLE
    cleanupActionIfNeeded(roleName, actionCode, resources);
    
    // ✅ Vérifier restriction directe
    const actionDirectlyRestricted = restrictedActionsRef.current.get(key);
    
    // ✅ Vérifier restriction indirecte (via ressources)
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
    
    // ✅ État final calculé
    const isCurrentlyRestricted = !!actionDirectlyRestricted || hasRestrictedResource;
    
    if (isCurrentlyRestricted) {
      // ✅ Dé-restreindre
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
      // ✅ Restreindre
      restrictedActionsRef.current.set(key, { restrictedByAction: true });
      
      // Si on restreint, on retire la suppression
      const wasDeleted = deletedActionsRef.current.has(key);
      if (wasDeleted) {
        deletedActionsRef.current.delete(key);
      }
      
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

  const restrictResource = useCallback((
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => {
    console.log('🔒 restrictResource appelé:', { roleName, resourceCode, externalResourceCode, values });
    const key = getResourceKey(roleName, resourceCode, externalResourceCode);
    console.log('🔑 Clé générée:', key);
    
    const restrictedValuesSet = restrictedResourcesRef.current.get(key) || new Set<string>();
    console.log('📊 Valeurs avant:', Array.from(restrictedValuesSet));
    
    // ✅ FORCER LA RESTRICTION : Ajouter les valeurs (sans toggle)
    values.forEach(v => restrictedValuesSet.add(v));
    restrictedResourcesRef.current.set(key, restrictedValuesSet);
    
    console.log('📊 Valeurs après:', Array.from(restrictedValuesSet));
    console.log('🗂️ Toutes les restrictions:', Array.from(restrictedResourcesRef.current.entries()));
    
    incrementVersion();
    console.log('🔄 Version incrémentée');
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
   * Vérifier si une action est restreinte (directement OU via ses ressources)
   * ✅ FIX : Détecte maintenant les restrictions par propagation
   * - Restriction directe : action dans restrictedActionsRef
   * - Restriction indirecte : toutes les ressources non-S_TCODE sont restreintes
   */
  const isActionRestricted = useCallback((roleName: string, actionCode: string, resources?: any[]) => {
    const key = getActionKey(roleName, actionCode);
    const restriction = restrictedActionsRef.current.get(key);
    
    // ✅ Vérifier restriction directe
    const directlyRestricted = !!restriction;
    
    // ✅ Vérifier restriction indirecte (via ressources) si resources fournis
    let indirectlyRestricted = false;
    
    if (resources && resources.length > 0) {
      indirectlyRestricted = resources.some(resource => {
        if (resource.code === 'S_TCODE') return false;
        
        return resource.externalResources?.some((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          const resKey = getResourceKey(roleName, resource.code, extRes.code);
          const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
          
          if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
            return false;
          }
          
          // Toutes les valeurs doivent être dans le set pour que la ressource soit restreinte
          return values.length > 0 && values.every(v => restrictedValuesSet.has(v));
        });
      });
    }
    
    const isRestricted = directlyRestricted || indirectlyRestricted;
    
    return {
      isRestricted,
      restrictedByAction: restriction?.restrictedByAction || false
    };
  }, [getActionKey, getResourceKey]);
  
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
    
    console.log('🔍 isResourceRestricted:', { roleName, resourceCode, externalResourceCode, values, key, restrictedValuesSet: restrictedValuesSet ? Array.from(restrictedValuesSet) : 'undefined' });
    
    if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
      console.log('❌ Pas de restrictions trouvées');
      return false;
    }
    
    // ✅ Toutes les valeurs doivent être dans le set
    // Une ressource est restreinte si toutes ses valeurs sont restreintes
    const isRestricted = values.length > 0 && values.every(v => restrictedValuesSet.has(v));
    console.log('✅ Restriction trouvée:', isRestricted, 'pour valeurs:', values);
    return isRestricted;
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
  
  // ============================================
  // FONCTIONS DE CALCUL DE REMÉDIATION - RÔLES COMPOSITES (ÉTAPE 2)
  // ============================================
  
  /**
   * Calcule si une fonction composite est remediée
   * 
   * ✅ LOGIQUE CORRECTE :
   *    - Agrège TOUTES les actions de TOUS les rôles simples
   *    - Vérifie au niveau de la FONCTION (pas rôle par rôle)
   *    - Une fonction est remediée si :
   *      1. TOUTES les actions supprimables sont supprimées
   *      OU
   *      2. TOUTES les actions restrainables sont restreintes
   * 
   * ✅ OPTIMISATIONS :
   *    - Gestion des rôles simples exclus (ignorés dans le calcul)
   *    - Réutilisation de la logique existante (getActionKey, getResourceKey)
   * 
   * @param compositeRoleName - Nom du rôle composite
   * @param func - Fonction composite contenant plusieurs rôles simples
   */
  const calculateCompositeFunctionRemediation = useCallback((
    compositeRoleName: string,
    func: any // SodCompositeRoleFunction
  ) => {
    
    if (!func.simpleRoles || func.simpleRoles.length === 0) {
      console.log('⚠️ [COMPOSITE FUNCTION] Aucun rôle simple trouvé', { functionCode: func.code });
      return {
        isRemediated: false,
        totalSimpleRoles: 0,
        remediatedSimpleRoles: 0
      };
    }
    
    // ✅ ÉTAPE 1 : Agréger toutes les actions de tous les rôles simples (non exclus)
    const allActions: any[] = [];
    let totalSimpleRoles = 0;
    
    func.simpleRoles.forEach((simpleRole: any) => {
      // Ignorer les rôles simples exclus
      const isExcluded = isSimpleRoleExcluded(compositeRoleName, simpleRole.roleName);
      
      if (isExcluded) {
        console.log('⏭️ [COMPOSITE FUNCTION] Rôle simple exclu (ignoré)', {
          functionCode: func.code,
          simpleRoleName: simpleRole.roleName
        });
        return;
      }
      
      totalSimpleRoles++;
      
      // Ajouter toutes les actions de ce rôle simple
      if (simpleRole.actions && simpleRole.actions.length > 0) {
        simpleRole.actions.forEach((action: any) => {
          allActions.push({
            ...action,
            sourceRoleName: simpleRole.roleName // Pour debug
          });
        });
      }
    });
    
    
    if (allActions.length === 0) {
      console.log('⚠️ [COMPOSITE FUNCTION] Aucune action trouvée', { functionCode: func.code });
      return {
        isRemediated: false,
        totalSimpleRoles,
        remediatedSimpleRoles: 0
      };
    }
    
    // ✅ ÉTAPE 2 : Vérifier la remédiation au niveau de la FONCTION
    let suppressableCount = 0;
    let suppressedCount = 0;
    let restrainableCount = 0;
    let restrictedCount = 0;
    
    allActions.forEach(action => {
      const sourceRoleName = action.sourceRoleName || '';
      const actionKey = getActionKey(sourceRoleName, action.code || '');
      const isDeleted = deletedActionsRef.current.get(actionKey) || false;
      
      // Analyser les ressources
      const resources = action.resources || [];
      const hasTCode = resources.some((r: any) => r.code === 'S_TCODE');
      const hasOtherResources = resources.some((r: any) => r.code !== 'S_TCODE');
      
      // Ignorer les actions sans ressources valides
      if (!hasTCode && !hasOtherResources) {
        return;
      }
      
      const restriction = restrictedActionsRef.current.get(actionKey);
      const isActionDirectlyRestricted = !!restriction;
      
      // ✅ Vérifier si au moins une ressource non-S_TCODE est restreinte
      let hasRestrictedResource = false;
      if (hasOtherResources && resources && Array.isArray(resources)) {
        for (const resource of resources) {
          // Ignorer S_TCODE
          if (resource.code === 'S_TCODE') continue;
          
          // Vérifier si cette ressource a des externalResources restreintes
          if (resource.externalResources && Array.isArray(resource.externalResources)) {
            for (const extRes of resource.externalResources) {
              // Extraire les valeurs de cette externalResource
              const values = extractExternalResourceValues(extRes);
              
              // Vérifier si cette externalResource est restreinte
              const resKey = getResourceKey(sourceRoleName, resource.code, extRes.code);
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
    
    // ✅ ÉTAPE 3 : Déterminer si la fonction est remediée
    // Fonction remediée si AU MOINS UNE condition est vraie :
    // 1. Toutes les actions supprimables sont supprimées
    const allSuppressablesSuppressed = suppressableCount > 0 && suppressedCount === suppressableCount;
    
    // 2. Toutes les actions restrainables sont restreintes
    const allRestrainablesRestricted = restrainableCount > 0 && restrictedCount === restrainableCount;
    
    const isRemediated = allSuppressablesSuppressed || allRestrainablesRestricted;
    
    return {
      isRemediated,
      totalSimpleRoles,
      remediatedSimpleRoles: isRemediated ? totalSimpleRoles : 0
    };
  }, [getActionKey, getResourceKey, isSimpleRoleExcluded]);
  
  /**
   * Calcule si un risque composite est remedié
   * 
   * ✅ IDENTIQUE à l'Étape 1 : Un risque est remedié si AU MOINS UNE fonction est remediée
   * 
   * ✅ OPTIMISATIONS :
   *    - Mémoïsation recommandée dans les composants (useMemo avec version)
   *    - Calcul du pourcentage pour affichage progressif
   * 
   * @param compositeRoleName - Nom du rôle composite
   * @param functions - Liste des fonctions du risque
   */
  const calculateCompositeRiskRemediation = useCallback((
    compositeRoleName: string,
    functions: any[] // SodCompositeRoleFunction[]
  ) => {
    
    if (!functions || functions.length === 0) {
      console.log('⚠️ [COMPOSITE RISK] Aucune fonction trouvée');
      return {
        isRemediated: false,
        totalFunctions: 0,
        remediatedFunctions: 0,
        remediationPercentage: 0
      };
    }
    
    let remediatedFunctions = 0;
    const functionDetails: any[] = [];
    
    // Parcourir chaque fonction
    functions.forEach(func => {
      const funcStatus = calculateCompositeFunctionRemediation(
        compositeRoleName,
        func
      );
      
      functionDetails.push({
        functionCode: func.code,
        isRemediated: funcStatus.isRemediated,
        totalSimpleRoles: funcStatus.totalSimpleRoles,
        remediatedSimpleRoles: funcStatus.remediatedSimpleRoles
      });
      
      
      if (funcStatus.isRemediated) {
        remediatedFunctions++;
      }
    });
    
    const totalFunctions = functions.length;
    const remediationPercentage = totalFunctions > 0
      ? Math.round((remediatedFunctions / totalFunctions) * 100)
      : 0;
    const isRemediated = remediatedFunctions > 0; // ✅ AU MOINS UNE fonction
    
    
    return {
      isRemediated,
      totalFunctions,
      remediatedFunctions,
      remediationPercentage
    };
  }, [calculateCompositeFunctionRemediation]);
  
  /**
   * Calcule si un rôle composite est remedié
   * 
   * ✅ IDENTIQUE à l'Étape 1 : Un rôle est remedié si TOUS ses risques sont remediés
   * 
   * ✅ OPTIMISATIONS :
   *    - Mémoïsation recommandée dans les composants (useMemo avec version)
   *    - Calcul du pourcentage pour badges et gradients
   * 
   * @param compositeRoleName - Nom du rôle composite
   * @param risks - Liste des risques du rôle
   */
  const calculateCompositeRoleRemediation = useCallback((
    compositeRoleName: string,
    risks: any[] // SodCompositeRoleRiskItem[]
  ) => {
    
    if (!risks || risks.length === 0) {
      console.log('⚠️ [COMPOSITE ROLE] Aucun risque trouvé', { compositeRoleName });
      return {
        isRemediated: false,
        totalRisks: 0,
        remediatedRisks: 0,
        remediationPercentage: 0
      };
    }
    
    let remediatedRisks = 0;
    const riskDetails: any[] = [];
    
    // Parcourir chaque risque
    risks.forEach(risk => {
      const riskStatus = calculateCompositeRiskRemediation(
        compositeRoleName,
        risk.functions || []
      );
      
      riskDetails.push({
        riskId: risk.riskId,
        isRemediated: riskStatus.isRemediated,
        totalFunctions: riskStatus.totalFunctions,
        remediatedFunctions: riskStatus.remediatedFunctions,
        remediationPercentage: riskStatus.remediationPercentage
      });
      
      
      if (riskStatus.isRemediated) {
        remediatedRisks++;
      }
    });
    
    const totalRisks = risks.length;
    const remediationPercentage = totalRisks > 0
      ? Math.round((remediatedRisks / totalRisks) * 100)
      : 0;
    const isRemediated = remediatedRisks === totalRisks && totalRisks > 0; // ✅ TOUS les risques
    
    
    return {
      isRemediated,
      totalRisks,
      remediatedRisks,
      remediationPercentage
    };
  }, [calculateCompositeRiskRemediation]);
  
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
    unrestrictAction,
    toggleRestrictAction,
    toggleRestrictResource,
    restrictResource,
    toggleExcludeSimpleRole,
    resetState,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
    isSimpleRoleExcluded,
    calculateFunctionRemediation,
    calculateRiskRemediation,
    calculateRoleRemediation,
    calculateCompositeFunctionRemediation,
    calculateCompositeRiskRemediation,
    calculateCompositeRoleRemediation,
  }), [
    version, // ✅ Dépendre de la version
    buildActionResourcesMap,
    toggleDeleteAction,
    restrictAction,
    unrestrictAction,
    toggleRestrictAction,
    toggleRestrictResource,
    restrictResource,
    toggleExcludeSimpleRole,
    resetState,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
    isSimpleRoleExcluded,
    calculateFunctionRemediation,
    calculateRiskRemediation,
    calculateRoleRemediation,
    calculateCompositeFunctionRemediation,
    calculateCompositeRiskRemediation,
    calculateCompositeRoleRemediation,
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
