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
  const memoizedCallbacks = useMemo(() => callbacks, []);
  
  // État des sélections
  const [state, setState] = useState<AnalysisSelectionsState>({
    selectedRoles: new Map()
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
  
  // ⚡ OPTIMISÉ : Handler stable avec useRef pour éviter les re-renders 
  const callbacksRef = useRef(memoizedCallbacks);
  callbacksRef.current = memoizedCallbacks;
  
  // 🔒 STABILISÉ : Référence pour éviter les setState multiples avec le même état
  const lastStateRef = useRef<string>('');
  
  const handleSelectionChange = useCallback((businessRole: string, selectedRoles: Set<string>) => {
    
    // 🔒 DÉDUPLICATION : Éviter les setState multiples avec le même état
    const currentState = JSON.stringify([businessRole, Array.from(selectedRoles).sort()]);
    
    if (lastStateRef.current === currentState) {
      // ⚡ OPTIMISATION : Éviter les setState identiques
      return;
    }
    
    // 🔒 STABILISER : Mettre à jour la référence avant setState
    lastStateRef.current = currentState;
    
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
      
      // ⚡ Notification stable via useRef pour éviter les re-créations
      callbacksRef.current?.onSelectedRolesChange?.(newSelectedRoles);
      
      return {
        ...prev,
        selectedRoles: newSelectedRoles
      };
    });
  }, []); // ⚡ STABLE : Aucune dépendance
  
  // ⚡ OPTIMISÉ : Accesseur stable avec useRef pour éviter les re-renders de toutes les cartes
  const selectionsRef = useRef(state.selectedRoles);
  selectionsRef.current = state.selectedRoles;
  
  const getSelectedRolesForBusinessRole = useCallback((businessRole: string): Set<string> => {
    return selectionsRef.current.get(businessRole) || new Set<string>();
  }, []); // ⚡ STABLE : Aucune dépendance
  
  // 🔄 SYNCHRONISATION : Synchroniser avec des sélections externes
  const synchronizeSelectedRoles = useCallback((selections: Map<string, Set<string>>) => {
    // 🔒 DÉDUPLICATION : Éviter les setState si l'état est identique
    const currentState = JSON.stringify(Array.from(selections.entries()).sort());
    
    if (lastStateRef.current === currentState) {
      return;
    }
    
    lastStateRef.current = currentState;
    
    setState(prev => ({
      ...prev,
      selectedRoles: new Map(selections)
    }));
    
    // Notifier du changement directement
    callbacksRef.current?.onSelectedRolesChange?.(selections);
  }, []); // ⚡ STABLE : Aucune dépendance
  
  // 🧹 NETTOYAGE : Vider toutes les sélections
  const clearAllSelections = useCallback(() => {
    // 🔒 DÉDUPLICATION : Éviter les setState si déjà vide
    if (state.selectedRoles.size === 0) {
      return;
    }
    
    const emptyMap = new Map<string, Set<string>>();
    setState(prev => ({
      ...prev,
      selectedRoles: emptyMap
    }));
    
    // Réinitialiser la référence
    lastStateRef.current = '';
    
    // Notifier du changement directement
    callbacksRef.current?.onSelectedRolesChange?.(emptyMap);
  }, [state.selectedRoles.size]); // ⚡ STABLE : Dépendance minimale
  
  // 📊 UTILITAIRE : Nombre total de rôles sélectionnés
  const getTotalSelectedRoles = useCallback((): number => {
    let total = 0;
    selectionsRef.current.forEach(roles => {
      total += roles.size;
    });
    return total;
  }, []); // ⚡ STABLE : Aucune dépendance
  
  // 📈 UTILITAIRE : Résumé des sélections
  const getSelectionSummary = useCallback(() => {
    const totalBusinessRoles = selectionsRef.current.size;
    const businessRolesWithSelections = Array.from(selectionsRef.current.values())
      .filter(roles => roles.size > 0).length;
    const totalSelectedSimpleRoles = getTotalSelectedRoles();
    
    return {
      totalBusinessRoles,
      businessRolesWithSelections,
      totalSelectedSimpleRoles,
    };
  }, [getTotalSelectedRoles]); // ⚡ STABLE : Dépendance minimale
  
  // 🔍 UTILITAIRE : Y a-t-il des sélections
  const hasSelections = useMemo(() => {
    return selectionsRef.current.size > 0 && getTotalSelectedRoles() > 0;
  }, [getTotalSelectedRoles]); // ⚡ STABLE : Dépendance minimale
  
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