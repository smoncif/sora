/**
 * Hook optimisé pour gérer le workflow complet de l'analyse SOD
 * Utilise TanStack Query pour une gestion d'état optimale
 */

'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSodSession } from './useSodAnalysisQuery';
import { useSodExcelParserOptimized } from './useSodExcelParserOptimized';
import type { SodAnalysisSession } from 'lib/types/sodAnalysis';

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
  
  // Création de session depuis données parsées
  createSessionFromParsedData: (file: File, parsedRecords: any[]) => Promise<SodAnalysisSession | null>;
  
  // Remédiation automatique
  startAutomaticRemediation: () => Promise<void>;
  
  // Reset du workflow
  resetWorkflow: () => void;
}

export interface SodWorkflow {
  state: SodWorkflowState;
  actions: SodWorkflowActions;
}

export const useSodWorkflowOptimized = (config: SodWorkflowConfig): SodWorkflow => {
  const queryClient = useQueryClient();
  
  // État local pour les préférences utilisateur (ne nécessite pas de cache)
  const [importType, setImportType] = useState<'new' | 'import' | 'resume'>('new');
  const [enableUsageAnalysis, setEnableUsageAnalysis] = useState(false);
  
  // 🎯 OPTION B : État pour gérer quelle session est actuellement active
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(undefined);
  
  // Référence au fichier uploadé (pour créer la session après le parsing)
  const uploadedFileRef = useRef<File | null>(null);
  
  // Session SOD avec TanStack Query complet
  // 🎯 OPTION B : Passer activeSessionId pour que React Query fetch la bonne session
  const sodSession = useSodSession({ 
    userId: config.userId,
    sessionId: activeSessionId  // ← Clé dynamique
  });
  
  // Parser Excel (garde la logique actuelle pour l'instant)
  const excelParser = useSodExcelParserOptimized();
  
  // ✅ SIMPLIFIÉ : Le hook useSodSession gère déjà les mutations
  
  // 🔄 MUTATION : Upload et parsing de fichier
  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log('🚀 Démarrage de l\'analyse pour:', file.name);
      
      // Sauvegarder la référence au fichier
      uploadedFileRef.current = file;
      
      // Parser le fichier Excel (asynchrone via Web Worker)
      await excelParser.parseFile(file);
      
      return file;
    },
    onSuccess: (file) => {
      console.log('✅ Fichier parsé avec succès:', file.name);
      
      // ✅ SIMPLIFIÉ : Le hook useSodSession gère la création de session automatiquement
    },
    onError: (error) => {
      console.error('❌ Erreur lors du parsing:', error);
      uploadedFileRef.current = null;
    },
  });
  
  // 🔄 MUTATION : Charger une analyse sauvegardée
  const loadSavedAnalysisMutation = useMutation({
    mutationFn: async () => {
      console.log('📂 Chargement d\'analyse sauvegardée...');
      
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        id: 'saved_session_123',
        userId: config.userId,
        fileName: 'analyse_sauvegardee.xlsx',
        createdAt: new Date().toISOString(),
        // ... données de session
      };
    },
    onSuccess: (sessionData) => {
      console.log('✅ Analyse sauvegardée chargée:', sessionData.id);
      queryClient.setQueryData(['sod-session', config.userId], sessionData);
    },
  });
  
  // 🔄 MUTATION : Reprendre depuis fichier
  const resumeFromFileMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 Reprise depuis fichier...');
      
      // Simuler l'appel API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        id: 'resumed_session_456',
        userId: config.userId,
        fileName: 'analyse_reprise.xlsx',
        createdAt: new Date().toISOString(),
        // ... données de session
      };
    },
    onSuccess: (sessionData) => {
      console.log('✅ Analyse reprise avec succès:', sessionData.id);
      queryClient.setQueryData(['sod-session', config.userId], sessionData);
    },
  });
  
  // 🎯 OPTION B : Effet pour créer la session ET activer le sessionId
  useEffect(() => {
    console.log('🔍 DEBUG useEffect déclenché:', {
      hasParsedData: !!excelParser.parsedData,
      isParsing: excelParser.parsing,
      hasUploadedFile: !!uploadedFileRef.current,
      activeSessionId: activeSessionId,
      parsedDataLength: excelParser.parsedData?.length || 0
    });
    
    // Créer la session seulement si :
    // 1. Les données sont parsées
    // 2. Le parsing est terminé
    // 3. On a un fichier en attente
    // 4. Aucune session n'est active
    if (excelParser.parsedData && !excelParser.parsing && uploadedFileRef.current && !activeSessionId) {
      console.log('📊 Création de la session SOD avec les données parsées...');
      
      const file = uploadedFileRef.current;
      const data = excelParser.parsedData;
      
      // Créer la session et activer son ID
      sodSession.createSessionFromParsedData(file, data)
        .then((newSession) => {
          if (newSession) {
            console.log('✅ Session créée, activation de l\'ID:', newSession.id);
            setActiveSessionId(newSession.id);  // 🎯 Active la session créée
          } else {
            console.error('❌ Échec de la création de session');
          }
        })
        .catch((error) => {
          console.error('❌ Erreur lors de la création de session:', error);
        });
      
      uploadedFileRef.current = null; // Nettoyer la référence
    }
  }, [excelParser.parsedData, excelParser.parsing, activeSessionId, sodSession]);
  
  // État dérivé optimisé
  const state: SodWorkflowState = useMemo(() => ({
    importType,
    loading: sodSession.isLoading || excelParser.parsing || uploadFileMutation.isPending,
    error: sodSession.error || excelParser.error || uploadFileMutation.error?.message,
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
    uploadFileMutation.isPending,
    uploadFileMutation.error,
  ]);
  
  // Actions optimisées avec mutations
  const actions: SodWorkflowActions = useMemo(() => ({
    setImportType,
    
    startNewAnalysis: async (file: File) => {
      uploadFileMutation.mutate(file);
    },
    
    loadSavedAnalysis: async () => {
      loadSavedAnalysisMutation.mutate();
    },
    
    resumeFromFile: async () => {
      resumeFromFileMutation.mutate();
    },
    
    setEnableUsageAnalysis,
    
    setCurrentStep: sodSession.setCurrentStep || (() => {}),
    
    createSessionFromParsedData: sodSession.createSessionFromParsedData,
    
    startAutomaticRemediation: async () => {
      console.log('🚀 Démarrage de la remédiation automatique...', {
        enableUsageAnalysis,
        session: sodSession.session,
      });
      
      // TODO: Implémenter avec mutation TanStack Query
    },
    
    resetWorkflow: () => {
      setImportType('new');
      setEnableUsageAnalysis(false);
      
      // 🎯 OPTION B : Réinitialiser le sessionId actif
      setActiveSessionId(undefined);
      
      // Invalider toutes les queries SOD
      queryClient.invalidateQueries({ queryKey: ['sod-session', config.userId] });
      queryClient.invalidateQueries({ queryKey: ['sod-sessions', config.userId] });
      
      // Nettoyer le parser
      excelParser.cancelParsing?.();
    },
  }), [
    enableUsageAnalysis,
    sodSession,
    excelParser,
    uploadFileMutation,
    loadSavedAnalysisMutation,
    resumeFromFileMutation,
    queryClient,
    config.userId,
  ]);
  
  return {
    state,
    actions,
  };
};
