/**
 * Types pour l'analyse SoD au niveau Utilisateurs (Step 3)
 * 
 * Structure hiérarchique avec 2 modes d'affichage :
 * 
 * MODE "Par Rôle" :
 *   Utilisateur → Risque → Fonction → Rôle Composite (si existe) → Rôle Simple → Action → Resource → Valeurs
 * 
 * MODE "Par Transaction" :
 *   Utilisateur → Risque → Fonction → Action → Rôle Composite (si existe) → Rôle Simple → Resource → Valeurs
 */

import type { 
  SodRiskLevel, 
  SodResource, 
  SodValue,
  SodFilteringStats 
} from './sodAnalysis';

// ============================================
// ENREGISTREMENT BRUT (Excel Utilisateurs)
// ============================================

/**
 * Enregistrement brut du fichier Excel d'analyse utilisateurs
 * Différences avec SodRawRecord :
 * - userId au lieu de roleName
 * - executionCount (nouveau champ)
 * - Toutes les autres colonnes identiques
 */
export interface UserSodRawRecord {
  // ========== COLONNES SPÉCIFIQUES UTILISATEURS ==========
  
  /** ID Utilisateur / User ID - COLONNE PRINCIPALE DIFFÉRENCIANTE */
  userId: string;
  
  /** Comptage des exécutions / Execution Count - NOUVEAU CHAMP */
  executionCount: number;
  
  /** Groupe utilisateur / User Group (optionnel) */
  userGroup?: string;
  
  // ========== COLONNES COMMUNES (identiques à SodRawRecord) ==========
  
  /** ID de risque d'accès / Access Risk ID */
  accessRiskId: string;
  
  /** Niveau du risque / Risk Level */
  riskLevel: string;
  
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
  
  /** Processus de gestion / Business Process */
  businessProcess?: string;
}

// ============================================
// DÉTECTION DE TYPE DE FICHIER
// ============================================

/**
 * Type de fichier Excel détecté
 */
export type SodExcelFileType = 'ROLE_ANALYSIS' | 'USER_ANALYSIS' | 'UNKNOWN';

/**
 * Résultat de la détection du type de fichier
 */
export interface SodFileTypeDetectionResult {
  type: SodExcelFileType;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  /** Colonnes détectées qui ont permis la classification */
  detectedColumns: {
    /** True si "User ID" ou "ID util." trouvé */
    hasUserId: boolean;
    /** True si "Role Name" ou "Nom du rôle" trouvé */
    hasRoleName: boolean;
    /** True si "Execution Count" ou "Comptage des exécutions" trouvé */
    hasExecutionCount: boolean;
  };
  
  /** Message explicatif */
  message: string;
}

// ============================================
// HIÉRARCHIE UTILISATEURS - MODE "PAR RÔLE"
// ============================================

/**
 * Action dans un rôle simple (pour utilisateurs)
 */
export interface UserSodAction {
  code: string;
  description?: string;
  resources: SodResource[];
  
  /** Comptage des exécutions pour cette action par cet utilisateur */
  executionCount: number;
  
  /** États de remédiation (synchronisés avec Step 1 et 2) */
  isDeleted: boolean;
  isRestricted: boolean;
  restrictedByAction: boolean;
}

/**
 * Rôle simple dans le contexte utilisateur
 */
export interface UserSodSimpleRole {
  roleName: string;
  roleDescription?: string;
  actions: UserSodAction[];
  
  /** Compteurs */
  actionCount: number;
  totalExecutionCount: number;
  
  /** États */
  isDeleted: boolean;
  isRestricted: boolean;
}

/**
 * Rôle composite dans le contexte utilisateur
 * Contient des rôles simples
 */
export interface UserSodCompositeRole {
  roleName: string;
  roleDescription?: string;
  simpleRoles: UserSodSimpleRole[];
  
  /** Compteurs */
  simpleRoleCount: number;
  totalActionCount: number;
  totalExecutionCount: number;
  
  /** États */
  isExcluded: boolean;
}

/**
 * Fonction dans le contexte utilisateur (MODE "Par Rôle")
 */
export interface UserSodFunctionByRole {
  code: string;
  description?: string;
  system: string;
  
  /** Rôles composites (si existent) puis rôles simples */
  compositeRoles: UserSodCompositeRole[];
  simpleRoles: UserSodSimpleRole[];
  
  /** Compteurs */
  roleCount: number;
  totalActionCount: number;
  totalExecutionCount: number;
}

/**
 * Risque utilisateur (MODE "Par Rôle")
 */
export interface UserSodRiskByRole {
  riskId: string;
  riskLevel: SodRiskLevel;
  riskDescription?: string;
  functions: UserSodFunctionByRole[];
  
  /** Compteurs */
  functionCount: number;
  totalRoleCount: number;
  totalExecutionCount: number;
  
  /** Statut de remédiation */
  isRemediated: boolean;
  remediationPercentage: number;
}

// ============================================
// HIÉRARCHIE UTILISATEURS - MODE "PAR TRANSACTION"
// ============================================

/**
 * Rôle associé à une action (pour mode Transaction)
 */
export interface UserSodRoleForAction {
  roleName: string;
  roleDescription?: string;
  
  /** Type de rôle */
  roleType: 'SIMPLE' | 'COMPOSITE';
  
  /** Rôle composite parent (si ce rôle est un rôle simple dans un composite) */
  parentCompositeRole?: string;
  
  /** Ressources de cette action dans ce rôle */
  resources: SodResource[];
  
  /** États */
  isDeleted: boolean;
  isRestricted: boolean;
  isExcluded: boolean;
}

/**
 * Action dans le contexte utilisateur (MODE "Par Transaction")
 */
export interface UserSodActionByTransaction {
  code: string;
  description?: string;
  
  /** Comptage des exécutions */
  executionCount: number;
  
  /** Rôles qui contiennent cette action */
  roles: UserSodRoleForAction[];
  
  /** États agrégés */
  isDeleted: boolean;
  isRestricted: boolean;
}

/**
 * Fonction dans le contexte utilisateur (MODE "Par Transaction")
 */
export interface UserSodFunctionByTransaction {
  code: string;
  description?: string;
  system: string;
  
  /** Actions dans cette fonction */
  actions: UserSodActionByTransaction[];
  
  /** Compteurs */
  actionCount: number;
  totalExecutionCount: number;
}

/**
 * Risque utilisateur (MODE "Par Transaction")
 */
export interface UserSodRiskByTransaction {
  riskId: string;
  riskLevel: SodRiskLevel;
  riskDescription?: string;
  functions: UserSodFunctionByTransaction[];
  
  /** Compteurs */
  functionCount: number;
  totalActionCount: number;
  totalExecutionCount: number;
  
  /** Statut de remédiation */
  isRemediated: boolean;
  remediationPercentage: number;
}

// ============================================
// UTILISATEUR COMPLET
// ============================================

/**
 * Utilisateur avec ses risques SoD
 * Supporte les 2 modes d'affichage
 */
export interface UserSodEntry {
  userId: string;
  userGroup?: string;
  
  /** Risques en mode "Par Rôle" */
  risksByRole: UserSodRiskByRole[];
  
  /** Risques en mode "Par Transaction" */
  risksByTransaction: UserSodRiskByTransaction[];
  
  /** Compteurs globaux */
  riskCount: number;
  highestRiskLevel: SodRiskLevel;
  totalExecutionCount: number;
  
  /** Statut de remédiation global */
  isRemediated: boolean;
  remediationPercentage: number;
}

// ============================================
// RÔLES RISQUÉS (pour distribution Step 1/2)
// ============================================

/**
 * Rôle identifié comme risqué dans l'analyse utilisateur
 * 
 * RÈGLE : Un rôle est risqué s'il est présent dans TOUTES les fonctions
 * d'un même risque (quelque soit l'utilisateur)
 */
export interface UserSodRiskyRole {
  roleName: string;
  roleDescription?: string;
  
  /** Type de rôle (déterminé par la colonne Composite/Business Role) */
  roleType: 'SIMPLE' | 'COMPOSITE';
  
  /** Rôle composite parent (si rôle simple dans un composite) */
  parentCompositeRole?: string;
  
  /** Risques pour lesquels ce rôle est risqué */
  riskyForRisks: {
    riskId: string;
    riskLevel: SodRiskLevel;
    functions: string[]; // Codes des fonctions où le rôle est présent
  }[];
  
  /** Utilisateurs qui ont ce rôle */
  affectedUsers: {
    userId: string;
    executionCount: number;
  }[];
  
  /** Compteurs */
  affectedUserCount: number;
  totalExecutionCount: number;
}

// ============================================
// MÉTRIQUES ET SESSION
// ============================================

/**
 * Métriques pour l'analyse utilisateur SoD
 */
export interface UserSodMetrics {
  totalUsers: number;
  totalRisks: number;
  totalFunctions: number;
  totalActions: number;
  totalExecutions: number;
  
  /** Distribution par niveau de risque */
  risksByLevel: Record<SodRiskLevel, number>;
  
  /** Distribution par système */
  risksBySystem: Record<string, number>;
  
  /** Rôles risqués identifiés */
  riskySimpleRolesCount: number;
  riskyCompositeRolesCount: number;
  
  /** Moyennes */
  averageRisksPerUser: number;
  averageExecutionsPerUser: number;
}

/**
 * Statistiques de filtrage spécifiques aux utilisateurs
 */
export interface UserSodFilteringStats extends SodFilteringStats {
  /** Nombre d'utilisateurs uniques après filtrage */
  uniqueUserCount: number;
  
  /** Nombre de rôles risqués identifiés */
  riskyRolesIdentified: number;
}

/**
 * Session d'analyse utilisateur SoD (Step 3)
 */
export interface UserSodAnalysisSession {
  /** Métadonnées du fichier source */
  sourceFile: {
    fileName: string;
    fileSize: number;
    uploadDate: Date;
  };
  
  /** Statistiques de filtrage */
  filteringStats: UserSodFilteringStats;
  
  /** Utilisateurs analysés */
  users: UserSodEntry[];
  
  /** Rôles risqués identifiés (pour distribution Step 1/2) */
  riskyRoles: UserSodRiskyRole[];
  
  /** Métriques globales */
  metrics: UserSodMetrics;
  
  /** Mode d'affichage actuel */
  displayMode: 'BY_ROLE' | 'BY_TRANSACTION';
}

// ============================================
// RÉSULTAT DU PARSING
// ============================================

/**
 * Résultat du parsing du fichier Excel utilisateurs
 */
export interface UserSodParsingResult {
  /** Enregistrements bruts parsés */
  rawRecords: UserSodRawRecord[];
  
  /** Statistiques de filtrage */
  filteringStats: UserSodFilteringStats;
  
  /** Rôles risqués identifiés */
  riskyRoles: UserSodRiskyRole[];
  
  /** Warnings et erreurs */
  warnings: string[];
  errors: string[];
  
  /** Métadonnées */
  metadata: {
    fileName: string;
    fileSize: number;
    processingTimeMs: number;
    sheetsFound: string[];
  };
}

// ============================================
// CONFIGURATION DU PARSING
// ============================================

/**
 * Mapping des colonnes FR/EN pour le fichier utilisateurs
 */
export const USER_SOD_COLUMN_MAPPINGS = {
  // Colonnes spécifiques utilisateurs
  userId: ['User ID', 'ID util.', 'ID utilisateur', 'User Id'],
  executionCount: ['Execution Count', 'Comptage des exécutions', 'Execution count', 'Nb exécutions'],
  userGroup: ['User Group', 'Groupe utilisateur', 'Groupe util.'],
  
  // Colonnes communes (identiques à SodRawRecord)
  accessRiskId: ['Access Risk ID', 'ID de risque d\'accès', 'ID risque accès'],
  riskLevel: ['Risk Level', 'Niveau du risque', 'Niveau risque'],
  function: ['Function', 'Fonction'],
  system: ['System', 'Système'],
  action: ['Action'],
  resource: ['Resource', 'Ressource'],
  resourceExtn: ['Resource Extn', 'Ressource externe'],
  valueFrom: ['Value From', 'Valeur de'],
  valueTo: ['Value To', 'Valeur jusq.', 'Valeur jusqu\'à'],
  roleProfile: ['Role/Profile', 'Rôle/Profil'],
  compositeBusinessRole: ['Composite/Business Role', 'Rôle utilisateur/composite', 'Rôle composite'],
  
  // Colonnes optionnelles
  riskDescription: ['Risk Description', 'Description du risque'],
  functionDescription: ['Function Description', 'Description de fonction'],
  actionDescription: ['Action Description', 'Description action'],
  resourceDescription: ['Resource Description', 'Description de ressource'],
  resourceExtnDesc: ['Resource Extn Desc', 'Description externe de ressource'],
  roleProfileDescription: ['Role/Profile Description', 'Description de rôle/profil'],
  compositeRoleDescription: ['Composite Role Description', 'Description de rôle composite'],
  control: ['Control', 'Contrôle'],
  businessProcess: ['Business Process', 'Processus de gestion'],
} as const;

/**
 * Colonnes obligatoires pour la détection du type de fichier
 */
export const USER_SOD_REQUIRED_COLUMNS = [
  'userId',
  'accessRiskId',
  'riskLevel',
  'function',
  'action',
  'roleProfile',
] as const;

/**
 * Colonnes pour la détection automatique du type de fichier
 */
export const FILE_TYPE_DETECTION_COLUMNS = {
  /** Colonnes qui indiquent un fichier UTILISATEUR */
  userAnalysis: ['User ID', 'ID util.', 'ID utilisateur'],
  
  /** Colonnes qui indiquent un fichier RÔLE */
  roleAnalysis: ['Role Name', 'Nom du rôle'],
} as const;

