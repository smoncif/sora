import { useState, useCallback, useMemo } from 'react';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';
import { 
  parseExcelFile, 
  calculateCoverageAnalysis, 
  createSimplifiedAnalysisResult 
} from 'lib/services/role/simplifiedAnalysisService';
import { parseResumeFile, validateResumeFile } from 'lib/services/analysis/resumeAnalysisService';
import { getSavedAnalysisById } from 'lib/services/analysis/savedAnalysisService';
import * as XLSX from 'xlsx';

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
      
      setProgress(40);
      
      // 🚀 NOUVEAU : Vérifier si l'analyse a besoin d'un recalcul des analyses de couverture
      let finalAnalysis = savedAnalysis;
      
      if (savedAnalysis.coverageAnalyses.length === 0 && 
          savedAnalysis.businessRoleTransactions.length > 0 && 
          savedAnalysis.simpleRoleTransactions.length > 0) {
        

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
          

          
        } catch (recalcError) {
          console.warn('⚠️ Erreur lors du recalcul (non critique):', recalcError);
          // Continuer avec l'analyse originale même si le recalcul échoue
        }
      } else {
        // Analyse complète, pas de recalcul nécessaire
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
    
    setProgress(0);
    setProcessingStep('Reprise de l\'analyse...');
    
    try {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        throw new Error('Le fichier doit être un fichier Excel (.xlsx ou .xls)');
      }
      
      // 🔍 NOUVEAU : Test préliminaire de validation
      const isValidResumeFile = await validateResumeFile(file);
      
              if (!isValidResumeFile) {
          console.warn('⚠️ Le fichier ne semble pas être un fichier de reprise valide, tentative de parsing quand même...');
          
          // 🔍 DEBUG : Lister les feuilles du fichier Excel pour diagnostic
          try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            
            // Vérifier les feuilles attendues
            const expectedSheets = ['Metadata', 'BusinessRoleTransactions', 'SimpleRoleTransactions', 'UserSelections', 'ProgressInfo'];
            const missingSheets = expectedSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
            const extraSheets = workbook.SheetNames.filter(sheet => !expectedSheets.includes(sheet));
          } catch (debugError) {
            console.error('📋 DEBUG: Erreur lors de l\'inspection du fichier:', debugError);
          }
        }
      
      setProgress(10);
      setProcessingStep('Lecture du fichier Excel de reprise...');
      
      // Parser le fichier de reprise avec toutes ses données
      const resumeData = await parseResumeFile(file);
      
      setProgress(30);
      setProcessingStep('Reconstitution de l\'analyse...');
      
      // 🚀 IMPLÉMENTATION COMPLÈTE : Reconstituer l'analyse depuis les données de reprise
      const { analysisResult, userSelections, progressInfo, metadata } = resumeData;
      
      // Appliquer les sélections utilisateur sauvegardées à l'analyse
      if (userSelections && userSelections.size > 0) {
        setProgress(50);
        setProcessingStep('Application des sélections sauvegardées...');
        
        // Convertir les sélections Map vers l'objet attendu
        const selectionsObject: Record<string, string[]> = {};
        userSelections.forEach((simpleRoles, businessRole) => {
          selectionsObject[businessRole] = Array.from(simpleRoles);
        });
        
        // Mettre à jour l'analyse avec les sélections
        analysisResult.userSelections = selectionsObject;
      } else {
        // Aucune sélection utilisateur trouvée dans le fichier
      }
      
      setProgress(70);
      setProcessingStep('Finalisation de la reconstruction...');
      
      // Mettre à jour les métadonnées et description avec les informations de reprise
      if (analysisResult.metadata) {
        // Utiliser les propriétés existantes du metadata
        analysisResult.metadata.fileName = `[REPRISE] ${metadata.originalFileName}`;
      }
      
      // Enrichir la description avec les informations de reprise
      const resumeInfo = `
📄 Analyse reprise depuis: ${metadata.originalFileName}
🕒 Dernière sauvegarde: ${metadata.lastSaved.toLocaleString('fr-FR')}
📊 Progression: ${progressInfo.progressPercentage}% (${progressInfo.completedBusinessRoles.length}/${progressInfo.totalBusinessRoles} rôles complétés)
🔄 Version: ${metadata.resumeVersion}`;
      
      analysisResult.description = analysisResult.description ? 
        `${analysisResult.description}\n\n--- INFORMATIONS DE REPRISE ---${resumeInfo}` : 
        `Analyse reprise depuis Excel${resumeInfo}`;
      
      setProgress(90);
      setProcessingStep('Mise à jour de l\'interface...');
      
      // Mettre à jour l'état avec l'analyse reconstituée
      setAnalysisResult(analysisResult);
      setImportType('resume');
      setLoadedAnalysisId(null); // Pas d'ID car chargé depuis fichier local
      
      setProgress(100);
      setProcessingStep('Analyse reprise avec succès !');
      
      // Petit délai pour afficher le succès
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setProcessingStep('');
      }, 500);
      
    } catch (error) {
      console.error('❌ Erreur lors de la reprise depuis Excel:', error);
      console.error('📊 Stack trace:', error instanceof Error ? error.stack : 'Pas de stack disponible');
      console.error('📊 Erreur complète:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la reprise de l\'analyse';
      console.error('📨 Message d\'erreur qui sera affiché:', errorMessage);
      
      setError(errorMessage);
      setLoading(false);
      setProgress(0);
      setProcessingStep('');
    }
  }, [setLoading, setError, setProgress, setProcessingStep, setAnalysisResult, setImportType, setLoadedAnalysisId]);
  
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