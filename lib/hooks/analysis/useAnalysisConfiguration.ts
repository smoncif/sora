import { useState, useCallback, useMemo, useEffect } from 'react';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

// Types pour la configuration de l'analyse
export interface AnalysisConfigurationState {
  // Métadonnées de l'analyse
  analysisName: string;
  analysisDescription: string;
  
  // Configuration des poids pour les calculs
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  includeFrequency: boolean;
  
  // États de validation
  isValid: boolean;
  validationErrors: string[];
}

export interface ConfigurationActions {
  // Actions de métadonnées
  setAnalysisName: (name: string) => void;
  setAnalysisDescription: (description: string) => void;
  
  // Actions de configuration des poids
  setCoverageWeight: (weight: number) => void;
  setSizeWeight: (weight: number) => void;
  setUsageWeight: (weight: number) => void;
  setIncludeFrequency: (include: boolean) => void;
  setWeights: (weights: { coverageWeight: number; sizeWeight: number; usageWeight: number }) => void;
  
  // Actions de validation
  validateConfiguration: () => boolean;
  resetConfiguration: () => void;
  
  // Actions utilitaires
  exportConfiguration: () => AnalysisConfigurationState;
  importConfiguration: (config: Partial<AnalysisConfigurationState>) => void;
}

export interface AnalysisConfiguration {
  state: AnalysisConfigurationState;
  actions: ConfigurationActions;
}

// Callbacks optionnels pour les événements
export interface ConfigurationCallbacks {
  onAnalysisName?: (name: string) => void;
  onAnalysisDescription?: (description: string) => void;
  onWeights?: (weights: { coverageWeight: number; sizeWeight: number; usageWeight: number }) => void;
  onConfigurationValid?: (isValid: boolean) => void;
  onValidationErrors?: (errors: string[]) => void;
}

export interface ConfigurationConfig {
  analysisResult?: SimplifiedAnalysisResult | null; // Pour la restauration automatique des paramètres
}

export const useAnalysisConfiguration = (
  callbacks?: ConfigurationCallbacks,
  initialConfig?: Partial<AnalysisConfigurationState>,
  config?: ConfigurationConfig
): AnalysisConfiguration => {
  
  // Configuration par défaut
  const defaultConfiguration: AnalysisConfigurationState = {
    analysisName: '',
    analysisDescription: '',
    coverageWeight: 50,
    sizeWeight: 50,
    usageWeight: 0,
    includeFrequency: true,
    isValid: false,
    validationErrors: ['Le nom de l\'analyse est requis'],
  };
  
  // Fusionner avec la configuration initiale si fournie
  const mergedInitialConfig = { ...defaultConfiguration, ...initialConfig };
  
  // État principal
  const [state, setState] = useState<AnalysisConfigurationState>(mergedInitialConfig);
  
  // 🚀 NOUVEAU : Restaurer automatiquement les coefficients depuis analysisResult
  useEffect(() => {
    if (config?.analysisResult?.analysisParams) {
      const { coverageWeight, sizeWeight, usageWeight } = config.analysisResult.analysisParams;
      
      if (coverageWeight !== undefined && sizeWeight !== undefined && usageWeight !== undefined) {
        setState(prev => ({
          ...prev,
          coverageWeight,
          sizeWeight,
          usageWeight,
        }));
        
        // Notifier les callbacks - utilisation directe pour éviter les dépendances cycliques
        setTimeout(() => {
          callbacks?.onWeights?.({ coverageWeight, sizeWeight, usageWeight });
        }, 0);
      }
    }
  }, [config?.analysisResult]); // ✅ CORRIGÉ : Retirer callbacks des dépendances pour éviter les boucles
  
  // Helper pour mise à jour d'état
  const updateState = useCallback((updates: Partial<AnalysisConfigurationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Validation de la configuration - CORRIGÉ pour éviter les boucles
  const validateConfiguration = useCallback(() => {
    setState(prevState => {
      const errors: string[] = [];
      
      // Validation du nom d'analyse
      if (!prevState.analysisName.trim()) {
        errors.push('Le nom de l\'analyse est requis');
      } else if (prevState.analysisName.length < 3) {
        errors.push('Le nom de l\'analyse doit contenir au moins 3 caractères');
      }
      
      // Validation des poids (doivent totaliser 100%)
      const totalWeight = prevState.coverageWeight + prevState.sizeWeight + prevState.usageWeight;
      if (Math.abs(totalWeight - 100) > 0.1) {
        errors.push(`Les poids doivent totaliser 100% (actuellement ${totalWeight}%)`);
      }
      
      // Validation des valeurs individuelles des poids
      if (prevState.coverageWeight < 0 || prevState.coverageWeight > 100) {
        errors.push('Le poids de couverture doit être entre 0 et 100%');
      }
      if (prevState.sizeWeight < 0 || prevState.sizeWeight > 100) {
        errors.push('Le poids de taille doit être entre 0 et 100%');
      }
      if (prevState.usageWeight < 0 || prevState.usageWeight > 100) {
        errors.push('Le poids d\'usage doit être entre 0 et 100%');
      }
      
      const isValid = errors.length === 0;
      
      // Callbacks asynchrones pour éviter les boucles
      setTimeout(() => {
        callbacks?.onConfigurationValid?.(isValid);
        callbacks?.onValidationErrors?.(errors);
      }, 0);
      
      return { 
        ...prevState,
        isValid, 
        validationErrors: errors 
      };
    });
    
    return true; // Retourner un boolean stable
  }, [callbacks]);
  
  // Actions de métadonnées
  const setAnalysisName = useCallback((name: string) => {
    setState(prev => ({ ...prev, analysisName: name }));
    callbacks?.onAnalysisName?.(name);
    // Re-validation asynchrone pour éviter les boucles
    setTimeout(validateConfiguration, 0);
  }, [callbacks, validateConfiguration]);
  
  const setAnalysisDescription = useCallback((description: string) => {
    updateState({ analysisDescription: description });
    callbacks?.onAnalysisDescription?.(description);
  }, [updateState, callbacks]);
  
  // Actions de configuration des poids avec validation automatique
  const setCoverageWeight = useCallback((weight: number) => {
    const newWeight = Math.max(0, Math.min(100, weight));
    
    setState(prev => {
      const weights = { 
        coverageWeight: newWeight, 
        sizeWeight: prev.sizeWeight, 
        usageWeight: prev.usageWeight 
      };
      callbacks?.onWeights?.(weights);
      
      return { ...prev, coverageWeight: newWeight };
    });
    
    // Re-validation asynchrone pour éviter les boucles
    setTimeout(validateConfiguration, 0);
  }, [callbacks, validateConfiguration]);
  
  const setSizeWeight = useCallback((weight: number) => {
    const newWeight = Math.max(0, Math.min(100, weight));
    
    setState(prev => {
      const weights = { 
        coverageWeight: prev.coverageWeight, 
        sizeWeight: newWeight, 
        usageWeight: prev.usageWeight 
      };
      callbacks?.onWeights?.(weights);
      
      return { ...prev, sizeWeight: newWeight };
    });
    
    // Re-validation asynchrone pour éviter les boucles
    setTimeout(validateConfiguration, 0);
  }, [callbacks, validateConfiguration]);
  
  const setUsageWeight = useCallback((weight: number) => {
    const newWeight = Math.max(0, Math.min(100, weight));
    
    setState(prev => {
      const weights = { 
        coverageWeight: prev.coverageWeight, 
        sizeWeight: prev.sizeWeight, 
        usageWeight: newWeight 
      };
      callbacks?.onWeights?.(weights);
      
      return { ...prev, usageWeight: newWeight };
    });
    
    // Re-validation asynchrone pour éviter les boucles
    setTimeout(validateConfiguration, 0);
  }, [callbacks, validateConfiguration]);
  
  const setIncludeFrequency = useCallback((include: boolean) => {
    updateState({ includeFrequency: include });
  }, [updateState]);
  
  // Action pour définir tous les poids en une fois
  const setWeights = useCallback((weights: { coverageWeight: number; sizeWeight: number; usageWeight: number }) => {
    const { coverageWeight, sizeWeight, usageWeight } = weights;
    
    setState(prev => ({
      ...prev,
      coverageWeight: Math.max(0, Math.min(100, coverageWeight)),
      sizeWeight: Math.max(0, Math.min(100, sizeWeight)),
      usageWeight: Math.max(0, Math.min(100, usageWeight)),
    }));
    
    callbacks?.onWeights?.(weights);
    
    // Re-validation asynchrone pour éviter les boucles
    setTimeout(validateConfiguration, 0);
  }, [callbacks, validateConfiguration]);
  
  // Action pour réinitialiser la configuration
  const resetConfiguration = useCallback(() => {
    setState(defaultConfiguration);
    callbacks?.onAnalysisName?.('');
    callbacks?.onAnalysisDescription?.('');
    callbacks?.onWeights?.({
      coverageWeight: defaultConfiguration.coverageWeight,
      sizeWeight: defaultConfiguration.sizeWeight,
      usageWeight: defaultConfiguration.usageWeight,
    });
    callbacks?.onConfigurationValid?.(false);
    callbacks?.onValidationErrors?.([]);
  }, [callbacks]);
  
  // Action pour exporter la configuration
  const exportConfiguration = useCallback(() => {
    return { ...state };
  }, [state]);
  
  // Action pour importer une configuration
  const importConfiguration = useCallback((config: Partial<AnalysisConfigurationState>) => {
    setState(prev => {
      const newState = { ...prev, ...config };
      
      // Notifier les callbacks des changements
      if (config.analysisName !== undefined) {
        callbacks?.onAnalysisName?.(config.analysisName);
      }
      if (config.analysisDescription !== undefined) {
        callbacks?.onAnalysisDescription?.(config.analysisDescription);
      }
      if (config.coverageWeight !== undefined || config.sizeWeight !== undefined || config.usageWeight !== undefined) {
        callbacks?.onWeights?.({
          coverageWeight: config.coverageWeight ?? prev.coverageWeight,
          sizeWeight: config.sizeWeight ?? prev.sizeWeight,
          usageWeight: config.usageWeight ?? prev.usageWeight,
        });
      }
      
      return newState;
    });
    
    // Re-validation asynchrone pour éviter les boucles
    setTimeout(validateConfiguration, 0);
  }, [callbacks, validateConfiguration]);
  
  // Actions groupées
  const actions: ConfigurationActions = {
    setAnalysisName,
    setAnalysisDescription,
    setCoverageWeight,
    setSizeWeight,
    setUsageWeight,
    setIncludeFrequency,
    setWeights,
    validateConfiguration,
    resetConfiguration,
    exportConfiguration,
    importConfiguration,
  };
  
  return {
    state,
    actions,
  };
}; 