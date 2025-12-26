/**
 * Service de parsing Excel pour l'analyse SoD Utilisateurs (Step 3)
 * 
 * Responsabilités :
 * 1. Lire le fichier Excel utilisateurs (bilingue FR/EN)
 * 2. Pré-filtrage automatique (même logique que sodParsingService) :
 *    - Garder lignes avec "Control" vide
 *    - Garder lignes avec "Access Risk ID" non vide
 *    - Supprimer doublons
 * 3. Parser les colonnes spécifiques utilisateurs (User ID, Execution Count)
 * 4. Préparer les données pour l'analyse des rôles risqués
 */

import * as XLSX from 'xlsx';
import {
  UserSodRawRecord,
  UserSodParsingResult,
  UserSodFilteringStats,
  USER_SOD_COLUMN_MAPPINGS,
} from 'lib/types/userSodAnalysis';
import { SOD_RISK_LEVEL_MAPPING, SodRiskLevel } from 'lib/types/sodAnalysis';

/**
 * Configuration par défaut pour le parsing SoD Utilisateurs
 */
interface UserSodParsingConfig {
  maxFileSize: number;
  timeoutMs: number;
}

const DEFAULT_CONFIG: UserSodParsingConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  timeoutMs: 120000, // 2 minutes
};

/**
 * Trouve une colonne dans les headers (support bilingue)
 */
function findColumn(headers: string[], possibleNames: readonly string[]): number {
  const headersLower = headers.map(h => h.toLowerCase().trim());
  
  for (const name of possibleNames) {
    const nameLower = name.toLowerCase().trim();
    const index = headersLower.indexOf(nameLower);
    if (index !== -1) return index;
  }
  
  return -1;
}

/**
 * Normalise le niveau de risque (FR/EN → SodRiskLevel)
 */
function normalizeRiskLevel(riskLevel: string): SodRiskLevel {
  const normalized = riskLevel.toLowerCase().trim();
  return SOD_RISK_LEVEL_MAPPING[normalized] || 'LOW';
}

/**
 * Vérifie si une valeur est vide ou undefined
 */
function isEmpty(value: any): boolean {
  return value === undefined || value === null || value === '' || String(value).trim() === '';
}

/**
 * Crée une clé unique pour détecter les doublons
 * Inclut userId et executionCount pour différencier des records similaires
 */
function createRecordKey(record: UserSodRawRecord): string {
  return [
    record.userId,
    record.accessRiskId,
    record.function,
    record.action,
    record.resource,
    record.resourceExtn,
    record.valueFrom,
    record.valueTo,
    record.roleProfile,
    record.compositeBusinessRole,
  ].join('|').toLowerCase();
}

/**
 * Parse un fichier Excel SoD Utilisateurs avec pré-filtrage automatique
 * 
 * PRÉ-FILTRAGE (identique au parsing rôles) :
 * 1. Garder uniquement les lignes où "Control" est vide
 * 2. Garder uniquement les lignes où "Access Risk ID" n'est pas vide
 * 3. Supprimer les doublons
 */
export async function parseUserSodExcelFile(
  file: File,
  config: Partial<UserSodParsingConfig> = {}
): Promise<UserSodParsingResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Validation de la taille du fichier
  if (file.size > finalConfig.maxFileSize) {
    throw new Error(
      `Le fichier est trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). ` +
      `Limite : ${Math.round(finalConfig.maxFileSize / 1024 / 1024)}MB`
    );
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Lire le fichier Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheetsFound = workbook.SheetNames;
    
    // Prendre la première feuille
    if (sheetsFound.length === 0) {
      throw new Error('Le fichier Excel ne contient aucune feuille');
    }
    
    if (sheetsFound.length > 1) {
      warnings.push(`Le fichier contient ${sheetsFound.length} feuilles. Seule la première sera analysée.`);
    }
    
    const sheetName = sheetsFound[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    
    if (jsonData.length === 0) {
      throw new Error('La feuille Excel est vide');
    }
    
    // Première ligne = headers
    const headers = jsonData[0].map((h: any) => String(h).trim());
    
    // Mapper les colonnes
    const columnIndexes: Record<string, number> = {};
    
    // Colonnes obligatoires pour l'analyse utilisateur
    const requiredFields = [
      'userId',
      'accessRiskId', 
      'riskLevel', 
      'function', 
      'action', 
      'roleProfile',
    ] as const;
    
    // Colonnes optionnelles mais importantes
    const optionalFields = [
      'executionCount',
      'userGroup',
      'system',
      'resource',
      'resourceExtn',
      'valueFrom',
      'valueTo',
      'compositeBusinessRole',
      'riskDescription',
      'functionDescription',
      'actionDescription',
      'resourceDescription',
      'resourceExtnDesc',
      'roleProfileDescription',
      'compositeRoleDescription',
      'control',
      'businessProcess',
    ] as const;
    
    // Trouver les colonnes obligatoires
    for (const field of requiredFields) {
      const mapping = USER_SOD_COLUMN_MAPPINGS[field as keyof typeof USER_SOD_COLUMN_MAPPINGS];
      if (mapping) {
        const index = findColumn(headers, mapping);
        
        if (index === -1) {
          errors.push(`Colonne obligatoire non trouvée : ${Array.from(mapping).join(' / ')}`);
        } else {
          columnIndexes[field] = index;
        }
      }
    }
    
    // Trouver les colonnes optionnelles
    for (const field of optionalFields) {
      const mapping = USER_SOD_COLUMN_MAPPINGS[field as keyof typeof USER_SOD_COLUMN_MAPPINGS];
      if (mapping) {
        const index = findColumn(headers, mapping);
        if (index !== -1) {
          columnIndexes[field] = index;
        }
      }
    }
    
    // Si des colonnes obligatoires manquent, arrêter
    if (errors.length > 0) {
      throw new Error(`Colonnes obligatoires manquantes :\n${errors.join('\n')}`);
    }
    
    // Parser les lignes de données
    const rawRecords: UserSodRawRecord[] = [];
    let originalRecordCount = 0;
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      originalRecordCount++;
      
      // Extraire les valeurs selon le mapping
      const getValue = (field: string): string => {
        const index = columnIndexes[field];
        if (index === undefined) return '';
        const value = row[index];
        return value ? String(value).trim() : '';
      };
      
      const getNumberValue = (field: string): number => {
        const strValue = getValue(field);
        const num = parseInt(strValue, 10);
        return isNaN(num) ? 0 : num;
      };
      
      const record: UserSodRawRecord = {
        // Colonnes spécifiques utilisateurs
        userId: getValue('userId'),
        executionCount: getNumberValue('executionCount'),
        userGroup: getValue('userGroup') || undefined,
        
        // Colonnes communes
        accessRiskId: getValue('accessRiskId'),
        riskLevel: getValue('riskLevel'),
        function: getValue('function'),
        system: getValue('system'),
        action: getValue('action'),
        resource: getValue('resource'),
        resourceExtn: getValue('resourceExtn'),
        valueFrom: getValue('valueFrom'),
        valueTo: getValue('valueTo'),
        roleProfile: getValue('roleProfile'),
        compositeBusinessRole: getValue('compositeBusinessRole'),
        
        // Colonnes optionnelles
        riskDescription: getValue('riskDescription') || undefined,
        functionDescription: getValue('functionDescription') || undefined,
        actionDescription: getValue('actionDescription') || undefined,
        resourceDescription: getValue('resourceDescription') || undefined,
        resourceExtnDesc: getValue('resourceExtnDesc') || undefined,
        roleProfileDescription: getValue('roleProfileDescription') || undefined,
        compositeRoleDescription: getValue('compositeRoleDescription') || undefined,
        control: getValue('control') || undefined,
        businessProcess: getValue('businessProcess') || undefined,
      };
      
      rawRecords.push(record);
    }
    
    // ========== PRÉ-FILTRAGE AUTOMATIQUE (IDENTIQUE AU PARSING RÔLES) ==========
    
    const afterRuleIdRemoval = rawRecords.length;
    
    // Étape 1 : Garder uniquement les lignes où "Control" est vide
    let filteredRecords = rawRecords.filter(record => isEmpty(record.control));
    const removedByControlFilter = rawRecords.length - filteredRecords.length;
    
    if (removedByControlFilter > 0) {
      warnings.push(`${removedByControlFilter} ligne(s) supprimée(s) (colonne "Contrôle" non vide)`);
    }
    
    const afterControlFilter = filteredRecords.length;
    
    // Étape 2 : Garder uniquement les lignes où "Access Risk ID" n'est pas vide
    filteredRecords = filteredRecords.filter(record => !isEmpty(record.accessRiskId));
    const removedByRiskIdFilter = afterControlFilter - filteredRecords.length;
    
    if (removedByRiskIdFilter > 0) {
      warnings.push(`${removedByRiskIdFilter} ligne(s) supprimée(s) (colonne "ID de risque d'accès" vide)`);
    }
    
    const afterRiskIdFilter = filteredRecords.length;
    
    // Étape 3 : Supprimer les doublons
    const uniqueRecords = new Map<string, UserSodRawRecord>();
    
    for (const record of filteredRecords) {
      const key = createRecordKey(record);
      if (!uniqueRecords.has(key)) {
        uniqueRecords.set(key, record);
      } else {
        // Si doublon, additionner les execution counts
        const existing = uniqueRecords.get(key)!;
        existing.executionCount += record.executionCount;
      }
    }
    
    const finalRecords = Array.from(uniqueRecords.values());
    const removedDuplicates = filteredRecords.length - finalRecords.length;
    
    if (removedDuplicates > 0) {
      warnings.push(`${removedDuplicates} doublon(s) fusionné(s) (execution counts additionnés)`);
    }
    
    const afterDuplicateRemoval = finalRecords.length;
    
    // Compter les utilisateurs uniques
    const uniqueUsers = new Set(finalRecords.map(r => r.userId));
    
    // Statistiques de filtrage
    const filteringStats: UserSodFilteringStats = {
      originalRecordCount,
      afterRuleIdRemoval,
      afterControlFilter,
      afterRiskIdFilter,
      afterDuplicateRemoval,
      removedDuplicates,
      removedByControlFilter,
      removedByRiskIdFilter,
      uniqueUserCount: uniqueUsers.size,
      riskyRolesIdentified: 0, // Sera rempli par userSodAnalysisService
    };
    
    const processingTime = Date.now() - startTime;
    
    // Vérifier le timeout
    if (processingTime > finalConfig.timeoutMs) {
      warnings.push(`Le traitement a pris ${Math.round(processingTime / 1000)}s (timeout: ${finalConfig.timeoutMs / 1000}s)`);
    }
    
    // Warnings informatifs
    if (finalRecords.length === 0) {
      warnings.push('Aucun enregistrement valide après filtrage');
    } else {
      warnings.push(`${uniqueUsers.size} utilisateur(s) unique(s) trouvé(s)`);
    }
    
    return {
      rawRecords: finalRecords,
      filteringStats,
      riskyRoles: [], // Sera rempli par userSodAnalysisService
      warnings,
      errors,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        processingTimeMs: processingTime,
        sheetsFound,
      },
    };
    
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Erreur lors du parsing du fichier SoD Utilisateurs: ${error}`);
  }
}

/**
 * Valide qu'un fichier Excel est compatible avec le format SoD Utilisateurs
 */
export async function validateUserSodExcelFile(file: File): Promise<{
  isValid: boolean;
  confidence: number;
  warnings: string[];
  errors: string[];
}> {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  try {
    // Vérifier l'extension
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      errors.push('Le fichier doit être un fichier Excel (.xlsx ou .xls)');
      return { isValid: false, confidence: 0, warnings, errors };
    }
    
    // Lire le fichier
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheetsFound = workbook.SheetNames;
    
    // Vérifier qu'il y a au moins 1 feuille
    if (sheetsFound.length === 0) {
      errors.push('Le fichier Excel ne contient aucune feuille');
      return { isValid: false, confidence: 0, warnings, errors };
    }
    
    if (sheetsFound.length > 1) {
      warnings.push(`Le fichier contient ${sheetsFound.length} feuilles (seule la première sera utilisée)`);
    }
    
    // Lire les headers
    const worksheet = workbook.Sheets[sheetsFound[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) {
      errors.push('La feuille Excel est vide');
      return { isValid: false, confidence: 0, warnings, errors };
    }
    
    const headers = jsonData[0].map((h: any) => String(h).toLowerCase().trim());
    
    // Vérifier la présence de la colonne User ID (OBLIGATOIRE pour fichier utilisateurs)
    const userIdColumns = ['user id', 'id util.', 'id utilisateur'];
    const hasUserId = userIdColumns.some(col => headers.includes(col));
    
    if (!hasUserId) {
      errors.push('Colonne "User ID" / "ID util." non trouvée. Ce fichier n\'est pas un rapport utilisateurs.');
      errors.push(`Headers trouvés: ${headers.slice(0, 10).join(', ')}...`);
      return { isValid: false, confidence: 0, warnings, errors };
    }
    
    // Vérifier la présence de colonnes clés SoD
    const sodKeywords = [
      'access risk', 'risque d\'accès',
      'risk level', 'niveau du risque',
      'function', 'fonction',
      'action',
    ];
    
    let matchCount = 0;
    for (const keyword of sodKeywords) {
      if (headers.some(h => h.includes(keyword))) {
        matchCount++;
      }
    }
    
    // +1 pour User ID déjà vérifié
    const confidence = Math.min(95, Math.round(((matchCount + 1) / (sodKeywords.length + 1)) * 100));
    
    if (matchCount < 2) {
      errors.push('Le fichier ne semble pas être un rapport SoD Utilisateurs valide');
      errors.push(`Headers trouvés: ${headers.slice(0, 10).join(', ')}...`);
      return { isValid: false, confidence, warnings, errors };
    }
    
    return { isValid: true, confidence, warnings, errors };
    
  } catch (error) {
    errors.push(`Erreur lors de la validation: ${error}`);
    return { isValid: false, confidence: 0, warnings, errors };
  }
}

/**
 * Extrait les statistiques de base d'un fichier Excel utilisateurs sans parsing complet
 */
export async function getQuickStats(file: File): Promise<{
  estimatedUsers: number;
  estimatedRecords: number;
  headers: string[];
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    if (workbook.SheetNames.length === 0) {
      return { estimatedUsers: 0, estimatedRecords: 0, headers: [] };
    }
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) {
      return { estimatedUsers: 0, estimatedRecords: 0, headers: [] };
    }
    
    const headers = jsonData[0].map((h: any) => String(h).trim());
    const estimatedRecords = jsonData.length - 1; // Moins la ligne d'en-tête
    
    // Trouver la colonne User ID
    const userIdIndex = findColumn(headers, USER_SOD_COLUMN_MAPPINGS.userId);
    
    let estimatedUsers = 0;
    if (userIdIndex !== -1) {
      const uniqueUsers = new Set<string>();
      for (let i = 1; i < jsonData.length; i++) {
        const userId = String(jsonData[i][userIdIndex] || '').trim();
        if (userId) {
          uniqueUsers.add(userId);
        }
      }
      estimatedUsers = uniqueUsers.size;
    }
    
    return { estimatedUsers, estimatedRecords, headers };
    
  } catch {
    return { estimatedUsers: 0, estimatedRecords: 0, headers: [] };
  }
}

