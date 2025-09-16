/**
 * Types spécifiques pour l'analyse des utilisateurs
 */

import { 
  BaseAnalysisItem, 
  GenericAnalysisResult, 
  TransactionExecution,
  Transaction 
} from './analysis';
import { BusinessRole } from './roleAnalysis';

/**
 * Utilisateur pour l'analyse
 */
export interface User extends BaseAnalysisItem {
  // L'ID est le seul identifiant requis pour un utilisateur
  id: string;
  
  // Pas de name ni description pour les utilisateurs
  name?: undefined;
  description?: undefined;
  
  // Transactions utilisées par cet utilisateur
  transactions: string[];
  
  // Données d'exécution par transaction (avec période optionnelle)
  executionData: Map<string, number>;
  
  // Détails d'exécution avec période
  transactionExecutions?: TransactionExecution[];
  
  // Métadonnées optionnelles
  metadata?: {
    department?: string;
    lastActivity?: Date;
    [key: string]: any;
  };
}

/**
 * Résultat d'analyse pour les utilisateurs
 */
export interface UserAnalysisResult extends GenericAnalysisResult<User> {
  mode: 'users';
  
  // Utilisateurs analysés
  items: User[];
  
  // Rôles métier disponibles (cibles pour les utilisateurs)
  targetRoles: BusinessRole[];
  
  // Transactions
  transactions: Transaction[];
  
  // Mapping utilisateur -> transactions avec exécutions
  itemToTransactions: Map<string, TransactionExecution[]>;
  
  // Mapping rôle métier -> transactions
  targetRoleToTransactions: Map<string, string[]>;
  
  // Mapping rôle métier -> rôles simples
  targetRoleToSimpleRoles: Map<string, string[]>;
  
  // Mapping rôle simple -> transactions
  simpleRoleToTransactions: Map<string, string[]>;
  
  // Métriques spécifiques aux utilisateurs
  metrics?: {
    averageTransactionsPerUser: number;
    averageExecutionsPerUser: number;
    usersWithoutOptimalRole: number;
    coverageBySelectedRoles: number;
  };
}

/**
 * Configuration Excel pour l'import des utilisateurs
 */
export interface UserExcelConfig {
  // Feuille 1 : Utilisateur ↔ Transaction
  userTransactionSheet: {
    sheetName: string;
    columns: {
      userId: string; // "Utilisateur"
      year?: string; // "Année" (optionnel)
      month?: string; // "Mois" (optionnel)
      transactionId: string; // "Transaction"
      executionCount: string; // "Nombre d'exécutions"
    };
  };
  
  // Feuille 2 : Rôle Métier ↔ Rôle Simple
  businessRoleToSimpleRoleSheet: {
    sheetName: string;
    columns: {
      businessRoleId: string; // "Rôle Métier"
      simpleRoleId: string; // "Rôle Simple"
    };
  };
  
  // Feuille 3 : Rôle Simple ↔ Transaction
  simpleRoleToTransactionSheet: {
    sheetName: string;
    columns: {
      simpleRoleId: string; // "Rôle Simple"
      transactionId: string; // "Transaction"
    };
  };
}

/**
 * Types pour le parsing spécifique
 */
export interface UserTransactionData {
  userId: string;
  transaction: string;
  executionCount?: number;
  year?: number;
  month?: number;
}

export interface BusinessRoleMappingData {
  businessRole: string;
  simpleRole: string;
}

export interface ParsedUserAnalysisData {
  userTransactions: UserTransactionData[];
  businessRoleMappings: BusinessRoleMappingData[];
  simpleRoleTransactions: { simpleRole: string; transaction: string; }[];
  metadata: {
    fileName: string;
    fileSize: number;
    sheetsFound: string[];
    userCount: number;
    businessRoleCount: number;
    simpleRoleCount: number;
    totalTransactions: number;
    processingTimeMs: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Configuration par défaut pour l'import Excel des utilisateurs
 */
export const DEFAULT_USER_EXCEL_CONFIG: UserExcelConfig = {
  userTransactionSheet: {
    sheetName: 'Utilisateur-Transaction',
    columns: {
      userId: 'Utilisateur',
      year: 'Année',
      month: 'Mois',
      transactionId: 'Transaction',
      executionCount: 'Nombre d\'exécutions'
    }
  },
  businessRoleToSimpleRoleSheet: {
    sheetName: 'RoleMétier-RoleSimple',
    columns: {
      businessRoleId: 'Rôle Métier',
      simpleRoleId: 'Rôle Simple'
    }
  },
  simpleRoleToTransactionSheet: {
    sheetName: 'RoleSimple-Transaction',
    columns: {
      simpleRoleId: 'Rôle Simple',
      transactionId: 'Transaction'
    }
  }
};

/**
 * Sélection de rôle pour un utilisateur
 */
export interface UserRoleSelection {
  userId: string;
  selectedBusinessRoleId: string | null; // Un seul rôle métier par utilisateur
  coverage: number; // Pourcentage de couverture des transactions
  uncoveredTransactions: string[]; // Transactions non couvertes
  metadata?: {
    selectionDate?: Date;
    selectionMethod?: 'manual' | 'automatic';
    score?: number;
  };
}

/**
 * Type guard pour vérifier si c'est un utilisateur
 */
export function isUser(item: BaseAnalysisItem): item is User {
  return !item.name && !item.description;
}

/**
 * Type guard pour vérifier si c'est un résultat d'analyse utilisateur
 */
export function isUserAnalysisResult(result: GenericAnalysisResult<any>): result is UserAnalysisResult {
  return result.mode === 'users';
}
