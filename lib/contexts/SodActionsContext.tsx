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
  toggleDeleteAction: (roleName: string, actionCode: string) => void;
  
  /** Restreindre/dé-restreindre une action */
  toggleRestrictAction: (roleName: string, actionCode: string) => void;
  
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
   */
  const toggleDeleteAction = useCallback((roleName: string, actionCode: string) => {
    const key = getActionKey(roleName, actionCode);
    const isDeleted = deletedActionsRef.current.get(key);
    
    if (isDeleted) {
      deletedActionsRef.current.delete(key);
    } else {
      deletedActionsRef.current.set(key, true);
      // Si on supprime, on retire aussi la restriction
      restrictedActionsRef.current.delete(key);
    }
    
    console.log('🗑️ [DELETE ACTION]', { 
      roleName, 
      actionCode, 
      key,
      newState: !isDeleted,
      mapSize: deletedActionsRef.current.size 
    });
    incrementVersion();
  }, [getActionKey, incrementVersion]);
  
  /**
   * Toggle restriction d'une action
   */
  const toggleRestrictAction = useCallback((roleName: string, actionCode: string) => {
    const key = getActionKey(roleName, actionCode);
    const current = restrictedActionsRef.current.get(key);
    
    if (current) {
      restrictedActionsRef.current.delete(key);
    } else {
      restrictedActionsRef.current.set(key, { restrictedByAction: true });
      // Si on restreint, on retire la suppression
      deletedActionsRef.current.delete(key);
    }
    
    console.log('🚫 [RESTRICT ACTION]', { 
      roleName, 
      actionCode, 
      key,
      newState: !current,
      mapSize: restrictedActionsRef.current.size 
    });
    incrementVersion();
  }, [getActionKey, incrementVersion]);
  
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
  }), [
    version, // ✅ Dépendre de la version
    toggleDeleteAction,
    toggleRestrictAction,
    toggleRestrictResource,
    resetState,
    isActionDeleted,
    isActionRestricted,
    isResourceRestricted,
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
