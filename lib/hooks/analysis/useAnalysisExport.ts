import { useState, useCallback } from 'react';
import { useAuth } from 'lib/hooks/useAuth';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';
import { exportAnalysisToExcel } from 'lib/services/analysis/exportAnalysisService';

// Types pour la gestion des exports
export interface ExportState {
  // États d'export
  exporting: boolean;
  exportError: string | null;
  exportProgress: number;
  exportStep: string;
  
  // Configuration d'export
  exportFormat: 'excel' | 'pdf' | 'csv' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  includeMetadata: boolean;
  
  // États de sauvegarde
  saving: boolean;
  saveError: string | null;
  saveDialogOpen: boolean;
  lastSavedAt: Date | null;
}

export interface ExportActions {
  // Actions d'export
  handleExportExcel: (analysisResult: SimplifiedAnalysisResult, config?: ExportConfiguration) => Promise<void>;
  handleExportPdf: (analysisResult: SimplifiedAnalysisResult, config?: ExportConfiguration) => Promise<void>;
  handleExportCsv: (analysisResult: SimplifiedAnalysisResult, config?: ExportConfiguration) => Promise<void>;
  handleExportJson: (analysisResult: SimplifiedAnalysisResult, config?: ExportConfiguration) => Promise<void>;
  
  // Actions de sauvegarde
  handleSaveAnalysis: (analysisResult: SimplifiedAnalysisResult, metadata: AnalysisMetadata) => Promise<void>;
  handleQuickSave: (analysisResult: SimplifiedAnalysisResult) => Promise<void>;
  
  // Configuration d'export
  setExportFormat: (format: 'excel' | 'pdf' | 'csv' | 'json') => void;
  setIncludeCharts: (include: boolean) => void;
  setIncludeRawData: (include: boolean) => void;
  setIncludeMetadata: (include: boolean) => void;
  
  // Gestion des dialogs
  setSaveDialogOpen: (open: boolean) => void;
  
  // Gestion des états
  setExporting: (exporting: boolean) => void;
  setExportError: (error: string | null) => void;
  setExportProgress: (progress: number) => void;
  setExportStep: (step: string) => void;
  setSaving: (saving: boolean) => void;
  setSaveError: (error: string | null) => void;
  
  // Actions utilitaires
  resetExportState: () => void;
  getExportConfiguration: () => ExportConfiguration;
}

export interface AnalysisExport {
  state: ExportState;
  actions: ExportActions;
}

// Types pour la configuration d'export
export interface ExportConfiguration {
  format: 'excel' | 'pdf' | 'csv' | 'json';
  includeCharts: boolean;
  includeRawData: boolean;
  includeMetadata: boolean;
  filename?: string;
}

// Types pour les métadonnées de sauvegarde
export interface AnalysisMetadata {
  name: string;
  description: string;
  createdBy?: string;
  tags?: string[];
}

// Callbacks optionnels pour les événements
export interface ExportCallbacks {
  onExportStart?: (format: string) => void;
  onExportComplete?: (format: string, filename: string) => void;
  onExportError?: (error: string) => void;
  onSaveComplete?: (analysisId: string) => void;
  onSaveError?: (error: string) => void;
}

const initialState: ExportState = {
  exporting: false,
  exportError: null,
  exportProgress: 0,
  exportStep: '',
  exportFormat: 'excel',
  includeCharts: true,
  includeRawData: false,
  includeMetadata: true,
  saving: false,
  saveError: null,
  saveDialogOpen: false,
  lastSavedAt: null,
};

export const useAnalysisExport = (
  callbacks?: ExportCallbacks
): AnalysisExport => {
  const { user } = useAuth();
  const [state, setState] = useState<ExportState>(initialState);
  
  // Helper pour mise à jour d'état
  const updateState = useCallback((updates: Partial<ExportState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Setters d'état avec callbacks
  const setExporting = useCallback((exporting: boolean) => {
    updateState({ exporting });
  }, [updateState]);
  
  const setExportError = useCallback((error: string | null) => {
    updateState({ exportError: error });
    if (error) {
      callbacks?.onExportError?.(error);
    }
  }, [updateState, callbacks]);
  
  const setExportProgress = useCallback((progress: number) => {
    updateState({ exportProgress: progress });
  }, [updateState]);
  
  const setExportStep = useCallback((step: string) => {
    updateState({ exportStep: step });
  }, [updateState]);
  
  const setSaving = useCallback((saving: boolean) => {
    updateState({ saving });
  }, [updateState]);
  
  const setSaveError = useCallback((error: string | null) => {
    updateState({ saveError: error });
    if (error) {
      callbacks?.onSaveError?.(error);
    }
  }, [updateState, callbacks]);
  
  const setSaveDialogOpen = useCallback((open: boolean) => {
    updateState({ saveDialogOpen: open });
  }, [updateState]);
  
  // Configuration d'export
  const setExportFormat = useCallback((format: 'excel' | 'pdf' | 'csv' | 'json') => {
    updateState({ exportFormat: format });
  }, [updateState]);
  
  const setIncludeCharts = useCallback((include: boolean) => {
    updateState({ includeCharts: include });
  }, [updateState]);
  
  const setIncludeRawData = useCallback((include: boolean) => {
    updateState({ includeRawData: include });
  }, [updateState]);
  
  const setIncludeMetadata = useCallback((include: boolean) => {
    updateState({ includeMetadata: include });
  }, [updateState]);
  
  // Utilitaire pour générer un nom de fichier
  const generateFilename = useCallback((analysisResult: SimplifiedAnalysisResult, format: string) => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const baseName = analysisResult.metadata?.name || 'analyse-roles';
    return `${baseName}_${dateStr}_${timeStr}.${format}`;
  }, []);
  
  // Action principale : Export Excel
  const handleExportExcel = useCallback(async (
    analysisResult: SimplifiedAnalysisResult, 
    customConfig?: ExportConfiguration
  ) => {
    const config = customConfig || {
      format: state.exportFormat,
      includeCharts: state.includeCharts,
      includeRawData: state.includeRawData,
      includeMetadata: state.includeMetadata,
    };
    
    setExporting(true);
    setExportError(null);
    setExportProgress(0);
    setExportStep('Préparation de l\'export Excel...');
    
    try {
      callbacks?.onExportStart?.('excel');
      
      setExportProgress(20);
      setExportStep('Génération du fichier Excel...');
      
      const filename = config.filename || generateFilename(analysisResult, 'xlsx');
      
      setExportProgress(50);
      setExportStep('Traitement des données...');
      
      await exportAnalysisToExcel(analysisResult, {
        filename,
        includeCharts: config.includeCharts,
        includeRawData: config.includeRawData,
        includeMetadata: config.includeMetadata,
      });
      
      setExportProgress(90);
      setExportStep('Finalisation...');
      
      setExportProgress(100);
      setExportStep('Export terminé !');
      
      callbacks?.onExportComplete?.('excel', filename);
      
      // Reset après succès
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
        setExportStep('');
      }, 1000);
      
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      setExportError(error instanceof Error ? error.message : 'Erreur lors de l\'export Excel');
      setExporting(false);
      setExportProgress(0);
      setExportStep('');
    }
  }, [
    state.exportFormat, 
    state.includeCharts, 
    state.includeRawData, 
    state.includeMetadata,
    setExporting, 
    setExportError, 
    setExportProgress, 
    setExportStep,
    generateFilename,
    callbacks
  ]);
  
  // Actions d'export pour autres formats (à implémenter)
  const handleExportPdf = useCallback(async (
    analysisResult: SimplifiedAnalysisResult, 
    customConfig?: ExportConfiguration
  ) => {
    // TODO: Implémenter l'export PDF
    console.log('Export PDF à implémenter', analysisResult, customConfig);
  }, []);
  
  const handleExportCsv = useCallback(async (
    analysisResult: SimplifiedAnalysisResult, 
    customConfig?: ExportConfiguration
  ) => {
    // TODO: Implémenter l'export CSV
    console.log('Export CSV à implémenter', analysisResult, customConfig);
  }, []);
  
  const handleExportJson = useCallback(async (
    analysisResult: SimplifiedAnalysisResult, 
    customConfig?: ExportConfiguration
  ) => {
    const config = customConfig || {
      format: 'json' as const,
      includeCharts: state.includeCharts,
      includeRawData: state.includeRawData,
      includeMetadata: state.includeMetadata,
    };
    
    try {
      callbacks?.onExportStart?.('json');
      
      const filename = config.filename || generateFilename(analysisResult, 'json');
      const dataToExport = {
        ...(config.includeMetadata && { metadata: analysisResult.metadata }),
        analysis: analysisResult,
        ...(config.includeRawData && { rawData: analysisResult.rawData }),
        exportedAt: new Date().toISOString(),
        exportedBy: user?.email,
      };
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      callbacks?.onExportComplete?.('json', filename);
      
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      setExportError(error instanceof Error ? error.message : 'Erreur lors de l\'export JSON');
    }
  }, [state.includeCharts, state.includeRawData, state.includeMetadata, generateFilename, user, callbacks, setExportError]);
  
  // Actions de sauvegarde
  const handleSaveAnalysis = useCallback(async (
    analysisResult: SimplifiedAnalysisResult, 
    metadata: AnalysisMetadata
  ) => {
    setSaving(true);
    setSaveError(null);
    
    try {
      // TODO: Implémenter la sauvegarde en base de données
      console.log('Sauvegarde à implémenter', analysisResult, metadata);
      
      updateState({ lastSavedAt: new Date() });
      callbacks?.onSaveComplete?.('temp-id');
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setSaveError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [setSaving, setSaveError, updateState, callbacks]);
  
  const handleQuickSave = useCallback(async (analysisResult: SimplifiedAnalysisResult) => {
    const metadata: AnalysisMetadata = {
      name: `Analyse rapide ${new Date().toLocaleDateString()}`,
      description: 'Sauvegarde automatique',
      createdBy: user?.email,
    };
    
    return handleSaveAnalysis(analysisResult, metadata);
  }, [user, handleSaveAnalysis]);
  
  // Actions utilitaires
  const resetExportState = useCallback(() => {
    setState(initialState);
  }, []);
  
  const getExportConfiguration = useCallback((): ExportConfiguration => {
    return {
      format: state.exportFormat,
      includeCharts: state.includeCharts,
      includeRawData: state.includeRawData,
      includeMetadata: state.includeMetadata,
    };
  }, [state]);
  
  // Actions groupées
  const actions: ExportActions = {
    handleExportExcel,
    handleExportPdf,
    handleExportCsv,
    handleExportJson,
    handleSaveAnalysis,
    handleQuickSave,
    setExportFormat,
    setIncludeCharts,
    setIncludeRawData,
    setIncludeMetadata,
    setSaveDialogOpen,
    setExporting,
    setExportError,
    setExportProgress,
    setExportStep,
    setSaving,
    setSaveError,
    resetExportState,
    getExportConfiguration,
  };
  
  return {
    state,
    actions,
  };
}; 