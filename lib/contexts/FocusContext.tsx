import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Context pour gérer le focus des BusinessRole de manière isolée
 * Évite les re-renders en cascade quand on change de focus
 * Gère aussi la sauvegarde/restauration de la position de scroll
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
  // 💾 Sauvegarde de la position de scroll avant le focus
  const [scrollPositionBeforeFocus, setScrollPositionBeforeFocus] = useState<number>(0);

  // ⚡ OPTIMISÉ : Handler stable pour changer le focus avec gestion du scroll
  const setFocusedBusinessRole = useCallback((businessRole: string | null) => {
    if (businessRole) {
      // 💾 Sauvegarder la position actuelle avant d'entrer en focus
      setScrollPositionBeforeFocus(window.scrollY);
    }
    
    setFocusedBusinessRoleState(businessRole);
    // ⚡ Notification immédiate sans délai
    onFocusChange?.(businessRole);
    
    if (!businessRole) {
      // 🔄 Restaurer la position de scroll quand on quitte le focus
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPositionBeforeFocus,
          behavior: 'auto' // Immédiat pour de meilleures performances
        });
      });
    }
  }, [onFocusChange, scrollPositionBeforeFocus]);

  // Helper stable pour vérifier si un rôle est en focus
  const isBusinessRoleFocused = useCallback((businessRole: string) => {
    return focusedBusinessRole === businessRole;
  }, [focusedBusinessRole]);

  // ⚡ OPTIMISÉ : Mémorisation de la valeur du contexte pour éviter les re-renders inutiles
  const value: FocusContextValue = React.useMemo(() => ({
    focusedBusinessRole,
    setFocusedBusinessRole,
    isBusinessRoleFocused,
  }), [focusedBusinessRole, setFocusedBusinessRole, isBusinessRoleFocused]);

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

// Hook spécialisé pour un BusinessRole spécifique - OPTIMISÉ
export function useBusinessRoleFocus(businessRole: string) {
  const { focusedBusinessRole, setFocusedBusinessRole, isBusinessRoleFocused } = useFocus();
  
  const isFocused = isBusinessRoleFocused(businessRole);
  
  // ⚡ OPTIMISÉ : Handlers immédiat avec scroll intégré pour meilleure réactivité
  const handleFocus = useCallback(() => {
    setFocusedBusinessRole(businessRole);
    // ⚡ Scroll immédiat vers le haut pour une UX fluide
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [setFocusedBusinessRole, businessRole]);
  
  const handleExitFocus = useCallback(() => {
    setFocusedBusinessRole(null);
    // 🔄 Scroll automatiquement restauré par le FocusContext vers la position sauvegardée
  }, [setFocusedBusinessRole]);
  
  return {
    isFocused,
    handleFocus,
    handleExitFocus,
    focusedBusinessRole,
  };
} 