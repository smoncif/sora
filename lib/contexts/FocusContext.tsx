import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Context pour gérer le focus des éléments (rôles, utilisateurs, etc.) de manière isolée
 * Évite les re-renders en cascade quand on change de focus
 * Gère aussi la sauvegarde/restauration de la position de scroll
 */
interface FocusContextValue {
  focusedItem: string | null;
  setFocusedItem: (item: string | null) => void;
  isItemFocused: (item: string) => boolean;
}

const FocusContext = createContext<FocusContextValue | undefined>(undefined);

interface FocusProviderProps {
  children: ReactNode;
  onFocusChange?: (item: string | null) => void;
}

export function FocusProvider({ children, onFocusChange }: FocusProviderProps) {
  const [focusedItem, setFocusedItemState] = useState<string | null>(null);
  // 💾 Sauvegarde de la position de scroll avant le focus
  const [scrollPositionBeforeFocus, setScrollPositionBeforeFocus] = useState<number>(0);

  // ⚡ OPTIMISÉ : Handler stable pour changer le focus avec gestion du scroll
  const setFocusedItem = useCallback((item: string | null) => {
    if (item) {
      // 💾 Sauvegarder la position actuelle avant d'entrer en focus
      setScrollPositionBeforeFocus(window.scrollY);
    }
    
    setFocusedItemState(item);
    // ⚡ Notification immédiate sans délai
    onFocusChange?.(item);
    
    if (!item) {
      // 🔄 Restaurer la position de scroll quand on quitte le focus
      requestAnimationFrame(() => {
        window.scrollTo({
          top: scrollPositionBeforeFocus,
          behavior: 'auto' // Immédiat pour de meilleures performances
        });
      });
    }
  }, [onFocusChange, scrollPositionBeforeFocus]);

  // Helper stable pour vérifier si un élément est en focus
  const isItemFocused = useCallback((item: string) => {
    return focusedItem === item;
  }, [focusedItem]);


  // ⚡ OPTIMISÉ : Mémorisation de la valeur du contexte pour éviter les re-renders inutiles
  const value: FocusContextValue = React.useMemo(() => ({
    focusedItem,
    setFocusedItem,
    isItemFocused,
  }), [focusedItem, setFocusedItem, isItemFocused]);

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

// 🆕 Hook générique pour n'importe quel élément (utilisateur, rôle, etc.) - OPTIMISÉ
export function useItemFocus(item: string) {
  const { focusedItem, setFocusedItem, isItemFocused } = useFocus();
  
  const isFocused = isItemFocused(item);
  
  // ⚡ OPTIMISÉ : Handlers immédiat avec scroll intégré pour meilleure réactivité
  const handleFocus = useCallback(() => {
    setFocusedItem(item);
    // ⚡ Scroll immédiat vers le haut pour une UX fluide
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [setFocusedItem, item]);
  
  const handleExitFocus = useCallback(() => {
    setFocusedItem(null);
    // 🔄 Scroll automatiquement restauré par le FocusContext vers la position sauvegardée
  }, [setFocusedItem]);
  
  return {
    isFocused,
    handleFocus,
    handleExitFocus,
    focusedItem,
  };
}
