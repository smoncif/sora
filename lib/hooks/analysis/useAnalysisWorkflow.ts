import { useCallback } from 'react';
import { useAnalysisFileManager } from './useAnalysisFileManager';
import { useAnalysisConfiguration } from './useAnalysisConfiguration';
import { useAnalysisExport } from './useAnalysisExport';
import type { User } from 'lib/types/auth';

/**
 * Hook orchestrateur principal qui compose tous les hooks spécialisés d'analyse
 * 
 * Architecture modulaire :
 * - fileManager : Gestion des fichiers et traitement
 * - configuration : Configuration d'analyse et métadonnées  
 * - exportManager : Export multi-format et sauvegarde
 * - Actions orchestrées de haut niveau
 */
export const useAnalysisWorkflow = () => {
  // 🗂️ Hook spécialisé : Gestion des fichiers
  const fileManager = useAnalysisFileManager();
  
  // ⚙️ Hook spécialisé : Configuration d'analyse
  const configuration = useAnalysisConfiguration();
  
  // 📊 Hook spécialisé : Export et sauvegarde
  const exportManager = useAnalysisExport();

  // 🔄 Actions orchestrées de haut niveau
  
  /**
   * Sauvegarde l'analyse courante avec la configuration actuelle
   */
  const saveCurrentAnalysis = useCallback(async () => {
    if (!fileManager.state.analysisResult) {
      throw new Error('Aucune analyse à sauvegarder');
    }

    if (!configuration.state.analysisName.trim()) {
      throw new Error('Le nom de l\'analyse est requis');
    }

    return await exportManager.actions.handleSaveAnalysis(
      fileManager.state.analysisResult,
      {
        name: configuration.state.analysisName,
        description: configuration.state.analysisDescription,
      }
    );
  }, [
    fileManager.state.analysisResult,
    configuration.state.analysisName,
    configuration.state.analysisDescription,
    exportManager.actions.handleSaveAnalysis,
  ]);

  /**
   * Export de l'analyse courante dans le format spécifié
   */
  const exportCurrentAnalysis = useCallback(async (format: 'excel' | 'pdf' | 'csv' | 'json') => {
    if (!fileManager.state.analysisResult) {
      throw new Error('Aucune analyse à exporter');
    }

    switch (format) {
      case 'excel':
        return await exportManager.actions.handleExportExcel(
          fileManager.state.analysisResult,
          {
            format: 'excel',
            includeCharts: true,
            includeRawData: false,
            includeMetadata: true,
          }
        );
      case 'pdf':
        return await exportManager.actions.handleExportPdf(
          fileManager.state.analysisResult,
          {
            format: 'pdf',
            includeCharts: true,
            includeRawData: false,
            includeMetadata: true,
          }
        );
      case 'csv':
        return await exportManager.actions.handleExportCsv(
          fileManager.state.analysisResult,
          {
            format: 'csv',
            includeCharts: false,
            includeRawData: true,
            includeMetadata: false,
          }
        );
      case 'json':
        return await exportManager.actions.handleExportJson(
          fileManager.state.analysisResult,
          {
            format: 'json',
            includeCharts: false,
            includeRawData: true,
            includeMetadata: true,
          }
        );
      default:
        throw new Error(`Format d'export non supporté: ${format}`);
    }
  }, [
    fileManager.state.analysisResult,
    exportManager.actions.handleExportExcel,
    exportManager.actions.handleExportPdf,
    exportManager.actions.handleExportCsv,
    exportManager.actions.handleExportJson,
  ]);

  /**
   * Reset complet de tous les états
   */
  const resetAll = useCallback(() => {
    fileManager.actions.handleReset();
    configuration.actions.resetConfiguration();
    exportManager.actions.resetExportState();
  }, [
    fileManager.actions.handleReset,
    configuration.actions.resetConfiguration,
    exportManager.actions.resetExportState,
  ]);

  // 📊 États dérivés et calculés
  
  /**
   * Indique si une analyse est en cours
   */
  const isAnalyzing = fileManager.state.loading;
  
  /**
   * Indique si des résultats sont disponibles
   */
  const hasResults = Boolean(fileManager.state.analysisResult);
  
  /**
   * Indique si une exportation est en cours
   */
  const isExporting = exportManager.state.exporting;
  
  /**
   * Configuration complète pour les exports
   */
  const exportConfiguration = {
    coverageWeight: configuration.state.coverageWeight,
    sizeWeight: configuration.state.sizeWeight,
    usageWeight: configuration.state.usageWeight,
    includeFrequency: configuration.state.includeFrequency,
  };

  /**
   * Métadonnées d'analyse complètes
   */
  const analysisMetadata = {
    name: configuration.state.analysisName,
    description: configuration.state.analysisDescription,
    configuration: exportConfiguration,
    createdAt: new Date(),
  };

  return {
    // 🗂️ Hooks spécialisés
    fileManager,
    configuration,
    exportManager,
    
    // 🎯 Actions orchestrées
    saveCurrentAnalysis,
    exportCurrentAnalysis,
    resetAll,
    
    // 📊 États dérivés
    isAnalyzing,
    hasResults,
    isExporting,
    exportConfiguration,
    analysisMetadata,
  };
};

export default useAnalysisWorkflow; 