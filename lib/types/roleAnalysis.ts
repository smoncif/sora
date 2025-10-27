/**
 * Types pour le module d'analyse des rôles métier
 */

import { BaseAnalysisItem, GenericAnalysisResult, TransactionExecution } from './analysis';

/**
 * Transaction système représentant une action ou permission
 * Étendue de la transaction de base avec des propriétés spécifiques aux rôles
 */
export interface Transaction {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  criticality?: 'low' | 'medium' | 'high';
  subcategory?: string;
  system?: string;
  module?: string;
  metadata?: Record<string, any>;
  isCore: boolean;
  tags: string[];
}

/**
 * Rôle métier défini pour regrouper des transactions
 * Étend BaseAnalysisItem avec des propriétés spécifiques aux rôles
 */
export interface BusinessRole extends BaseAnalysisItem {
  id: string;
  name: string;
  description: string;
  department?: string;
  transactions: string[]; // IDs des transactions associées
  users: string[]; // IDs des utilisateurs assignés à ce rôle
  userCount?: number;
  metadata?: Record<string, any>;
  isCustom: boolean;
  createdAt: string;
  createdBy: string;
  score?: number;
  coverage?: number;
  quality?: number;
}

/**
 * Rôle simple SAP
 * Étend BaseAnalysisItem pour la compatibilité avec le système générique
 */
export interface SimpleRole extends BaseAnalysisItem {
  id: string;
  name: string;
  description?: string;
  transactions: string[]; // IDs des transactions associées
  metadata?: Record<string, any>;
  license?: string; // Type de licence associé
  licenseOrder?: number; // Ordre de priorité de la licence
}

/**
 * Assignation d'un utilisateur à un rôle
 */
export interface UserRoleAssignment {
  userId: string;
  username: string;
  fullName?: string;
  email?: string;
  department?: string;
  roleIds: string[]; // IDs des rôles assignés
  metadata?: Record<string, any>;
}

/**
 * Métriques calculées pour un rôle
 */
export interface RoleMetrics {
  roleId: string;
  name: string;
  transactionCount: number;
  coverageScore: number;
  qualityScore: number;
  securityScore: number;
  overallScore: number;
  issues: number;
  redundancyRate: number;
  unusedTransactions?: string[];
  mostUsedTransactions?: string[];
  metadata?: {
    transactionHistory?: Array<{
      date: string;
      count: number;
    }>;
    issueDetails?: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    usagePatterns?: {
      peakHours: number[];
      commonTransactions: string[];
    };
  };
}

/**
 * Résultat global d'une analyse de rôles
 */
export interface RoleAnalysisResult {
  id?: string;
  name: string;
  description?: string;
  timestamp: Date;
  isBaseline?: boolean;
  
  roles: BusinessRole[];
  transactions: Transaction[];
  userAssignments?: UserRoleAssignment[];
  
  metrics: {
    roleMetrics: Record<string, RoleMetrics>;
    globalCoverageScore: number;
    globalQualityScore: number;
    globalOverallScore: number;
    
    totalRoles: number;
    totalTransactions: number;
    totalUsers?: number;
    
    roleDistribution?: {
      byDepartment?: Record<string, number>;
      bySize?: Record<string, number>;
    };
  };
  
  analysisParams?: {
    weightCoverage?: number;
    weightQuality?: number;
  };
  
  source?: {
    fileName?: string;
    fileSize?: number;
    importDate?: Date;
    sheets?: string[];
  };
}

/**
 * Paramètres pour l'optimisation des rôles
 */
export interface RoleOptimizationParameters {
  maxRolesPerUser?: number;
  maxUsersPerRole?: number;
  weightings?: {
    minimizeRoles?: number;
    minimizeLicenses?: number;
    maximizeCoverage?: number;
  };
}

/**
 * Résultats de l'optimisation des rôles
 */
export interface RoleOptimizationResult {
  originalRoles: BusinessRole[];
  optimizedRoles: BusinessRole[];
  metrics: {
    before: RoleMetrics[];
    after: RoleMetrics[];
  };
  licenseEstimates: {
    before: number;
    after: number;
  };
}

/**
 * Analyse sauvegardée avec métadonnées et versions
 */
export interface SavedAnalysis {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isArchived: boolean;
  tags: string[];
  
  versions: Array<{
    id: string;
    version: number;
    timestamp: Date;
    description: string;
    data: RoleAnalysisResult;
  }>;
}

/**
 * Mapping entre rôles et transactions
 */
export interface RoleMapping {
  roleId: string;
  transactionId: string;
}

/**
 * Données extraites du fichier Excel
 */
export interface ExcelRoleData {
  transactions: Transaction[];
  roles: BusinessRole[];
  userAssignments?: UserRoleAssignment[];
  metadata: {
    fileName: string;
    extractedAt: string;
    transactionCount: number;
    roleCount: number;
    userCount: number;
  };
}

/**
 * Configuration pour l'extraction des données Excel
 */
export interface ExcelExtractionConfig {
  sheetNames?: {
    transactions?: string;
    roles?: string;
    mappings?: string;
    users?: string;
  };
  columnNames?: {
    transactions?: Record<string, string>;
    roles?: Record<string, string>;
    mappings?: Record<string, string>;
    users?: Record<string, string>;
  };
  validateData?: boolean;
  generateMissingIds?: boolean;
}

/**
 * Assignation d'utilisateur
 */
export interface UserAssignment {
  userId: string;
  username: string;
  roleIds: string[];
} 

/**
 * Types pour l'analyse des rôles métier
 * Version simplifiée pour le nouveau workflow Excel
 */

// ===== NOUVEAUX TYPES POUR LE WORKFLOW SIMPLIFIÉ =====

/**
 * Transaction d'un rôle métier (Feuille 1 du fichier Excel)
 */
export interface BusinessRoleTransaction {
  businessRole: string;      // Rôle métier (obligatoire)
  year?: number;            // Année
  month?: number;           // Mois  
  transaction: string;      // Transaction (obligatoire)
  executionCount?: number;  // Nombre d'exécutions
}

/**
 * Transaction d'un rôle simple SAP (Feuille 2 du fichier Excel)
 */
export interface SimpleRoleTransaction {
  simpleRole: string;       // Rôle simple (obligatoire)
  transaction: string;      // Transaction (obligatoire)
  roleDescription?: string; // Description du rôle simple (optionnel)
  transactionDescription?: string; // Description de la transaction (optionnel)
}

/**
 * Type de licence SAP
 */
export interface LicenseType {
  id: string;
  name: string;             // Nom du type (Standard, Professional, etc.)
  displayOrder: number;     // Ordre de priorité (1=moins cher, 4=plus cher)
  description?: string;     // Description optionnelle
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Association rôle simple <-> licence
 */
export interface SimpleRoleLicense {
  id: string;
  simpleRole: string;       // Nom du rôle simple (unique)
  licenseTypeId: string;    // Référence vers LicenseType
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Association enrichie avec les détails du type de licence
 */
export interface SimpleRoleLicenseWithType extends SimpleRoleLicense {
  licenseType: LicenseType;
}

/**
 * Analyse de couverture pour un rôle métier
 */
export interface CoverageAnalysis {
  businessRole: string;
  totalTransactions: number;
  uniqueTransactions: string[];
  simpleRoles: SimpleRoleCoverage[];
  maxLicence?: string; // Licence la plus chère parmi les rôles simples sélectionnés
  maxLicenceOrder?: number; // Ordre de la licence max pour comparaison
}

/**
 * Couverture d'un rôle simple pour un rôle métier
 */
export interface SimpleRoleCoverage {
  roleName: string;
  coveragePercentage: number;
  coveredTransactions: string[];
  uncoveredTransactions: string[];
  isSelected: boolean;
  executionFrequency?: number; // Fréquence totale d'exécution des transactions couvertes
  licence?: string; // Type de licence associé au rôle simple
  licenceOrder?: number; // Ordre de priorité de la licence (pour calcul max)
}

/**
 * Résultat complet de l'analyse simplifiée
 * Version spécifique pour l'analyse des rôles métier
 */
export interface SimplifiedAnalysisResult extends Partial<GenericAnalysisResult<BusinessRole>> {
  id: string;
  name: string;
  description?: string;
  timestamp: Date;
  mode?: 'roles'; // Mode par défaut pour la compatibilité
  
  // Données source
  businessRoleTransactions: BusinessRoleTransaction[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  
  // Résultats d'analyse
  coverageAnalyses: CoverageAnalysis[];
  
  // Données spécifiques utilisateurs (pour mode 'users')
  userAnalysisData?: {
    users: { id: string; transactions: string[]; executionCount: number }[];
    businessRoleMappings: { businessRole: string; simpleRole: string }[];
  };
  
  // Mode d'analyse (pour différencier les types de données)
  analysisMode?: 'roles' | 'users';
  
  // Métadonnées
  metadata: {
    fileName: string;
    fileSize: number;
    importDate: Date;
    totalBusinessRoles: number;
    totalSimpleRoles: number;
    totalTransactions: number;
    processingTimeMs: number;
  };
  
  // Sélections utilisateur
  userSelections: Record<string, string[]>; // businessRole -> selectedSimpleRoles[]
  
  // Paramètres d'analyse
  analysisParams: {
    minCoverageThreshold: number; // Seuil minimum de couverture (défaut: 0%)
    includeFrequency: boolean;    // Inclure la fréquence dans l'affichage
    showLicenses?: boolean;       // Toggle pour afficher/masquer les licences
    coverageWeight?: number;      // Poids du pourcentage de couverture (défaut: 50)
    sizeWeight?: number;          // Poids du score de taille (défaut: 50)
    usageWeight?: number;         // Poids de l'usage/fréquence (défaut: 0)
  };
}

/**
 * Configuration pour l'export Excel
 */
export interface ExcelExportConfig {
  includeMetadata: boolean;
  includeUncoveredTransactions: boolean;
  includeFrequencyData: boolean;
  sheetNames: {
    summary: string;
    coverage: string;
    uncovered: string;
    metadata: string;
  };
} 
