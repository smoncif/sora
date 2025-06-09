/**
 * Service d'export des résultats d'analyse vers Excel
 * 
 * Ce service permet d'exporter les résultats d'analyse avec les sélections
 * de rôles simples pour chaque rôle métier dans un format Excel structuré.
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { 
  SimplifiedAnalysisResult
} from '@/types/roleAnalysis';

/**
 * Interface pour les données d'export des résultats
 */
export interface ResultsExportData {
  businessRole: string;
  uncoveredTransactions: string[];
  selectedSimpleRoles: string[];
  coveredTransactions: string[];
  unusedTransactions: string[];
}

/**
 * Options d'export des résultats
 */
export interface ResultsExportOptions {
  fileName?: string;
  onProgress?: (progress: number, stage: string) => void;
}

/**
 * Exporte les résultats d'analyse vers Excel avec les colonnes spécifiées
 */
export async function exportResultsToExcel(
  analysisResult: SimplifiedAnalysisResult,
  selectedRoles: Map<string, Set<string>>,
  options: ResultsExportOptions = {}
): Promise<void> {
  const { fileName, onProgress } = options;

  try {
    if (onProgress) onProgress(10, 'Préparation des données...');

    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // Préparer les données pour l'export
    if (onProgress) onProgress(30, 'Traitement des rôles métier...');
    const exportData = prepareExportData(analysisResult, selectedRoles);

    // Créer la feuille principale avec les résultats
    if (onProgress) onProgress(60, 'Création de la feuille Excel...');
    const resultsSheet = createResultsSheet(exportData);
    XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Résultats Analyse');

    // Créer une feuille de détails par rôle métier
    if (onProgress) onProgress(80, 'Création des feuilles détaillées...');
    exportData.forEach((data) => {
      const detailSheet = createDetailSheet(data);
      const sheetName = `${data.businessRole.substring(0, 25)}...`.replace(/[\\\/\?\*\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName);
    });

    // Générer le fichier Excel
    if (onProgress) onProgress(95, 'Génération du fichier Excel...');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      compression: true
    });

    // Sauvegarder le fichier
    if (onProgress) onProgress(100, 'Sauvegarde du fichier...');
    const finalFileName = fileName || `resultats_analyse_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    saveAs(blob, finalFileName);

  } catch (error: unknown) {

    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Impossible d'exporter les résultats vers Excel : ${errorMessage}`);
  }
}

/**
 * Prépare les données d'export à partir de l'analyse et des sélections
 */
function prepareExportData(
  analysisResult: SimplifiedAnalysisResult,
  selectedRoles: Map<string, Set<string>>
): ResultsExportData[] {
  const exportData: ResultsExportData[] = [];

  // Créer une map des transactions par rôle simple pour optimiser les recherches
  const transactionsByRole = new Map<string, string[]>();
  analysisResult.simpleRoleTransactions.forEach(tx => {
    if (!transactionsByRole.has(tx.simpleRole)) {
      transactionsByRole.set(tx.simpleRole, []);
    }
    transactionsByRole.get(tx.simpleRole)!.push(tx.transaction);
  });

  // Traiter chaque rôle métier
  analysisResult.coverageAnalyses.forEach(analysis => {
    const businessRole = analysis.businessRole;
    const selectedRolesForBusiness = selectedRoles.get(businessRole) || new Set<string>();
    
    // Calculer les transactions couvertes par les rôles sélectionnés
    const coveredTransactions = new Set<string>();
    const allSelectedRoleTransactions = new Set<string>();
    
    selectedRolesForBusiness.forEach(roleName => {
      const roleData = analysis.simpleRoles.find(r => r.roleName === roleName);
      if (roleData) {
        // Ajouter les transactions couvertes
        (roleData.coveredTransactions || []).forEach(tx => coveredTransactions.add(tx));
      }
      
      // Ajouter toutes les transactions du rôle simple
      const allRoleTransactions = transactionsByRole.get(roleName) || [];
      allRoleTransactions.forEach(tx => allSelectedRoleTransactions.add(tx));
    });

    // Calculer les transactions non couvertes
    const businessRoleTransactions = new Set(analysis.uniqueTransactions);
    const uncoveredTransactions = Array.from(businessRoleTransactions).filter(tx => 
      !coveredTransactions.has(tx)
    );

    // Calculer les transactions non utilisées (dans les rôles sélectionnés mais pas dans le rôle métier)
    const unusedTransactions = Array.from(allSelectedRoleTransactions).filter(tx => 
      !businessRoleTransactions.has(tx)
    );

    exportData.push({
      businessRole,
      uncoveredTransactions,
      selectedSimpleRoles: Array.from(selectedRolesForBusiness),
      coveredTransactions: Array.from(coveredTransactions),
      unusedTransactions
    });
  });

  return exportData;
}

/**
 * Crée la feuille principale avec un résumé de tous les rôles métier
 */
function createResultsSheet(exportData: ResultsExportData[]): XLSX.WorkSheet {
  const data = [
    [
      'Rôle Métier',
      'Transactions Non Couvertes (Nombre)',
      'Rôles Simples Choisis (Nombre)',
      'Transactions Couvertes (Nombre)',
      'Transactions Non Utilisées (Nombre)',
      'Taux de Couverture (%)'
    ]
  ];

  exportData.forEach(item => {
    const totalTransactions = item.coveredTransactions.length + item.uncoveredTransactions.length;
    const coverageRate = totalTransactions > 0 
      ? ((item.coveredTransactions.length / totalTransactions) * 100).toFixed(1)
      : '0.0';

    data.push([
      item.businessRole,
      item.uncoveredTransactions.length.toString(),
      item.selectedSimpleRoles.length.toString(),
      item.coveredTransactions.length.toString(),
      item.unusedTransactions.length.toString(),
      coverageRate
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes
  worksheet['!cols'] = [
    { wch: 30 }, // Rôle Métier
    { wch: 25 }, // Transactions Non Couvertes
    { wch: 25 }, // Rôles Simples Choisis
    { wch: 25 }, // Transactions Couvertes
    { wch: 25 }, // Transactions Non Utilisées
    { wch: 20 }  // Taux de Couverture
  ];

  return worksheet;
}

/**
 * Crée une feuille détaillée pour un rôle métier spécifique
 */
function createDetailSheet(data: ResultsExportData): XLSX.WorkSheet {
  const sheetData = [];

  // Section: Informations générales
  sheetData.push(['INFORMATIONS GÉNÉRALES']);
  sheetData.push(['Rôle Métier:', data.businessRole]);
  sheetData.push(['Nombre de rôles simples sélectionnés:', data.selectedSimpleRoles.length.toString()]);
  sheetData.push(['Nombre de transactions couvertes:', data.coveredTransactions.length.toString()]);
  sheetData.push(['Nombre de transactions non couvertes:', data.uncoveredTransactions.length.toString()]);
  sheetData.push(['Nombre de transactions non utilisées:', data.unusedTransactions.length.toString()]);
  sheetData.push([]);

  // Section: Rôles simples choisis
  sheetData.push(['RÔLES SIMPLES CHOISIS']);
  if (data.selectedSimpleRoles.length > 0) {
    data.selectedSimpleRoles.forEach(role => {
      sheetData.push([role]);
    });
  } else {
    sheetData.push(['Aucun rôle sélectionné']);
  }
  sheetData.push([]);

  // Section: Transactions couvertes
  sheetData.push(['TRANSACTIONS COUVERTES']);
  if (data.coveredTransactions.length > 0) {
    data.coveredTransactions.forEach(tx => {
      sheetData.push([tx]);
    });
  } else {
    sheetData.push(['Aucune transaction couverte']);
  }
  sheetData.push([]);

  // Section: Transactions non couvertes
  sheetData.push(['TRANSACTIONS NON COUVERTES']);
  if (data.uncoveredTransactions.length > 0) {
    data.uncoveredTransactions.forEach(tx => {
      sheetData.push([tx]);
    });
  } else {
    sheetData.push(['Toutes les transactions sont couvertes']);
  }
  sheetData.push([]);

  // Section: Transactions non utilisées
  sheetData.push(['TRANSACTIONS NON UTILISÉES (ajoutées par les rôles simples)']);
  if (data.unusedTransactions.length > 0) {
    data.unusedTransactions.forEach(tx => {
      sheetData.push([tx]);
    });
  } else {
    sheetData.push(['Aucune transaction non utilisée']);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Définir la largeur des colonnes
  worksheet['!cols'] = [
    { wch: 50 } // Largeur principale pour les données
  ];

  return worksheet;
}
