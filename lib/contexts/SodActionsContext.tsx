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
  
  /** Supprimer/restaurer une action */
  toggleDeleteAction: (roleName: string, actionCode: string, resources: any[]) => void;
  
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
   * Toggle suppression d'une action
   * ✅ PROPAGATION AUTOMATIQUE : Restreindre les ressources non-S_TCODE lors de la suppression
   */
  const toggleDeleteAction = useCallback((roleName: string, actionCode: string, resources: any[]) => {
    const key = getActionKey(roleName, actionCode);
    const isDeleted = deletedActionsRef.current.get(key);
    
    if (isDeleted) {
      // ♻️ RESTAURER l'action
      deletedActionsRef.current.delete(key);
      
      // ✅ Retirer les restrictions automatiques des ressources non-S_TCODE
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
      
      console.log('♻️ [RESTORE ACTION + UNRESTRICT RESOURCES]', { 
        roleName, 
        actionCode, 
        key,
        resourcesProcessed: resources.filter(r => r.code !== 'S_TCODE').length
      });
    } else {
      // 🗑️ SUPPRIMER l'action
      deletedActionsRef.current.set(key, true);
      // Si on supprime, on retire aussi la restriction de l'action
      restrictedActionsRef.current.delete(key);
      
      // ✅ PROPAGATION AUTOMATIQUE : Restreindre automatiquement toutes les ressources non-S_TCODE
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
      
      console.log('🗑️ [DELETE ACTION + AUTO-RESTRICT RESOURCES]', { 
        roleName, 
        actionCode, 
        key,
        resourcesProcessed: resources.filter(r => r.code !== 'S_TCODE').length,
        totalRestrictedResources: restrictedResourcesRef.current.size
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
      console.log('🧹 [AUTO CLEANUP] Action sans ressources restreintes:', {
        roleName,
        actionCode,
        key
      });
      restrictedActionsRef.current.delete(key);
    }
  }, [getActionKey, getResourceKey]);
  
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
    
    console.log('🔍 [TOGGLE RESTRICT ACTION] État actuel:', {
      roleName,
      actionCode,
      actionDirectlyRestricted: !!actionDirectlyRestricted,
      hasRestrictedResource,
      isCurrentlyRestricted
    });
    
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
      
      console.log('✅ [UNRESTRICT ACTION + RESOURCES]', { 
        roleName, 
        actionCode, 
        key,
        resourcesProcessed: resources.filter(r => r.code !== 'S_TCODE').length
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
      
      console.log('🚫 [RESTRICT ACTION + RESOURCES]', { 
        roleName, 
        actionCode, 
        key,
        resourcesProcessed: resources.filter(r => r.code !== 'S_TCODE').length,
        totalRestrictedResources: restrictedResourcesRef.current.size
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
    console.log('🔍 [toggleRestrictResource] Called with:', {
      roleName,
      resourceCode,
      externalResourceCode,
      values,
      isArray: Array.isArray(values),
      valuesLength: values?.length
    });
    
    const key = getResourceKey(roleName, resourceCode, externalResourceCode);
    const restrictedValuesSet = restrictedResourcesRef.current.get(key) || new Set<string>();
    
    console.log('  Generated key:', key);
    console.log('  Current restrictedValuesSet:', Array.from(restrictedValuesSet));
    
    // Vérifier si ces valeurs sont déjà restreintes
    const alreadyRestricted = values.every(v => restrictedValuesSet.has(v));
    
    console.log('  alreadyRestricted:', alreadyRestricted);
    
    if (alreadyRestricted) {
      // Retirer les valeurs
      values.forEach(v => restrictedValuesSet.delete(v));
      if (restrictedValuesSet.size === 0) {
        restrictedResourcesRef.current.delete(key);
      }
      console.log('✅ [UNRESTRICT RESOURCE]', { 
        roleName, 
        resourceCode, 
        externalResourceCode,
        values,
        mapSize: restrictedResourcesRef.current.size 
      });
    } else {
      // Ajouter les valeurs
      values.forEach(v => restrictedValuesSet.add(v));
      restrictedResourcesRef.current.set(key, restrictedValuesSet);
      console.log('🚫 [RESTRICT RESOURCE]', { 
        roleName, 
        resourceCode, 
        externalResourceCode,
        values,
        mapSize: restrictedResourcesRef.current.size 
      });
    }
    
    incrementVersion();
  }, [getResourceKey, incrementVersion]);
  
  /**
   * Réinitialiser tout l'état
   */
  const resetState = useCallback(() => {
    deletedActionsRef.current.clear();
    restrictedActionsRef.current.clear();
    restrictedResourcesRef.current.clear();
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
    toggleDeleteAction,
    toggleRestrictAction,
    toggleRestrictResource,
    resetState,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
    calculateFunctionRemediation,
    calculateRiskRemediation,
    calculateRoleRemediation,
  }), [
    version, // ✅ Dépendre de la version
    toggleDeleteAction,
    toggleRestrictAction,
    toggleRestrictResource,
    resetState,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
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
