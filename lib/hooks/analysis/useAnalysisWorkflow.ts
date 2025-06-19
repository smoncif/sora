import { useCallback, useEffect, useMemo } from 'react';
import { 
  useAnalysisFileManager, 
  type AnalysisFileManager,
  type FileManagerCallbacks 
} from './useAnalysisFileManager';
import { 
  useAnalysisConfiguration, 
  type AnalysisConfiguration,
  type ConfigurationCallbacks 
} from './useAnalysisConfiguration';
import { 
  useAnalysisExport, 
  type AnalysisExport,
  type ExportCallbacks 
} from './useAnalysisExport';
import { 
  useAnalysisCache,
  type AnalysisCacheReturn,
  type AnalysisCacheCallbacks 
} from './useAnalysisCache';
import { 
  useAnalysisCalculations,
  type AnalysisCalculationsReturn 
} from './useAnalysisCalculations';
import { 
  useAnalysisSelections,
  type AnalysisSelectionsReturn,
  type AnalysisSelectionsCallbacks 
} from './useAnalysisSelections';
import { 
  useWorkflowLocalState,
  type WorkflowLocalReturn,
  type WorkflowLocalCallbacks 
} from './useWorkflowLocalState';
import { 
  useStaticAnalysisData,
  type StaticAnalysisData 
} from './useStaticAnalysisData';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

// Interface principale du workflow d'analyse - VERSION OPTIMISÉE
export interface AnalysisWorkflow {
  // Sous-hooks spécialisés (gestion données)
  fileManager: AnalysisFileManager;
  configuration: AnalysisConfiguration;
  exportManager: AnalysisExport;
  
  // Sous-hooks spécialisés (traitement)
  cache: AnalysisCacheReturn;
  calculations: AnalysisCalculationsReturn;
  selections: AnalysisSelectionsReturn;
  localState: WorkflowLocalReturn;
  staticData: StaticAnalysisData; // 🚀 NOUVELLES DONNÉES STATIQUES
  
  // États dérivés pour faciliter l'utilisation
  isReady: boolean;
  hasAnalysisResult: boolean;
  canExport: boolean;
  canSave: boolean;
  
  // Actions de haut niveau
  startNewAnalysis: (file: File) => Promise<void>;
  saveCurrentAnalysis: () => Promise<void>;
  exportCurrentAnalysis: (format?: 'excel' | 'pdf' | 'csv' | 'json') => Promise<void>;
  resetWorkflow: () => void;
  
  // Getters utilitaires
  getCurrentAnalysisResult: () => SimplifiedAnalysisResult | null;
  getWorkflowStatus: () => WorkflowStatus;
  getSharedBusinessRoleProps: () => SharedBusinessRoleProps;
}

// Props partagées pour les composants Business Role
export interface SharedBusinessRoleProps {
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  includeFrequency: boolean;
  simpleRoleFilter: string;
  showZeroCoverageRoles: Map<string, boolean>;
  onRoleSelectionChange: (businessRole: string, selectedRoles: Set<string>) => void;
  onToggleZeroCoverageRoles: (businessRole: string) => void;
  getSelectedRoles: (businessRole: string) => Set<string>;
  staticScoresCache: Map<string, {
    sizeScore: number;
    usageFrequency: number;
    totalRoleTransactions: number;
    originalCoveredCount: number;
    simpleRoleExecutions: number;
    totalBusinessRoleExecutions: number;
  }>;
  transactionDetailsCache: Map<string, {
    covered: string[];
    nonUtilisees: string[];
    nonCouvertes: string[];
    orphelines: string[];
    total: number;
  }>;
  businessRoleTransactions: any[];
  simpleRoleTransactions: any[];
  focusedBusinessRole: string | null;
  onFocusBusinessRole: (businessRole: string) => void;
  onExitFocus: () => void;
  onGlobalSelectionChange: (businessRole: string, selectedRoles: Set<string>) => void;
}

// Type pour le statut global du workflow
export interface WorkflowStatus {
  phase: 'idle' | 'uploading' | 'configuring' | 'ready' | 'exporting' | 'saving' | 'error';
  message: string;
  progress?: number;
  canProceed: boolean;
}

// Callbacks étendus pour les événements du workflow
export interface WorkflowCallbacks {
  onPhaseChange?: (phase: WorkflowStatus['phase']) => void;
  onAnalysisComplete?: (result: SimplifiedAnalysisResult) => void;
  onExportComplete?: (format: string, filename: string) => void;
  onSaveComplete?: (analysisId: string) => void;
  onError?: (error: string, context: string) => void;
  onSelectedRolesChange?: (roles: Map<string, Set<string>>) => void;
  onFocusChange?: (businessRole: string | null) => void;
}

// Configuration optionnelle pour initialiser le workflow
export interface WorkflowConfig {
  autoValidateConfiguration?: boolean;
  defaultExportFormat?: 'excel' | 'pdf' | 'csv' | 'json';
  enableAutoSave?: boolean;
  autoSaveInterval?: number; // en millisecondes
}

const defaultConfig: Required<WorkflowConfig> = {
  autoValidateConfiguration: true,
  defaultExportFormat: 'excel',
  enableAutoSave: false,
  autoSaveInterval: 5 * 60 * 1000, // 5 minutes
};

export const useAnalysisWorkflow = (
  callbacks?: WorkflowCallbacks,
  config: WorkflowConfig = {}
): AnalysisWorkflow => {
  const mergedConfig = { ...defaultConfig, ...config };
  
  // Callbacks pour synchroniser les sous-hooks
  const fileManagerCallbacks: FileManagerCallbacks = {
    onAnalysisResult: (result) => {
      if (result) {
        callbacks?.onAnalysisComplete?.(result);
        callbacks?.onPhaseChange?.('ready');
      }
    },
    onLoading: (loading) => {
      if (loading) {
        callbacks?.onPhaseChange?.('uploading');
      }
    },
    onError: (error) => {
      if (error) {
        callbacks?.onError?.(error, 'file-manager');
        callbacks?.onPhaseChange?.('error');
      }
    },
  };
  
  const configurationCallbacks: ConfigurationCallbacks = {
    onConfigurationValid: (isValid) => {
      if (isValid && fileManager.state.analysisResult) {
        callbacks?.onPhaseChange?.('ready');
      } else {
        callbacks?.onPhaseChange?.('configuring');
      }
    },
  };
  
  const exportCallbacks: ExportCallbacks = {
    onExportStart: () => {
      callbacks?.onPhaseChange?.('exporting');
    },
    onExportComplete: (format, filename) => {
      callbacks?.onExportComplete?.(format, filename);
      callbacks?.onPhaseChange?.('ready');
    },
    onExportError: (error) => {
      callbacks?.onError?.(error, 'export');
      callbacks?.onPhaseChange?.('error');
    },
    onSaveComplete: (analysisId) => {
      callbacks?.onSaveComplete?.(analysisId);
      callbacks?.onPhaseChange?.('ready');
    },
    onSaveError: (error) => {
      callbacks?.onError?.(error, 'save');
      callbacks?.onPhaseChange?.('error');
    },
  };
  
  const cacheCallbacks: AnalysisCacheCallbacks = {
    onCacheUpdated: () => {
      // Cache mis à jour
    },
  };
  
  // 🔒 STABILISÉ : Mémoriser les callbacks stables pour les sous-hooks
  const memoizedCallbacks = useMemo(() => callbacks, [callbacks]);
  
  const selectionsCallbacks: AnalysisSelectionsCallbacks = useMemo(() => ({
    onSelectedRolesChange: (roles) => {
      memoizedCallbacks?.onSelectedRolesChange?.(roles);
    },
  }), [memoizedCallbacks]);
  
  const localStateCallbacks: WorkflowLocalCallbacks = useMemo(() => ({
    onFocusChange: (businessRole) => {
      memoizedCallbacks?.onFocusChange?.(businessRole);
    },
  }), [memoizedCallbacks]);
  
  // Initialisation des sous-hooks de traitement (cache d'abord pour qu'il soit disponible)
  const cache = useAnalysisCache(cacheCallbacks);
  
  // Initialisation des sous-hooks de données (avec cache intégré)
  const fileManager = useAnalysisFileManager(fileManagerCallbacks, cache); // 🚀 OPTIMISATION
  const configuration = useAnalysisConfiguration(configurationCallbacks);
  const exportManager = useAnalysisExport(exportCallbacks);
  
  const selections = useAnalysisSelections({
    analysisResult: fileManager.state.analysisResult,
  }, selectionsCallbacks);
  
  const localState = useWorkflowLocalState(localStateCallbacks);
  
  // 🚀 HOOK POUR DONNÉES STATIQUES (calculées une seule fois au chargement du fichier)
  const staticData = useStaticAnalysisData(fileManager.state.analysisResult);

  const calculations = useAnalysisCalculations({
    analysisResult: fileManager.state.analysisResult,
    businessRoleFilter: localState.state.businessRoleFilter,
    focusedBusinessRole: localState.state.focusedBusinessRole,
    currentBusinessRolePage: localState.state.currentBusinessRolePage,
    businessRolesPerPage: localState.state.businessRolesPerPage,
  });
  
  // États dérivés
  const hasAnalysisResult = !!fileManager.state.analysisResult;
  const isConfigurationValid = configuration.state.isValid;
  const isNotLoading = !fileManager.state.loading && !exportManager.state.exporting && !exportManager.state.saving;
  
  const isReady = hasAnalysisResult && isConfigurationValid && isNotLoading;
  const canExport = hasAnalysisResult && isNotLoading;
  const canSave = hasAnalysisResult && isNotLoading;
  
  // LOG: Initialisation du hook useAnalysisWorkflow
  console.log('[PERF] INIT useAnalysisWorkflow');

  // LOG: fileManager.state.analysisResult
  console.log('[PERF] fileManager.state.analysisResult', fileManager.state.analysisResult);

  // Reset des sous-hooks quand l'analyse change
  useEffect(() => {
    console.log('[PERF][useEffect] RESET localState/cache', {
      analysisResult: fileManager.state.analysisResult,
      // On ne log plus localState.actions ni cache car ils sont stables
    });
    if (fileManager.state.analysisResult) {
      localState.actions.resetLocalState();
      cache.precomputeCache();
    }
  }, [fileManager.state.analysisResult]);
  
  // LOG: tous les changements de state principaux
  useEffect(() => {
    console.log('[PERF][useEffect] localState.state', localState.state);
  }, [localState.state]);

  useEffect(() => {
    console.log('[PERF][useEffect] cache', cache);
  }, [cache]);

  useEffect(() => {
    console.log('[PERF][useEffect] fileManager.state', fileManager.state);
  }, [fileManager.state]);
  
  // Getter pour props partagées des composants
  const getSharedBusinessRoleProps = useCallback((): SharedBusinessRoleProps => {
    return {
      coverageWeight: configuration.state.coverageWeight,
      sizeWeight: configuration.state.sizeWeight,
      usageWeight: configuration.state.usageWeight,
      includeFrequency: configuration.state.includeFrequency,
      simpleRoleFilter: localState.state.simpleRoleFilter,
      showZeroCoverageRoles: localState.state.showZeroCoverageRoles,
      onRoleSelectionChange: selections.handleSelectionChange,
      onToggleZeroCoverageRoles: localState.actions.handleToggleZeroCoverageRoles,
      getSelectedRoles: selections.getSelectedRolesForBusinessRole,
      staticScoresCache: staticData.staticScoresCache, // 🚀 UTILISER LES DONNÉES STATIQUES
      transactionDetailsCache: staticData.transactionDetailsCache, // 🚀 UTILISER LES DONNÉES STATIQUES
      businessRoleTransactions: fileManager.state.analysisResult?.businessRoleTransactions || [],
      simpleRoleTransactions: fileManager.state.analysisResult?.simpleRoleTransactions || [],
      focusedBusinessRole: localState.state.focusedBusinessRole,
      onFocusBusinessRole: localState.actions.handleFocusBusinessRole,
      onExitFocus: localState.actions.handleExitFocus,
      onGlobalSelectionChange: selections.handleSelectionChange,
    };
  }, [
    configuration.state,
    localState.state,
    localState.actions,
    selections.handleSelectionChange,
    selections.getSelectedRolesForBusinessRole,
    staticData.staticScoresCache, // 🚀 DÉPENDANCE STATIQUE
    staticData.transactionDetailsCache, // 🚀 DÉPENDANCE STATIQUE
    fileManager.state.analysisResult
  ]);
  
  // Action de haut niveau : Démarrer une nouvelle analyse
  const startNewAnalysis = useCallback(async (file: File) => {
    // Reset du workflow
    fileManager.actions.handleReset();
    configuration.actions.resetConfiguration();
    exportManager.actions.resetExportState();
    cache.clearCache();
    selections.clearAllSelections();
    localState.actions.resetLocalState();
    
    // Démarrer l'upload
    await fileManager.actions.handleFileUpload(file);
  }, [
    fileManager.actions, 
    configuration.actions, 
    exportManager.actions, 
    cache, 
    selections, 
    localState.actions
  ]);
  
  // Action de haut niveau : Sauvegarder l'analyse actuelle
  const saveCurrentAnalysis = useCallback(async () => {
    const analysisResult = fileManager.state.analysisResult;
    if (!analysisResult) {
      callbacks?.onError?.('Aucune analyse à sauvegarder', 'save');
      return;
    }
    
    const metadata = {
      name: configuration.state.analysisName || `Analyse ${new Date().toLocaleDateString()}`,
      description: configuration.state.analysisDescription || 'Analyse automatique',
    };
    
    callbacks?.onPhaseChange?.('saving');
    await exportManager.actions.handleSaveAnalysis(analysisResult, metadata);
  }, [fileManager.state.analysisResult, configuration.state, exportManager.actions, callbacks]);
  
  // Action de haut niveau : Exporter l'analyse actuelle
  const exportCurrentAnalysis = useCallback(async (format = mergedConfig.defaultExportFormat) => {
    const analysisResult = fileManager.state.analysisResult;
    if (!analysisResult) {
      callbacks?.onError?.('Aucune analyse à exporter', 'export');
      return;
    }
    
    const exportConfig = {
      format,
      includeCharts: exportManager.state.includeCharts,
      includeRawData: exportManager.state.includeRawData,
      includeMetadata: exportManager.state.includeMetadata,
      filename: `${configuration.state.analysisName || 'analyse'}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : format}`,
    };
    
    switch (format) {
      case 'excel':
        await exportManager.actions.handleExportExcel(analysisResult, exportConfig);
        break;
      case 'pdf':
        await exportManager.actions.handleExportPdf(analysisResult, exportConfig);
        break;
      case 'csv':
        await exportManager.actions.handleExportCsv(analysisResult, exportConfig);
        break;
      case 'json':
        await exportManager.actions.handleExportJson(analysisResult, exportConfig);
        break;
      default:
        callbacks?.onError?.(`Format d'export non supporté: ${format}`, 'export');
    }
  }, [
    fileManager.state.analysisResult, 
    configuration.state.analysisName,
    exportManager.state,
    exportManager.actions, 
    mergedConfig.defaultExportFormat,
    callbacks
  ]);
  
  // Action de haut niveau : Reset complet du workflow
  const resetWorkflow = useCallback(() => {
    fileManager.actions.handleReset();
    configuration.actions.resetConfiguration();
    exportManager.actions.resetExportState();
    cache.clearCache();
    selections.clearAllSelections();
    localState.actions.resetLocalState();
    callbacks?.onPhaseChange?.('idle');
  }, [
    fileManager.actions, 
    configuration.actions, 
    exportManager.actions, 
    cache, 
    selections, 
    localState.actions, 
    callbacks
  ]);
  
  // Getter : Résultat d'analyse actuel
  const getCurrentAnalysisResult = useCallback(() => {
    return fileManager.state.analysisResult;
  }, [fileManager.state.analysisResult]);
  
  // Getter : Statut global du workflow
  const getWorkflowStatus = useCallback((): WorkflowStatus => {
    if (fileManager.state.error || exportManager.state.exportError || exportManager.state.saveError) {
      return {
        phase: 'error',
        message: fileManager.state.error || exportManager.state.exportError || exportManager.state.saveError || 'Erreur inconnue',
        canProceed: false,
      };
    }
    
    if (fileManager.state.loading) {
      return {
        phase: 'uploading',
        message: fileManager.state.processingStep || 'Traitement en cours...',
        progress: fileManager.state.progress,
        canProceed: false,
      };
    }
    
    if (exportManager.state.exporting) {
      return {
        phase: 'exporting',
        message: exportManager.state.exportStep || 'Export en cours...',
        progress: exportManager.state.exportProgress,
        canProceed: false,
      };
    }
    
    if (exportManager.state.saving) {
      return {
        phase: 'saving',
        message: 'Sauvegarde en cours...',
        canProceed: false,
      };
    }
    
    if (hasAnalysisResult && !isConfigurationValid) {
      return {
        phase: 'configuring',
        message: 'Configuration requise',
        canProceed: false,
      };
    }
    
    if (isReady) {
      return {
        phase: 'ready',
        message: 'Prêt pour export ou sauvegarde',
        canProceed: true,
      };
    }
    
    return {
      phase: 'idle',
      message: 'En attente d\'un fichier',
      canProceed: false,
    };
  }, [
    fileManager.state,
    exportManager.state,
    hasAnalysisResult,
    isConfigurationValid,
    isReady
  ]);
  
  // Auto-validation de la configuration si activée
  useEffect(() => {
    // On ne valide automatiquement QUE lors du premier chargement d'une analyse
    if (mergedConfig.autoValidateConfiguration && hasAnalysisResult) {
      console.log('[PERF][useEffect] AUTO-VALIDATION configuration (une seule fois au chargement)');
      configuration.actions.validateConfiguration();
    }
    // eslint-disable-next-line
    // On ne met PAS configuration.actions ni configuration.state dans les dépendances pour éviter la boucle infinie
    // On ne met PAS hasAnalysisResult dans les dépendances pour éviter la boucle infinie
  }, [mergedConfig.autoValidateConfiguration, fileManager.state.analysisResult]);
  
  // Auto-sauvegarde si activée
  useEffect(() => {
    if (!mergedConfig.enableAutoSave || !hasAnalysisResult || !isConfigurationValid) {
      return;
    }
    
    const interval = setInterval(() => {
      if (fileManager.state.analysisResult) {
        exportManager.actions.handleQuickSave(fileManager.state.analysisResult);
      }
    }, mergedConfig.autoSaveInterval);
    
    return () => clearInterval(interval);
  }, [
    mergedConfig.enableAutoSave,
    mergedConfig.autoSaveInterval,
    hasAnalysisResult,
    isConfigurationValid,
    fileManager.state.analysisResult,
    exportManager.actions
  ]);
  
  // LOG: tous les callbacks principaux
  const logCallback = (name: string) => (...args: any[]) => {
    console.log(`[PERF][CALLBACK] ${name}`, ...args);
  };
  
  return {
    // Sous-hooks de données
    fileManager,
    configuration,
    exportManager,
    
    // Sous-hooks de traitement
    cache,
    calculations,
    selections,
    localState,
    staticData, // 🚀 DONNÉES STATIQUES
    
    // États dérivés
    isReady,
    hasAnalysisResult,
    canExport,
    canSave,
    
    // Actions de haut niveau
    startNewAnalysis,
    saveCurrentAnalysis,
    exportCurrentAnalysis,
    resetWorkflow,
    getCurrentAnalysisResult,
    getWorkflowStatus,
    getSharedBusinessRoleProps,
  };
};