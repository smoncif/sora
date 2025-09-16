import { useState, useCallback } from 'react';

// États locaux pour filtres et pagination
export interface WorkflowLocalState {
  primaryFilter: string;
  targetRoleFilter: string;
  showFilters: boolean;
  currentPage: number;
  itemsPerPage: number;
  focusedItem: string | null;
  showZeroCoverageRoles: Map<string, boolean>;
  pageBeforeFocus: number; // 🆕 Sauvegarder la page avant le focus
  
}

export interface WorkflowLocalActions {
  setPrimaryFilter: (filter: string) => void;
  setTargetRoleFilter: (filter: string) => void;
  toggleFilters: () => void;
  clearFilters: () => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (perPage: number) => void;
  handleFocusItem: (item: string) => void;
  handleExitFocus: () => void;
  handleToggleZeroCoverageRoles: (item: string) => void;
  resetLocalState: () => void;
}

export interface WorkflowLocalCallbacks {
  onFocusChange?: (businessRole: string | null) => void;
}

export interface WorkflowLocalReturn {
  state: WorkflowLocalState;
  actions: WorkflowLocalActions;
}

const initialState: WorkflowLocalState = {
  primaryFilter: '',
  targetRoleFilter: '',
  showFilters: false,
  currentPage: 0,
  itemsPerPage: 3,
  focusedItem: null,
  showZeroCoverageRoles: new Map(),
  pageBeforeFocus: 0,
};

export const useWorkflowLocalState = (
  callbacks?: WorkflowLocalCallbacks
): WorkflowLocalReturn => {
  
  const [state, setState] = useState<WorkflowLocalState>(initialState);
  
  // 🔒 STABILISÉ : Callback stable pour éviter les boucles
  const stableOnFocusChange = useCallback((businessRole: string | null) => {
    callbacks?.onFocusChange?.(businessRole);
  }, [callbacks]);
  
  // Actions de filtrage et pagination - NOUVEAUX NOMS
  const setPrimaryFilter = useCallback((filter: string) => {
    setState(prev => ({
      ...prev,
      primaryFilter: filter,
      currentPage: 0,
    }));
  }, []);
  
  const setTargetRoleFilter = useCallback((filter: string) => {
    setState(prev => ({ 
      ...prev, 
      targetRoleFilter: filter,
    }));
  }, []);
  
  const setCurrentPage = useCallback((page: number) => {
    setState(prev => ({ 
      ...prev, 
      currentPage: page,
    }));
  }, []);
  
  const setItemsPerPage = useCallback((perPage: number) => {
    setState(prev => ({ 
      ...prev,
      itemsPerPage: perPage,
      currentPage: 0,
    }));
  }, []);
  
  const toggleFilters = useCallback(() => {
    setState(prev => ({ ...prev, showFilters: !prev.showFilters }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      primaryFilter: '',
      targetRoleFilter: '',
      currentPage: 0,
    }));
  }, []);

  
  // Actions de focus - OPTIMISÉES pour réactivité immédiate
  const handleFocusItem = useCallback((item: string) => {
    setState(prev => ({ 
      ...prev,
      focusedItem: item,
      pageBeforeFocus: prev.currentPage,
      currentPage: 0,
    }));
    // ⚡ OPTIMISÉ : Notification immédiate pour meilleure réactivité
    stableOnFocusChange(item);
  }, [stableOnFocusChange]);
  
  const handleExitFocus = useCallback(() => {
    setState(prev => ({ 
      ...prev,
      focusedItem: null,
      currentPage: prev.pageBeforeFocus,
    }));
    // ⚡ OPTIMISÉ : Notification immédiate pour meilleure réactivité
    stableOnFocusChange(null);
  }, [stableOnFocusChange]);

  
  // Actions d'affichage
  const handleToggleZeroCoverageRoles = useCallback((businessRole: string) => {
    setState(prev => {
      const newMap = new Map(prev.showZeroCoverageRoles);
      newMap.set(businessRole, !newMap.get(businessRole));
      return { ...prev, showZeroCoverageRoles: newMap };
    });
  }, []);
  
  // Reset complet
  const resetLocalState = useCallback(() => {
    setState(initialState);
  }, []);
  
  return {
    state,
    actions: {
      // Nouvelles fonctions génériques
      setPrimaryFilter,
      setTargetRoleFilter,
      setCurrentPage,
      setItemsPerPage,
      handleFocusItem,
      toggleFilters,
      clearFilters,
      handleExitFocus,
      handleToggleZeroCoverageRoles,
      resetLocalState,
    },
  };
}; 