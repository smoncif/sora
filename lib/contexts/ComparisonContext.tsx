import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useComparison } from '../hooks/analysis';
import { SimpleRole } from '../types';

interface ComparisonContextType {
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

const ComparisonContext = createContext<ComparisonContextType | null>(null);

export const ComparisonProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const comparisonState = useComparison();

  // 🚀 OPTIMISATION : Mémoisation de la valeur du contexte
  // Évite les re-renders des consommateurs si les valeurs ne changent pas
  const contextValue = useMemo(() => comparisonState, [
    comparisonState.selectedRoles,
    comparisonState.isSliderOpen,
    comparisonState.openSlider,
    comparisonState.closeSlider,
    comparisonState.toggleRoleSelection,
    comparisonState.removeRole,
    comparisonState.clearSelection,
    comparisonState.canSelectMore,
    comparisonState.isRoleSelected,
    comparisonState.canCompare,
    comparisonState.currentContext,
  ]);

  return (
    <ComparisonContext.Provider value={contextValue}>
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparisonContext = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparisonContext must be used within a ComparisonProvider');
  }
  return context;
};
