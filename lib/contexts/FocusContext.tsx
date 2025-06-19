import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Context pour gérer le focus des BusinessRole de manière isolée
 * Évite les re-renders en cascade quand on change de focus
 */
interface FocusContextValue {
  focusedBusinessRole: string | null;
  setFocusedBusinessRole: (businessRole: string | null) => void;
  isBusinessRoleFocused: (businessRole: string) => boolean;
}

const FocusContext = createContext<FocusContextValue | undefined>(undefined);

interface FocusProviderProps {
  children: ReactNode;
  onFocusChange?: (businessRole: string | null) => void;
}

export function FocusProvider({ children, onFocusChange }: FocusProviderProps) {
  const [focusedBusinessRole, setFocusedBusinessRoleState] = useState<string | null>(null);

  // Handler stable pour changer le focus
  const setFocusedBusinessRole = useCallback((businessRole: string | null) => {
    setFocusedBusinessRoleState(businessRole);
    onFocusChange?.(businessRole);
  }, [onFocusChange]);

  // Helper stable pour vérifier si un rôle est en focus
  const isBusinessRoleFocused = useCallback((businessRole: string) => {
    return focusedBusinessRole === businessRole;
  }, [focusedBusinessRole]);

  const value: FocusContextValue = {
    focusedBusinessRole,
    setFocusedBusinessRole,
    isBusinessRoleFocused,
  };

  return (
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
}

// Hook spécialisé pour un BusinessRole spécifique
export function useBusinessRoleFocus(businessRole: string) {
  const { focusedBusinessRole, setFocusedBusinessRole, isBusinessRoleFocused } = useFocus();
  
  const isFocused = isBusinessRoleFocused(businessRole);
  
  const handleFocus = useCallback(() => {
    setFocusedBusinessRole(businessRole);
  }, [setFocusedBusinessRole, businessRole]);
  
  const handleExitFocus = useCallback(() => {
    setFocusedBusinessRole(null);
  }, [setFocusedBusinessRole]);
  
  return {
    isFocused,
    handleFocus,
    handleExitFocus,
    focusedBusinessRole,
  };
} 