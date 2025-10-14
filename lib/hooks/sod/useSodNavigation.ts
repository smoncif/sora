/**
 * Hook pour la navigation dans l'analyse SoD
 * Gère l'état du slider de navigation et la navigation cross-étapes
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { SodSession } from 'lib/types/sodAnalysis';

export type NavigationMode = 'simple' | 'composite' | 'users';

export interface SodNavigationState {
  isSliderOpen: boolean;
  mode: NavigationMode;
}

export interface SodNavigationActions {
  openSlider: () => void;
  closeSlider: () => void;
  toggleSlider: () => void;
  setMode: (mode: NavigationMode) => void;
  navigateToRisk: (
    roleName: string, 
    riskCode: string, 
    targetStep: number,
    onStepChange?: ((step: number) => void) | undefined,
    onScrollToRole?: ((roleName: string, riskCode: string, targetStep: number) => void) | undefined
  ) => void;
}

export interface UseSodNavigationReturn {
  state: SodNavigationState;
  actions: SodNavigationActions;
}

/**
 * Hook pour gérer la navigation SoD
 */
export const useSodNavigation = (): UseSodNavigationReturn => {
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [mode, setMode] = useState<NavigationMode>('simple');

  const openSlider = useCallback(() => {
    setIsSliderOpen(true);
  }, []);

  const closeSlider = useCallback(() => {
    setIsSliderOpen(false);
  }, []);

  const toggleSlider = useCallback(() => {
    setIsSliderOpen(prev => !prev);
  }, []);

  const setModeCallback = useCallback((newMode: NavigationMode) => {
    setMode(newMode);
  }, []);

  const navigateToRisk = useCallback((
    roleName: string, 
    riskCode: string, 
    targetStep: number,
    onStepChange?: (step: number) => void,
    onScrollToRole?: (roleName: string, riskCode: string, targetStep: number) => void
  ) => {
    // Changer l'étape si nécessaire
    if (onStepChange && targetStep !== undefined) {
      onStepChange(targetStep);
    }
    
    // Naviguer vers le rôle/risque spécifique
    if (onScrollToRole) {
      onScrollToRole(roleName, riskCode, targetStep);
    }
    
    // Garder le slider ouvert après navigation
    // closeSlider(); // Supprimé pour garder le slider ouvert
  }, [closeSlider]);

  const state = useMemo(() => ({
    isSliderOpen,
    mode,
  }), [isSliderOpen, mode]);

  const actions = useMemo(() => ({
    openSlider,
    closeSlider,
    toggleSlider,
    setMode: setModeCallback,
    navigateToRisk,
  }), [openSlider, closeSlider, toggleSlider, setModeCallback, navigateToRisk]);

  return {
    state,
    actions,
  };
};
