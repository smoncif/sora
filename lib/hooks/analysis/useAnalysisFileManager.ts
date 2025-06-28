import { useState, useCallback, useMemo } from 'react';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';
import { 
  parseExcelFile, 
  calculateCoverageAnalysis, 
  createSimplifiedAnalysisResult 
} from 'lib/services/role/simplifiedAnalysisService';
import { parseResumeFile } from 'lib/services/analysis/resumeAnalysisService';
import { getSavedAnalysisById } from 'lib/services/analysis/savedAnalysisService';

// Types pour la gestion des fichiers
export interface FileManagerState {
  // Données du fichier
  analysisResult: SimplifiedAnalysisResult | null;
  importType: 'new' | 'saved' | 'resume';
  
  // 🚀 NOUVEAU : ID de l'analyse chargée (pour les mises à jour)
  loadedAnalysisId: string | null;
  
  // États de traitement
  loading: boolean;
  error: string | null;
  progress: number;
  processingStep: string;
}

export interface FileManagerActions {
  // Actions principales
  handleFileUpload: (file: File) => Promise<void>;
  handleLoadSavedAnalysis: (analysisId: string, userId?: string) => Promise<void>;
  handleResumeFromFile: (file: File) => Promise<void>;
  handleReset: () => void;
  
  // Setters d'état
  setAnalysisResult: (result: SimplifiedAnalysisResult | null) => void;
  setImportType: (type: 'new' | 'saved' | 'resume') => void;
  setLoadedAnalysisId: (id: string | null) => void;
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
  loadedAnalysisId: null,
  loading: false,
  error: null,
  progress: 0,
  processingStep: '',
};

export const useAnalysisFileManager = (
  callbacks?: FileManagerCallbacks,
  cache?: any // 🚀 OPTIMISATION : Ajouter le cache comme paramètre
): AnalysisFileManager => {
  const [state, setState] = useState<FileManagerState>(initialState);
  
  // 🔒 STABILISÉ : Mémoriser les callbacks avec clé stable
  const memoizedCallbacks = useMemo(() => callbacks, [callbacks]);
  
  // 🚀 OPTIMISÉ : Setters avec callbacks synchrones 
  const setAnalysisResult = useCallback((result: SimplifiedAnalysisResult | null) => {
    setState(prev => ({ ...prev, analysisResult: result }));
    // Callback direct pour éviter les boucles asynchrones
    memoizedCallbacks?.onAnalysisResult?.(result);
  }, [memoizedCallbacks]);
  
  const setImportType = useCallback((type: 'new' | 'saved' | 'resume') => {
    setState(prev => ({ ...prev, importType: type }));
    memoizedCallbacks?.onImportType?.(type);
  }, [memoizedCallbacks]);
  
  const setLoadedAnalysisId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, loadedAnalysisId: id }));
  }, []);
  
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
    memoizedCallbacks?.onLoading?.(loading);
  }, [memoizedCallbacks]);
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
    memoizedCallbacks?.onError?.(error);
  }, [memoizedCallbacks]);
  
  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
    memoizedCallbacks?.onProgress?.(progress);
  }, [memoizedCallbacks]);
  
  const setProcessingStep = useCallback((step: string) => {
    setState(prev => ({ ...prev, processingStep: step }));
    memoizedCallbacks?.onProcessingStep?.(step);
  }, [memoizedCallbacks]);
  
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
      const analysis = calculateCoverageAnalysis(
        data.businessRoleTransactions,
        data.simpleRoleTransactions,
        0 // minCoverageThreshold
      );
      setProgress(60);
      setProcessingStep('Génération des résultats...');
      
      // Création du résultat simplifié
      const result = createSimplifiedAnalysisResult(
        data,
        analysis,
        file.name,
        'Analyse importée'
      );
      setProgress(90);
      setProcessingStep('Finalisation...');
      
      // Mise à jour du résultat
      setAnalysisResult(result);
      setImportType('new');
      setLoadedAnalysisId(null); // 🚀 Reset car nouveau fichier
      setProgress(90);
      setProcessingStep('Finalisation...');

      // 🚀 OPTIMISATION 2 : Pré-calcul du cache pour les futures utilisations
      if (cache?.precomputeCoverageAnalysis) {
        setProgress(95);
        setProcessingStep('Optimisation des performances...');
        try {
          cache.precomputeCoverageAnalysis(result);
        } catch (cacheError) {
          console.warn('Erreur lors du pré-calcul du cache (non critique):', cacheError);
        }
      }
      
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
  }, [setLoading, setError, setProgress, setProcessingStep, setAnalysisResult, setImportType, setLoadedAnalysisId, cache]);
  
  // Action : Charger une analyse sauvegardée
  const handleLoadSavedAnalysis = useCallback(async (analysisId: string, userId?: string) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStep('Chargement de l\'analyse...');
    
    try {
      console.log('🔄 Chargement de l\'analyse depuis Supabase:', analysisId);
      
      // Récupérer l'analyse depuis la base de données
      // Si userId n'est pas fourni, on essaie de le récupérer depuis l'auth
      if (!userId) {
        // On peut utiliser l'utilisateur connecté par défaut
        // Mais il serait mieux de passer userId en paramètre
        throw new Error('ID utilisateur requis pour charger l\'analyse');
      }
      
      setProgress(20);
      setProcessingStep('Récupération des données...');
      
      const savedAnalysis = await getSavedAnalysisById(analysisId, userId);
      console.log('✅ Analyse chargée avec succès:', savedAnalysis.metadata?.fileName);
      
      setProgress(40);
      
      // 🚀 NOUVEAU : Vérifier si l'analyse a besoin d'un recalcul des analyses de couverture
      let finalAnalysis = savedAnalysis;
      
      if (savedAnalysis.coverageAnalyses.length === 0 && 
          savedAnalysis.businessRoleTransactions.length > 0 && 
          savedAnalysis.simpleRoleTransactions.length > 0) {
        
        console.log('🔄 Recalcul des analyses de couverture nécessaire pour version compressée');
        setProcessingStep('Recalcul des analyses de couverture...');
        setProgress(60);
        
        try {
          // Recalculer les analyses de couverture depuis les données de base
          const recalculatedAnalysis = calculateCoverageAnalysis(
            savedAnalysis.businessRoleTransactions,
            savedAnalysis.simpleRoleTransactions,
            savedAnalysis.analysisParams?.minCoverageThreshold || 0
          );
          
          setProgress(80);
          setProcessingStep('Finalisation du recalcul...');
          
          // Reconstituer l'analyse complète avec les nouvelles analyses de couverture
          finalAnalysis = {
            ...savedAnalysis,
            coverageAnalyses: recalculatedAnalysis
          };
          
          console.log('✅ Recalcul terminé, analyses de couverture restaurées:', recalculatedAnalysis.length);
          
        } catch (recalcError) {
          console.warn('⚠️ Erreur lors du recalcul (non critique):', recalcError);
          // Continuer avec l'analyse originale même si le recalcul échoue
        }
      } else {
        console.log('ℹ️ Analyse complète, pas de recalcul nécessaire');
      }
      
      setProgress(90);
      setProcessingStep('Mise à jour de l\'interface...');
      
      // Mettre à jour l'état avec l'analyse finale
      setAnalysisResult(finalAnalysis);
      setImportType('saved');
      setLoadedAnalysisId(analysisId); // 🚀 Stocker l'ID pour les futures mises à jour
      
      setProgress(100);
      setProcessingStep('Analyse chargée avec succès !');
      
      // Petit délai pour afficher le succès
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setProcessingStep('');
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement de l\'analyse';
      setError(errorMessage);
      setLoading(false);
      setProgress(0);
      setProcessingStep('');
    }
  }, [setLoading, setError, setProgress, setProcessingStep, setAnalysisResult, setImportType, setLoadedAnalysisId]);
  
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
    // Callbacks directs pour éviter les boucles asynchrones
    memoizedCallbacks?.onAnalysisResult?.(null);
    memoizedCallbacks?.onImportType?.('new');
    memoizedCallbacks?.onLoading?.(false);
    memoizedCallbacks?.onError?.(null);
    memoizedCallbacks?.onProgress?.(0);
    memoizedCallbacks?.onProcessingStep?.('');
  }, [memoizedCallbacks]);
  
  // Actions groupées
  const actions: FileManagerActions = {
    handleFileUpload,
    handleLoadSavedAnalysis,
    handleResumeFromFile,
    handleReset,
    setAnalysisResult,
    setImportType,
    setLoadedAnalysisId,
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