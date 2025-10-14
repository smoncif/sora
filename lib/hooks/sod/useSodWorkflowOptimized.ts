/**
 * Hook optimisé pour gérer le workflow complet de l'analyse SOD
 * Utilise TanStack Query pour une gestion d'état optimale
 */

'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
  
  // 🔧 FIX BOUCLE INFINIE : Mémoriser sodSession pour éviter les re-renders
  const memoizedSodSession = useMemo(() => sodSession, [
    sodSession.session?.id,
    sodSession.isLoading,
    sodSession.error,
    activeSessionId
  ]);
  
  // Parser Excel (garde la logique actuelle pour l'instant)
  const excelParser = useSodExcelParserOptimized();
  
  // 🔧 FIX BOUCLE INFINIE : Mémoriser excelParser pour éviter les re-renders
  const memoizedExcelParser = useMemo(() => excelParser, [
    excelParser.parsing,
    excelParser.parsedData?.simpleRoles?.length,
    excelParser.parsedData?.compositeRoles?.length,
    excelParser.error,
    excelParser.progress?.progress
  ]);
  
  // 🔍 LOG : Hook re-render avec détection de cause
  const prevHookState = useRef({
    activeSessionId,
    parsing: memoizedExcelParser.state?.parsing,
    progress: memoizedExcelParser.state?.progress,
    importType,
    enableUsageAnalysis
  });
  
  const hookChanges: string[] = [];
  if (prevHookState.current.activeSessionId !== activeSessionId) {
    hookChanges.push(`activeSessionId: ${prevHookState.current.activeSessionId} → ${activeSessionId}`);
  }
  if (prevHookState.current.parsing !== memoizedExcelParser.state?.parsing) {
    hookChanges.push(`parsing: ${prevHookState.current.parsing} → ${memoizedExcelParser.state?.parsing}`);
  }
  if (prevHookState.current.progress !== memoizedExcelParser.state?.progress) {
    hookChanges.push(`progress: ${prevHookState.current.progress} → ${memoizedExcelParser.state?.progress}`);
  }
  if (prevHookState.current.importType !== importType) {
    hookChanges.push(`importType: ${prevHookState.current.importType} → ${importType}`);
  }
  if (prevHookState.current.enableUsageAnalysis !== enableUsageAnalysis) {
    hookChanges.push(`enableUsageAnalysis: ${prevHookState.current.enableUsageAnalysis} → ${enableUsageAnalysis}`);
  }
  
  console.log('🔧 [HOOK RENDER] useSodWorkflowOptimized render #' + renderCountRef.current, {
    changes: hookChanges.length > 0 ? hookChanges : ['Hook re-render sans changement détecté'],
    activeSessionId,
    parsing: excelParser.state?.parsing,
    progress: excelParser.state?.progress,
    importType,
    enableUsageAnalysis
  });
  
  prevHookState.current = {
    activeSessionId,
    parsing: memoizedExcelParser.state?.parsing,
    progress: memoizedExcelParser.state?.progress,
    importType,
    enableUsageAnalysis
  };
  
  // ✅ SIMPLIFIÉ : Le hook useSodSession gère toutes les mutations nécessaires
  
  // 🎯 OPTION B : Effet pour créer la session ET activer le sessionId
  useEffect(() => {
    console.log('🔧 [EFFECT] Session creation effect déclenché', {
      hasParsedData: !!memoizedExcelParser.parsedData,
      isParsing: memoizedExcelParser.parsing,
      hasUploadedFile: !!uploadedFileRef.current,
      activeSessionId,
      shouldCreateSession: !!(memoizedExcelParser.parsedData && !memoizedExcelParser.parsing && uploadedFileRef.current && !activeSessionId)
    });
    
    // Créer la session seulement si :
    // 1. Les données sont parsées
    // 2. Le parsing est terminé
    // 3. On a un fichier en attente
    // 4. Aucune session n'est active
    if (memoizedExcelParser.parsedData && !memoizedExcelParser.parsing && uploadedFileRef.current && !activeSessionId) {
      const file = uploadedFileRef.current;
      const data = memoizedExcelParser.parsedData;
      
      console.log('🚀 [EFFECT] Création session en cours...');
      
      // Créer la session et activer son ID
      memoizedSodSession.createSessionFromParsedData(file, data)
        .then((newSession) => {
          if (newSession) {
            console.log('✅ [EFFECT] Session créée, activation:', newSession.id);
            setActiveSessionId(newSession.id);  // 🎯 Active la session créée
          }
        })
        .catch((error) => {
          console.error('❌ Erreur lors de la création de session:', error);
        });
      
      uploadedFileRef.current = null; // Nettoyer la référence
    }
  }, [memoizedExcelParser.parsedData, memoizedExcelParser.parsing, activeSessionId, memoizedSodSession]);
  
  // État dérivé optimisé
  const state: SodWorkflowState = useMemo(() => ({
    importType,
    loading: memoizedSodSession.isLoading || memoizedExcelParser.parsing,
    error: memoizedSodSession.error || memoizedExcelParser.error,
    enableUsageAnalysis,
    session: memoizedSodSession.session,
    currentStep: memoizedSodSession.currentStep,
    // État du parsing
    parsing: memoizedExcelParser.parsing || false,
    parsingProgress: memoizedExcelParser.progress?.progress || 0,
    parsingMessage: memoizedExcelParser.progress?.message || 'Traitement en cours...',
    parsingError: memoizedExcelParser.error || null,
  }), [
    importType,
    enableUsageAnalysis,
    memoizedSodSession.isLoading,
    memoizedSodSession.error,
    memoizedSodSession.session,
    memoizedSodSession.currentStep,
    memoizedExcelParser.parsing,
    memoizedExcelParser.progress?.progress,
    memoizedExcelParser.progress?.message,
    memoizedExcelParser.error,
  ]);
  
  // Actions optimisées
  const actions: SodWorkflowActions = useMemo(() => ({
    setImportType,
    
    startNewAnalysis: async (file: File) => {
      console.log('🚀 Démarrage de l\'analyse pour:', file.name);
      
      // Sauvegarder la référence au fichier
      uploadedFileRef.current = file;
      
      // Parser le fichier Excel (asynchrone via Web Worker)
      await memoizedExcelParser.parseFile(file);
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
    
    setCurrentStep: memoizedSodSession.setCurrentStep || (() => {}),
    
    createSessionFromParsedData: memoizedSodSession.createSessionFromParsedData,
    
    startAutomaticRemediation: async () => {
      console.log('🚀 Démarrage de la remédiation automatique...', {
        enableUsageAnalysis,
        session: memoizedSodSession.session,
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
    queryClient,
    config.userId,
    setActiveSessionId,
  ]);
  
  return {
    state,
    actions,
  };
};
