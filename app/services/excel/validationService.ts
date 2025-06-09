/**
 * Service de validation des fichiers Excel
 * Combine les fonctionnalités de validation des fichiers Excel
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ValidationError, 
  ValidationErrorType, 
  ValidationSeverity, 
  ValidationResult,
  ValidationOptions
} from '@/types/validation';
import { ExcelParseResult } from './excelService';

/**
 * Interface pour une règle de validation
 */
export interface ValidationRule {
  type: 'required' | 'format' | 'values' | 'dependency';
  message: string;
  validate: (value: unknown, row: Record<string, unknown>, sheetData: Record<string, unknown>[]) => boolean;
}

/**
 * Interface pour la validation d'une colonne
 */
export interface ColumnValidation {
  column: string;
  rules: ValidationRule[];
}

/**
 * Interface pour la validation d'une feuille
 */
export interface SheetValidation {
  sheetName: string;
  requiredColumns: string[];
  columnValidations: ColumnValidation[];
}

// Règles de validation pré-définies
export const ValidationRules = {
  required: (message = 'Valeur requise'): ValidationRule => ({
    type: 'required',
    message,
    validate: (value) => value !== undefined && value !== null && value !== '',
  }),

  numericFormat: (message = 'Format numérique requis'): ValidationRule => ({
    type: 'format',
    message,
    validate: (value) => value === undefined || value === null || value === '' || !isNaN(Number(value)),
  }),

  dateFormat: (message = 'Format de date requis'): ValidationRule => ({
    type: 'format',
    message,
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true;
      
      // Vérification si c'est déjà un objet Date
      if (value instanceof Date) return !isNaN(value.getTime());
      
      // Essai de conversion en date
      // S'assurer que value est convertible en string ou number avant de créer une date
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
      
      // Pour tout autre type, la validation échoue
      return false;
    },
  }),

  valueIn: (validValues: unknown[], message = 'Valeur non autorisée'): ValidationRule => ({
    type: 'values',
    message,
    validate: (value) => 
      value === undefined || 
      value === null || 
      value === '' || 
      validValues.includes(value as unknown),
  }),

  dependsOn: (
    dependentColumn: string,
    condition: (dependentValue: unknown) => boolean,
    message = 'Condition de dépendance non respectée'
  ): ValidationRule => ({
    type: 'dependency',
    message,
    validate: (value, row) => {
      const dependentValue = row[dependentColumn];
      return !condition(dependentValue) || (value !== undefined && value !== null && value !== '');
    },
  }),
};

/**
 * Valide un fichier Excel selon les critères spécifiés
 * @param file - Fichier Excel à valider
 * @param options - Options de validation
 * @returns Résultat de la validation
 */
export async function validateExcelFile(
  parseResult: ExcelParseResult,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const infos: ValidationError[] = [];
  const statsBySheet: Record<string, { errors: number; warnings: number; infos: number }> = {};
  const statsByType: Record<string, number> = {};

  try {
    // Vérifier la présence des feuilles attendues
    const requiredSheets = ['Transactions', 'Roles', 'RoleMapping'];
    const optionalSheets = ['Users'];
    const availableSheets = parseResult.sheets.map(sheet => sheet.name);
    
    // Vérification des feuilles requises
    for (const sheetName of requiredSheets) {
      if (!availableSheets.includes(sheetName) && 
          !(options.ignoreMissingSheets && options.ignoreMissingSheets.includes(sheetName))) {
        addError(
          errors,
          ValidationErrorType.SHEET_MISSING,
          `Feuille requise "${sheetName}" manquante dans le fichier`,
          { sheet: sheetName }
        );
      }
    }
    
    // Si des feuilles manquent, pas besoin de continuer la validation
    if (errors.length > 0) {
      return buildValidationResult(errors, warnings, infos, statsBySheet, statsByType);
    }

    // Valider chaque feuille présente
    for (const sheet of parseResult.sheets) {
      const sheetErrors: ValidationError[] = [];
      const sheetWarnings: ValidationError[] = [];
      const sheetInfos: ValidationError[] = [];

      // Initialiser les statistiques pour cette feuille
      statsBySheet[sheet.name] = { errors: 0, warnings: 0, infos: 0 };

      // Validation spécifique selon le type de feuille
      switch (sheet.name) {
        case 'Transactions':
          validateTransactionsSheet(sheet.data, sheetErrors, sheetWarnings, sheetInfos);
          break;
        case 'Roles':
          validateRolesSheet(sheet.data, sheetErrors, sheetWarnings, sheetInfos);
          break;
        case 'RoleMapping':
          validateRoleMappingSheet(sheet.data, sheetErrors, sheetWarnings, sheetInfos);
          break;
        case 'Users':
          validateUsersSheet(sheet.data, sheetErrors, sheetWarnings, sheetInfos);
          break;
        default:
          // Information sur les feuilles non standard
          addInfo(
            sheetInfos,
            ValidationErrorType.UNKNOWN_ERROR,
            `Feuille non standard "${sheet.name}" détectée. Elle sera ignorée lors de l'importation.`,
            { sheet: sheet.name }
          );
      }

      // Mise à jour des statistiques
      statsBySheet[sheet.name].errors = sheetErrors.length;
      statsBySheet[sheet.name].warnings = sheetWarnings.length;
      statsBySheet[sheet.name].infos = sheetInfos.length;

      // Ajout des erreurs, avertissements et infos au résultat global
      errors.push(...sheetErrors);
      warnings.push(...sheetWarnings);
      infos.push(...sheetInfos);
    }

    // Validation de l'intégrité référentielle si demandé
    if (options.validateReferentialIntegrity) {
      validateReferentialIntegrity(parseResult.sheets, errors, warnings);
    }

    // Exécution des validateurs personnalisés, si fournis
    if (options.customValidators) {
      for (const [validatorName, validatorFn] of Object.entries(options.customValidators)) {
        try {
          const customErrors = validatorFn(parseResult.sheets);
          errors.push(...customErrors);
          
          // Mise à jour des statistiques
          customErrors.forEach(error => {
            if (error.sheet && statsBySheet[error.sheet]) {
              statsBySheet[error.sheet].errors++;
            }
          });
        } catch (e) {

          addError(
            errors,
            ValidationErrorType.UNKNOWN_ERROR,
            `Erreur lors de l'exécution du validateur "${validatorName}": ${e instanceof Error ? e.message : String(e)}`
          );
        }
      }
    }

    // Comptabiliser les erreurs par type
    [...errors, ...warnings, ...infos].forEach(item => {
      statsByType[item.type] = (statsByType[item.type] || 0) + 1;
    });

    return buildValidationResult(errors, warnings, infos, statsBySheet, statsByType);
  } catch (error) {

    addError(
      errors,
      ValidationErrorType.UNKNOWN_ERROR,
      `Erreur lors de la validation: ${error instanceof Error ? error.message : String(error)}`
    );
    return buildValidationResult(errors, warnings, infos, statsBySheet, statsByType);
  }
}

/**
 * Validation de la feuille Transactions
 */
function validateTransactionsSheet(
  data: Record<string, unknown>[],
  errors: ValidationError[],
  warnings: ValidationError[],
  infos: ValidationError[]
): void {
  if (!data || data.length === 0) {
    addError(
      errors,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      'La feuille Transactions ne contient aucune donnée',
      { sheet: 'Transactions' }
    );
    return;
  }

  // Colonnes requises pour les transactions
  const requiredColumns = ['TransactionID', 'Code', 'Description', 'Category', 'Criticality'];
  
  // Vérifier les colonnes requises
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
  
  if (missingColumns.length > 0) {
    missingColumns.forEach(column => {
      addError(
        errors,
        ValidationErrorType.COLUMN_MISSING,
        `Colonne requise "${column}" manquante dans la feuille Transactions`,
        { sheet: 'Transactions', column }
      );
    });
    return; // Arrêter la validation si des colonnes requises sont manquantes
  }

  // Valider chaque ligne
  const transactionIds = new Set<string>();
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 car la première ligne est l'en-tête, et les index commencent à 0
    
    // Vérifier si TransactionID est fourni
    const transactionId = String(row.TransactionID || '');
    if (!transactionId) {
      addWarning(
        warnings,
        ValidationErrorType.MISSING_REQUIRED_FIELD,
        `TransactionID manquant à la ligne ${rowNum}`,
        { sheet: 'Transactions', row: rowNum, column: 'TransactionID' }
      );
    } else if (transactionIds.has(transactionId)) {
      // Vérifier les doublons d'ID
      addError(
        errors,
        ValidationErrorType.DUPLICATE_ID,
        `ID de transaction en doublon: "${transactionId}" à la ligne ${rowNum}`,
        { sheet: 'Transactions', row: rowNum, column: 'TransactionID', value: transactionId }
      );
    } else {
      transactionIds.add(transactionId);
    }
  });
}

/**
 * Validation de la feuille Roles
 */
function validateRolesSheet(
  data: Record<string, unknown>[],
  errors: ValidationError[],
  warnings: ValidationError[],
  infos: ValidationError[]
): void {
  if (!data || data.length === 0) {
    addError(
      errors,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      'La feuille Roles ne contient aucune donnée',
      { sheet: 'Roles' }
    );
    return;
  }

  // Colonnes requises pour les rôles
  const requiredColumns = ['RoleID', 'RoleName', 'Description'];
  
  // Vérifier les colonnes requises
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
  
  if (missingColumns.length > 0) {
    missingColumns.forEach(column => {
      addError(
        errors,
        ValidationErrorType.COLUMN_MISSING,
        `Colonne requise "${column}" manquante dans la feuille Roles`,
        { sheet: 'Roles', column }
      );
    });
    return;
  }

  // Valider chaque ligne
  const roleIds = new Set<string>();
  
  data.forEach((row, index) => {
    const rowNum = index + 2;
    
    // Vérifier si RoleID est fourni
    if (!row.RoleID) {
      addWarning(
        warnings,
        ValidationErrorType.MISSING_REQUIRED_FIELD,
        `RoleID manquant à la ligne ${rowNum}`,
        { sheet: 'Roles', row: rowNum, column: 'RoleID' }
      );
    } else if (roleIds.has(String(row.RoleID))) {
      // Vérifier les doublons d'ID
      addError(
        errors,
        ValidationErrorType.DUPLICATE_ID,
        `ID de rôle en doublon: "${row.RoleID}" à la ligne ${rowNum}`,
        { sheet: 'Roles', row: rowNum, column: 'RoleID', value: row.RoleID }
      );
    } else {
      roleIds.add(String(row.RoleID));
    }
  });
}

/**
 * Validation de la feuille RoleMapping
 */
function validateRoleMappingSheet(
  data: any[],
  errors: ValidationError[],
  warnings: ValidationError[],
  infos: ValidationError[]
): void {
  if (!data || data.length === 0) {
    addWarning(
      warnings,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      'La feuille RoleMapping ne contient aucune donnée',
      { sheet: 'RoleMapping' }
    );
    return;
  }

  // Colonnes requises pour les mappings
  const requiredColumns = ['RoleID', 'TransactionID'];
  
  // Vérifier les colonnes requises
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
  
  if (missingColumns.length > 0) {
    missingColumns.forEach(column => {
      addError(
        errors,
        ValidationErrorType.COLUMN_MISSING,
        `Colonne requise "${column}" manquante dans la feuille RoleMapping`,
        { sheet: 'RoleMapping', column }
      );
    });
    return;
  }
}

/**
 * Validation de la feuille Users
 */
function validateUsersSheet(
  data: any[],
  errors: ValidationError[],
  warnings: ValidationError[],
  infos: ValidationError[]
): void {
  if (!data || data.length === 0) {
    addInfo(
      infos,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      'La feuille Users ne contient aucune donnée. Cette feuille est optionnelle.',
      { sheet: 'Users' }
    );
    return;
  }

  // Colonnes requises pour les utilisateurs
  const requiredColumns = ['UserID', 'Username', 'RoleIDs'];
  
  // Vérifier les colonnes requises
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
  
  if (missingColumns.length > 0) {
    missingColumns.forEach(column => {
      addWarning(
        warnings,
        ValidationErrorType.COLUMN_MISSING,
        `Colonne recommandée "${column}" manquante dans la feuille Users`,
        { sheet: 'Users', column }
      );
    });
  }
}

/**
 * Validation de l'intégrité référentielle entre les feuilles
 */
function validateReferentialIntegrity(
  sheets: Array<{ name: string; data: any[] }>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  // Récupération des feuilles nécessaires
  const transactionsSheet = sheets.find(s => s.name === 'Transactions');
  const rolesSheet = sheets.find(s => s.name === 'Roles');
  const roleMappingSheet = sheets.find(s => s.name === 'RoleMapping');
  const usersSheet = sheets.find(s => s.name === 'Users');
  
  if (!transactionsSheet || !rolesSheet || !roleMappingSheet) {
    // Les vérifications des feuilles manquantes sont déjà faites ailleurs
    return;
  }
  
  // Création des ensembles d'IDs pour une vérification rapide
  const transactionIds = new Set(
    transactionsSheet.data
      .filter(row => row.TransactionID)
      .map(row => row.TransactionID)
  );
  
  const roleIds = new Set(
    rolesSheet.data
      .filter(row => row.RoleID)
      .map(row => row.RoleID)
  );
  
  // Vérification des références dans RoleMapping
  if (roleMappingSheet.data.length > 0) {
    roleMappingSheet.data.forEach((row, index) => {
      const rowNum = index + 2;
      
      // Vérifier si RoleID existe
      if (row.RoleID && !roleIds.has(row.RoleID)) {
        addError(
          errors,
          ValidationErrorType.REFERENCE_ERROR,
          `La feuille RoleMapping fait référence à un rôle inexistant: "${row.RoleID}" à la ligne ${rowNum}`,
          { sheet: 'RoleMapping', row: rowNum, column: 'RoleID', value: row.RoleID }
        );
      }
      
      // Vérifier si TransactionID existe
      if (row.TransactionID && !transactionIds.has(row.TransactionID)) {
        addError(
          errors,
          ValidationErrorType.REFERENCE_ERROR,
          `La feuille RoleMapping fait référence à une transaction inexistante: "${row.TransactionID}" à la ligne ${rowNum}`,
          { sheet: 'RoleMapping', row: rowNum, column: 'TransactionID', value: row.TransactionID }
        );
      }
    });
  }
}

/**
 * Normalise une valeur de criticité
 */
function normalizeCriticality(value: unknown): 'low' | 'medium' | 'high' {
  if (value === undefined || value === null || value === '') {
    return 'medium';
  }
  
  if (typeof value === 'number') {
    if (value >= 3) return 'high';
    if (value >= 2) return 'medium';
    return 'low';
  }
  
  const normalized = String(value).toLowerCase();
  
  if (['high', 'critical', 'important', '3'].includes(normalized)) {
    return 'high';
  }
  
  if (['medium', 'normal', 'standard', '2'].includes(normalized)) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Ajoute une erreur à la liste des erreurs
 */
function addError(
  errors: ValidationError[],
  type: ValidationErrorType, 
  message: string,
  metadata?: Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>
): void {
  errors.push({
    id: uuidv4(),
    type,
    severity: ValidationSeverity.ERROR,
    message,
    ...metadata
  });
}

/**
 * Ajoute un avertissement à la liste des avertissements
 */
function addWarning(
  warnings: ValidationError[],
  type: ValidationErrorType, 
  message: string,
  metadata?: Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>
): void {
  warnings.push({
    id: uuidv4(),
    type,
    severity: ValidationSeverity.WARNING,
    message,
    ...metadata
  });
}

/**
 * Ajoute une information à la liste des infos
 */
function addInfo(
  infos: ValidationError[],
  type: ValidationErrorType, 
  message: string,
  metadata?: Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>
): void {
  infos.push({
    id: uuidv4(),
    type,
    severity: ValidationSeverity.INFO,
    message,
    ...metadata
  });
}

/**
 * Construit le résultat final de la validation
 */
function buildValidationResult(
  errors: ValidationError[],
  warnings: ValidationError[],
  infos: ValidationError[],
  statsBySheet: Record<string, { errors: number; warnings: number; infos: number }>,
  statsByType: Record<string, number>
): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    timestamp: new Date(),
    stats: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalInfos: infos.length,
      bySheet: statsBySheet,
      byType: statsByType
    }
  };
}

/**
 * Génère un rapport de validation au format HTML
 */
export function generateValidationReport(validation: ValidationResult): string {
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="color: ${validation.valid ? 'green' : 'red'};">
        ${validation.valid ? 'Validation réussie' : 'Erreurs de validation détectées'}
      </h2>
      
      <div style="margin-bottom: 20px;">
        <h3>Résumé:</h3>
        <ul>
          <li>Erreurs: ${validation.stats.totalErrors}</li>
          <li>Avertissements: ${validation.stats.totalWarnings}</li>
          <li>Informations: ${validation.stats.totalInfos}</li>
        </ul>
      </div>
  `;

  // Erreurs
  if (validation.errors.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h3>Erreurs:</h3>
        <ul style="color: red;">
          ${validation.errors.map(error => `
            <li>${error.message} ${error.sheet ? `(Feuille: ${error.sheet}${error.row ? `, Ligne: ${error.row}` : ''}${error.column ? `, Colonne: ${error.column}` : ''})` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  // Avertissements
  if (validation.warnings.length > 0) {
    html += `
      <div style="margin-bottom: 20px;">
        <h3>Avertissements:</h3>
        <ul style="color: orange;">
          ${validation.warnings.map(warning => `
            <li>${warning.message} ${warning.sheet ? `(Feuille: ${warning.sheet}${warning.row ? `, Ligne: ${warning.row}` : ''}${warning.column ? `, Colonne: ${warning.column}` : ''})` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  html += `</div>`;
  return html;
} 
