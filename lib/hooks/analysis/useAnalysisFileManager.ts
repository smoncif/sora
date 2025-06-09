import { useState, useCallback } from 'react';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';
import { 
  parseExcelFile, 
  calculateCoverageAnalysis, 
  createSimplifiedAnalysisResult 
} from 'lib/services/role/simplifiedAnalysisService';
import { parseResumeFile } from 'lib/services/analysis/resumeAnalysisService';

// Types pour la gestion des fichiers
export interface FileManagerState {
  // Données du fichier
  analysisResult: SimplifiedAnalysisResult | null;
  importType: 'new' | 'saved' | 'resume';
  
  // États de traitement
  loading: boolean;
  error: string | null;
  progress: number;
  processingStep: string;
}

export interface FileManagerActions {
  // Actions principales
  handleFileUpload: (file: File) => Promise<void>;
  handleLoadSavedAnalysis: (analysisId: string) => Promise<void>;
  handleResumeFromFile: (file: File) => Promise<void>;
  handleReset: () => void;
  
  // Setters d'état
  setAnalysisResult: (result: SimplifiedAnalysisResult | null) => void;
  setImportType: (type: 'new' | 'saved' | 'resume') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  setProcessingStep: (step: string) => void;
}

export interface AnalysisFileManager {
  state: FileManagerState;
  actions: FileManagerActions;
}

// Callbacks optionnels pour les événements
export interface FileManagerCallbacks {
  onAnalysisResult?: (result: SimplifiedAnalysisResult | null) => void;
  onImportType?: (type: 'new' | 'saved' | 'resume') => void;
  onLoading?: (loading: boolean) => void;
  onError?: (error: string | null) => void;
  onProgress?: (progress: number) => void;
  onProcessingStep?: (step: string) => void;
}

const initialState: FileManagerState = {
  analysisResult: null,
  importType: 'new',
  loading: false,
  error: null,
  progress: 0,
  processingStep: '',
};

export const useAnalysisFileManager = (
  callbacks?: FileManagerCallbacks
): AnalysisFileManager => {
  const [state, setState] = useState<FileManagerState>(initialState);
  
  // Helper pour mise à jour d'état
  const updateState = useCallback((updates: Partial<FileManagerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Setters avec callbacks
  const setAnalysisResult = useCallback((result: SimplifiedAnalysisResult | null) => {
    updateState({ analysisResult: result });
    callbacks?.onAnalysisResult?.(result);
  }, [updateState, callbacks]);
  
  const setImportType = useCallback((type: 'new' | 'saved' | 'resume') => {
    updateState({ importType: type });
    callbacks?.onImportType?.(type);
  }, [updateState, callbacks]);
  
  const setLoading = useCallback((loading: boolean) => {
    updateState({ loading });
    callbacks?.onLoading?.(loading);
  }, [updateState, callbacks]);
  
  const setError = useCallback((error: string | null) => {
    updateState({ error });
    callbacks?.onError?.(error);
  }, [updateState, callbacks]);
  
  const setProgress = useCallback((progress: number) => {
    updateState({ progress });
    callbacks?.onProgress?.(progress);
  }, [updateState, callbacks]);
  
  const setProcessingStep = useCallback((step: string) => {
    updateState({ processingStep: step });
    callbacks?.onProcessingStep?.(step);
  }, [updateState, callbacks]);
  
  // Action principale : Upload et traitement de fichier
  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStep('Début de l\'analyse...');
    
    try {
      setProgress(10);
      setProcessingStep('Lecture du fichier Excel...');
      
      // Parse du fichier Excel
      const data = await parseExcelFile(file);
      setProgress(30);
      setProcessingStep('Traitement des données...');
      
      // Calcul de l'analyse de couverture
      const analysis = calculateCoverageAnalysis(data);
      setProgress(60);
      setProcessingStep('Génération des résultats...');
      
      // Création du résultat simplifié
      const result = createSimplifiedAnalysisResult(analysis);
      setProgress(90);
      setProcessingStep('Finalisation...');
      
      // Mise à jour du résultat
      setAnalysisResult(result);
      setImportType('new');
      setProgress(100);
      setProcessingStep('Analyse terminée !');
      
      // Petit délai pour afficher le succès
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setProcessingStep('');
      }, 500);
      
    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du traitement du fichier');
      setLoading(false);
      setProgress(0);
      setProcessingStep('');
    }
  }, [setLoading, setError, setProgress, setProcessingStep, setAnalysisResult, setImportType]);
  
  // Action : Charger une analyse sauvegardée
  const handleLoadSavedAnalysis = useCallback(async (analysisId: string) => {
    setLoading(true);
    setError(null);
    setProcessingStep('Chargement de l\'analyse...');
    
    try {
      // TODO: Implémenter le chargement depuis la base de données
      // const savedAnalysis = await loadSavedAnalysis(analysisId);
      // setAnalysisResult(savedAnalysis);
      setImportType('saved');
      setLoading(false);
      setProcessingStep('');
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement');
      setLoading(false);
      setProcessingStep('');
    }
  }, [setLoading, setError, setProcessingStep, setImportType]);
  
  // Action : Reprendre depuis un fichier
  const handleResumeFromFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProcessingStep('Reprise de l\'analyse...');
    
    try {
      const resumeData = await parseResumeFile(file);
      // TODO: Reconstituer l'analyse depuis les données de reprise
      setImportType('resume');
      setLoading(false);
      setProcessingStep('');
    } catch (error) {
      console.error('Erreur lors de la reprise:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la reprise');
      setLoading(false);
      setProcessingStep('');
    }
  }, [setLoading, setError, setProcessingStep, setImportType]);
  
  // Action : Reset complet
  const handleReset = useCallback(() => {
    setState(initialState);
    callbacks?.onAnalysisResult?.(null);
    callbacks?.onImportType?.('new');
    callbacks?.onLoading?.(false);
    callbacks?.onError?.(null);
    callbacks?.onProgress?.(0);
    callbacks?.onProcessingStep?.('');
  }, [callbacks]);
  
  // Actions groupées
  const actions: FileManagerActions = {
    handleFileUpload,
    handleLoadSavedAnalysis,
    handleResumeFromFile,
    handleReset,
    setAnalysisResult,
    setImportType,
    setLoading,
    setError,
    setProgress,
    setProcessingStep,
  };
  
  return {
    state,
    actions,
  };
}; 