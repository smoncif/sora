/**
 * Service d'export d'analyse avec avancement vers Excel
 * 
 * Ce service permet d'exporter une analyse complète avec les sélections
 * de l'utilisateur dans un fichier Excel qui peut être réutilisé pour
 * reprendre l'analyse exactement où elle a été laissée.
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  SimplifiedAnalysisResult,
  BusinessRoleTransaction,
  SimpleRoleTransaction
} from 'lib/types/roleAnalysis';

/**
 * Options d'export Excel
 */
export interface ExportOptions {
  includeMetadata?: boolean;
  includeProgressInfo?: boolean;
  includeUserSelections?: boolean;
  fileName?: string;
  onProgress?: (progress: number, stage: string) => void;
}

/**
 * Métadonnées d'export
 */
export interface ExportMetadata {
  analysisName: string;
  analysisDescription: string;
  exportedAt: string;
  exportedBy?: string;
  version: string;
  analysisParams: {
    includeFrequency: boolean;
    minCoverageThreshold: number;
    coverageWeight: number;
    sizeWeight: number;
    usageWeight: number;
  };
}

/**
 * Informations de progression
 */
export interface ProgressInfo {
  totalBusinessRoles: number;
  completedBusinessRoles: string[];
  progressPercentage: number;
  lastModified: string;
}

/**
 * Exporte une analyse complète vers Excel avec les sélections
 */
export async function exportAnalysisToExcel(
  analysisResult: SimplifiedAnalysisResult,
  userSelections: Map<string, Set<string>>,
  metadata: ExportMetadata,
  options: ExportOptions = {}
): Promise<void> {
  const {
    includeMetadata = true,
    includeProgressInfo = true,
    includeUserSelections = true,
    fileName,
    onProgress
  } = options;

  try {
    // Notification de début
    if (onProgress) onProgress(10, 'Préparation des données...');

    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // 1. Feuille de métadonnées
    if (includeMetadata) {
      if (onProgress) onProgress(20, 'Export des métadonnées...');
      const metadataSheet = createMetadataSheet(metadata);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
    }

    // 2. Feuille des transactions de rôles métier
    if (onProgress) onProgress(35, 'Export des transactions de rôles métier...');
    const businessRoleSheet = createBusinessRoleTransactionsSheet(analysisResult.businessRoleTransactions);
    XLSX.utils.book_append_sheet(workbook, businessRoleSheet, 'BusinessRoleTransactions');

    // 3. Feuille des transactions de rôles simples
    if (onProgress) onProgress(50, 'Export des transactions de rôles simples...');
    const simpleRoleSheet = createSimpleRoleTransactionsSheet(analysisResult.simpleRoleTransactions);
    XLSX.utils.book_append_sheet(workbook, simpleRoleSheet, 'SimpleRoleTransactions');

    // 4. Feuille des sélections utilisateur
    if (includeUserSelections) {
      if (onProgress) onProgress(65, 'Export des sélections utilisateur...');
      const selectionsSheet = createUserSelectionsSheet(userSelections);
      XLSX.utils.book_append_sheet(workbook, selectionsSheet, 'UserSelections');
    }

    // 5. Feuille d'informations de progression
    if (includeProgressInfo) {
      if (onProgress) onProgress(75, 'Export des informations de progression...');
      const progressSheet = createProgressInfoSheet(analysisResult, userSelections);
      XLSX.utils.book_append_sheet(workbook, progressSheet, 'ProgressInfo');
    }

    // 6. Feuille résumé d'analyse pour consultation
    if (onProgress) onProgress(85, 'Création du résumé d\'analyse...');
    const summarySheet = createAnalysisSummarySheet(analysisResult, userSelections);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

    // 7. Générer le fichier Excel
    if (onProgress) onProgress(95, 'Génération du fichier Excel...');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      compression: true
    });

    // 8. Sauvegarder le fichier
    if (onProgress) onProgress(100, 'Sauvegarde du fichier...');
    const finalFileName = fileName || `analyse_${metadata.analysisName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    saveAs(blob, finalFileName);

  } catch (error: any) {

    throw new Error(`Impossible d'exporter vers Excel : ${error.message}`);
  }
}

/**
 * Crée la feuille de métadonnées
 */
function createMetadataSheet(metadata: ExportMetadata): XLSX.WorkSheet {
  const data = [
    ['Propriété', 'Valeur'],
    ['analysisName', metadata.analysisName],
    ['analysisDescription', metadata.analysisDescription],
    ['exportedAt', metadata.exportedAt],
    ['exportedBy', metadata.exportedBy || 'N/A'],
    ['version', metadata.version],
    ['includeFrequency', metadata.analysisParams.includeFrequency.toString()],
    ['minCoverageThreshold', metadata.analysisParams.minCoverageThreshold.toString()],
    ['coverageWeight', metadata.analysisParams.coverageWeight.toString()],
    ['sizeWeight', metadata.analysisParams.sizeWeight.toString()],
    ['usageWeight', metadata.analysisParams.usageWeight.toString()]
  ];

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Crée la feuille des transactions de rôles métier
 */
function createBusinessRoleTransactionsSheet(transactions: BusinessRoleTransaction[]): XLSX.WorkSheet {
  const data = [
    ['Rôle métier', 'Transaction', 'Nombre d\'exécutions', 'Année', 'Mois']
  ];

  transactions.forEach(tx => {
    data.push([
      tx.businessRole,
      tx.transaction,
      (tx.executionCount || 0).toString(),
      (tx.year || new Date().getFullYear()).toString(),
      (tx.month || 1).toString()
    ]);
  });

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Crée la feuille des transactions de rôles simples
 */
function createSimpleRoleTransactionsSheet(transactions: SimpleRoleTransaction[]): XLSX.WorkSheet {
  const data = [
    ['Rôle simple', 'Transaction']
  ];

  transactions.forEach(tx => {
    data.push([
      tx.simpleRole,
      tx.transaction
    ]);
  });

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Crée la feuille des sélections utilisateur
 */
function createUserSelectionsSheet(userSelections: Map<string, Set<string>>): XLSX.WorkSheet {
  const data = [
    ['Rôle métier', 'Rôle simple sélectionné', 'Date de sélection']
  ];

  const currentDate = new Date().toISOString().split('T')[0];

  userSelections.forEach((simpleRoles, businessRole) => {
    simpleRoles.forEach(simpleRole => {
      data.push([
        businessRole,
        simpleRole,
        currentDate
      ]);
    });
  });

  // Si aucune sélection, ajouter une ligne vide pour préserver la structure
  if (data.length === 1) {
    data.push(['', '', '']);
  }

  return XLSX.utils.aoa_to_sheet(data);
}

/**
 * Crée la feuille d'informations de progression
 */
function createProgressInfoSheet(
  analysisResult: SimplifiedAnalysisResult,
  userSelections: Map<string, Set<string>>
): XLSX.WorkSheet {
  const totalBusinessRoles = analysisResult.coverageAnalyses.length;
  const completedBusinessRoles = Array.from(userSelections.keys());
  const progressPercentage = totalBusinessRoles > 0 
    ? Math.round((completedBusinessRoles.length / totalBusinessRoles) * 100)
    : 0;

  const summaryData = [
    ['Propriété', 'Valeur'],
    ['Total rôles métier', totalBusinessRoles.toString()],
    ['Rôles métier avec sélections', completedBusinessRoles.length.toString()],
    ['Pourcentage de progression', progressPercentage.toString()],
    ['Dernière modification', new Date().toISOString()]
  ];

  // Ajouter la liste des rôles métier complétés
  summaryData.push(['', '']);
  summaryData.push(['Rôles métier', 'Statut']);
  
  analysisResult.coverageAnalyses.forEach(analysis => {
    const status = userSelections.has(analysis.businessRole) ? 'Complété' : 'En attente';
    summaryData.push([analysis.businessRole, status]);
  });

  return XLSX.utils.aoa_to_sheet(summaryData);
}

/**
 * Crée la feuille de résumé d'analyse pour consultation
 */
function createAnalysisSummarySheet(
  analysisResult: SimplifiedAnalysisResult,
  userSelections: Map<string, Set<string>>
): XLSX.WorkSheet {
  const data = [
    ['Rôle métier', 'Transactions totales', 'Rôles simples sélectionnés', 'Transactions couvertes', '% Couverture']
  ];

  analysisResult.coverageAnalyses.forEach(analysis => {
    const selectedRoles = userSelections.get(analysis.businessRole) || new Set();
    const selectedRolesList = Array.from(selectedRoles);
    
    // Calculer les transactions couvertes par les rôles sélectionnés
    const coveredTransactions = new Set<string>();
    analysis.simpleRoles.forEach(role => {
      if (selectedRoles.has(role.roleName)) {
        (role.coveredTransactions || []).forEach(tx => coveredTransactions.add(tx));
      }
    });

    const coveragePercentage = analysis.totalTransactions > 0
      ? Math.round((coveredTransactions.size / analysis.totalTransactions) * 100)
      : 0;

    data.push([
      analysis.businessRole,
      analysis.totalTransactions.toString(),
      selectedRolesList.join(', ') || 'Aucune sélection',
      coveredTransactions.size.toString(),
      `${coveragePercentage}%`
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Appliquer du style de base aux en-têtes
  const headerStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "EEEEEE" } }
  };

  // Style pour les en-têtes (première ligne)
  if (worksheet['!ref']) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = headerStyle;
    }
  }

  return worksheet;
}

/**
 * Génère un nom de fichier automatique basé sur l'analyse
 */
export function generateFileName(analysisName: string, includeDate: boolean = true): string {
  const cleanName = analysisName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = includeDate ? `_${new Date().toISOString().split('T')[0]}` : '';
  return `analyse_${cleanName}${dateStr}.xlsx`;
}

/**
 * Estime la taille du fichier qui sera généré
 */
export function estimateFileSize(
  analysisResult: SimplifiedAnalysisResult,
  userSelections: Map<string, Set<string>>
): number {
  // Estimation approximative basée sur le nombre d'éléments
  const businessRoleTransactions = analysisResult.businessRoleTransactions.length;
  const simpleRoleTransactions = analysisResult.simpleRoleTransactions.length;
  const selectionsCount = Array.from(userSelections.values()).reduce((sum, set) => sum + set.size, 0);
  
  // Estimation : ~50 bytes par transaction + 30 bytes par sélection + overhead
  const estimatedSize = (businessRoleTransactions * 50) + (simpleRoleTransactions * 40) + (selectionsCount * 30) + 10000; // 10KB overhead
  
  return estimatedSize;
} 

