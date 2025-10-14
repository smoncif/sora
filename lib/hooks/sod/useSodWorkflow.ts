/**
 * Hook pour gérer le workflow complet de l'analyse SOD
 * Inspiré du pattern useAnalysisWorkflow des autres analyses
 */

'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useSodSession } from './useSodSession';
import { useSodExcelParserOptimized } from './useSodExcelParserOptimized';

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
  parsingProgress: number;
  parsingMessage: string;
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
  const excelParser = useSodExcelParserOptimized();
  
  // Référence au fichier uploadé (pour créer la session après le parsing)
  const uploadedFileRef = useRef<File | null>(null);
  
  // ✅ EFFET : Créer la session automatiquement quand les données sont parsées
  useEffect(() => {
    if (excelParser.parsedData && !excelParser.parsing && uploadedFileRef.current && !sodSession.session) {
      console.log('📊 Création de la session SOD avec les données parsées...');
      sodSession.createSessionFromParsedData(uploadedFileRef.current, excelParser.parsedData);
      uploadedFileRef.current = null; // Nettoyer la référence
    }
  }, [excelParser.parsedData, excelParser.parsing, sodSession]);
  
  // État dérivé
  const state: SodWorkflowState = useMemo(() => ({
    importType,
    loading: sodSession.isLoading || excelParser.parsing,
    error: sodSession.error || excelParser.error,
    enableUsageAnalysis,
    session: sodSession.session,
    currentStep: sodSession.currentStep,
    // État du parsing
    parsing: excelParser.parsing || false,
    parsingProgress: excelParser.progress?.progress || 0,
    parsingMessage: excelParser.progress?.message || 'Traitement en cours...',
    parsingError: excelParser.error || null,
  }), [
    importType,
    enableUsageAnalysis,
    sodSession.isLoading,
    sodSession.error,
    sodSession.session,
    sodSession.currentStep,
    excelParser.parsing,
    excelParser.progress?.progress,
    excelParser.progress?.message,
    excelParser.error,
  ]);
  
  // Actions
  const actions: SodWorkflowActions = useMemo(() => ({
    setImportType,
    
    startNewAnalysis: async (file: File) => {
      try {
        console.log('🚀 Démarrage de l\'analyse pour:', file.name);
        
        // Sauvegarder la référence au fichier
        uploadedFileRef.current = file;
        
        // Parser le fichier Excel (asynchrone via Web Worker)
        // ExcelJS par défaut avec fallback automatique vers XLSX.js
        await excelParser.parseFile(file);
        
        // ✅ La session sera créée automatiquement par le useEffect
        // quand parsedData sera disponible
      } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error);
        uploadedFileRef.current = null; // Nettoyer en cas d'erreur
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
