/**
 * Service pour reprendre une analyse depuis un fichier Excel avec avancement
 * 
 * Ce service permet de charger un fichier Excel exporté précédemment
 * qui contient les données d'analyse ET les sélections de rôles effectuées.
 */

import * as XLSX from 'xlsx';
import { 
  SimplifiedAnalysisResult,
  BusinessRoleTransaction,
  SimpleRoleTransaction,
  CoverageAnalysis
} from 'lib/types/roleAnalysis';
import { 
  calculateCoverageAnalysis,
  createSimplifiedAnalysisResult 
} from 'lib/services/role/simplifiedAnalysisService';

/**
 * Structure attendue du fichier Excel de reprise
 */
export interface ResumeFileStructure {
  // Feuilles de données originales
  businessRoleTransactions: BusinessRoleTransaction[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  
  // Métadonnées de l'analyse
  metadata: {
    analysisName: string;
    analysisDescription: string;
    createdAt: string;
    version: string;
    analysisParams: {
      includeFrequency: boolean;
      minCoverageThreshold: number;
      coverageWeight: number;
      sizeWeight: number;
      usageWeight: number;
    };
  };
  
  // Sélections effectuées par l'utilisateur
  userSelections: Record<string, string[]>; // businessRole -> [simpleRole1, simpleRole2, ...]
  
  // État de progression
  progressInfo: {
    totalBusinessRoles: number;
    completedBusinessRoles: string[];
    lastModified: string;
    progressPercentage: number;
  };
}

/**
 * Résultat du parsing d'un fichier de reprise
 */
export interface ResumeParsingResult {
  analysisResult: SimplifiedAnalysisResult;
  userSelections: Map<string, Set<string>>;
  progressInfo: {
    totalBusinessRoles: number;
    completedBusinessRoles: string[];
    progressPercentage: number;
  };
  metadata: {
    originalFileName: string;
    resumeVersion: string;
    lastSaved: Date;
  };
}

/**
 * Parse un fichier Excel de reprise et reconstruit l'analyse avec les sélections
 */
export async function parseResumeFile(file: File): Promise<ResumeParsingResult> {
  try {
    // Validation du fichier
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      throw new Error('Le fichier doit être un fichier Excel (.xlsx ou .xls)');
    }

    // Lecture du fichier Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Vérifier la structure du fichier
    const expectedSheets = [
      'Metadata',
      'BusinessRoleTransactions', 
      'SimpleRoleTransactions',
      'UserSelections',
      'ProgressInfo'
    ];
    
    const missingSheets = expectedSheets.filter(sheet => !workbook.SheetNames.includes(sheet));
    if (missingSheets.length > 0) {
      throw new Error(
        `Fichier de reprise invalide. Feuilles manquantes : ${missingSheets.join(', ')}.
        Ce fichier doit être exporté depuis l'application d'analyse des rôles.`
      );
    }

    // Parser les métadonnées
    const metadataSheet = workbook.Sheets['Metadata'];
    const metadataData = XLSX.utils.sheet_to_json(metadataSheet, { header: 1 }) as string[][];
    const metadata = parseMetadataSheet(metadataData);

    // Parser les transactions de rôles métier
    const businessRoleSheet = workbook.Sheets['BusinessRoleTransactions'];
    const businessRoleData = XLSX.utils.sheet_to_json(businessRoleSheet) as any[];
    const businessRoleTransactions = parseBusinessRoleTransactions(businessRoleData);

    // Parser les transactions de rôles simples
    const simpleRoleSheet = workbook.Sheets['SimpleRoleTransactions'];
    const simpleRoleData = XLSX.utils.sheet_to_json(simpleRoleSheet) as any[];
    const simpleRoleTransactions = parseSimpleRoleTransactions(simpleRoleData);

    // Parser les sélections utilisateur
    const selectionsSheet = workbook.Sheets['UserSelections'];
    const selectionsData = XLSX.utils.sheet_to_json(selectionsSheet) as any[];
    const userSelections = parseUserSelections(selectionsData);

    // Parser les informations de progression
    const progressSheet = workbook.Sheets['ProgressInfo'];
    const progressData = XLSX.utils.sheet_to_json(progressSheet) as any[];
    const progressInfo = parseProgressInfo(progressData);

    // Recalculer l'analyse de couverture avec les données originales
    const coverageAnalyses = calculateCoverageAnalysis(
      businessRoleTransactions,
      simpleRoleTransactions,
      metadata.analysisParams.minCoverageThreshold
    );

    // Créer le résultat d'analyse
    const analysisResult = createSimplifiedAnalysisResult(
      {
        businessRoleTransactions,
        simpleRoleTransactions,
        metadata: {
          fileName: metadata.analysisName,
          fileSize: file.size,
          sheetsFound: workbook.SheetNames,
          businessRoleCount: new Set(businessRoleTransactions.map(t => t.businessRole)).size,
          simpleRoleCount: new Set(simpleRoleTransactions.map(t => t.simpleRole)).size,
          totalTransactions: new Set([
            ...businessRoleTransactions.map(t => t.transaction),
            ...simpleRoleTransactions.map(t => t.transaction)
          ]).size,
          processingTimeMs: 0
        },
        warnings: [],
        errors: []
      },
      coverageAnalyses,
      metadata.analysisName,
      metadata.analysisDescription
    );

    // Appliquer les paramètres d'analyse sauvegardés
    analysisResult.analysisParams = metadata.analysisParams;

    return {
      analysisResult,
      userSelections,
      progressInfo,
      metadata: {
        originalFileName: file.name,
        resumeVersion: metadata.version,
        lastSaved: new Date(metadata.createdAt)
      }
    };

  } catch (error: any) {

    throw new Error(`Impossible de charger le fichier de reprise : ${error.message}`);
  }
}

/**
 * Parse la feuille de métadonnées
 */
function parseMetadataSheet(data: string[][]): ResumeFileStructure['metadata'] {
  const metadataMap = new Map<string, string>();
  
  // Convertir le tableau 2D en Map clé-valeur
  for (let i = 0; i < data.length; i++) {
    if (data[i].length >= 2) {
      metadataMap.set(data[i][0], data[i][1]);
    }
  }

  return {
    analysisName: metadataMap.get('analysisName') || 'Analyse reprise',
    analysisDescription: metadataMap.get('analysisDescription') || '',
    createdAt: metadataMap.get('createdAt') || new Date().toISOString(),
    version: metadataMap.get('version') || '1.0',
    analysisParams: {
      includeFrequency: metadataMap.get('includeFrequency') === 'true',
      minCoverageThreshold: parseFloat(metadataMap.get('minCoverageThreshold') || '0'),
      coverageWeight: parseFloat(metadataMap.get('coverageWeight') || '50'),
      sizeWeight: parseFloat(metadataMap.get('sizeWeight') || '50'),
      usageWeight: parseFloat(metadataMap.get('usageWeight') || '0')
    }
  };
}

/**
 * Parse les transactions de rôles métier
 */
function parseBusinessRoleTransactions(data: any[]): BusinessRoleTransaction[] {
  return data.map(row => ({
    businessRole: row['Rôle métier'] || row['businessRole'] || '',
    transaction: row['Transaction'] || row['transaction'] || '',
    executionCount: parseInt(row['Nombre d\'exécutions'] || row['executionCount'] || '0'),
    year: parseInt(row['Année'] || row['year'] || new Date().getFullYear().toString()),
    month: parseInt(row['Mois'] || row['month'] || '1')
  })).filter(t => t.businessRole && t.transaction);
}

/**
 * Parse les transactions de rôles simples
 */
function parseSimpleRoleTransactions(data: any[]): SimpleRoleTransaction[] {
  return data.map(row => ({
    simpleRole: row['Rôle simple'] || row['simpleRole'] || '',
    transaction: row['Transaction'] || row['transaction'] || ''
  })).filter(t => t.simpleRole && t.transaction);
}

/**
 * Parse les sélections utilisateur
 */
function parseUserSelections(data: any[]): Map<string, Set<string>> {
  const selections = new Map<string, Set<string>>();
  
  data.forEach(row => {
    const businessRole = row['Rôle métier'] || row['businessRole'];
    const simpleRole = row['Rôle simple sélectionné'] || row['selectedSimpleRole'];
    
    if (businessRole && simpleRole) {
      if (!selections.has(businessRole)) {
        selections.set(businessRole, new Set());
      }
      selections.get(businessRole)!.add(simpleRole);
    }
  });
  
  return selections;
}

/**
 * Parse les informations de progression
 */
function parseProgressInfo(data: any[]): ResumeParsingResult['progressInfo'] {
  const progressRow = data[0] || {};
  
  const completedBusinessRoles = data
    .filter(row => row['Statut'] === 'Complété' || row['status'] === 'completed')
    .map(row => row['Rôle métier'] || row['businessRole'])
    .filter(Boolean);

  return {
    totalBusinessRoles: parseInt(progressRow['Total rôles métier'] || progressRow['totalBusinessRoles'] || '0'),
    completedBusinessRoles,
    progressPercentage: parseFloat(progressRow['Pourcentage de progression'] || progressRow['progressPercentage'] || '0')
  };
}

/**
 * Valide que le fichier est bien un fichier de reprise valide
 */
export function validateResumeFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Vérifier la présence des feuilles essentielles
        const requiredSheets = ['Metadata', 'BusinessRoleTransactions', 'UserSelections'];
        const hasRequiredSheets = requiredSheets.every(sheet => 
          workbook.SheetNames.includes(sheet)
        );
        
        // Vérifier la présence de métadonnées de version
        if (hasRequiredSheets && workbook.Sheets['Metadata']) {
          const metadataSheet = workbook.Sheets['Metadata'];
          const metadataData = XLSX.utils.sheet_to_json(metadataSheet, { header: 1 }) as string[][];
          const hasVersionInfo = metadataData.some(row => 
            row[0] === 'version' || row[0] === 'analysisName'
          );
          
          resolve(hasVersionInfo);
        } else {
          resolve(false);
        }
      } catch (error) {

        resolve(false);
      }
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file);
  });
} 

