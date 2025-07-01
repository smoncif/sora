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
import { reconstructSelectedRoles } from 'lib/services/analysis/savedAnalysisService';

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
  saveCurrentAnalysis: (customMetadata?: { name?: string; description?: string }) => Promise<void>;
  exportCurrentAnalysis: (format?: 'excel' | 'pdf' | 'csv' | 'json') => Promise<void>;
  resetWorkflow: () => void;
  loadSavedAnalysis: (analysisId: string) => Promise<void>;
  
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
  userId?: string; // Pour les fonctions nécessitant l'authentification
}

// Configuration par défaut
const defaultConfig: Required<Omit<WorkflowConfig, 'userId'>> & Pick<WorkflowConfig, 'userId'> = {
  autoValidateConfiguration: true,
  defaultExportFormat: 'excel',
  enableAutoSave: false,
  autoSaveInterval: 30000,
  userId: undefined,
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
  const configuration = useAnalysisConfiguration(
    configurationCallbacks, 
    undefined, 
    { analysisResult: fileManager.state.analysisResult } // 🚀 PASSAGE de l'analysisResult pour la restauration
  );
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

  // Reset des sous-hooks quand l'analyse change
  useEffect(() => {
    if (fileManager.state.analysisResult) {
      localState.actions.resetLocalState();
      cache.precomputeCache();
    }
  }, [fileManager.state.analysisResult]);
  
  // 🚀 NOUVEAU : Restaurer les sélections depuis une analyse chargée
  useEffect(() => {
    const analysisResult = fileManager.state.analysisResult;
    
    // Vérifier si l'analyse contient des sélections utilisateur à restaurer
    if (analysisResult && analysisResult.userSelections && Object.keys(analysisResult.userSelections).length > 0) {
      // Restaurer les sélections utilisateur dans le hook selections
      const selectedRolesMap = reconstructSelectedRoles(analysisResult);
      selections.synchronizeSelectedRoles(selectedRolesMap);
      
      // ✅ SUPPRIMÉ : La synchronisation des flags isSelected est maintenant gérée lors du chargement
      // Plus besoin de modifier l'analyse ici car les flags sont déjà corrects
    }
    
    // Note: Les coefficients sont maintenant restaurés automatiquement par useAnalysisConfiguration
  }, [fileManager.state.analysisResult, selections]);
  
  // LOG: tous les changements de state principaux
  
  // 🚀 OPTIMISÉ : Getter pour props partagées des composants (focus géré par Context)
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
      onGlobalSelectionChange: selections.handleSelectionChange,
    };
  }, [
    configuration.state.coverageWeight,
    configuration.state.sizeWeight,
    configuration.state.usageWeight,
    configuration.state.includeFrequency,
    localState.state.simpleRoleFilter,
    localState.state.showZeroCoverageRoles,
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
  
  // 🚀 NOUVEAU : Détecter si c'est une analyse chargée (mise à jour vs nouvelle sauvegarde)
  const isLoadedAnalysis = fileManager.state.importType === 'saved' && fileManager.state.loadedAnalysisId;
  
  // Action de haut niveau : Sauvegarder l'analyse actuelle
  const saveCurrentAnalysis = useCallback(async (customMetadata?: { name?: string; description?: string }) => {
    const actionType = isLoadedAnalysis ? 'mise à jour' : 'sauvegarde';
    
    const analysisResult = fileManager.state.analysisResult;
    if (!analysisResult) {
      console.error(`❌ Aucune analyse à ${actionType === 'mise à jour' ? 'mettre à jour' : 'sauvegarder'}`);
      callbacks?.onError?.(`Aucune analyse à ${actionType === 'mise à jour' ? 'mettre à jour' : 'sauvegarder'}`, 'save');
      return;
    }
    
    // 🚀 STABILISÉ : Récupérer les données actuelles directement (pas de dépendances sur state)
    const currentSelections = selections.state.selectedRoles;
    const currentConfig = configuration.state;
    
    // Utiliser les métadonnées personnalisées si fournies, sinon utiliser la configuration
    const metadata = {
      name: customMetadata?.name || currentConfig.analysisName || `Analyse ${new Date().toLocaleDateString()}`,
      description: customMetadata?.description || currentConfig.analysisDescription || 'Analyse automatique',
      createdBy: mergedConfig.userId,
    };
    
    // 🚀 NOUVEAU : Enrichir l'analysisResult avec les données ACTUELLES avant la sauvegarde
    const enrichedAnalysisResult = {
      ...analysisResult,
      // Convertir les sélections actuelles en format sérialisable
      userSelections: Object.fromEntries(
        Array.from(currentSelections.entries()).map(([businessRole, simpleRoles]) => [
          businessRole,
          Array.from(simpleRoles)
        ])
      ),
      // Mettre à jour les paramètres avec les coefficients actuels
      analysisParams: {
        ...analysisResult.analysisParams,
        coverageWeight: currentConfig.coverageWeight,
        sizeWeight: currentConfig.sizeWeight,
        usageWeight: currentConfig.usageWeight,
      }
    };
    
    // 🚀 NOUVEAU : Utiliser la bonne fonction selon le contexte
    try {
      if (isLoadedAnalysis && fileManager.state.loadedAnalysisId) {
        // Mise à jour d'une analyse existante
        await exportManager.actions.handleUpdateAnalysis(
          fileManager.state.loadedAnalysisId,
          enrichedAnalysisResult, 
          metadata
        );
      } else {
        // Nouvelle sauvegarde
        await exportManager.actions.handleSaveAnalysis(enrichedAnalysisResult, metadata);
      }
    } catch (error) {
      console.error(`[WORKFLOW] ❌ Erreur lors de la ${actionType}:`, error);
      throw error;
    }
  }, [
    fileManager.state.analysisResult, // Seule dépendance stable
    fileManager.state.loadedAnalysisId, // Pour déterminer si c'est une mise à jour
    fileManager.state.importType, // Pour déterminer si c'est une analyse chargée
    isLoadedAnalysis, // État dérivé
    exportManager.actions, // Actions stables
    callbacks,
    mergedConfig.userId
  ]); // ✅ CORRIGÉ : Inclure les dépendances nécessaires pour la détection de mise à jour
  
  // Action de haut niveau : Exporter l'analyse actuelle
  const exportCurrentAnalysis = useCallback(async (format = mergedConfig.defaultExportFormat) => {
    const analysisResult = fileManager.state.analysisResult;
    if (!analysisResult) {
      callbacks?.onError?.('Aucune analyse à exporter', 'export');
      return;
    }
    

    
    // 🚀 NOUVEAU : Enrichir l'analysisResult avec les données ACTUELLES avant l'export
    const enrichedAnalysisResult = {
      ...analysisResult,
      // Convertir les sélections actuelles en format sérialisable
      userSelections: Object.fromEntries(
        Array.from(selections.state.selectedRoles.entries()).map(([businessRole, simpleRoles]) => [
          businessRole,
          Array.from(simpleRoles)
        ])
      ),
      // Mettre à jour les paramètres avec les coefficients actuels
      analysisParams: {
        ...analysisResult.analysisParams,
        coverageWeight: configuration.state.coverageWeight,
        sizeWeight: configuration.state.sizeWeight,
        usageWeight: configuration.state.usageWeight,
      }
    };
    
    const exportConfig = {
      format,
      includeCharts: exportManager.state.includeCharts,
      includeRawData: exportManager.state.includeRawData,
      includeMetadata: exportManager.state.includeMetadata,
      filename: `${configuration.state.analysisName || 'analyse'}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : format}`,
    };
    
    switch (format) {
      case 'excel':
        await exportManager.actions.handleExportExcel(enrichedAnalysisResult, exportConfig);
        break;
      case 'pdf':
        await exportManager.actions.handleExportPdf(enrichedAnalysisResult, exportConfig);
        break;
      case 'csv':
        await exportManager.actions.handleExportCsv(enrichedAnalysisResult, exportConfig);
        break;
      case 'json':
        await exportManager.actions.handleExportJson(enrichedAnalysisResult, exportConfig);
        break;
      default:
        callbacks?.onError?.(`Format d'export non supporté: ${format}`, 'export');
    }
  }, [
    fileManager.state.analysisResult, 
    selections.state.selectedRoles,
    configuration.state.coverageWeight,
    configuration.state.sizeWeight,
    configuration.state.usageWeight,
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
  
  // Wrapper pour le chargement d'analyse sauvegardée avec userId automatique
  const loadSavedAnalysisWithUser = useCallback(async (analysisId: string) => {
    if (!mergedConfig.userId) {
      throw new Error('Utilisateur non authentifié. Impossible de charger l\'analyse.');
    }
    return fileManager.actions.handleLoadSavedAnalysis(analysisId, mergedConfig.userId);
  }, [fileManager.actions, mergedConfig.userId]);
  
  return {
    fileManager,
    configuration,
    exportManager,
    cache,
    calculations,
    selections,
    localState,
    staticData,
    isReady,
    hasAnalysisResult,
    canExport,
    canSave,
    startNewAnalysis,
    saveCurrentAnalysis,
    exportCurrentAnalysis,
    resetWorkflow,
    loadSavedAnalysis: loadSavedAnalysisWithUser, // 🚀 NOUVEAU wrapper avec userId
    getCurrentAnalysisResult,
    getWorkflowStatus,
    getSharedBusinessRoleProps,
  };
};