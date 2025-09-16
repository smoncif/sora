/**
 * Types génériques pour l'analyse (rôles et utilisateurs)
 */

/**
 * Mode d'analyse - détermine le type d'élément analysé
 */
export type AnalysisMode = 'roles' | 'users';

/**
 * Élément de base pour l'analyse
 */
export interface BaseAnalysisItem {
  id: string;
  name?: string; // Optionnel - utilisé pour les rôles, pas pour les utilisateurs
  description?: string; // Optionnel - utilisé pour les rôles
  transactions?: string[]; // IDs des transactions associées
  executionData?: Map<string, number>; // Données d'exécution par transaction
  metadata?: Record<string, any>;
}

/**
 * Transaction avec données temporelles optionnelles
 */
export interface TransactionExecution {
  transactionId: string;
  executionCount: number;
  year?: number;
  month?: number;
}

/**
 * Résultat d'analyse générique
 */
export interface GenericAnalysisResult<T extends BaseAnalysisItem> {
  id?: string;
  name: string;
  description?: string;
  timestamp: Date;
  mode: AnalysisMode;
  
  // Éléments analysés (rôles métier ou utilisateurs)
  items: T[];
  
  // Rôles cibles (rôles simples pour l'analyse de rôles, rôles métier pour l'analyse d'utilisateurs)
  targetRoles: BaseAnalysisItem[];
  
  // Transactions
  transactions: Transaction[];
  
  // Métriques globales
  totalItems: number;
  totalTargetRoles: number;
  totalTransactions: number;
  
  // Mappings
  itemToTransactions: Map<string, TransactionExecution[]>;
  targetRoleToTransactions: Map<string, string[]>;
  
  // Pour l'analyse des utilisateurs : mapping rôle métier -> rôle simple
  targetRoleToSimpleRoles?: Map<string, string[]>;
  simpleRoleToTransactions?: Map<string, string[]>;
  
  // Métadonnées
  metadata?: {
    userId?: string;
    analysisType?: string;
    [key: string]: any;
  };
}

/**
 * Configuration d'analyse
 */
export interface AnalysisConfig {
  mode: AnalysisMode;
  
  // Pondérations pour le calcul des scores
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  
  // Options d'affichage
  includeFrequency: boolean;
  showLicenses: boolean;
  
  // Options de sélection
  maxSelectionsPerItem?: number; // 1 pour les utilisateurs, undefined pour les rôles
  
  // Labels personnalisés
  labels?: {
    item: string; // "Rôle Métier" ou "Utilisateur"
    targetRole: string; // "Rôle Simple" ou "Rôle Métier"
    itemPlural: string; // "Rôles Métier" ou "Utilisateurs"
    targetRolePlural: string; // "Rôles Simples" ou "Rôles Métier"
  };
}

/**
 * Interface Transaction de base (commune aux deux modes)
 */
export interface Transaction {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  metadata?: Record<string, any>;
}

/**
 * Labels par défaut selon le mode
 */
export const DEFAULT_LABELS: Record<AnalysisMode, AnalysisConfig['labels']> = {
  roles: {
    item: 'Rôle Métier',
    targetRole: 'Rôle Simple',
    itemPlural: 'Rôles Métier',
    targetRolePlural: 'Rôles Simples'
  },
  users: {
    item: 'Utilisateur',
    targetRole: 'Rôle Métier',
    itemPlural: 'Utilisateurs',
    targetRolePlural: 'Rôles Métier'
  }
};

/**
 * Helper pour obtenir les labels selon le mode
 */
export function getLabels(mode: AnalysisMode): AnalysisConfig['labels'] {
  return DEFAULT_LABELS[mode];
}

/**
 * Type guard pour vérifier si un élément a un nom
 */
export function hasName(item: BaseAnalysisItem): item is BaseAnalysisItem & { name: string } {
  return typeof item.name === 'string' && item.name.length > 0;
}

/**
 * Obtenir le label d'affichage pour un élément
 */
export function getItemDisplayName(item: BaseAnalysisItem, mode: AnalysisMode): string {
  if (mode === 'users') {
    return `Utilisateur ${item.id}`;
  }
  return item.name || item.id;
}
