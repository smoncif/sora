// 🚀 HOOKS REFACTORISÉS - Architecture simplifiée avec 2 hooks consolidés

// Hook de gestion des données et interface
export { useAnalysisDataManager } from './useAnalysisDataManager';
export type {
  AnalysisDataState,
  AnalysisDataCallbacks,
  AnalysisDataManager,
} from './useAnalysisDataManager';

// Hook de traitement et analyse
export { useAnalysisProcessor } from './useAnalysisProcessor';
export type {
  AnalysisProcessorState,
  AnalysisProcessorConfig,
  AnalysisProcessorCallbacks,
  AnalysisProcessorReturn,
} from './useAnalysisProcessor';

// 🗑️ ANCIENS HOOKS SUPPRIMÉS APRÈS REFACTORISATION :
// - useAnalysisState (logique intégrée dans useAnalysisDataManager)
// - useFileUpload (logique intégrée dans useAnalysisDataManager)
// - useAnalysisActions (logique intégrée dans useAnalysisDataManager)
// - useAnalysisOptimization (logique intégrée dans useAnalysisProcessor)
// - useAnalysisFilters (logique intégrée dans useAnalysisProcessor)
// - useAnalysisCalculations (logique intégrée dans useAnalysisProcessor)
//
// ✅ Résultat : Réduction de 6+ hooks à seulement 2 hooks consolidés
// ✅ Architecture simplifiée et maintenable
// ✅ Élimination des duplications et sources de vérité multiples 
