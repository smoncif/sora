/**
 * Service d'analyse simplifié pour les rôles métier
 * 
 * Ce service traite les fichiers Excel avec la nouvelle structure simplifiée :
 * - Feuille 1 : Historique des transactions par rôle métier
 * - Feuille 2 : Modèle de rôles simples SAP
 */

import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { findSheetForRoleAnalysisTemplate } from 'lib/services/analysis/analysisExcelSheetFinders';
import { 
  BusinessRoleTransaction,
  SimpleRoleTransaction,
  CoverageAnalysis,
  SimpleRoleCoverage,
  SimplifiedAnalysisResult
} from 'lib/types/roleAnalysis';

/**
 * Configuration pour le parsing Excel
 */
export interface ExcelParsingConfig {
  maxFileSize: number; // 100MB par défaut
  timeoutMs: number;   // 5 minutes par défaut
  sheetNames: {
    businessRoles: string;
    simpleRoles: string;
  };
  columnMappings: {
    businessRoles: {
      process?: string;         // 🆕 Processus métier (optionnel)
      businessRole: string;
      year?: string;
      month?: string;
      transaction: string;
      executionCount?: string;
    };
    simpleRoles: {
      simpleRole: string;
      transaction: string;
      roleDescription?: string;
      transactionDescription?: string;
    };
  };
}

/**
 * Configuration par défaut (exportée pour validation pré-parser)
 */
export const DEFAULT_CONFIG: ExcelParsingConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  timeoutMs: 5 * 60 * 1000,       // 5 minutes
  sheetNames: {
    businessRoles: 'Feuille1', // Ou 'Business Roles', 'Historique', etc.
    simpleRoles: 'Feuille2'     // Ou 'Simple Roles', 'Modèle', etc.
  },
  columnMappings: {
    businessRoles: {
      process: 'Process',               // 🆕 Processus (optionnel)
      businessRole: 'Rôle métier',
      year: 'Année',
      month: 'Mois',
      transaction: 'Transaction',
      executionCount: 'Nombre d\'exécutions'
    },
    simpleRoles: {
      simpleRole: 'Rôle simple',
      transaction: 'Transaction',
      roleDescription: 'Description du rôle',
      transactionDescription: 'Description de la transaction'
    }
  }
};

/**
 * Résultat du parsing Excel
 */
export interface ExcelParsingResult {
  businessRoleTransactions: BusinessRoleTransaction[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  metadata: {
    fileName: string;
    fileSize: number;
    sheetsFound: string[];
    businessRoleCount: number;
    simpleRoleCount: number;
    totalTransactions: number;
    processingTimeMs: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Parse un fichier Excel selon la nouvelle structure
 */
export async function parseExcelFile(
  file: File,
  config: Partial<ExcelParsingConfig> = {}
): Promise<ExcelParsingResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Validation de la taille du fichier
  if (file.size > finalConfig.maxFileSize) {
    throw new Error(`Le fichier est trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Limite : ${Math.round(finalConfig.maxFileSize / 1024 / 1024)}MB`);
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Lire le fichier Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheetsFound = workbook.SheetNames;
    
    // Vérifier que les feuilles requises existent
    const businessRoleSheet = findSheetForRoleAnalysisTemplate(
      finalConfig.sheetNames.businessRoles,
      sheetsFound
    );
    const simpleRoleSheet = findSheetForRoleAnalysisTemplate(
      finalConfig.sheetNames.simpleRoles,
      sheetsFound
    );
    
    if (!businessRoleSheet) {
      throw new Error(`Feuille des rôles métier non trouvée. Feuilles disponibles : ${sheetsFound.join(', ')}`);
    }
    
    if (!simpleRoleSheet) {
      throw new Error(`Feuille des rôles simples non trouvée. Feuilles disponibles : ${sheetsFound.join(', ')}`);
    }

    // Parser les données
    const businessRoleTransactions = parseBusinessRoleSheet(
      workbook.Sheets[businessRoleSheet],
      finalConfig.columnMappings.businessRoles,
      warnings,
      errors
    );
    
    const simpleRoleTransactions = parseSimpleRoleSheet(
      workbook.Sheets[simpleRoleSheet],
      finalConfig.columnMappings.simpleRoles,
      warnings,
      errors
    );

    const processingTime = Date.now() - startTime;
    
    // Vérifier le timeout
    if (processingTime > finalConfig.timeoutMs) {
      throw new Error(`Timeout dépassé (${Math.round(processingTime / 1000)}s). Limite : ${Math.round(finalConfig.timeoutMs / 1000)}s`);
    }

    return {
      businessRoleTransactions,
      simpleRoleTransactions,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        sheetsFound,
        businessRoleCount: new Set(businessRoleTransactions.map(t => t.businessRole)).size,
        simpleRoleCount: new Set(simpleRoleTransactions.map(t => t.simpleRole)).size,
        totalTransactions: new Set([
          ...businessRoleTransactions.map(t => t.transaction),
          ...simpleRoleTransactions.map(t => t.transaction)
        ]).size,
        processingTimeMs: processingTime
      },
      warnings,
      errors
    };
    
  } catch (error: any) {
    throw new Error(`Erreur lors du parsing Excel : ${error.message}`);
  }
}

/**
 * Parse la feuille des rôles métier
 */
function parseBusinessRoleSheet(
  sheet: XLSX.WorkSheet,
  columnMapping: ExcelParsingConfig['columnMappings']['businessRoles'],
  warnings: string[],
  errors: string[]
): BusinessRoleTransaction[] {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (data.length === 0) {
    throw new Error('La feuille des rôles métier est vide');
  }
  
  // Trouver la ligne d'en-tête
  const headerRow = data[0];
  const columnIndexes = mapColumns(headerRow, columnMapping);
  
  if (columnIndexes.businessRole === -1) {
    throw new Error(`Colonne "${columnMapping.businessRole}" non trouvée dans la feuille des rôles métier`);
  }
  
  if (columnIndexes.transaction === -1) {
    throw new Error(`Colonne "${columnMapping.transaction}" non trouvée dans la feuille des rôles métier`);
  }
  
  const transactions: BusinessRoleTransaction[] = [];
  
  // Parser les données (en commençant à la ligne 2)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (!row || row.length === 0) continue;
    
    const businessRole = getCellValue(row, columnIndexes.businessRole);
    const transaction = getCellValue(row, columnIndexes.transaction);
    
    // Vérifier les champs obligatoires
    if (!businessRole || !transaction) {
      warnings.push(`Ligne ${i + 1} : Rôle métier ou transaction manquant`);
      continue;
    }
    
    const transactionData: BusinessRoleTransaction = {
      businessRole: String(businessRole).trim(),
      transaction: String(transaction).trim()
    };
    
    // Champs optionnels
    if (columnIndexes.process !== undefined && columnIndexes.process !== -1) {
      const process = getCellValue(row, columnIndexes.process);
      if (process) transactionData.process = String(process).trim();
    }
    
    if (columnIndexes.year !== -1) {
      const year = getCellValue(row, columnIndexes.year);
      if (year) transactionData.year = Number(year);
    }
    
    if (columnIndexes.month !== -1) {
      const month = getCellValue(row, columnIndexes.month);
      if (month) transactionData.month = Number(month);
    }
    
    if (columnIndexes.executionCount !== -1) {
      const count = getCellValue(row, columnIndexes.executionCount);
      if (count) transactionData.executionCount = Number(count) || 1;
    }
    
    transactions.push(transactionData);
  }
  
  if (transactions.length === 0) {
    throw new Error('Aucune transaction valide trouvée dans la feuille des rôles métier');
  }
  
  return transactions;
}

/**
 * Parse la feuille des rôles simples
 */
function parseSimpleRoleSheet(
  sheet: XLSX.WorkSheet,
  columnMapping: ExcelParsingConfig['columnMappings']['simpleRoles'],
  warnings: string[],
  errors: string[]
): SimpleRoleTransaction[] {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (data.length === 0) {
    throw new Error('La feuille des rôles simples est vide');
  }
  
  // Trouver la ligne d'en-tête
  const headerRow = data[0];
  const columnIndexes = {
    simpleRole: findColumnIndex(headerRow, columnMapping.simpleRole),
    transaction: findColumnIndex(headerRow, columnMapping.transaction),
    roleDescription: columnMapping.roleDescription ? findColumnIndex(headerRow, columnMapping.roleDescription) : -1,
    transactionDescription: columnMapping.transactionDescription ? findColumnIndex(headerRow, columnMapping.transactionDescription) : -1
  };
  
  if (columnIndexes.simpleRole === -1) {
    throw new Error(`Colonne "${columnMapping.simpleRole}" non trouvée dans la feuille des rôles simples`);
  }
  
  if (columnIndexes.transaction === -1) {
    throw new Error(`Colonne "${columnMapping.transaction}" non trouvée dans la feuille des rôles simples`);
  }
  
  const transactions: SimpleRoleTransaction[] = [];
  
  // Parser les données (en commençant à la ligne 2)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (!row || row.length === 0) continue;
    
    const simpleRole = getCellValue(row, columnIndexes.simpleRole);
    const transaction = getCellValue(row, columnIndexes.transaction);
    
    // Vérifier les champs obligatoires
    if (!simpleRole || !transaction) {
      warnings.push(`Ligne ${i + 1} : Rôle simple ou transaction manquant`);
      continue;
    }
    
    // Extraire les champs optionnels
    const roleDescription = columnIndexes.roleDescription >= 0 ? getCellValue(row, columnIndexes.roleDescription) : null;
    const transactionDescription = columnIndexes.transactionDescription >= 0 ? getCellValue(row, columnIndexes.transactionDescription) : null;
    
    transactions.push({
      simpleRole: String(simpleRole).trim(),
      transaction: String(transaction).trim(),
      roleDescription: roleDescription ? String(roleDescription).trim() : undefined,
      transactionDescription: transactionDescription ? String(transactionDescription).trim() : undefined
    });
  }
  
  if (transactions.length === 0) {
    throw new Error('Aucune transaction valide trouvée dans la feuille des rôles simples');
  }
  
  return transactions;
}

/**
 * Mappe les colonnes selon la configuration
 */
function mapColumns(headerRow: any[], columnMapping: any): Record<string, number> {
  const result: Record<string, number> = {};
  
  for (const [key, columnName] of Object.entries(columnMapping)) {
    if (columnName) {
      result[key] = findColumnIndex(headerRow, columnName as string);
    } else {
      result[key] = -1;
    }
  }
  
  return result;
}

/**
 * Trouve l'index d'une colonne par nom
 */
function findColumnIndex(headerRow: any[], columnName: string): number {
  return headerRow.findIndex(header => 
    String(header).toLowerCase().trim() === columnName.toLowerCase().trim()
  );
}

/**
 * Récupère la valeur d'une cellule
 */
function getCellValue(row: any[], index: number): any {
  return index >= 0 && index < row.length ? row[index] : null;
}

/**
 * Calcule l'analyse de couverture avec optimisation des performances maximale
 * Optimisations appliquées :
 * - Utilisation de Map/Set pour des lookups O(1) au lieu de Array.filter O(n)
 * - Pré-filtrage des rôles simples pertinents
 * - Évitement des recalculs redondants
 * - Optimisations mémoire pour les gros datasets
 */
export function calculateCoverageAnalysis(
  businessRoleTransactions: BusinessRoleTransaction[],
  simpleRoleTransactions: SimpleRoleTransaction[],
  minCoverageThreshold: number = 0
): CoverageAnalysis[] {
  // 🚀 OPTIMISATION 1 : Grouper avec Map pour des performances O(1)
  const businessRoleGroups = new Map<string, BusinessRoleTransaction[]>();
  const simpleRoleGroups = new Map<string, SimpleRoleTransaction[]>();
  
  // Grouper les transactions par rôle métier
  businessRoleTransactions.forEach((transaction: BusinessRoleTransaction) => {
    const role = transaction.businessRole;
    if (!businessRoleGroups.has(role)) {
      businessRoleGroups.set(role, []);
    }
    businessRoleGroups.get(role)!.push(transaction);
  });
  
  // Grouper les transactions par rôle simple
  simpleRoleTransactions.forEach((transaction: SimpleRoleTransaction) => {
    const role = transaction.simpleRole;
    if (!simpleRoleGroups.has(role)) {
      simpleRoleGroups.set(role, []);
    }
    simpleRoleGroups.get(role)!.push(transaction);
  });
  
  const analyses: CoverageAnalysis[] = [];
  
  // 🚀 OPTIMISATION 2 : Traitement par batch pour éviter les blocages UI sur gros datasets
  businessRoleGroups.forEach((transactions: BusinessRoleTransaction[], businessRole: string) => {
    // Dédupliquer les transactions avec Set (plus rapide qu'Array.from(new Set()))
    const uniqueTransactionSet = new Set<string>(transactions.map((t: BusinessRoleTransaction) => t.transaction));
    const uniqueTransactions = Array.from(uniqueTransactionSet);
    const totalTransactions = uniqueTransactions.length;
    
    // 🚀 OPTIMISATION 3 : Map des fréquences d'exécution (calculée une seule fois)
    const executionFrequencyMap = new Map<string, number>();
    transactions.forEach((transaction: BusinessRoleTransaction) => {
      const existing = executionFrequencyMap.get(transaction.transaction) || 0;
      executionFrequencyMap.set(transaction.transaction, existing + (transaction.executionCount || 1));
    });
    
    // 🚀 OPTIMISATION 4 : Pré-filtrer les rôles simples avec au moins une intersection
    const relevantSimpleRoles = new Map<string, {
      transactions: Set<string>;
      intersectionSize: number;
    }>();
    
    simpleRoleGroups.forEach((simpleTransactions: SimpleRoleTransaction[], simpleRole: string) => {
      const simpleRoleTransactionSet = new Set<string>(simpleTransactions.map((t: SimpleRoleTransaction) => t.transaction));
      
      // Calcul rapide de l'intersection
      let intersectionSize = 0;
      uniqueTransactionSet.forEach((transaction: string) => {
        if (simpleRoleTransactionSet.has(transaction)) {
          intersectionSize++;
        }
      });
      
      // Ne garder que les rôles avec au moins une transaction en commun
      if (intersectionSize > 0) {
        relevantSimpleRoles.set(simpleRole, {
          transactions: simpleRoleTransactionSet,
          intersectionSize
        });
      }
    });
    
    // 🚀 OPTIMISATION 5 : Traitement optimisé des rôles simples pertinents
    const simpleRoles: SimpleRoleCoverage[] = [];
    
    relevantSimpleRoles.forEach((roleData: { transactions: Set<string>; intersectionSize: number; }, simpleRole: string) => {
      const { transactions: simpleRoleTransactionSet, intersectionSize } = roleData;
      
      // Les transactions couvertes sont exactement celles de l'intersection
      const coveredTransactions: string[] = [];
      const uncoveredTransactions: string[] = [];
      
      // Un seul passage pour déterminer couvertes/non-couvertes
      uniqueTransactions.forEach((transaction: string) => {
        if (simpleRoleTransactionSet.has(transaction)) {
          coveredTransactions.push(transaction);
        } else {
          uncoveredTransactions.push(transaction);
        }
      });
      
      const coveragePercentage = totalTransactions > 0 
        ? Math.round((intersectionSize / totalTransactions) * 100)
        : 0;
      
      // Appliquer le seuil minimum
      if (coveragePercentage >= minCoverageThreshold) {
        // 🚀 OPTIMISATION 6 : Calcul rapide de la fréquence d'exécution
        let executionFrequency = 0;
        coveredTransactions.forEach((transaction: string) => {
          executionFrequency += executionFrequencyMap.get(transaction) || 1;
        });
        
        simpleRoles.push({
          roleName: simpleRole,
          coveragePercentage,
          coveredTransactions,
          uncoveredTransactions,
          isSelected: false,
          executionFrequency
        });
      }
    });
    
    // 🚀 OPTIMISATION 7 : Tri optimisé (une seule opération)
    simpleRoles.sort((a, b) => {
      // Tri principal par pourcentage de couverture (décroissant)
      const coverageDiff = b.coveragePercentage - a.coveragePercentage;
      if (coverageDiff !== 0) return coverageDiff;
      
      // Tri secondaire par fréquence d'exécution (décroissant)
      return (b.executionFrequency || 0) - (a.executionFrequency || 0);
    });
    
    analyses.push({
      businessRole,
      totalTransactions,
      uniqueTransactions,
      simpleRoles
    });
  });
  
  return analyses;
}

/**
 * Crée un résultat d'analyse complet
 */
export function createSimplifiedAnalysisResult(
  parsingResult: ExcelParsingResult,
  coverageAnalyses: CoverageAnalysis[],
  name: string,
  description?: string
): SimplifiedAnalysisResult {
  return {
    id: uuidv4(),
    name,
    description,
    timestamp: new Date(),
    businessRoleTransactions: parsingResult.businessRoleTransactions,
    simpleRoleTransactions: parsingResult.simpleRoleTransactions,
    coverageAnalyses,
    metadata: {
      fileName: parsingResult.metadata.fileName,
      fileSize: parsingResult.metadata.fileSize,
      importDate: new Date(),
      totalBusinessRoles: parsingResult.metadata.businessRoleCount,
      totalSimpleRoles: parsingResult.metadata.simpleRoleCount,
      totalTransactions: parsingResult.metadata.totalTransactions,
      processingTimeMs: parsingResult.metadata.processingTimeMs
    },
    userSelections: {},
    analysisParams: {
      minCoverageThreshold: 0,
      includeFrequency: true
    }
  };
}

/**
 * Fonction utilitaire pour grouper par propriété
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
} 

