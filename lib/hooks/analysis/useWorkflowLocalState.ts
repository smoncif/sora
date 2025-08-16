import { useState, useCallback } from 'react';

// États locaux pour filtres et pagination
export interface WorkflowLocalState {
  businessRoleFilter: string;
  simpleRoleFilter: string;
  showFilters: boolean;
  currentBusinessRolePage: number;
  businessRolesPerPage: number;
  focusedBusinessRole: string | null;
  showZeroCoverageRoles: Map<string, boolean>;
  pageBeforeFocus: number; // 🆕 Sauvegarder la page avant le focus
}

export interface WorkflowLocalActions {
  setBusinessRoleFilter: (filter: string) => void;
  setSimpleRoleFilter: (filter: string) => void;
  toggleFilters: () => void;
  clearFilters: () => void;
  setCurrentBusinessRolePage: (page: number) => void;
  setBusinessRolesPerPage: (perPage: number) => void;
  handleFocusBusinessRole: (businessRole: string) => void;
  handleExitFocus: () => void;
  handleToggleZeroCoverageRoles: (businessRole: string) => void;
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
  businessRoleFilter: '',
  simpleRoleFilter: '',
  showFilters: false,
  currentBusinessRolePage: 0,
  businessRolesPerPage: 3,
  focusedBusinessRole: null,
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
  
  // Actions de filtrage et pagination
  const setBusinessRoleFilter = useCallback((filter: string) => {
    setState(prev => ({ 
      ...prev,
      businessRoleFilter: filter,
      currentBusinessRolePage: 0 // Reset pagination quand on filtre
    }));
  }, []);
  
  const setSimpleRoleFilter = useCallback((filter: string) => {
    setState(prev => ({ ...prev, simpleRoleFilter: filter }));
  }, []);
  
  const toggleFilters = useCallback(() => {
    setState(prev => ({ ...prev, showFilters: !prev.showFilters }));
  }, []);
  
  const clearFilters = useCallback(() => {
    setState(prev => ({ 
      ...prev,
      businessRoleFilter: '',
      simpleRoleFilter: '',
      currentBusinessRolePage: 0
    }));
  }, []);
  
  const setCurrentBusinessRolePage = useCallback((page: number) => {
    setState(prev => ({ ...prev, currentBusinessRolePage: page }));
  }, []);
  
  const setBusinessRolesPerPage = useCallback((perPage: number) => {
    setState(prev => ({ 
      ...prev,
      businessRolesPerPage: perPage,
      currentBusinessRolePage: 0 // Reset pagination
    }));
  }, []);
  
  // Actions de focus - OPTIMISÉES pour réactivité immédiate
  const handleFocusBusinessRole = useCallback((businessRole: string) => {
    setState(prev => ({ 
      ...prev,
      focusedBusinessRole: businessRole,
      pageBeforeFocus: prev.currentBusinessRolePage, // 🆕 Sauvegarder la page actuelle
      currentBusinessRolePage: 0
    }));
    // ⚡ OPTIMISÉ : Notification immédiate pour meilleure réactivité
    stableOnFocusChange(businessRole);
  }, [stableOnFocusChange]);
  
  const handleExitFocus = useCallback(() => {
    setState(prev => ({ 
      ...prev,
      focusedBusinessRole: null,
      currentBusinessRolePage: prev.pageBeforeFocus // 🆕 Restaurer la page sauvegardée
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
      setBusinessRoleFilter,
      setSimpleRoleFilter,
      toggleFilters,
      clearFilters,
      setCurrentBusinessRolePage,
      setBusinessRolesPerPage,
      handleFocusBusinessRole,
      handleExitFocus,
      handleToggleZeroCoverageRoles,
      resetLocalState,
    },
  };
}; 