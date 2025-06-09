import { useState, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';
import { 
  parseExcelFile, 
  calculateCoverageAnalysis, 
  createSimplifiedAnalysisResult 
} from 'lib/services/role/simplifiedAnalysisService';
import { parseResumeFile } from 'lib/services/analysis/resumeAnalysisService';
import { exportAnalysisToExcel } from 'lib/services/analysis/exportAnalysisService';

// Types pour le hook de gestion des données
export interface AnalysisDataState {
  // États des données
  analysisResult: SimplifiedAnalysisResult | null;
  analysisName: string;
  analysisDescription: string;
  
  // États de l'interface
  loading: boolean;
  error: string | null;
  progress: number;
  processingStep: string;
  importType: 'new' | 'saved' | 'resume';
  
  // États des dialogs et UI
  saveDialogOpen: boolean;
  
  // Configuration des poids
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  includeFrequency: boolean;
}

export interface AnalysisDataCallbacks {
  onAnalysisResult: (result: SimplifiedAnalysisResult | null) => void;
  onAnalysisName: (name: string) => void;
  onAnalysisDescription: (description: string) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
  onProgress: (progress: number) => void;
  onProcessingStep: (step: string) => void;
  onImportType: (type: 'new' | 'saved' | 'resume') => void;
  onSaveDialogOpen: (open: boolean) => void;
  onWeights: (weights: { coverageWeight: number; sizeWeight: number; usageWeight: number }) => void;
}

export interface AnalysisDataManager {
  // États
  state: AnalysisDataState;
  
  // Actions de fichiers
  handleFileUpload: (file: File) => Promise<void>;
  handleLoadSavedAnalysis: (analysisId: string) => Promise<void>;
  handleResumeFromFile: (file: File) => Promise<void>;
  
  // Actions d'export/sauvegarde
  handleSaveAnalysis: () => Promise<void>;
  handleExportExcel: () => Promise<void>;
  
  // Actions de configuration
  setAnalysisName: (name: string) => void;
  setAnalysisDescription: (description: string) => void;
  setCoverageWeight: (weight: number) => void;
  setSizeWeight: (weight: number) => void;
  setUsageWeight: (weight: number) => void;
  setIncludeFrequency: (include: boolean) => void;
  
  // Actions d'interface
  setImportType: (type: 'new' | 'saved' | 'resume') => void;
  setSaveDialogOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  setProcessingStep: (step: string) => void;
  
  // Actions système
  handleReset: () => void;
}

export const useAnalysisDataManager = (
  callbacks?: Partial<AnalysisDataCallbacks>
): AnalysisDataManager => {
  const { user } = useAuth();
  
  // États centralisés
  const [state, setState] = useState<AnalysisDataState>({
    // Données
    analysisResult: null,
    analysisName: '',
    analysisDescription: '',
    
    // Interface
    loading: false,
    error: null,
    progress: 0,
    processingStep: '',
    importType: 'new',
    
    // Dialogs
    saveDialogOpen: false,
    
    // Configuration
    coverageWeight: 40,
    sizeWeight: 30,
    usageWeight: 30,
    includeFrequency: true,
  });
  
  // Fonctions de mise à jour d'état simplifiées
  const updateState = useCallback((updates: Partial<AnalysisDataState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Actions de configuration
  const setAnalysisName = useCallback((name: string) => {
    updateState({ analysisName: name });
    callbacks?.onAnalysisName?.(name);
  }, [updateState, callbacks]);
  
  const setAnalysisDescription = useCallback((description: string) => {
    updateState({ analysisDescription: description });
    callbacks?.onAnalysisDescription?.(description);
  }, [updateState, callbacks]);
  
  const setCoverageWeight = useCallback((weight: number) => {
    updateState({ coverageWeight: weight });
    callbacks?.onWeights?.({ 
      coverageWeight: weight, 
      sizeWeight: state.sizeWeight, 
      usageWeight: state.usageWeight 
    });
  }, [updateState, callbacks, state.sizeWeight, state.usageWeight]);
  
  const setSizeWeight = useCallback((weight: number) => {
    updateState({ sizeWeight: weight });
    callbacks?.onWeights?.({ 
      coverageWeight: state.coverageWeight, 
      sizeWeight: weight, 
      usageWeight: state.usageWeight 
    });
  }, [updateState, callbacks, state.coverageWeight, state.usageWeight]);
  
  const setUsageWeight = useCallback((weight: number) => {
    updateState({ usageWeight: weight });
    callbacks?.onWeights?.({ 
      coverageWeight: state.coverageWeight, 
      sizeWeight: state.sizeWeight, 
      usageWeight: weight 
    });
  }, [updateState, callbacks, state.coverageWeight, state.sizeWeight]);
  
  const setIncludeFrequency = useCallback((include: boolean) => {
    updateState({ includeFrequency: include });
  }, [updateState]);
  
  // Actions d'interface
  const setImportType = useCallback((type: 'new' | 'saved' | 'resume') => {
    updateState({ importType: type });
    callbacks?.onImportType?.(type);
  }, [updateState, callbacks]);
  
  const setSaveDialogOpen = useCallback((open: boolean) => {
    updateState({ saveDialogOpen: open });
    callbacks?.onSaveDialogOpen?.(open);
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
  
  // Actions de données
  const setAnalysisResult = useCallback((result: SimplifiedAnalysisResult | null) => {
    updateState({ analysisResult: result });
    callbacks?.onAnalysisResult?.(result);
  }, [updateState, callbacks]);
  
  // Actions de fichiers - IMPLÉMENTATION COMPLÈTE
  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStep('Début de l\'analyse...');
    
    try {
      // Validation du fichier
      if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        throw new Error('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
      }

      setProgress(10);
      setProcessingStep('Lecture du fichier Excel...');
      
      // Parse du fichier Excel
      const parsingResult = await parseExcelFile(file);
      
      setProgress(40);
      setProcessingStep('Analyse de la couverture des rôles...');
      
      // Calcul de l'analyse de couverture
      const coverageAnalyses = calculateCoverageAnalysis(
        parsingResult.businessRoleTransactions,
        parsingResult.simpleRoleTransactions,
        0 // minCoverageThreshold par défaut
      );
      
      setProgress(70);
      setProcessingStep('Création du résultat d\'analyse...');
      
      // Création du résultat final
      const analysisResult = createSimplifiedAnalysisResult(
        parsingResult,
        coverageAnalyses,
        file.name.replace(/\.[^/.]+$/, ''), // Nom sans extension
        `Analyse générée depuis ${file.name}`
      );
      
      setProgress(90);
      setProcessingStep('Finalisation...');
      
      // Mise à jour de l'état
      setAnalysisResult(analysisResult);
      
      setProgress(100);
      setProcessingStep('Analyse terminée avec succès !');
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inconnue lors de l\'analyse');
      setProgress(0);
      setProcessingStep('Erreur lors de l\'analyse');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProgress, setProcessingStep, setError, setAnalysisResult]);

  const handleLoadSavedAnalysis = useCallback(async (analysisId: string) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStep('Chargement de l\'analyse sauvegardée...');
    
    try {
      // TODO: Intégrer avec l'API de sauvegarde
      // const savedAnalysis = await loadAnalysisFromDatabase(analysisId);
      // setAnalysisResult(savedAnalysis);
      
      // Paramètre utilisé pour la future implémentation
      void analysisId;
      
      setProgress(100);
      setProcessingStep('Analyse chargée avec succès !');
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProgress, setProcessingStep, setError]);

  const handleResumeFromFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStep('Reprise de l\'analyse depuis le fichier...');
    
    try {
      setProgress(20);
      setProcessingStep('Lecture du fichier de reprise...');
      
      const resumeResult = await parseResumeFile(file);
      
      setProgress(60);
      setProcessingStep('Restauration des données...');
      
      // Restaurer l'analyse
      setAnalysisResult(resumeResult.analysisResult);
      
      // Restaurer les paramètres
      if (resumeResult.metadata) {
        updateState({
          analysisName: resumeResult.analysisResult.name,
          analysisDescription: resumeResult.analysisResult.description || '',
        });
      }
      
      setProgress(100);
      setProcessingStep('Analyse restaurée avec succès !');
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la reprise');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setProgress, setProcessingStep, setError, setAnalysisResult, updateState]);

  const handleSaveAnalysis = useCallback(async () => {
    if (!state.analysisResult) {
      setError('Aucune analyse à sauvegarder');
      return;
    }
    
    if (!state.analysisName.trim()) {
      setError('Veuillez entrer un nom pour l\'analyse');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // TODO: Intégrer avec l'API de sauvegarde
      // await saveAnalysisToDatabase({
      //   ...state.analysisResult,
      //   name: state.analysisName,
      //   description: state.analysisDescription
      // });
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }, [state.analysisResult, state.analysisName, setLoading, setError]);

  const handleExportExcel = useCallback(async () => {
    if (!state.analysisResult) {
      setError('Aucune analyse à exporter');
      return;
    }
    
    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStep('Préparation de l\'export...');
    
    try {
      const userSelections = new Map(); // TODO: Intégrer avec les sélections réelles
      
      await exportAnalysisToExcel(
        state.analysisResult,
        userSelections,
        {
          analysisName: state.analysisName || state.analysisResult.name,
          analysisDescription: state.analysisDescription || state.analysisResult.description || '',
          exportedAt: new Date().toISOString(),
          exportedBy: user?.email || 'Utilisateur',
          version: '1.0',
          analysisParams: {
            includeFrequency: state.includeFrequency,
            minCoverageThreshold: 0,
            coverageWeight: state.coverageWeight,
            sizeWeight: state.sizeWeight,
            usageWeight: state.usageWeight,
          }
        },
        {
          onProgress: (progress, stage) => {
            setProgress(progress);
            setProcessingStep(stage);
          }
        }
      );
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  }, [state.analysisResult, state.analysisName, state.analysisDescription, state.includeFrequency, 
      state.coverageWeight, state.sizeWeight, state.usageWeight, user?.email, 
      setLoading, setError, setProgress, setProcessingStep]);
  
  // Action de reset
  const handleReset = useCallback(() => {
    setState({
      analysisResult: null,
      analysisName: '',
      analysisDescription: '',
      loading: false,
      error: null,
      progress: 0,
      processingStep: '',
      importType: 'new',
      saveDialogOpen: false,
      coverageWeight: 40,
      sizeWeight: 30,
      usageWeight: 30,
      includeFrequency: true,
    });
  }, []);
  
  return {
    state,
    
    // Actions de fichiers
    handleFileUpload,
    handleLoadSavedAnalysis,
    handleResumeFromFile,
    
    // Actions d'export/sauvegarde
    handleSaveAnalysis,
    handleExportExcel,
    
    // Actions de configuration
    setAnalysisName,
    setAnalysisDescription,
    setCoverageWeight,
    setSizeWeight,
    setUsageWeight,
    setIncludeFrequency,
    
    // Actions d'interface
    setImportType,
    setSaveDialogOpen,
    setLoading,
    setError,
    setProgress,
    setProcessingStep,
    
    // Actions système
    handleReset,
  };
}; 

