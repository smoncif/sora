/**
 * Hook pour gérer le workflow complet de l'analyse SOD
 * Inspiré du pattern useAnalysisWorkflow des autres analyses
 */

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useSodSession } from './useSodSession';
import { useSodExcelParser } from './useSodExcelParser';

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
  
  // État du parsing
  parsing: boolean;
  progress: any;
  parsingError: string | null;
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
  
  // Parsing
  cancelParsing: () => void;
  
  // Reset
  resetWorkflow: () => void;
}

export interface SodWorkflow {
  state: SodWorkflowState;
  actions: SodWorkflowActions;
}

export const useSodWorkflow = (config: SodWorkflowConfig): SodWorkflow => {
  // État local
  const [importType, setImportType] = useState<'new' | 'import' | 'resume'>('new');
  const [enableUsageAnalysis, setEnableUsageAnalysis] = useState(false);
  
  // Session SOD
  const sodSession = useSodSession({ userId: config.userId });
  
  // Parser Excel
  const excelParser = useSodExcelParser();
  
  // État dérivé
  const state: SodWorkflowState = useMemo(() => ({
    importType,
    loading: sodSession.isLoading || excelParser.parsing,
    error: sodSession.error || excelParser.error,
    enableUsageAnalysis,
    session: sodSession.session,
    currentStep: sodSession.currentStep,
    // État du parsing pour la barre de progression
    parsing: excelParser.parsing,
    progress: excelParser.progress,
    parsingError: excelParser.error,
  }), [
    importType,
    enableUsageAnalysis,
    sodSession.isLoading,
    sodSession.error,
    sodSession.session,
    sodSession.currentStep,
    excelParser.parsing,
    excelParser.progress,
    excelParser.error,
  ]);
  
  // Actions
  const actions: SodWorkflowActions = useMemo(() => ({
    setImportType,
    
    startNewAnalysis: async (file: File) => {
      try {
        // Parser le fichier Excel
        await excelParser.parseFile(file);
        
        // Créer la session avec les données parsées
        if (excelParser.parsedData) {
          await sodSession.createSessionFromParsedData(file, excelParser.parsedData);
        }
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
      // TODO: Implémenter la remédiation automatique
      console.log('Démarrage de la remédiation automatique...', {
        enableUsageAnalysis,
        session: sodSession.session,
      });
    },
    
    cancelParsing: () => {
      excelParser.cancelParsing?.();
    },
    
    resetWorkflow: () => {
      setImportType('new');
      setEnableUsageAnalysis(false);
      // TODO: Implémenter resetSession dans useSodSession
      // sodSession.resetSession?.();
      excelParser.cancelParsing?.();
    },
  }), [
    enableUsageAnalysis,
    sodSession,
    excelParser,
  ]);
  
  return {
    state,
    actions,
  };
};
