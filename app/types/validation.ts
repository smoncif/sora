/**
 * Types pour la validation des données importées
 */

/**
 * Type d'erreurs possibles lors de la validation
 */
export enum ValidationErrorType {
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_FORMAT = 'invalid_format',
  DUPLICATE_ID = 'duplicate_id',
  REFERENCE_ERROR = 'reference_error',
  CONSTRAINT_VIOLATION = 'constraint_violation',
  SHEET_MISSING = 'sheet_missing',
  COLUMN_MISSING = 'column_missing',
  DATA_TYPE_ERROR = 'data_type_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Niveaux de sévérité des erreurs
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Interface pour une erreur de validation
 */
export interface ValidationError {
  id: string;
  type: ValidationErrorType;
  severity: ValidationSeverity;
  message: string;
  sheet?: string;
  row?: number;
  column?: string;
  value?: any;
  expected?: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
  onFix?: (error: ValidationError) => void;
  onIgnore?: (error: ValidationError) => void;
}

/**
 * Résultat groupé de validation
 */
export interface ValidationResult {
  valid: boolean;
  isValid?: boolean;             // Alias pour valid
  isProcessing?: boolean;        // Indique si la validation est en cours
  structureValid?: boolean;      // Validité de la structure du fichier
  dataValid?: boolean;           // Validité des données
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  structureErrors?: string[];    // Erreurs liées à la structure
  dataErrors?: any[];            // Erreurs liées aux données
  timestamp: Date;
  
  // Statistiques
  stats: {
    totalErrors: number;
    totalWarnings: number;
    totalInfos: number;
    bySheet: Record<string, {
      errors: number;
      warnings: number;
      infos: number;
    }>;
    byType: Record<string, number>;
  };
}

/**
 * Options de validation
 */
export interface ValidationOptions {
  strictMode?: boolean;           // Traiter les avertissements comme des erreurs
  ignoreWarnings?: boolean;       // Ignorer les avertissements
  ignoreInfos?: boolean;          // Ignorer les messages d'information
  fixAutomatically?: boolean;     // Tenter de corriger automatiquement les erreurs mineures
  validateReferentialIntegrity?: boolean; // Vérifier l'intégrité référentielle entre les feuilles
  ignoreMissingSheets?: string[]; // Feuilles dont l'absence ne génère pas d'erreur
  customValidators?: Record<string, (data: any) => ValidationError[]>; // Validateurs personnalisés
  rejectOnError?: boolean;        // Rejeter l'importation en cas d'erreur de validation
}

/**
 * Options pour l'importation de données
 */
export interface ImportOptions {
  generateMissingIds?: boolean;
  validateBeforeImport?: boolean;
  validationOptions?: ValidationOptions;
  transformers?: Record<string, (data: any[]) => any[]>;
  preserveOriginalFile?: boolean;
  onProgress?: (progress: number) => void;
  onValidationComplete?: (result: ValidationResult) => void;
} 
