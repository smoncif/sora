/**
 * Service de parsing Excel pour l'analyse des utilisateurs
 * 
 * Ce service traite les fichiers Excel avec la structure utilisateurs :
 * - Feuille 1 : Transactions par utilisateur (User ↔ Transaction)
 * - Feuille 2 : Mapping rôles métier ↔ rôles simples (Business Role ↔ Simple Role)
 * - Feuille 3 : Transactions par rôle simple (Simple Role ↔ Transaction)
 */

import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { 
  BusinessRoleTransaction,
  SimpleRoleTransaction,
  CoverageAnalysis,
  SimplifiedAnalysisResult
} from 'lib/types/roleAnalysis';

/**
 * Interfaces spécifiques pour l'analyse utilisateurs
 */
export interface UserTransaction {
  userId: string;
  transaction: string;
  executionCount?: number;
  year?: number;
  month?: number;
}

export interface BusinessRoleMapping {
  businessRole: string;
  simpleRole: string;
}

/**
 * Configuration pour le parsing Excel utilisateurs (3 feuilles)
 */
export interface UserExcelParsingConfig {
  maxFileSize: number;
  timeoutMs: number;
  sheetNames: {
    userTransactions: string;      // Feuille 1: User ↔ Transaction
    businessRoleMappings: string;  // Feuille 2: Business Role ↔ Simple Role
    simpleRoleTransactions: string; // Feuille 3: Simple Role ↔ Transaction
  };
  columnMappings: {
    userTransactions: {
      userId: string;
      transaction: string;
      executionCount?: string;
      year?: string;
      month?: string;
    };
    businessRoleMappings: {
      businessRole: string;
      simpleRole: string;
    };
    simpleRoleTransactions: {
      simpleRole: string;
      transaction: string;
    };
  };
}

/**
 * Configuration par défaut pour utilisateurs
 */
const DEFAULT_USER_CONFIG: UserExcelParsingConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  timeoutMs: 5 * 60 * 1000,       // 5 minutes
  sheetNames: {
    userTransactions: 'Feuille1',        // User ↔ Transaction
    businessRoleMappings: 'Feuille2',    // Business Role ↔ Simple Role  
    simpleRoleTransactions: 'Feuille3'   // Simple Role ↔ Transaction
  },
  columnMappings: {
    userTransactions: {
      userId: 'Utilisateur',
      transaction: 'Transaction',
      executionCount: 'Nombre d\'exécutions',
      year: 'Année',
      month: 'Mois'
    },
    businessRoleMappings: {
      businessRole: 'Rôle Métier',
      simpleRole: 'Rôle Simple'
    },
    simpleRoleTransactions: {
      simpleRole: 'Rôle Simple',
      transaction: 'Transaction'
    }
  }
};

/**
 * Résultat du parsing Excel utilisateurs
 */
export interface UserExcelParsingResult {
  userTransactions: UserTransaction[];
  businessRoleMappings: BusinessRoleMapping[];
  simpleRoleTransactions: SimpleRoleTransaction[];
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
 * Parse un fichier Excel utilisateurs avec 3 feuilles
 */
export async function parseUserExcelFile(
  file: File,
  config: Partial<UserExcelParsingConfig> = {}
): Promise<UserExcelParsingResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_USER_CONFIG, ...config };
  
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
    
    // Vérifier qu'il y a au moins 3 feuilles
    if (sheetsFound.length < 3) {
      throw new Error(`Le fichier Excel pour l'analyse utilisateurs doit contenir au moins 3 feuilles. Trouvé : ${sheetsFound.length} feuille(s) : ${sheetsFound.join(', ')}`);
    }
    
    // Vérifier que les feuilles requises existent
    const userTransactionSheet = findSheet(workbook, finalConfig.sheetNames.userTransactions, sheetsFound);
    const businessRoleMappingSheet = findSheet(workbook, finalConfig.sheetNames.businessRoleMappings, sheetsFound);
    const simpleRoleSheet = findSheet(workbook, finalConfig.sheetNames.simpleRoleTransactions, sheetsFound);
    
    if (!userTransactionSheet) {
      throw new Error(`Feuille des transactions utilisateurs non trouvée. Feuilles disponibles : ${sheetsFound.join(', ')}`);
    }
    
    if (!businessRoleMappingSheet) {
      throw new Error(`Feuille des mappings rôles métier non trouvée. Feuilles disponibles : ${sheetsFound.join(', ')}`);
    }
    
    if (!simpleRoleSheet) {
      throw new Error(`Feuille des transactions de rôles simples non trouvée. Feuilles disponibles : ${sheetsFound.join(', ')}`);
    }

    // Parser les 3 feuilles
    const userTransactions = parseUserTransactionSheet(
      workbook.Sheets[userTransactionSheet],
      finalConfig.columnMappings.userTransactions,
      warnings,
      errors
    );
    
    const businessRoleMappings = parseBusinessRoleMappingSheet(
      workbook.Sheets[businessRoleMappingSheet],
      finalConfig.columnMappings.businessRoleMappings,
      warnings,
      errors
    );
    
    const simpleRoleTransactions = parseSimpleRoleTransactionSheet(
      workbook.Sheets[simpleRoleSheet],
      finalConfig.columnMappings.simpleRoleTransactions,
      warnings,
      errors
    );

    const processingTime = Date.now() - startTime;
    
    // Vérifier le timeout
    if (processingTime > finalConfig.timeoutMs) {
      warnings.push(`Temps de traitement dépassé (${Math.round(processingTime / 1000)}s > ${Math.round(finalConfig.timeoutMs / 1000)}s)`);
    }

    // Calculer les métadonnées
    const uniqueUsers = new Set(userTransactions.map(ut => ut.userId));
    const uniqueBusinessRoles = new Set(businessRoleMappings.map(brm => brm.businessRole));
    const uniqueSimpleRoles = new Set(simpleRoleTransactions.map(srt => srt.simpleRole));
    const allTransactions = new Set([
      ...userTransactions.map(ut => ut.transaction),
      ...simpleRoleTransactions.map(srt => srt.transaction)
    ]);

    return {
      userTransactions,
      businessRoleMappings,
      simpleRoleTransactions,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        sheetsFound,
        userCount: uniqueUsers.size,
        businessRoleCount: uniqueBusinessRoles.size,
        simpleRoleCount: uniqueSimpleRoles.size,
        totalTransactions: allTransactions.size,
        processingTimeMs: processingTime
      },
      warnings,
      errors
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Impossible de parser le fichier Excel : ${errorMessage}`);
  }
}

/**
 * Trouve une feuille dans le workbook (support noms flexibles)
 */
function findSheet(workbook: XLSX.WorkBook, expectedName: string, availableSheets: string[]): string | null {
  // Chercher le nom exact d'abord
  if (availableSheets.includes(expectedName)) {
    return expectedName;
  }
  
  // Chercher par index si c'est FeuillX
  if (expectedName.startsWith('Feuille')) {
    const index = parseInt(expectedName.replace('Feuille', '')) - 1;
    if (index >= 0 && index < availableSheets.length) {
      return availableSheets[index];
    }
  }
  
  // Chercher par correspondance partielle (insensible à la casse)
  const lowerExpected = expectedName.toLowerCase();
  const match = availableSheets.find(sheet => 
    sheet.toLowerCase().includes(lowerExpected) || 
    lowerExpected.includes(sheet.toLowerCase())
  );
  
  return match || null;
}

/**
 * Parse la feuille des transactions utilisateurs
 */
function parseUserTransactionSheet(
  worksheet: XLSX.WorkSheet,
  columnMapping: UserExcelParsingConfig['columnMappings']['userTransactions'],
  warnings: string[],
  errors: string[]
): UserTransaction[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  const userTransactions: UserTransaction[] = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2; // +2 car header = ligne 1, data commence ligne 2
    
    try {
      const userId = row[columnMapping.userId];
      const transaction = row[columnMapping.transaction];
      
      if (!userId || !transaction) {
        warnings.push(`Ligne ${rowNumber}: Utilisateur ou transaction manquant`);
        continue;
      }
      
      const userTransaction: UserTransaction = {
        userId: String(userId).trim(),
        transaction: String(transaction).trim(),
        executionCount: columnMapping.executionCount ? parseInt(row[columnMapping.executionCount]) || 1 : 1,
        year: columnMapping.year ? parseInt(row[columnMapping.year]) || new Date().getFullYear() : new Date().getFullYear(),
        month: columnMapping.month ? parseInt(row[columnMapping.month]) || 1 : 1
      };
      
      userTransactions.push(userTransaction);
      
    } catch (error) {
      errors.push(`Ligne ${rowNumber}: Erreur de parsing - ${error}`);
    }
  }
  
  return userTransactions;
}

/**
 * Parse la feuille des mappings rôles métier ↔ rôles simples
 */
function parseBusinessRoleMappingSheet(
  worksheet: XLSX.WorkSheet,
  columnMapping: UserExcelParsingConfig['columnMappings']['businessRoleMappings'],
  warnings: string[],
  errors: string[]
): BusinessRoleMapping[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  const businessRoleMappings: BusinessRoleMapping[] = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2;
    
    try {
      const businessRole = row[columnMapping.businessRole];
      const simpleRole = row[columnMapping.simpleRole];
      
      if (!businessRole || !simpleRole) {
        warnings.push(`Ligne ${rowNumber}: Rôle métier ou rôle simple manquant`);
        continue;
      }
      
      businessRoleMappings.push({
        businessRole: String(businessRole).trim(),
        simpleRole: String(simpleRole).trim()
      });
      
    } catch (error) {
      errors.push(`Ligne ${rowNumber}: Erreur de parsing - ${error}`);
    }
  }
  
  return businessRoleMappings;
}

/**
 * Parse la feuille des transactions par rôle simple
 */
function parseSimpleRoleTransactionSheet(
  worksheet: XLSX.WorkSheet,
  columnMapping: UserExcelParsingConfig['columnMappings']['simpleRoleTransactions'],
  warnings: string[],
  errors: string[]
): SimpleRoleTransaction[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
  const simpleRoleTransactions: SimpleRoleTransaction[] = [];
  
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i];
    const rowNumber = i + 2;
    
    try {
      const simpleRole = row[columnMapping.simpleRole];
      const transaction = row[columnMapping.transaction];
      
      if (!simpleRole || !transaction) {
        warnings.push(`Ligne ${rowNumber}: Rôle simple ou transaction manquant`);
        continue;
      }
      
      simpleRoleTransactions.push({
        simpleRole: String(simpleRole).trim(),
        transaction: String(transaction).trim()
      });
      
    } catch (error) {
      errors.push(`Ligne ${rowNumber}: Erreur de parsing - ${error}`);
    }
  }
  
  return simpleRoleTransactions;
}

/**
 * Transforme les données utilisateurs en format compatible avec l'analyse existante
 */
export function transformUserDataToAnalysisFormat(
  userParsingResult: UserExcelParsingResult
): {
  businessRoleTransactions: BusinessRoleTransaction[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  userAnalysisData: {
    users: { id: string; transactions: string[]; executionCount: number }[];
    businessRoleMappings: BusinessRoleMapping[];
  };
} {
  const { userTransactions, businessRoleMappings, simpleRoleTransactions } = userParsingResult;
  
  // 1. Créer des mappings pour la jointure
  // Map: transaction -> simpleRoles
  const transactionToSimpleRoles = new Map<string, Set<string>>();
  simpleRoleTransactions.forEach(srt => {
    if (!transactionToSimpleRoles.has(srt.transaction)) {
      transactionToSimpleRoles.set(srt.transaction, new Set());
    }
    transactionToSimpleRoles.get(srt.transaction)!.add(srt.simpleRole);
  });
  
  // Map: simpleRole -> businessRoles
  const simpleRoleToBusinessRoles = new Map<string, Set<string>>();
  businessRoleMappings.forEach(brm => {
    if (!simpleRoleToBusinessRoles.has(brm.simpleRole)) {
      simpleRoleToBusinessRoles.set(brm.simpleRole, new Set());
    }
    simpleRoleToBusinessRoles.get(brm.simpleRole)!.add(brm.businessRole);
  });
  
  // 2. Créer des BusinessRoleTransaction pour chaque utilisateur avec les vrais rôles métier
  const businessRoleTransactions: BusinessRoleTransaction[] = [];
  
  // Grouper les transactions par utilisateur
  const userTransactionMap = new Map<string, UserTransaction[]>();
  userTransactions.forEach(ut => {
    if (!userTransactionMap.has(ut.userId)) {
      userTransactionMap.set(ut.userId, []);
    }
    userTransactionMap.get(ut.userId)!.push(ut);
  });
  
  // Pour chaque utilisateur, créer des BusinessRoleTransaction pour TOUTES ses transactions
  userTransactionMap.forEach((transactions, userId) => {
    // CORRECTION : Créer des BusinessRoleTransaction pour TOUTES les transactions de l'utilisateur
    // Pas seulement celles qui sont dans les rôles métier
    transactions.forEach(ut => {
      businessRoleTransactions.push({
        businessRole: userId, // L'utilisateur reste l'élément principal
        transaction: ut.transaction,
        executionCount: ut.executionCount || 1,
        year: ut.year || new Date().getFullYear(),
        month: ut.month || 1
      });
    });
  });
  
  // 3. Préparer les données spécifiques utilisateurs
  const users = Array.from(userTransactionMap.entries()).map(([userId, transactions]) => ({
    id: userId,
    transactions: transactions.map(ut => ut.transaction),
    executionCount: transactions.reduce((sum, ut) => sum + (ut.executionCount || 1), 0)
  }));
  
  // 4. Créer des SimpleRoleTransaction basées sur les rôles métier (pas les rôles simples)
  // Pour l'analyse des utilisateurs, on veut analyser les rôles métier comme "rôles simples"
  const businessRoleBasedSimpleRoleTransactions: SimpleRoleTransaction[] = [];
  
  // Créer des mappings transaction -> businessRoles (via simpleRoles)
  const transactionToBusinessRoles = new Map<string, Set<string>>();
  
  simpleRoleTransactions.forEach(srt => {
    const simpleRoles = transactionToSimpleRoles.get(srt.transaction) || new Set();
    simpleRoles.forEach(simpleRole => {
      const businessRoles = simpleRoleToBusinessRoles.get(simpleRole) || new Set();
      businessRoles.forEach(businessRole => {
        if (!transactionToBusinessRoles.has(srt.transaction)) {
          transactionToBusinessRoles.set(srt.transaction, new Set());
        }
        transactionToBusinessRoles.get(srt.transaction)!.add(businessRole);
      });
    });
  });
  
  // Créer des SimpleRoleTransaction où simpleRole = businessRole
  transactionToBusinessRoles.forEach((businessRoles, transaction) => {
    businessRoles.forEach(businessRole => {
      businessRoleBasedSimpleRoleTransactions.push({
        simpleRole: businessRole, // Le rôle métier devient le "rôle simple"
        transaction: transaction
      });
    });
  });
  
  return {
    businessRoleTransactions,
    simpleRoleTransactions: businessRoleBasedSimpleRoleTransactions, // Utiliser les rôles métier
    userAnalysisData: {
      users,
      businessRoleMappings
    }
  };
}
