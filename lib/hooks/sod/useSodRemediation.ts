/**
 * Hook pour gérer la remédiation automatique SOD
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { generateRemediationPlan, type RemediationPlan, type RemediationConfig } from 'lib/services/sod/sodRemediationService';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';

export interface SodRemediationState {
  isGenerating: boolean;
  plan: RemediationPlan | null;
  isApplying: boolean;
  appliedModifications: number;
  error: string | null;
}

export interface SodRemediationActions {
  generatePlan: (simpleRoles: SodSimpleRole[], compositeRoles: SodCompositeRole[], config: RemediationConfig) => Promise<void>;
  applyPlan: () => Promise<void>;
  undoLastApplication: () => Promise<void>;
  exportPlan: () => void;
  reset: () => void;
}

export interface SodRemediation {
  state: SodRemediationState;
  actions: SodRemediationActions;
}

export const useSodRemediation = (): SodRemediation => {
  const [state, setState] = useState<SodRemediationState>({
    isGenerating: false,
    plan: null,
    isApplying: false,
    appliedModifications: 0,
    error: null,
  });

  const actions: SodRemediationActions = useMemo(() => ({
    generatePlan: async (simpleRoles: SodSimpleRole[], compositeRoles: SodCompositeRole[], config: RemediationConfig) => {
      try {
        setState(prev => ({ ...prev, isGenerating: true, error: null }));
        
        // Générer le plan de remédiation
        const plan = generateRemediationPlan(simpleRoles, compositeRoles, config);
        
        setState(prev => ({ 
          ...prev, 
          isGenerating: false, 
          plan,
          error: null 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isGenerating: false, 
          error: error instanceof Error ? error.message : 'Erreur lors de la génération du plan' 
        }));
      }
    },

    applyPlan: async () => {
      if (!state.plan) return;
      
      try {
        setState(prev => ({ ...prev, isApplying: true, error: null }));
        
        // TODO: Implémenter l'application du plan via SodActionsContext
        // Pour l'instant, simuler l'application
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          appliedModifications: prev.appliedModifications + state.plan!.totalModifications,
          error: null 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          error: error instanceof Error ? error.message : 'Erreur lors de l\'application du plan' 
        }));
      }
    },

    undoLastApplication: async () => {
      try {
        setState(prev => ({ ...prev, isApplying: true, error: null }));
        
        // TODO: Implémenter l'annulation via SodActionsContext
        // Pour l'instant, simuler l'annulation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          appliedModifications: 0,
          error: null 
        }));
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          error: error instanceof Error ? error.message : 'Erreur lors de l\'annulation' 
        }));
      }
    },

    exportPlan: () => {
      if (!state.plan) return;
      
      try {
        // Créer un fichier JSON avec le plan
        const dataStr = JSON.stringify(state.plan, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `plan-remediation-sod-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'Erreur lors de l\'export du plan' 
        }));
      }
    },

    reset: () => {
      setState({
        isGenerating: false,
        plan: null,
        isApplying: false,
        appliedModifications: 0,
        error: null,
      });
    },
  }), [state.plan, state.appliedModifications]);

  return {
    state,
    actions,
  };
};
