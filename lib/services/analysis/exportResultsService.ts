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
} from 'lib/types/roleAnalysis';
import { AnalysisMode, getLabels } from 'lib/types/analysis';

/**
 * Interface pour les données d'export des résultats
 */
export interface ResultsExportData {
  itemId: string; // businessRole pour rôles, userId pour utilisateurs
  uncoveredTransactions: string[];
  selectedTargetRoles: string[]; // selectedSimpleRoles pour rôles, selectedBusinessRoles pour users
  coveredTransactions: string[];
  unusedTransactions: string[];
  // Compatibilité
  businessRole?: string;
  selectedSimpleRoles?: string[];
}

/**
 * Options d'export des résultats
 */
export interface ResultsExportOptions {
  fileName?: string;
  onProgress?: (progress: number, stage: string) => void;
  mode?: AnalysisMode; // Mode d'analyse
}

/**
 * Exporte les résultats d'analyse vers Excel avec les colonnes spécifiées
 */
export async function exportResultsToExcel(
  analysisResult: SimplifiedAnalysisResult,
  selectedRoles: Map<string, Set<string>>,
  options: ResultsExportOptions = {},
  showLicenses?: boolean // Plus de valeur par défaut, obligatoire de passer l'état réel
): Promise<void> {
  const { fileName, onProgress, mode: optionsMode } = options;
  const mode = optionsMode || analysisResult.analysisMode || analysisResult.mode || 'roles';
  const labels = getLabels(mode);

  try {
    if (onProgress) onProgress(10, 'Préparation des données...');

    // ENRICHIR LES LICENCES AVANT L'EXPORT (seulement pour les analyses de rôles)
    let enrichedAnalysisResult = analysisResult;
    if (mode === 'roles') {
      if (onProgress) onProgress(20, 'Calcul des licences...');
      const { enrichAnalysisWithLicenses, recalculateMaxLicenseForAnalysis } = await import('../license/licenseService');
      
      // Enrichir d'abord avec toutes les licences
      enrichedAnalysisResult = await enrichAnalysisWithLicenses(analysisResult);
      
      // Puis recalculer les maxLicence en fonction des sélections réelles
      enrichedAnalysisResult = {
        ...enrichedAnalysisResult,
        coverageAnalyses: enrichedAnalysisResult.coverageAnalyses.map(analysis => {
          const selectedRolesForBusiness = selectedRoles.get(analysis.businessRole);
          if (!selectedRolesForBusiness || selectedRolesForBusiness.size === 0) {
            return analysis;
          }
          
          // Marquer les rôles sélectionnés
          const updatedAnalysis = {
            ...analysis,
            simpleRoles: analysis.simpleRoles.map(role => ({
              ...role,
              isSelected: selectedRolesForBusiness.has(role.roleName)
            }))
          };
          
          // Recalculer la licence max avec les vraies sélections
          return recalculateMaxLicenseForAnalysis(updatedAnalysis);
        })
      };
    }

    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // Préparer les données pour l'export
    if (onProgress) onProgress(30, `Traitement des ${labels?.itemPlural?.toLowerCase() || 'éléments'}...`);
    const exportData = prepareExportData(enrichedAnalysisResult, selectedRoles, mode);

    // Récupérer l'état réel du switch (si pas fourni, utiliser celui de analysisParams)
    // Forcer showLicenses à false pour les analyses utilisateur
    const actualShowLicenses = mode === 'users' ? false : (showLicenses ?? analysisResult.analysisParams?.showLicenses ?? false);

    // 1. Créer la feuille SYNTHÈSE (selon photo 2)
    if (onProgress) onProgress(50, 'Création de la feuille SYNTHÈSE...');
    const synthesisSheet = createSynthesisSheet(exportData, enrichedAnalysisResult, actualShowLicenses, mode);
    XLSX.utils.book_append_sheet(workbook, synthesisSheet, 'SYNTHÈSE');

    // 2. Créer la feuille DÉTAIL (selon photo 3)
    if (onProgress) onProgress(70, 'Création de la feuille DÉTAIL...');
    const detailSheet = createDetailSheet(enrichedAnalysisResult, selectedRoles, mode);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'DÉTAIL');

    // Générer le fichier Excel
    if (onProgress) onProgress(90, 'Génération du fichier Excel...');
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
  selectedRoles: Map<string, Set<string>>,
  mode: AnalysisMode = 'roles'
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
      itemId: businessRole,
      uncoveredTransactions,
      selectedTargetRoles: Array.from(selectedRolesForBusiness),
      coveredTransactions: Array.from(coveredTransactions),
      unusedTransactions,
      // Compatibilité
      businessRole,
      selectedSimpleRoles: Array.from(selectedRolesForBusiness)
    });
  });

  return exportData;
}

/**
 * Crée la feuille SYNTHÈSE (selon photo 2)
 */
function createSynthesisSheet(exportData: ResultsExportData[], enrichedAnalysisResult: SimplifiedAnalysisResult, showLicenses: boolean, mode: AnalysisMode = 'roles'): XLSX.WorkSheet {
  const labels = getLabels(mode);
  
  // Définir les en-têtes selon si les licences sont activées
  const headers = showLicenses 
    ? [
        labels?.item || 'Élément',
        'Licence',
        `${labels?.targetRolePlural || 'Rôles Cibles'} Choisis (Nombre)`,
        'Transactions Couvertes (Nombre)',
        'Transactions Non Couvertes (Nombre)',
        'Transactions Non Couvertes (liste séparée par ,)',
        'Transactions Non Utilisées (Nombre)',
        'Taux de Couverture (%)'
      ]
    : [
        labels?.item || 'Élément',
        `${labels?.targetRolePlural || 'Rôles Cibles'} Choisis (Nombre)`,
        'Transactions Couvertes (Nombre)',
        'Transactions Non Couvertes (Nombre)',
        'Transactions Non Couvertes (liste séparée par ,)',
        'Transactions Non Utilisées (Nombre)',
        'Taux de Couverture (%)'
      ];
      
  const data = [headers];

  exportData.forEach(item => {
    const totalTransactions = item.coveredTransactions.length + item.uncoveredTransactions.length;
    const coverageRate = totalTransactions > 0 
      ? ((item.coveredTransactions.length / totalTransactions) * 100).toFixed(1)
      : '0.0';

    const itemData = enrichedAnalysisResult.coverageAnalyses.find(analysis => analysis.businessRole === item.itemId);
    const license = itemData?.maxLicence || 'Aucune';

    // Créer la ligne selon si les licences sont activées
    const row = showLicenses 
      ? [
          item.itemId,
          license,
          item.selectedTargetRoles.length.toString(),
          item.coveredTransactions.length.toString(),
          item.uncoveredTransactions.length.toString(),
          item.uncoveredTransactions.join(', '), // Liste séparée par virgules
          item.unusedTransactions.length.toString(),
          coverageRate
        ]
      : [
          item.itemId,
          item.selectedTargetRoles.length.toString(),
          item.coveredTransactions.length.toString(),
          item.uncoveredTransactions.length.toString(),
          item.uncoveredTransactions.join(', '), // Liste séparée par virgules
          item.unusedTransactions.length.toString(),
          coverageRate
        ];
        
    data.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes selon si les licences sont activées
  worksheet['!cols'] = showLicenses 
    ? [
        { wch: 30 }, // Rôle Métier
        { wch: 15 }, // Licence
        { wch: 25 }, // Rôles Simples Choisis
        { wch: 25 }, // Transactions Couvertes
        { wch: 25 }, // Transactions Non Couvertes
        { wch: 40 }, // Transactions Non Couvertes (liste)
        { wch: 25 }, // Transactions Non Utilisées
        { wch: 20 }  // Taux de Couverture
      ]
    : [
        { wch: 30 }, // Rôle Métier
        { wch: 25 }, // Rôles Simples Choisis
        { wch: 25 }, // Transactions Couvertes
        { wch: 25 }, // Transactions Non Couvertes
        { wch: 40 }, // Transactions Non Couvertes (liste)
        { wch: 25 }, // Transactions Non Utilisées
        { wch: 20 }  // Taux de Couverture
      ];

  return worksheet;
}

/**
 * Crée la feuille DÉTAIL (selon photo 3) - UNE TRANSACTION PAR LIGNE
 */
function createDetailSheet(analysisResult: SimplifiedAnalysisResult, selectedRoles: Map<string, Set<string>>, mode: AnalysisMode = 'roles'): XLSX.WorkSheet {
  const labels = getLabels(mode);
  
  const data = [
    [
      labels?.item || 'Élément',
      `Description du ${labels?.item?.toLowerCase() || 'élément'}`,
      labels?.targetRole || 'Rôle Cible',
      `Description du ${labels?.targetRole?.toLowerCase() || 'rôle cible'}`,
      `Toutes les Transactions du ${labels?.targetRole?.toLowerCase() || 'rôle cible'}`,
      'Description des transactions',
      'Fréquence d\'Usage',
      'Marqué si utilisée'
    ]
  ];

  // Créer un Map pour récupérer toutes les transactions d'un rôle simple depuis les données source
  const simpleRoleTransactionsMap = new Map<string, string[]>();
  analysisResult.simpleRoleTransactions.forEach(srt => {
    if (!simpleRoleTransactionsMap.has(srt.simpleRole)) {
      simpleRoleTransactionsMap.set(srt.simpleRole, []);
    }
    simpleRoleTransactionsMap.get(srt.simpleRole)!.push(srt.transaction);
  });

  // Créer un Map pour récupérer la fréquence d'usage des transactions par rôle métier
  const businessRoleTransactionFrequencyMap = new Map<string, Map<string, number>>();
  analysisResult.businessRoleTransactions.forEach(brt => {
    if (!businessRoleTransactionFrequencyMap.has(brt.businessRole)) {
      businessRoleTransactionFrequencyMap.set(brt.businessRole, new Map<string, number>());
    }
    const transactionMap = businessRoleTransactionFrequencyMap.get(brt.businessRole)!;
    const currentCount = transactionMap.get(brt.transaction) || 0;
    transactionMap.set(brt.transaction, currentCount + (brt.executionCount || 1));
  });

  // Parcourir chaque analyse de couverture
  analysisResult.coverageAnalyses.forEach(analysis => {
    const businessRole = analysis.businessRole;
    const selectedRolesForBusiness = selectedRoles.get(businessRole) || new Set<string>();
    
    // Parcourir chaque rôle simple SÉLECTIONNÉ uniquement
    analysis.simpleRoles.forEach(role => {
      const isSelected = selectedRolesForBusiness.has(role.roleName);
      
      // Ne traiter que les rôles sélectionnés
      if (!isSelected) return;
      
      // Récupérer TOUTES les transactions du rôle simple depuis les données source
      const allTransactionsForRole = simpleRoleTransactionsMap.get(role.roleName) || [];
      
      // Si le rôle n'a aucune transaction, créer une ligne vide
      if (allTransactionsForRole.length === 0) {
        data.push([
          businessRole,
          `Rôle métier: ${businessRole}`,
          role.roleName,
          `Rôle simple: ${role.roleName}`,
          'Aucune transaction',
          'Aucune transaction disponible',
          '0', // Pas de fréquence si pas de transaction
          'Non'
        ]);
        return;
      }
      
      // Créer UNE LIGNE PAR TRANSACTION
      allTransactionsForRole.forEach(transaction => {
        const isTransactionUsed = role.coveredTransactions?.includes(transaction) || false;
        
        // Récupérer la fréquence d'usage de cette transaction pour ce rôle métier
        const businessRoleFrequencyMap = businessRoleTransactionFrequencyMap.get(businessRole);
        const usageFrequency = businessRoleFrequencyMap?.get(transaction) || 0;
        
        data.push([
          businessRole,
          `Rôle métier: ${businessRole}`,
          role.roleName,
          `Rôle simple: ${role.roleName}`,
          transaction, // UNE SEULE TRANSACTION PAR LIGNE
          `Transaction: ${transaction}`,
          usageFrequency.toString(), // VRAIE fréquence d'usage depuis businessRoleTransactions
          isTransactionUsed ? 'Oui' : 'Non' // Marqué si cette transaction spécifique est utilisée
        ]);
      });
    });
  });

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes
  worksheet['!cols'] = [
    { wch: 30 }, // Rôle Métier
    { wch: 35 }, // Description du rôle métier
    { wch: 30 }, // Rôle Simple
    { wch: 35 }, // Description du rôle simple
    { wch: 40 }, // Toutes les Transactions (une par ligne)
    { wch: 40 }, // Description des transactions
    { wch: 20 }, // Fréquence d'Usage
    { wch: 20 }  // Marqué si utilisée
  ];

  return worksheet;
}

