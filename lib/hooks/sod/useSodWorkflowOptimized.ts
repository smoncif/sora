/**
 * Hook optimisé pour gérer le workflow complet de l'analyse SOD
 * Utilise TanStack Query pour une gestion d'état optimale
 */

'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  // 🔍 LOG : Détecter les re-renders du hook
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
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
  
  // ✅ SOLUTION : Extraire les valeurs stables au lieu de mémoriser le hook entier
  // Le hook useSodSession retourne toujours un nouvel objet, donc impossible à mémoriser efficacement
  const { 
    session, 
    isLoading: sessionLoading, 
    error: sessionError,
    currentStep,
    setCurrentStep,
    createSessionFromParsedData
  } = sodSession;
  
  // Parser Excel (garde la logique actuelle pour l'instant)
  const excelParser = useSodExcelParserOptimized();
  
  // ✅ SOLUTION : Extraire les valeurs stables au lieu de mémoriser le hook entier
  // Le hook retourne toujours un nouvel objet, donc impossible à mémoriser efficacement
  const { parsing: parsingState, parsedData, error: parserError, parseFile } = excelParser;
  
  // 🔍 LOG : Hook re-render avec détection de cause
  const prevHookState = useRef({
    activeSessionId,
    parsing: parsingState,
    importType,
    enableUsageAnalysis
  });
  
  const hookChanges: string[] = [];
  if (prevHookState.current.activeSessionId !== activeSessionId) {
    hookChanges.push(`activeSessionId: ${prevHookState.current.activeSessionId} → ${activeSessionId}`);
  }
  if (prevHookState.current.parsing !== parsingState) {
    hookChanges.push(`parsing: ${prevHookState.current.parsing} → ${parsingState}`);
  }
  if (prevHookState.current.importType !== importType) {
    hookChanges.push(`importType: ${prevHookState.current.importType} → ${importType}`);
  }
  if (prevHookState.current.enableUsageAnalysis !== enableUsageAnalysis) {
    hookChanges.push(`enableUsageAnalysis: ${prevHookState.current.enableUsageAnalysis} → ${enableUsageAnalysis}`);
  }
  
  // Render tracking removed
  
  prevHookState.current = {
    activeSessionId,
    parsing: parsingState,
    importType,
    enableUsageAnalysis
  };
  
  // ✅ SIMPLIFIÉ : Le hook useSodSession gère toutes les mutations nécessaires
  
  // 🎯 OPTION B : Effet pour créer la session ET activer le sessionId
  useEffect(() => {
    // Créer la session seulement si :
    // 1. Les données sont parsées
    // 2. Le parsing est terminé
    // 3. On a un fichier en attente
    // 4. Aucune session n'est active
    if (parsedData && !parsingState && uploadedFileRef.current && !activeSessionId) {
      const file = uploadedFileRef.current;
      const data = parsedData;
      
      // Session creation effect removed
      
      // Appel direct de la fonction (stable depuis useSodSession)
      createSessionFromParsedData(file, data)
        .then((newSession) => {
          if (newSession) {
            // Session created effect removed
            setActiveSessionId(newSession.id);  // 🎯 Active la session créée
          }
        })
        .catch((error) => {
          console.error('❌ Erreur lors de la création de session:', error);
        });
      
      uploadedFileRef.current = null; // Nettoyer la référence
    }
  }, [parsedData, parsingState, activeSessionId, createSessionFromParsedData]);
  
  // État dérivé optimisé
  const state: SodWorkflowState = useMemo(() => ({
    importType,
    loading: sessionLoading || parsingState,
    error: sessionError || parserError,
    enableUsageAnalysis,
    session,
    currentStep,
    // État du parsing
    parsing: parsingState || false,
    parsingProgress: excelParser.progress?.progress || 0,
    parsingMessage: excelParser.progress?.message || 'Traitement en cours...',
    parsingError: parserError || null,
  }), [
    importType,
    enableUsageAnalysis,
    sessionLoading,
    sessionError,
    session,
    currentStep,
    parsingState,
    excelParser.progress?.progress,
    excelParser.progress?.message,
    parserError,
  ]);
  
  // Actions optimisées
  const actions: SodWorkflowActions = useMemo(() => ({
    setImportType,
    
    startNewAnalysis: async (file: File) => {
      // Analysis start removed
      
      // Sauvegarder la référence au fichier
      uploadedFileRef.current = file;
      
      // Parser le fichier Excel (asynchrone via Web Worker)
      await parseFile(file);
    },
    
    loadSavedAnalysis: async () => {
      console.log('📂 Chargement d\'analyse sauvegardée...');
      // TODO: Implémenter le chargement d'analyse sauvegardée
      setActiveSessionId('saved_session_123');
    },
    
    resumeFromFile: async () => {
      console.log('🔄 Reprise depuis fichier...');
      // TODO: Implémenter la reprise depuis fichier
      setActiveSessionId('resumed_session_456');
    },
    
    setEnableUsageAnalysis,
    
    setCurrentStep: setCurrentStep || (() => {}),
    
    createSessionFromParsedData,
    
    startAutomaticRemediation: async () => {
      // Auto remediation start removed
      
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
    queryClient,
    config.userId,
    setActiveSessionId,
  ]);
  
  return {
    state,
    actions,
  };
};
