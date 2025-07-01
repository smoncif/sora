import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

// Types pour la gestion des sélections
export interface AnalysisSelectionsState {
  selectedRoles: Map<string, Set<string>>;
}

export interface AnalysisSelectionsConfig {
  analysisResult: SimplifiedAnalysisResult | null;
}

export interface AnalysisSelectionsCallbacks {
  onSelectedRolesChange?: (roles: Map<string, Set<string>>) => void;
}

export interface AnalysisSelectionsReturn {
  // États
  state: AnalysisSelectionsState;
  
  // Actions de sélection
  handleSelectionChange: (businessRole: string, selectedRoles: Set<string>) => void;
  getSelectedRolesForBusinessRole: (businessRole: string) => Set<string>;
  synchronizeSelectedRoles: (selections: Map<string, Set<string>>) => void;
  clearAllSelections: () => void;
  
  // Utilitaires de sélection
  getTotalSelectedRoles: () => number;
  getSelectionSummary: () => {
    totalBusinessRoles: number;
    businessRolesWithSelections: number;
    totalSelectedSimpleRoles: number;
  };
  hasSelections: boolean;
}

export const useAnalysisSelections = (
  config: AnalysisSelectionsConfig,
  callbacks?: AnalysisSelectionsCallbacks
): AnalysisSelectionsReturn => {
  
  const { analysisResult } = config;
  
  // 🔒 STABILISÉ : Mémoriser les callbacks avec clé stable
  const memoizedCallbacks = useMemo(() => callbacks, [callbacks]);
  
  // État des sélections
  const [state, setState] = useState<AnalysisSelectionsState>({
    selectedRoles: new Map(),
  });

  // 🚀 OPTIMISATION 1 : Mémorisation granulaire par rôle métier
  // Chaque rôle métier a son propre Set mémorisé pour éviter les re-renders cross-business-role
  const memoizedSelectionsByRole = useMemo(() => {
    const memoMap = new Map<string, Set<string>>();
    state.selectedRoles.forEach((roles, businessRole) => {
      // Créer un nouveau Set pour chaque rôle métier pour éviter les mutations
      memoMap.set(businessRole, new Set(roles));
    });
    return memoMap;
  }, [state.selectedRoles]);
  
  // 🔄 RÉINITIALISATION : Reset des sélections quand l'analyse change (sauf si elle contient des sélections à restaurer)
  // 🔧 PROBLÈME RÉSOLU : Éviter le reset intempestif des sélections utilisateur
  //
  // PROBLÈME INITIAL :
  // 1. useEffect se déclenchait à CHAQUE modification d'analysisResult
  // 2. Même les modifications de coefficients provoquaient un reset des sélections
  // 3. Les sélections utilisateur étaient perdues lors de tout changement
  //
  // SOLUTION :
  // 1. Tracker l'ID unique de l'analyse pour détecter les vraies nouvelles analyses
  // 2. Ne resetter que lors du chargement d'une NOUVELLE analyse
  // 3. Préserver les sélections lors des modifications de la même analyse
  const lastAnalysisIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (analysisResult) {
      // 🔧 CORRECTION : Identifier l'analyse de manière unique pour éviter les resets intempestifs
      const currentAnalysisId = analysisResult.id || analysisResult.timestamp?.toISOString() || 'unknown';
      
      // Ne reset que si c'est vraiment une NOUVELLE analyse (pas une modification de l'existante)
      if (lastAnalysisIdRef.current !== currentAnalysisId) {
        lastAnalysisIdRef.current = currentAnalysisId;
        
        // Ne reset que si l'analyse ne contient pas de sélections à restaurer
        const hasSelectionsToRestore = analysisResult.userSelections && 
          Object.keys(analysisResult.userSelections).length > 0;
        
        if (!hasSelectionsToRestore) {
          setState({
            selectedRoles: new Map(),
          });
        }
      }
      // Sinon, c'est la même analyse qui a été modifiée → GARDER les sélections actuelles
    }
  }, [analysisResult?.id, analysisResult?.timestamp]);
  
  // 🎯 ACTION : Gestion des changements de sélection - OPTIMISÉ
  const handleSelectionChange = useCallback((businessRole: string, selectedRoles: Set<string>) => {
    setState(prev => {
      // Créer une nouvelle Map pour éviter les mutations
      const newSelectedRoles = new Map(prev.selectedRoles);
      
      if (selectedRoles.size > 0) {
        // Ajouter ou mettre à jour la sélection
        newSelectedRoles.set(businessRole, new Set(selectedRoles));
      } else {
        // Supprimer la sélection si elle est vide
        newSelectedRoles.delete(businessRole);
      }
      
      // Notifier du changement directement pour éviter les boucles asynchrones
      memoizedCallbacks?.onSelectedRolesChange?.(newSelectedRoles);
      
      return {
        ...prev,
        selectedRoles: newSelectedRoles
      };
    });
  }, [memoizedCallbacks]);
  
  // 🔍 ACCESSEUR : Récupérer les rôles sélectionnés pour un rôle métier (VERSION OPTIMISÉE)
  const getSelectedRolesForBusinessRole = useCallback((businessRole: string): Set<string> => {
    return memoizedSelectionsByRole.get(businessRole) || new Set<string>();
  }, [memoizedSelectionsByRole]);
  
  // 🔄 SYNCHRONISATION : Synchroniser avec des sélections externes
  const synchronizeSelectedRoles = useCallback((selections: Map<string, Set<string>>) => {
    setState(prev => ({
      ...prev,
      selectedRoles: new Map(selections)
    }));
    
    // Notifier du changement directement
    memoizedCallbacks?.onSelectedRolesChange?.(selections);
  }, [memoizedCallbacks]);
  
  // 🧹 NETTOYAGE : Vider toutes les sélections
  const clearAllSelections = useCallback(() => {
    const emptyMap = new Map<string, Set<string>>();
    setState(prev => ({
      ...prev,
      selectedRoles: emptyMap
    }));
    
    // Notifier du changement directement
    memoizedCallbacks?.onSelectedRolesChange?.(emptyMap);
  }, [memoizedCallbacks]);
  
  // 📊 UTILITAIRE : Nombre total de rôles sélectionnés
  const getTotalSelectedRoles = useCallback((): number => {
    let total = 0;
    state.selectedRoles.forEach(roles => {
      total += roles.size;
    });
    return total;
  }, [state.selectedRoles]);
  
  // 📈 UTILITAIRE : Résumé des sélections
  const getSelectionSummary = useCallback(() => {
    const totalBusinessRoles = state.selectedRoles.size;
    const businessRolesWithSelections = Array.from(state.selectedRoles.values())
      .filter(roles => roles.size > 0).length;
    const totalSelectedSimpleRoles = getTotalSelectedRoles();
    
    return {
      totalBusinessRoles,
      businessRolesWithSelections,
      totalSelectedSimpleRoles,
    };
  }, [state.selectedRoles, getTotalSelectedRoles]);
  
  // 🔍 UTILITAIRE : Y a-t-il des sélections
  const hasSelections = state.selectedRoles.size > 0 && getTotalSelectedRoles() > 0;
  
  return {
    state,
    
    // Actions
    handleSelectionChange,
    getSelectedRolesForBusinessRole,
    synchronizeSelectedRoles,
    clearAllSelections,
    
    // Utilitaires
    getTotalSelectedRoles,
    getSelectionSummary,
    hasSelections,
  };
};