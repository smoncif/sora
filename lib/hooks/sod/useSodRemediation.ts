/**
 * Hook pour gérer la remédiation automatique SOD
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { generateRemediationPlan, type RemediationPlan, type RemediationConfig } from 'lib/services/sod/sodRemediationService';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';

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
  const actionsContext = useSodActionsContext();
  console.log('🔗 SodActionsContext connecté:', !!actionsContext);
  
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
      console.log('🚀 applyPlan appelé');
      console.log('📋 Plan disponible:', !!state.plan);
      
      if (!state.plan) {
        console.log('❌ Aucun plan disponible');
        return;
      }
      
      try {
        setState(prev => ({ ...prev, isApplying: true, error: null }));
        console.log('✅ État isApplying défini à true');
        
        let appliedCount = 0;
        
        // Appliquer les restrictions de ressources
        console.log('📊 Restrictions de ressources:', state.plan.resourceRestrictions.length);
        for (const restriction of state.plan.resourceRestrictions) {
          console.log('🔒 Restriction ressource:', restriction.roleName, restriction.actionCode, restriction.resourceCode, restriction.externalResourceCode, restriction.values);
          actionsContext.restrictResource(
            restriction.roleName, 
            restriction.resourceCode, 
            restriction.externalResourceCode, 
            restriction.values
          );
          appliedCount++;
        }
        
        // Appliquer les suppressions d'actions
        console.log('🗑️ Suppressions d\'actions:', state.plan.actionDeletions.length);
        for (const deletion of state.plan.actionDeletions) {
          console.log('❌ Suppression action:', deletion.roleName, deletion.actionCode);
          actionsContext.toggleDeleteAction(deletion.roleName, deletion.actionCode);
          appliedCount++;
        }
        
        // Appliquer les restrictions d'actions
        console.log('🔐 Restrictions d\'actions:', state.plan.actionRestrictions.length);
        for (const restriction of state.plan.actionRestrictions) {
          console.log('⚠️ Restriction action:', restriction.roleName, restriction.actionCode);
          actionsContext.toggleRestrictAction(restriction.roleName, restriction.actionCode);
          appliedCount++;
        }
        
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          appliedModifications: prev.appliedModifications + appliedCount,
          error: null 
        }));
        
        console.log(`✅ Plan de remédiation appliqué: ${appliedCount} modifications`);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          error: error instanceof Error ? error.message : 'Erreur lors de l\'application du plan' 
        }));
        console.error('❌ Erreur lors de l\'application du plan:', error);
      }
    },

    undoLastApplication: async () => {
      if (!state.plan) return;
      
      try {
        setState(prev => ({ ...prev, isApplying: true, error: null }));
        
        let undoneCount = 0;
        
        // Annuler les suppressions d'actions
        for (const deletion of state.plan.actionDeletions) {
          actionsContext.toggleDeleteAction(deletion.roleName, deletion.actionCode);
          undoneCount++;
        }
        
        // Annuler les restrictions d'actions
        for (const restriction of state.plan.actionRestrictions) {
          actionsContext.toggleRestrictAction(restriction.roleName, restriction.actionCode);
          undoneCount++;
        }
        
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          appliedModifications: 0,
          error: null 
        }));
        
        console.log(`↩️ Annulation du plan: ${undoneCount} modifications annulées`);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          isApplying: false, 
          error: error instanceof Error ? error.message : 'Erreur lors de l\'annulation' 
        }));
        console.error('❌ Erreur lors de l\'annulation:', error);
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
