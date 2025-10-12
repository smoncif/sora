/**
 * Hook pour gérer le workflow complet de l'analyse SOD
 * Inspiré du pattern useAnalysisWorkflow des autres analyses
 */

'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useSodSession } from './useSodSession';
import { useSodExcelParser } from './useSodExcelParser';
import { useSodRemediation } from './useSodRemediation';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';

export interface SodWorkflowConfig {
  userId: string;
}

export interface SodWorkflowState {
  // État du fichier
  importType: 'new' | 'import' | 'resume';
  loading: boolean;
  error: string | null;
  
  // État de l'analyse d'usage
  enableUsageAnalysis: boolean;
  
  // Session SOD
  session: any;
  currentStep: number;
  
  // État du panneau de remédiation
  remediationPanelOpen: boolean;
}

export interface SodWorkflowActions {
  // Gestion du type d'import
  setImportType: (type: 'new' | 'import' | 'resume') => void;
  
  // Gestion des fichiers
  startNewAnalysis: (file: File) => Promise<void>;
  loadSavedAnalysis: () => Promise<void>;
  resumeFromFile: () => Promise<void>;
  
  // Gestion de l'analyse d'usage
  setEnableUsageAnalysis: (enabled: boolean) => void;
  
  // Gestion des étapes
  setCurrentStep: (step: number) => void;
  
  // Remédiation automatique
  startAutomaticRemediation: () => Promise<void>;
  
  // Gestion du panneau de remédiation
  openRemediationPanel: () => void;
  closeRemediationPanel: () => void;
  
  // Actions de remédiation
  applyRemediationPlan: () => Promise<void>;
  undoRemediation: () => Promise<void>;
  exportRemediationPlan: () => void;
  
  // Reset
  resetWorkflow: () => void;
}

export interface SodWorkflow {
  state: SodWorkflowState;
  actions: SodWorkflowActions;
  remediation: {
    state: any;
    actions: any;
  };
}

export const useSodWorkflow = (config: SodWorkflowConfig): SodWorkflow => {
  // État local
  const [importType, setImportType] = useState<'new' | 'import' | 'resume'>('new');
  const [enableUsageAnalysis, setEnableUsageAnalysis] = useState(false);
  const [remediationPanelOpen, setRemediationPanelOpen] = useState(false);
  
  // Session SOD
  const sodSession = useSodSession({ userId: config.userId });
  
  // Parser Excel
  const excelParser = useSodExcelParser();
  
  // Remédiation automatique
  const remediation = useSodRemediation();
  
  // Contexte des actions SOD
  const actionsContext = useSodActionsContext();
  
  // Référence au fichier uploadé
  const uploadedFileRef = useRef<File | null>(null);
  
  // Quand le parsing est terminé, créer la session avec les données parsées
  useEffect(() => {
    if (excelParser.parsedData && !excelParser.parsing && !sodSession.session && uploadedFileRef.current) {
      // ✅ Créer la session directement avec les données déjà parsées par le Worker
      sodSession.createSessionFromParsedData(uploadedFileRef.current, excelParser.parsedData);
      uploadedFileRef.current = null;
    }
  }, [excelParser.parsedData, excelParser.parsing, sodSession.session, sodSession.createSessionFromParsedData]);
  
  // État dérivé
  const state: SodWorkflowState = useMemo(() => ({
    importType,
    loading: sodSession.isLoading || excelParser.parsing,
    error: sodSession.error || excelParser.error,
    enableUsageAnalysis,
    session: sodSession.session,
    currentStep: sodSession.currentStep,
    remediationPanelOpen,
  }), [
    importType,
    enableUsageAnalysis,
    sodSession.isLoading,
    sodSession.error,
    sodSession.session,
    sodSession.currentStep,
    excelParser.parsing,
    excelParser.error,
    remediationPanelOpen,
  ]);
  
  // Actions
  const actions: SodWorkflowActions = useMemo(() => ({
    setImportType,
    
    startNewAnalysis: async (file: File) => {
      try {
        // 🚀 Réinitialiser l'état global avant de charger un nouveau fichier
        // TODO: Implémenter resetState dans SodActionsContext
        // resetState();
        
        // Sauvegarder la référence au fichier
        uploadedFileRef.current = file;
        
        // ✅ Parser avec le Web Worker (ne bloque pas l'UI)
        await excelParser.parseFile(file);
        // La session sera créée automatiquement dans le useEffect ci-dessus
      } catch (error) {
        console.error('Erreur lors de l\'analyse:', error);
      }
    },
    
    loadSavedAnalysis: async () => {
      // TODO: Implémenter le chargement d'analyses sauvegardées
      console.log('Chargement d\'analyse sauvegardée...');
    },
    
    resumeFromFile: async () => {
      // TODO: Implémenter la reprise depuis fichier
      console.log('Reprise depuis fichier...');
    },
    
    setEnableUsageAnalysis,
    
    setCurrentStep: sodSession.setCurrentStep || (() => {}),
    
    startAutomaticRemediation: async () => {
      try {
        if (!sodSession.session) {
          console.error('Aucune session SOD active');
          return;
        }

        // Générer le plan de remédiation
        const config = { enableUsageAnalysis };
        await remediation.actions.generatePlan(
          sodSession.session.simpleRoles?.roles || [],
          sodSession.session.compositeRoles?.roles || [],
          config
        );

        // Ouvrir le panneau de remédiation
        setRemediationPanelOpen(true);
      } catch (error) {
        console.error('Erreur lors de la génération du plan de remédiation:', error);
      }
    },

    openRemediationPanel: () => setRemediationPanelOpen(true),
    closeRemediationPanel: () => setRemediationPanelOpen(false),

    applyRemediationPlan: async () => {
      await remediation.actions.applyPlan(actionsContext);
    },

    undoRemediation: async () => {
      await remediation.actions.undoLastApplication();
    },

    exportRemediationPlan: () => {
      remediation.actions.exportPlan();
    },
    
    resetWorkflow: () => {
      setImportType('new');
      setEnableUsageAnalysis(false);
      setRemediationPanelOpen(false);
      // TODO: Implémenter resetSession dans useSodSession
      // sodSession.resetSession?.();
      excelParser.cancelParsing?.();
      remediation.actions.reset();
    },
  }), [
    enableUsageAnalysis,
    sodSession,
    excelParser,
    remediation,
  ]);

  return {
    state,
    actions,
    remediation,
  };
};
