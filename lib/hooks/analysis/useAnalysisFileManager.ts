import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { SimplifiedAnalysisResult, BusinessRoleTransaction, SimpleRoleTransaction } from 'lib/types/roleAnalysis';
import { 
  calculateCoverageAnalysis
} from 'lib/services/role/simplifiedAnalysisService';
import { parseResumeFile, validateResumeFile } from 'lib/services/analysis/resumeAnalysisService';
import { getSavedAnalysisById } from 'lib/services/analysis/savedAnalysisService';
import {
  useAnalysisExcelParserWorker,
  type AnalysisParseFileInput,
  type UseAnalysisExcelParserWorkerReturn,
} from './useAnalysisExcelParserWorker';
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

interface AnalysisCacheLike {
  precomputeCoverageAnalysis?: (analysis: SimplifiedAnalysisResult) => void;
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
  cache?: AnalysisCacheLike, // 🚀 OPTIMISATION : Ajouter le cache comme paramètre
  mode?: 'roles' | 'users' // Mode d'analyse pour déterminer le parser
): AnalysisFileManager => {
  const [state, setState] = useState<FileManagerState>(initialState);
  const analysisParser: UseAnalysisExcelParserWorkerReturn =
    useAnalysisExcelParserWorker();
  const parseAnalysisFileMutation = useMutation({
    mutationFn: async ({
      arrayBuffer,
      fileName,
      fileType,
    }: {
      arrayBuffer: ArrayBuffer;
      fileName: string;
      fileType: 'roles' | 'users';
    }) => {
      const parseInput: AnalysisParseFileInput = {
        preReadBuffer: arrayBuffer,
        fileName,
      };
      return analysisParser.parseFile(parseInput, fileType);
    },
  });
  
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

  // Synchronise la progression du worker avec l'UI globale
  useEffect(() => {
    if (!analysisParser.parsing || !analysisParser.progress) {
      return;
    }

    setProgress(analysisParser.progress.progress);
    setProcessingStep(analysisParser.progress.message);
  }, [analysisParser.parsing, analysisParser.progress, setProgress, setProcessingStep]);
  
  // Action principale : Upload et traitement de fichier
  const handleFileUpload = useCallback(async (file: File) => {
    const tHandleStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    setLoading(true);
    setError(null);
    setProgress(0);
    setProcessingStep('Début de l\'analyse...');
    
    try {
      // Limite produit stricte définie pour éviter les crashes navigateur
      const maxFileSize = 50 * 1024 * 1024;
      if (file.size > maxFileSize) {
        throw new Error(
          `Le fichier est trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Limite stricte: 50MB`
        );
      }

      const arrayBuffer = await file.arrayBuffer();

      setProgress(5);
      setProcessingStep('Détection du type de fichier...');
      
      // 🔍 NOUVELLE LOGIQUE : Détection automatique du type de fichier
      const { detectExcelFileType, validateExcelFileForType } = await import('lib/services/analysis/excelFileDetectionService');
      
      let detectedType: 'roles' | 'users' = 'roles';
      
      if (mode) {
        // Mode explicite fourni - valider que le fichier est compatible
        setProcessingStep(`Validation du fichier pour analyse ${mode}...`);
        const validation = await validateExcelFileForType(arrayBuffer, mode);
        
        if (!validation.isValid) {
          throw new Error(`Fichier incompatible avec l'analyse ${mode}:\n${validation.errors.join('\n')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.warn('Avertissements lors de la validation:', validation.warnings);
        }
        
        detectedType = mode;
      } else {
        // Mode automatique - détecter le type
        const detection = await detectExcelFileType(arrayBuffer);
        
        if (detection.type === 'unknown' || detection.confidence < 60) {
          throw new Error(`Impossible de déterminer le type de fichier Excel.\nRaisons: ${detection.reasoning.join(', ')}\nFeuilles trouvées: ${detection.sheetsFound.join(', ')}`);
        }

        if (detection.type !== 'roles' && detection.type !== 'users') {
          throw new Error(
            `Type de fichier détecté non supporté pour ce module: ${detection.type}. ` +
            'Utilisez un fichier dédié à l’analyse des rôles métier ou des utilisateurs.'
          );
        }
        
        detectedType = detection.type;
        setProcessingStep(`Type détecté: analyse ${detectedType} (confiance: ${detection.confidence}%)`);
      }
      
      setProgress(15);
      setProcessingStep('Préparation du parsing en worker...');
      
      // 🚀 PARSING DÉPORTÉ : exécution dans un Web Worker pour éviter de bloquer l'UI
      const parsedDataWithData = await parseAnalysisFileMutation.mutateAsync({
        arrayBuffer,
        fileName: file.name,
        fileType: detectedType,
      });
      const tAfterWorkerParse = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const businessRoleTransactions: BusinessRoleTransaction[] = parsedDataWithData.businessRoleTransactions;
      const simpleRoleTransactions: SimpleRoleTransaction[] = parsedDataWithData.simpleRoleTransactions;
      const finalUserAnalysisData = parsedDataWithData.userAnalysisData;

      if (parsedDataWithData.warnings.length > 0) {
        console.warn('Avertissements lors du parsing:', parsedDataWithData.warnings);
      }

      console.log('⏱️ [analysis upload] after worker COMPLETE', {
        fileType: detectedType,
        tSinceStartMs: Math.round(tAfterWorkerParse - tHandleStart),
        businessRoleTransactions: businessRoleTransactions.length,
        simpleRoleTransactions: simpleRoleTransactions.length,
        warnings: parsedDataWithData.warnings.length,
      });

      setProcessingStep(
        detectedType === 'users'
          ? 'Données utilisateurs parsées avec succès...'
          : 'Données rôles parsées avec succès...'
      );
      
      setProgress(35);
      setProcessingStep('Traitement des données...');

      // Mesurer quand le navigateur reprend pour un repaint
      // Si ce log est retardé, alors le thread UI est bloqué (et l'utilisateur
      // voit "Parsing terminé" visuellement plus longtemps que prévu).
      if (typeof window !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
        const tRafStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        requestAnimationFrame(() => {
          const tRafEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
          console.log('⏱️ [analysis upload] rAF after step35 repaint', {
            delayMs: Math.round(tRafEnd - tRafStart),
          });
        });
      }
      
      // Calcul de l'analyse de couverture (même logique pour les 2 types)
      const tCoverageStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const { calculateCoverageAnalysis } = await import('lib/services/role/simplifiedAnalysisService');
      const analysis = calculateCoverageAnalysis(
        businessRoleTransactions,
        simpleRoleTransactions,
        0 // minCoverageThreshold
      );
      const tCoverageEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.log('⏱️ [analysis upload] calculateCoverageAnalysis done', {
        tMs: Math.round(tCoverageEnd - tCoverageStart),
        coverageAnalyses: analysis.length,
      });
      setProgress(60);
      setProcessingStep('Génération des résultats...');
      
      // Création du résultat simplifié
      const tCreateStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const { createSimplifiedAnalysisResult } = await import('lib/services/role/simplifiedAnalysisService');
      const baseResult = createSimplifiedAnalysisResult(
        {
          businessRoleTransactions,
          simpleRoleTransactions,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            sheetsFound: [],
            businessRoleCount: new Set(businessRoleTransactions.map((t: BusinessRoleTransaction) => t.businessRole)).size,
            simpleRoleCount: new Set(simpleRoleTransactions.map((t: SimpleRoleTransaction) => t.simpleRole)).size,
            totalTransactions: new Set([...businessRoleTransactions.map((t: BusinessRoleTransaction) => t.transaction), ...simpleRoleTransactions.map((t: SimpleRoleTransaction) => t.transaction)]).size,
            processingTimeMs: 0
          },
          warnings: [],
          errors: []
        },
        analysis,
        file.name,
        `Analyse ${detectedType} importée`
      );
      const tCreateEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.log('⏱️ [analysis upload] createSimplifiedAnalysisResult done', {
        tMs: Math.round(tCreateEnd - tCreateStart),
        coverageAnalyses: baseResult.coverageAnalyses?.length ?? null,
      });
      
      // 🔧 ENRICHIR avec les données spécifiques utilisateurs si nécessaire
      // NOTE: logs “massifs” supprimés (baseResult contient de gros tableaux)
      
      type ExtendedSimplifiedAnalysisResult = SimplifiedAnalysisResult & {
        userAnalysisData?: {
          users: { id: string; transactions: string[]; executionCount: number }[];
          businessRoleMappings: { businessRole: string; simpleRole: string }[];
        };
        analysisMode?: 'roles' | 'users';
      };

      const enrichedBaseResult = baseResult as ExtendedSimplifiedAnalysisResult;

      if (detectedType === 'users' && finalUserAnalysisData) {
        enrichedBaseResult.userAnalysisData = finalUserAnalysisData;
        enrichedBaseResult.analysisMode = 'users';
      } else {
        enrichedBaseResult.analysisMode = 'roles';
      }
      
      setProgress(80);
      
      // Enrichir avec les licences seulement pour les analyses de rôles
      let result = baseResult;
      if (mode === 'roles') {
        setProcessingStep('Enrichissement avec les licences...');
        const tEnrichStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const { enrichAnalysisWithLicenses } = await import('lib/services/license/licenseService');
        result = await enrichAnalysisWithLicenses(baseResult);
        const tEnrichEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
        console.log('⏱️ [analysis upload] enrichAnalysisWithLicenses done', {
          tMs: Math.round(tEnrichEnd - tEnrichStart),
          coverageAnalyses: result.coverageAnalyses?.length ?? null,
        });
      } else {
        setProcessingStep('Finalisation...');
      }
      setProgress(90);
      
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
          const tPrecomputeStart =
            typeof performance !== 'undefined' ? performance.now() : Date.now();
          cache.precomputeCoverageAnalysis(result);
          const tPrecomputeEnd =
            typeof performance !== 'undefined' ? performance.now() : Date.now();
          console.log('⏱️ [analysis upload] precomputeCoverageAnalysis done', {
            tMs: Math.round(tPrecomputeEnd - tPrecomputeStart),
          });

          // Marqueur debug: utile pour mesurer le délai réel avant l'exécution
          // du calcul uncoveredTransactionsData dans useAnalysisCalculations.
          if (typeof window !== 'undefined') {
            window.__analysisPrecomputeEndAt = tPrecomputeEnd;
          }
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
  }, [cache, mode, parseAnalysisFileMutation, setAnalysisResult, setError, setImportType, setLoadedAnalysisId, setLoading, setProcessingStep, setProgress]);
  
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
      setProcessingStep('Enrichissement avec les licences...');
      
      // 🚀 NOUVEAU : Enrichir avec les licences (comme pour Excel)
      const { enrichAnalysisWithLicenses } = await import('lib/services/license/licenseService');
      const enrichedAnalysis = await enrichAnalysisWithLicenses(finalAnalysis);
      
      setProgress(95);
      setProcessingStep('Mise à jour de l\'interface...');
      
      // Mettre à jour l'état avec l'analyse enrichie
      setAnalysisResult(enrichedAnalysis);
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
            
            // Vérifier que le fichier est lisible et contient des feuilles
            if (workbook.SheetNames.length === 0) {
              console.warn('📋 DEBUG: aucune feuille trouvée dans le fichier de reprise');
            }
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
      setProcessingStep('Enrichissement avec les licences...');
      
      // 🚀 NOUVEAU : Enrichir avec les licences (comme pour Excel et Supabase)
      const { enrichAnalysisWithLicenses } = await import('lib/services/license/licenseService');
      const enrichedAnalysis = await enrichAnalysisWithLicenses(analysisResult);
      
      setProgress(95);
      setProcessingStep('Mise à jour de l\'interface...');
      
      // Mettre à jour l'état avec l'analyse enrichie
      setAnalysisResult(enrichedAnalysis);
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