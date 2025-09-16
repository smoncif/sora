import { useReducer, useCallback, useMemo } from 'react';
import { SimpleRole } from '../../types';

// Types
interface SimpleRoleWithContext extends SimpleRole {
  context?: string;
  roleName?: string; // Pour compatibilité avec l'ancien code
}

interface ComparisonState {
  selectedRoles: SimpleRoleWithContext[];
  currentContext: string | null;
  isSliderOpen: boolean;
}

type ComparisonAction =
  | { type: 'TOGGLE_ROLE'; role: SimpleRole; context: string }
  | { type: 'REMOVE_ROLE'; roleId: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'OPEN_SLIDER' }
  | { type: 'CLOSE_SLIDER' };

// Initial state
const initialState: ComparisonState = {
  selectedRoles: [],
  currentContext: null,
  isSliderOpen: false,
};

// Constants
const MAX_ROLES = 3;

// Helper pour obtenir l'identifiant du rôle de manière cohérente
const getRoleId = (role: any): string => {
  return role.roleName || role.name || role.id || '';
};

// Reducer
const comparisonReducer = (state: ComparisonState, action: ComparisonAction): ComparisonState => {
  switch (action.type) {
    case 'TOGGLE_ROLE': {
      const { role, context } = action;
      
      // Si le contexte change, désélectionner tous les rôles précédents
      if (state.currentContext && state.currentContext !== context) {
        const roleId = getRoleId(role);
        return {
          selectedRoles: [{ ...role, context, roleName: roleId }],
          currentContext: context,
          isSliderOpen: true,
        };
      }

      // Si pas de contexte actuel, définir le nouveau contexte
      if (!state.currentContext) {
        const roleId = getRoleId(role);
        return {
          ...state,
          selectedRoles: [{ ...role, context, roleName: roleId }],
          currentContext: context,
          isSliderOpen: true,
        };
      }

      // Même contexte : toggle normal
      const roleId = getRoleId(role);
      const isAlreadySelected = state.selectedRoles.some(r => getRoleId(r) === roleId);
      
      if (isAlreadySelected) {
        // Retirer le rôle
        const newRoles = state.selectedRoles.filter(r => getRoleId(r) !== roleId);
        return {
          selectedRoles: newRoles,
          currentContext: newRoles.length === 0 ? null : state.currentContext,
          isSliderOpen: state.isSliderOpen,
        };
      } else {
        // Ajouter le rôle (si pas déjà au maximum)
        if (state.selectedRoles.length < MAX_ROLES) {
          return {
            ...state,
            selectedRoles: [...state.selectedRoles, { ...role, context, roleName: roleId }],
            isSliderOpen: true,
          };
        }
        return state;
      }
    }

    case 'REMOVE_ROLE': {
      const newRoles = state.selectedRoles.filter(r => getRoleId(r) !== action.roleId);
      return {
        selectedRoles: newRoles,
        currentContext: newRoles.length === 0 ? null : state.currentContext,
        isSliderOpen: state.isSliderOpen,
      };
    }

    case 'CLEAR_SELECTION':
      return initialState;

    case 'OPEN_SLIDER':
      return { ...state, isSliderOpen: true };

    case 'CLOSE_SLIDER':
      return { ...state, isSliderOpen: false };

    default:
      return state;
  }
};

// Hook
interface UseComparisonReturn {
  selectedRoles: SimpleRole[];
  isSliderOpen: boolean;
  openSlider: () => void;
  closeSlider: () => void;
  toggleRoleSelection: (role: SimpleRole, context: string) => void;
  removeRole: (roleId: string) => void;
  clearSelection: () => void;
  canSelectMore: boolean;
  isRoleSelected: (roleId: string, context?: string) => boolean;
  canCompare: boolean;
  currentContext: string | null;
}

export const useComparison = (): UseComparisonReturn => {
  const [state, dispatch] = useReducer(comparisonReducer, initialState);

  // Actions
  const toggleRoleSelection = useCallback((role: SimpleRole, context: string) => {
    dispatch({ type: 'TOGGLE_ROLE', role, context });
  }, []);

  const removeRole = useCallback((roleId: string) => {
    dispatch({ type: 'REMOVE_ROLE', roleId });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const openSlider = useCallback(() => {
    dispatch({ type: 'OPEN_SLIDER' });
  }, []);

  const closeSlider = useCallback(() => {
    dispatch({ type: 'CLOSE_SLIDER' });
  }, []);

  // Computed values
  // 🚀 OPTIMISATION : Computed values mémorisées
  const canSelectMore = useMemo(() => 
    state.selectedRoles.length < MAX_ROLES, 
    [state.selectedRoles.length]
  );
  
  const isRoleSelected = useCallback((roleId: string, context?: string) => {
    // Si un contexte est fourni, vérifier que c'est le contexte actuel
    if (context && state.currentContext && context !== state.currentContext) {
      return false;
    }
    return state.selectedRoles.some(role => getRoleId(role) === roleId);
  }, [state.selectedRoles, state.currentContext]);

  const canCompare = useMemo(() => 
    state.selectedRoles.length >= 2, 
    [state.selectedRoles.length]
  );

  // Retourner les rôles sans le contexte interne pour l'API publique
  const selectedRoles = useMemo(() => 
    state.selectedRoles.map(({ context, ...role }) => role as SimpleRole),
    [state.selectedRoles]
  );

  return {
    selectedRoles,
    isSliderOpen: state.isSliderOpen,
    openSlider,
    closeSlider,
    toggleRoleSelection,
    removeRole,
    clearSelection,
    canSelectMore,
    isRoleSelected,
    canCompare,
    currentContext: state.currentContext,
  };
};
