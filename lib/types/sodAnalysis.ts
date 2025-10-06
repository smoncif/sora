/**
 * Types pour l'analyse SoD (Segregation of Duties)
 * 
 * Structure hiérarchique :
 * - Rôles Simples : Rôle → Risque → Fonction → Action → Resource → External Resource → Valeurs
 * - Rôles Composites : Rôle → Risque → Fonction → Rôle Simple → Action → Resource → External Resource → Valeurs
 */

/**
 * Niveaux de risque SoD avec code couleur
 */
export type SodRiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Mapping des niveaux de risque pour traduction FR/EN
 */
export const SOD_RISK_LEVEL_MAPPING: Record<string, SodRiskLevel> = {
  // Français - variations avec/sans accents
  'critique': 'CRITICAL',
  'élevé': 'HIGH',
  'eleve': 'HIGH',
  'elevé': 'HIGH',
  'moyen': 'MEDIUM',
  'faible': 'LOW',
  // Anglais
  'critical': 'CRITICAL',
  'high': 'HIGH',
  'medium': 'MEDIUM',
  'low': 'LOW',
};

/**
 * Couleurs associées aux niveaux de risque
 */
export const SOD_RISK_LEVEL_COLORS: Record<SodRiskLevel, string> = {
  CRITICAL: '#d32f2f', // Rouge
  HIGH: '#f57c00',     // Orange
  MEDIUM: '#fbc02d',   // Jaune
  LOW: '#9e9e9e',      // Gris
};

/**
 * Enregistrement brut du fichier Excel SoD (28 colonnes)
 * Support bilingue FR/EN pour les noms de colonnes
 */
export interface SodRawRecord {
  // ========== COLONNES OBLIGATOIRES ==========
  
  /** Nom du rôle / Role Name */
  roleName: string;
  
  /** ID de risque d'accès / Access Risk ID */
  accessRiskId: string;
  
  /** Niveau du risque / Risk Level */
  riskLevel: string; // Sera normalisé en SodRiskLevel
  
  /** Fonction / Function */
  function: string;
  
  /** Système / System */
  system: string;
  
  /** Action / Action */
  action: string;
  
  /** Ressource / Resource */
  resource: string;
  
  /** Ressource externe / Resource Extn */
  resourceExtn: string;
  
  /** Valeur de / Value From */
  valueFrom: string;
  
  /** Valeur jusq. / Value To */
  valueTo: string;
  
  /** Rôle/Profil / Role/Profile */
  roleProfile: string;
  
  /** Rôle utilisateur/composite / Composite/Business Role */
  compositeBusinessRole: string;
  
  // ========== COLONNES OPTIONNELLES ==========
  
  /** Description du risque / Risk Description */
  riskDescription?: string;
  
  /** ID de règle / Rule ID - SERA SUPPRIMÉE AU PRÉ-FILTRAGE */
  ruleId?: string;
  
  /** Description de fonction / Function Description */
  functionDescription?: string;
  
  /** Description action / Action Description */
  actionDescription?: string;
  
  /** Description de ressource / Resource Description */
  resourceDescription?: string;
  
  /** Description externe de ressource / Resource Extn Desc */
  resourceExtnDesc?: string;
  
  /** Description de rôle/profil / Role/Profile Description */
  roleProfileDescription?: string;
  
  /** Description de rôle composite / Composite Role Description */
  compositeRoleDescription?: string;
  
  /** Contrôle / Control - UTILISÉ POUR FILTRAGE (garder si vide) */
  control?: string;
  
  /** Description du contrôle / Control Description */
  controlDescription?: string;
  
  /** Moniteur / Monitor */
  monitor?: string;
  
  /** Nom de moniteur / Monitor Name */
  monitorName?: string;
  
  /** Processus de gestion / Business Process */
  businessProcess?: string;
  
  /** Description du processus de gestion / Business Process Description */
  businessProcessDescription?: string;
  
  /** ID règle organ. / Org Rule ID */
  orgRuleId?: string;
  
  /** Description synthét. / Short description */
  shortDescription?: string;
}

/**
 * Valeur (Value From → Value To)
 */
export interface SodValue {
  valueFrom: string;
  valueTo: string;
}

/**
 * Ressource externe avec ses valeurs
 */
export interface SodExternalResource {
  code: string;
  description?: string;
  values: SodValue[];
}

/**
 * Ressource avec ses ressources externes
 */
export interface SodResource {
  code: string;
  description?: string;
  externalResources: SodExternalResource[];
  isDeleted: boolean;      // ✅ Obligatoire pour l'optimisation
  isRestricted: boolean;   // ✅ Obligatoire pour l'optimisation
}

/**
 * Action avec ses ressources
 * Utilisé dans la hiérarchie des RÔLES SIMPLES
 */
export interface SodAction {
  code: string;
  description?: string;
  resources: SodResource[];
  isDeleted: boolean;              // ✅ Obligatoire pour l'optimisation
  isRestricted: boolean;           // ✅ Obligatoire pour l'optimisation
  restrictedByAction: boolean;     // ✅ Obligatoire - True si restreinte via le bouton de l'action (Parent → Enfants)
}

/**
 * Action au sein d'un rôle simple (pour rôles composites)
 * Utilisé dans la hiérarchie des RÔLES COMPOSITES
 */
export interface SodSimpleRoleAction {
  code: string;
  description?: string;
  resources: SodResource[];
  isDeleted: boolean;              // ✅ Obligatoire pour l'optimisation
  isRestricted: boolean;           // ✅ Obligatoire pour l'optimisation
  restrictedByAction: boolean;     // ✅ Obligatoire pour l'optimisation
}

/**
 * Rôle simple au sein d'un rôle composite
 * Niveau intermédiaire entre Fonction et Action dans les composites
 */
export interface SodSimpleRoleInComposite {
  roleName: string;
  roleDescription?: string;
  actions: SodSimpleRoleAction[];
  
  // Compteurs pour affichage
  actionCount: number;
  hasHighRisk?: boolean; // Pour badge coloré
}

/**
 * Fonction pour RÔLES SIMPLES
 * Hiérarchie : Fonction → Action → Resource → External Resource → Valeurs
 */
export interface SodSimpleRoleFunction {
  code: string;
  description?: string;
  system: string;
  actions: SodAction[];
  
  // Compteurs pour affichage
  actionCount: number;
}

/**
 * Fonction pour RÔLES COMPOSITES
 * Hiérarchie : Fonction → Rôle Simple → Action → Resource → External Resource → Valeurs
 */
export interface SodCompositeRoleFunction {
  code: string;
  description?: string;
  system: string;
  simpleRoles: SodSimpleRoleInComposite[];
  
  // Compteurs pour affichage
  simpleRoleCount: number;
  totalActionCount: number;
}

/**
 * Risque SoD pour RÔLES SIMPLES
 */
export interface SodSimpleRoleRiskItem {
  riskId: string;
  riskLevel: SodRiskLevel;
  riskDescription?: string;
  functions: SodSimpleRoleFunction[];
  
  // Métadonnées pour affichage
  functionCount: number;
  totalActionCount: number;
}

/**
 * Risque SoD pour RÔLES COMPOSITES
 */
export interface SodCompositeRoleRiskItem {
  riskId: string;
  riskLevel: SodRiskLevel;
  riskDescription?: string;
  functions: SodCompositeRoleFunction[];
  
  // Métadonnées pour affichage
  functionCount: number;
  totalSimpleRoleCount: number;
  totalActionCount: number;
}

/**
 * Rôle simple avec ses risques (ÉTAPE 1)
 * Hiérarchie complète pour affichage
 */
export interface SodSimpleRole {
  roleName: string;
  roleDescription?: string;
  risks: SodSimpleRoleRiskItem[];
  
  // Métadonnées
  riskCount: number;
  highestRiskLevel: SodRiskLevel;
}

/**
 * Rôle composite avec ses risques (ÉTAPE 2)
 * Hiérarchie complète pour affichage
 */
export interface SodCompositeRole {
  roleName: string;
  roleDescription?: string;
  compositeRoleName: string;
  compositeRoleDescription?: string;
  risks: SodCompositeRoleRiskItem[];
  
  // Métadonnées
  riskCount: number;
  highestRiskLevel: SodRiskLevel;
  involvedSimpleRoleCount: number;
}

/**
 * Métriques pour les rôles simples
 */
export interface SodSimpleRoleMetrics {
  totalRoles: number;
  totalRisks: number;
  totalFunctions: number;
  totalActions: number;
  
  risksByLevel: Record<SodRiskLevel, number>;
  risksBySystem: Record<string, number>;
  
  averageRisksPerRole: number;
  averageFunctionsPerRisk: number;
}

/**
 * Métriques pour les rôles composites
 */
export interface SodCompositeRoleMetrics {
  totalCompositeRoles: number;
  totalRisks: number;
  totalFunctions: number;
  totalSimpleRolesInvolved: number;
  totalActions: number;
  
  risksByLevel: Record<SodRiskLevel, number>;
  risksBySystem: Record<string, number>;
  
  averageRisksPerComposite: number;
  averageSimpleRolesPerRisk: number;
}

/**
 * Statistiques de pré-filtrage
 */
export interface SodFilteringStats {
  originalRecordCount: number;
  afterRuleIdRemoval: number;
  afterControlFilter: number;
  afterRiskIdFilter: number;
  afterDuplicateRemoval: number;
  
  removedDuplicates: number;
  removedByControlFilter: number;
  removedByRiskIdFilter: number;
}

/**
 * Session complète d'analyse SoD
 * Gère les 4 steps avec préservation d'état
 */
export interface SodAnalysisSession {
  id: string;
  name: string;
  timestamp: Date;
  currentStep: 1 | 2 | 3 | 4;
  
  // Données du fichier source
  sourceFile: {
    fileName: string;
    fileSize: number;
    uploadDate: Date;
  };
  
  // Statistiques de pré-filtrage
  filteringStats: SodFilteringStats;
  
  // ÉTAPE 1 : Rôles Simples
  simpleRoles: {
    roles: SodSimpleRole[];
    metrics: SodSimpleRoleMetrics;
    userActions?: any; // Actions utilisateur (suppression, annotation, etc.) - À définir plus tard
  };
  
  // ÉTAPE 2 : Rôles Composites
  compositeRoles: {
    roles: SodCompositeRole[];
    metrics: SodCompositeRoleMetrics;
    userActions?: any; // Actions utilisateur - À définir plus tard
  };
  
  // ÉTAPE 3 : Utilisateurs (à définir plus tard)
  users?: {
    fileName?: string;
    fileSize?: number;
    uploadDate?: Date;
    data?: any; // Structure à définir
    metrics?: any;
    userActions?: any;
  };
  
  // ÉTAPE 4 : Rapport Final (à définir plus tard)
  report?: {
    generatedDate?: Date;
    summary?: any;
    exportedFiles?: string[];
  };
  
  // Métadonnées générales
  metadata: {
    createdBy: string;
    createdAt: Date;
    lastModified: Date;
    processingTimeMs: number;
    version: string;
  };
}

/**
 * Configuration pour le parsing du fichier Excel SoD
 */
export interface SodParsingConfig {
  // Taille maximale du fichier (en octets)
  maxFileSize: number;
  
  // Timeout de traitement (en ms)
  timeoutMs: number;
  
  // Mapping des colonnes FR/EN
  columnMappings: {
    // Obligatoires
    roleName: string[];
    accessRiskId: string[];
    riskLevel: string[];
    function: string[];
    system: string[];
    action: string[];
    resource: string[];
    resourceExtn: string[];
    valueFrom: string[];
    valueTo: string[];
    roleProfile: string[];
    compositeBusinessRole: string[];
    
    // Optionnelles
    riskDescription?: string[];
    ruleId?: string[];
    functionDescription?: string[];
    actionDescription?: string[];
    resourceDescription?: string[];
    resourceExtnDesc?: string[];
    roleProfileDescription?: string[];
    compositeRoleDescription?: string[];
    control?: string[];
    controlDescription?: string[];
    monitor?: string[];
    monitorName?: string[];
    businessProcess?: string[];
    businessProcessDescription?: string[];
    orgRuleId?: string[];
    shortDescription?: string[];
  };
}

/**
 * Résultat du parsing du fichier Excel SoD
 */
export interface SodParsingResult {
  // Enregistrements parsés
  rawRecords: SodRawRecord[];
  simpleRoleRecords: SodRawRecord[];
  compositeRoleRecords: SodRawRecord[];
  
  // Statistiques de filtrage
  filteringStats: SodFilteringStats;
  
  // Warnings et erreurs
  warnings: string[];
  errors: string[];
  
  // Métadonnées
  metadata: {
    fileName: string;
    fileSize: number;
    processingTimeMs: number;
    sheetsFound: string[];
  };
}

/**
 * Options pour la construction de la hiérarchie
 */
export interface SodHierarchyBuildOptions {
  // Inclure les descriptions optionnelles
  includeDescriptions?: boolean;
  
  // Calculer les métriques
  calculateMetrics?: boolean;
  
  // Trier par niveau de risque
  sortByRiskLevel?: boolean;
}

/**
 * Statut de remédiation d'une fonction
 * Une fonction est remediée si TOUTES ses actions sont supprimées OU restreintes
 */
export interface FunctionRemediationStatus {
  isRemediated: boolean;
  totalActions: number;
  remediatedActions: number;
}

/**
 * Statut de remédiation d'un risque
 * Un risque est remedié si AU MOINS une de ses fonctions est remediée
 */
export interface RiskRemediationStatus {
  isRemediated: boolean;
  totalFunctions: number;
  remediatedFunctions: number;
  remediationPercentage: number; // 0-100
}

/**
 * Statut de remédiation d'un rôle simple
 * Un rôle est remedié si TOUS ses risques sont remediés
 */
export interface RoleRemediationStatus {
  isRemediated: boolean;
  totalRisks: number;
  remediatedRisks: number;
  remediationPercentage: number; // 0-100 pour le gradient visuel
}

