import { useState, useCallback } from 'react';

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

// Configuration par défaut
const defaultConfiguration: AnalysisConfigurationState = {
  analysisName: '',
  analysisDescription: '',
  coverageWeight: 40,
  sizeWeight: 30,
  usageWeight: 30,
  includeFrequency: true,
  isValid: false,
  validationErrors: [],
};

export const useAnalysisConfiguration = (
  callbacks?: ConfigurationCallbacks,
  initialConfig?: Partial<AnalysisConfigurationState>
): AnalysisConfiguration => {
  const [state, setState] = useState<AnalysisConfigurationState>({
    ...defaultConfiguration,
    ...initialConfig,
  });
  
  // Helper pour mise à jour d'état
  const updateState = useCallback((updates: Partial<AnalysisConfigurationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Validation de la configuration
  const validateConfiguration = useCallback(() => {
    const errors: string[] = [];
    
    // Validation du nom d'analyse
    if (!state.analysisName.trim()) {
      errors.push('Le nom de l\'analyse est requis');
    } else if (state.analysisName.length < 3) {
      errors.push('Le nom de l\'analyse doit contenir au moins 3 caractères');
    }
    
    // Validation des poids (doivent totaliser 100%)
    const totalWeight = state.coverageWeight + state.sizeWeight + state.usageWeight;
    if (Math.abs(totalWeight - 100) > 0.1) {
      errors.push(`Les poids doivent totaliser 100% (actuellement ${totalWeight}%)`);
    }
    
    // Validation des valeurs individuelles des poids
    if (state.coverageWeight < 0 || state.coverageWeight > 100) {
      errors.push('Le poids de couverture doit être entre 0 et 100%');
    }
    if (state.sizeWeight < 0 || state.sizeWeight > 100) {
      errors.push('Le poids de taille doit être entre 0 et 100%');
    }
    if (state.usageWeight < 0 || state.usageWeight > 100) {
      errors.push('Le poids d\'usage doit être entre 0 et 100%');
    }
    
    const isValid = errors.length === 0;
    
    updateState({ 
      isValid, 
      validationErrors: errors 
    });
    
    callbacks?.onConfigurationValid?.(isValid);
    callbacks?.onValidationErrors?.(errors);
    
    return isValid;
  }, [state, updateState, callbacks]);
  
  // Actions de métadonnées
  const setAnalysisName = useCallback((name: string) => {
    updateState({ analysisName: name });
    callbacks?.onAnalysisName?.(name);
    // Re-validation après changement
    setTimeout(validateConfiguration, 0);
  }, [updateState, callbacks, validateConfiguration]);
  
  const setAnalysisDescription = useCallback((description: string) => {
    updateState({ analysisDescription: description });
    callbacks?.onAnalysisDescription?.(description);
  }, [updateState, callbacks]);
  
  // Actions de configuration des poids avec validation automatique
  const setCoverageWeight = useCallback((weight: number) => {
    const newWeight = Math.max(0, Math.min(100, weight));
    updateState({ coverageWeight: newWeight });
    
    const weights = { 
      coverageWeight: newWeight, 
      sizeWeight: state.sizeWeight, 
      usageWeight: state.usageWeight 
    };
    callbacks?.onWeights?.(weights);
    
    // Re-validation après changement
    setTimeout(validateConfiguration, 0);
  }, [updateState, callbacks, state.sizeWeight, state.usageWeight, validateConfiguration]);
  
  const setSizeWeight = useCallback((weight: number) => {
    const newWeight = Math.max(0, Math.min(100, weight));
    updateState({ sizeWeight: newWeight });
    
    const weights = { 
      coverageWeight: state.coverageWeight, 
      sizeWeight: newWeight, 
      usageWeight: state.usageWeight 
    };
    callbacks?.onWeights?.(weights);
    
    // Re-validation après changement
    setTimeout(validateConfiguration, 0);
  }, [updateState, callbacks, state.coverageWeight, state.usageWeight, validateConfiguration]);
  
  const setUsageWeight = useCallback((weight: number) => {
    const newWeight = Math.max(0, Math.min(100, weight));
    updateState({ usageWeight: newWeight });
    
    const weights = { 
      coverageWeight: state.coverageWeight, 
      sizeWeight: state.sizeWeight, 
      usageWeight: newWeight 
    };
    callbacks?.onWeights?.(weights);
    
    // Re-validation après changement
    setTimeout(validateConfiguration, 0);
  }, [updateState, callbacks, state.coverageWeight, state.sizeWeight, validateConfiguration]);
  
  const setIncludeFrequency = useCallback((include: boolean) => {
    updateState({ includeFrequency: include });
  }, [updateState]);
  
  // Action pour définir tous les poids en une fois
  const setWeights = useCallback((weights: { coverageWeight: number; sizeWeight: number; usageWeight: number }) => {
    const { coverageWeight, sizeWeight, usageWeight } = weights;
    
    updateState({
      coverageWeight: Math.max(0, Math.min(100, coverageWeight)),
      sizeWeight: Math.max(0, Math.min(100, sizeWeight)),
      usageWeight: Math.max(0, Math.min(100, usageWeight)),
    });
    
    callbacks?.onWeights?.(weights);
    
    // Re-validation après changement
    setTimeout(validateConfiguration, 0);
  }, [updateState, callbacks, validateConfiguration]);
  
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
    updateState(config);
    
    // Notifier les callbacks des changements
    if (config.analysisName !== undefined) {
      callbacks?.onAnalysisName?.(config.analysisName);
    }
    if (config.analysisDescription !== undefined) {
      callbacks?.onAnalysisDescription?.(config.analysisDescription);
    }
    if (config.coverageWeight !== undefined || config.sizeWeight !== undefined || config.usageWeight !== undefined) {
      callbacks?.onWeights?.({
        coverageWeight: config.coverageWeight ?? state.coverageWeight,
        sizeWeight: config.sizeWeight ?? state.sizeWeight,
        usageWeight: config.usageWeight ?? state.usageWeight,
      });
    }
    
    // Re-validation après import
    setTimeout(validateConfiguration, 0);
  }, [updateState, callbacks, state, validateConfiguration]);
  
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