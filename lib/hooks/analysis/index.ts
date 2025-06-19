// 🚀 HOOKS D'ANALYSE - Architecture optimisée et refactorisée

// ✅ HOOK PRINCIPAL ORCHESTRATEUR
export { useAnalysisWorkflow } from './useAnalysisWorkflow';
export type {
  AnalysisWorkflow,
  WorkflowConfig,
  WorkflowCallbacks,
  SharedBusinessRoleProps,
  WorkflowStatus,
} from './useAnalysisWorkflow';

// 🔧 HOOKS SPÉCIALISÉS

// Gestion des fichiers et données brutes
export { useAnalysisFileManager } from './useAnalysisFileManager';
export type {
  AnalysisFileManager,
  FileManagerCallbacks,
} from './useAnalysisFileManager';

// Configuration et paramètres d'analyse
export { useAnalysisConfiguration } from './useAnalysisConfiguration';
export type {
  AnalysisConfiguration,
  ConfigurationCallbacks,
} from './useAnalysisConfiguration';

// Export et sauvegarde des résultats
export { useAnalysisExport } from './useAnalysisExport';
export type {
  AnalysisExport,
  ExportCallbacks,
} from './useAnalysisExport';

// Cache et optimisation des performances
export { useAnalysisCache } from './useAnalysisCache';
export type {
  AnalysisCacheState,
  AnalysisCacheConfig,
  AnalysisCacheCallbacks,
  AnalysisCacheReturn,
} from './useAnalysisCache';

// Calculs et données dérivées
export { useAnalysisCalculations } from './useAnalysisCalculations';
export type {
  AnalysisCalculationsConfig,
  AnalysisCalculationsReturn,
} from './useAnalysisCalculations';

// Gestion des sélections utilisateur
export { useAnalysisSelections } from './useAnalysisSelections';
export type {
  AnalysisSelectionsState,
  AnalysisSelectionsConfig,
  AnalysisSelectionsCallbacks,
  AnalysisSelectionsReturn,
} from './useAnalysisSelections';

// État local et interface utilisateur
export { useWorkflowLocalState } from './useWorkflowLocalState';
export type {
  WorkflowLocalState,
  WorkflowLocalReturn,
  WorkflowLocalCallbacks,
} from './useWorkflowLocalState';

// 📊 ARCHITECTURE FINALE OPTIMISÉE
// ================================
// 📱 Page Principale
//     └── 🎯 useAnalysisWorkflow (MAÎTRE)
//         ├── 📁 useAnalysisFileManager (fichiers)
//         ├── ⚙️ useAnalysisConfiguration (config)
//         ├── 📤 useAnalysisExport (export)
//         ├── 💾 useAnalysisCache (cache)
//         ├── 🧮 useAnalysisCalculations (calculs)
//         ├── ✅ useAnalysisSelections (sélections)
//         └── 🎨 useWorkflowLocalState (UI)
//
// ✅ REFACTORING TERMINÉ - Performance et maintenabilité optimisées
// - Ancien useAnalysisProcessor (462 lignes) → SUPPRIMÉ
// - Ancien useAnalysisDataManager (443 lignes) → SUPPRIMÉ  
// - Architecture simplifiée : 1 hook maître + 7 hooks spécialisés
// - ~900 lignes de code dupliqué éliminées
// - Performance améliorée avec cache et memoization
// - Code modulaire et maintenable