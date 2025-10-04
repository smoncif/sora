 /**
 * Service de parsing Excel pour l'analyse SoD
 * 
 * Responsabilités :
 * 1. Lire le fichier Excel (28 colonnes, bilingue FR/EN)
 * 2. Pré-filtrage automatique :
 *    - Supprimer colonne "Rule ID"
 *    - Garder lignes avec "Control" vide
 *    - Garder lignes avec "Access Risk ID" non vide
 *    - Supprimer doublons
 * 3. Séparer rôles simples vs rôles composites
 */

import * as XLSX from 'xlsx';
import {
  SodRawRecord,
  SodParsingResult,
  SodParsingConfig,
  SodFilteringStats,
  SOD_RISK_LEVEL_MAPPING,
  SodRiskLevel,
} from 'lib/types/sodAnalysis';

/**
 * Configuration par défaut pour le parsing SoD
 */
const DEFAULT_SOD_CONFIG: SodParsingConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50 MB
  timeoutMs: 120000, // 2 minutes
  
  columnMappings: {
    // Obligatoires (FR/EN)
    roleName: ['Nom du rôle', 'Role Name'],
    accessRiskId: ['ID de risque d\'accès', 'Access Risk ID'],
    riskLevel: ['Niveau du risque', 'Risk Level'],
    function: ['Fonction', 'Function'],
    system: ['Système', 'System'],
    action: ['Action', 'Action'],
    resource: ['Ressource', 'Resource'],
    resourceExtn: ['Ressource externe', 'Resource Extn'],
    valueFrom: ['Valeur de', 'Value From'],
    valueTo: ['Valeur jusq.', 'Value To'],
    roleProfile: ['Rôle/Profil', 'Role/Profile'],
    compositeBusinessRole: ['Rôle utilisateur/composite', 'Composite/Business Role'],
    
    // Optionnelles (FR/EN)
    riskDescription: ['Description du risque', 'Risk Description'],
    ruleId: ['ID de règle', 'Rule ID'],
    functionDescription: ['Description de fonction', 'Function Description'],
    actionDescription: ['Description action', 'Action Description'],
    resourceDescription: ['Description de ressource', 'Resource Description'],
    resourceExtnDesc: ['Description externe de ressource', 'Resource Extn Desc'],
    roleProfileDescription: ['Description de rôle/profil', 'Role/Profile Description'],
    compositeRoleDescription: ['Description de rôle composite', 'Composite Role Description'],
    control: ['Contrôle', 'Control'],
    controlDescription: ['Description du contrôle', 'Control Description'],
    monitor: ['Moniteur', 'Monitor'],
    monitorName: ['Nom de moniteur', 'Monitor Name'],
    businessProcess: ['Processus de gestion', 'Business Process'],
    businessProcessDescription: ['Description du processus de gestion', 'Business Process Description'],
    orgRuleId: ['ID règle organ.', 'Org Rule ID'],
    shortDescription: ['Description synthét.', 'Short description'],
  },
};

/**
 * Trouve une colonne dans les headers (support bilingue)
 */
function findColumn(headers: string[], possibleNames: string[]): number {
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
 */
function createRecordKey(record: SodRawRecord): string {
  return [
    record.roleName,
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
 * Parse un fichier Excel SoD avec pré-filtrage automatique
 */
export async function parseSodExcelFile(
  file: File,
  config: Partial<SodParsingConfig> = {}
): Promise<SodParsingResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_SOD_CONFIG, ...config };
  
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
    
    // Prendre la première feuille (fichier SoD = 1 feuille)
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
    const requiredFields = [
      'roleName', 'accessRiskId', 'riskLevel', 'function', 'system', 
      'action', 'resource', 'resourceExtn', 'valueFrom', 'valueTo', 
      'roleProfile', 'compositeBusinessRole'
    ];
    
    // Trouver les colonnes obligatoires
    for (const field of requiredFields) {
      const mapping = finalConfig.columnMappings[field as keyof typeof finalConfig.columnMappings];
      const index = findColumn(headers, mapping as string[]);
      
      if (index === -1) {
        errors.push(`Colonne obligatoire non trouvée : ${mapping?.join(' / ')}`);
      } else {
        columnIndexes[field] = index;
      }
    }
    
    // Trouver les colonnes optionnelles
    const optionalFields = [
      'riskDescription', 'ruleId', 'functionDescription', 'actionDescription',
      'resourceDescription', 'resourceExtnDesc', 'roleProfileDescription',
      'compositeRoleDescription', 'control', 'controlDescription',
      'monitor', 'monitorName', 'businessProcess', 'businessProcessDescription',
      'orgRuleId', 'shortDescription'
    ];
    
    for (const field of optionalFields) {
      const mapping = finalConfig.columnMappings[field as keyof typeof finalConfig.columnMappings];
      if (mapping) {
        const index = findColumn(headers, mapping as string[]);
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
    const rawRecords: SodRawRecord[] = [];
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
      
      const record: SodRawRecord = {
        // Obligatoires
        roleName: getValue('roleName'),
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
        
        // Optionnelles
        riskDescription: getValue('riskDescription') || undefined,
        ruleId: getValue('ruleId') || undefined,
        functionDescription: getValue('functionDescription') || undefined,
        actionDescription: getValue('actionDescription') || undefined,
        resourceDescription: getValue('resourceDescription') || undefined,
        resourceExtnDesc: getValue('resourceExtnDesc') || undefined,
        roleProfileDescription: getValue('roleProfileDescription') || undefined,
        compositeRoleDescription: getValue('compositeRoleDescription') || undefined,
        control: getValue('control') || undefined,
        controlDescription: getValue('controlDescription') || undefined,
        monitor: getValue('monitor') || undefined,
        monitorName: getValue('monitorName') || undefined,
        businessProcess: getValue('businessProcess') || undefined,
        businessProcessDescription: getValue('businessProcessDescription') || undefined,
        orgRuleId: getValue('orgRuleId') || undefined,
        shortDescription: getValue('shortDescription') || undefined,
      };
      
      rawRecords.push(record);
    }
    
    // ========== PRÉ-FILTRAGE AUTOMATIQUE ==========
    
    // Étape 1 : Supprimer la colonne "Rule ID" (déjà fait lors du parsing - on ignore juste la valeur)
    const afterRuleIdRemoval = rawRecords.length;
    
    // Étape 2 : Garder uniquement les lignes où "Control" est vide
    let filteredRecords = rawRecords.filter(record => isEmpty(record.control));
    const removedByControlFilter = rawRecords.length - filteredRecords.length;
    
    if (removedByControlFilter > 0) {
      warnings.push(`${removedByControlFilter} ligne(s) supprimée(s) (colonne "Contrôle" non vide)`);
    }
    
    const afterControlFilter = filteredRecords.length;
    
    // Étape 3 : Garder uniquement les lignes où "Access Risk ID" n'est pas vide
    filteredRecords = filteredRecords.filter(record => !isEmpty(record.accessRiskId));
    const removedByRiskIdFilter = afterControlFilter - filteredRecords.length;
    
    if (removedByRiskIdFilter > 0) {
      warnings.push(`${removedByRiskIdFilter} ligne(s) supprimée(s) (colonne "ID de risque d'accès" vide)`);
    }
    
    const afterRiskIdFilter = filteredRecords.length;
    
    // Étape 4 : Supprimer les doublons
    const uniqueRecords = new Map<string, SodRawRecord>();
    
    for (const record of filteredRecords) {
      const key = createRecordKey(record);
      if (!uniqueRecords.has(key)) {
        uniqueRecords.set(key, record);
      }
    }
    
    const finalRecords = Array.from(uniqueRecords.values());
    const removedDuplicates = filteredRecords.length - finalRecords.length;
    
    if (removedDuplicates > 0) {
      warnings.push(`${removedDuplicates} doublon(s) supprimé(s)`);
    }
    
    const afterDuplicateRemoval = finalRecords.length;
    
    // ========== SÉPARATION RÔLES SIMPLES VS COMPOSITES ==========
    
    /**
     * Rôles Simples : "Rôle utilisateur/composite" est VIDE
     * Rôles Composites : "Rôle utilisateur/composite" est NON VIDE
     */
    const simpleRoleRecords = finalRecords.filter(record => 
      isEmpty(record.compositeBusinessRole)
    );
    
    const compositeRoleRecords = finalRecords.filter(record => 
      !isEmpty(record.compositeBusinessRole)
    );
    
    // Statistiques de filtrage
    const filteringStats: SodFilteringStats = {
      originalRecordCount,
      afterRuleIdRemoval,
      afterControlFilter,
      afterRiskIdFilter,
      afterDuplicateRemoval,
      removedDuplicates,
      removedByControlFilter,
      removedByRiskIdFilter,
    };
    
    const processingTime = Date.now() - startTime;
    
    // Vérifier le timeout
    if (processingTime > finalConfig.timeoutMs) {
      warnings.push(`Le traitement a pris ${Math.round(processingTime / 1000)}s (timeout: ${finalConfig.timeoutMs / 1000}s)`);
    }
    
    // Warnings informatifs
    if (simpleRoleRecords.length === 0) {
      warnings.push('Aucun rôle simple détecté dans le fichier');
    }
    
    if (compositeRoleRecords.length === 0) {
      warnings.push('Aucun rôle composite détecté dans le fichier');
    }
    
    return {
      rawRecords: finalRecords,
      simpleRoleRecords,
      compositeRoleRecords,
      filteringStats,
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
    throw new Error(`Erreur lors du parsing du fichier SoD: ${error}`);
  }
}

/**
 * Valide qu'un fichier Excel est compatible avec le format SoD
 */
export async function validateSodExcelFile(file: File): Promise<{
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
    
    // Vérifier la présence de colonnes clés SoD
    const sodKeywords = [
      'access risk', 'risque d\'accès',
      'risk level', 'niveau du risque',
      'composite', 'role name', 'nom du rôle'
    ];
    
    let matchCount = 0;
    for (const keyword of sodKeywords) {
      if (headers.some(h => h.includes(keyword))) {
        matchCount++;
      }
    }
    
    const confidence = Math.min(95, Math.round((matchCount / sodKeywords.length) * 100));
    
    if (matchCount < 3) {
      errors.push('Le fichier ne semble pas être un rapport SoD valide');
      errors.push(`Headers trouvés: ${headers.slice(0, 10).join(', ')}...`);
      return { isValid: false, confidence, warnings, errors };
    }
    
    return { isValid: true, confidence, warnings, errors };
    
  } catch (error) {
    errors.push(`Erreur lors de la validation: ${error}`);
    return { isValid: false, confidence: 0, warnings, errors };
  }
}
