/**
 * Service de génération de template Excel pour l'analyse des rôles métier
 * 
 * Génère un fichier Excel avec 2 feuilles :
 * - Feuille 1 : Historique des transactions par rôle métier (avec Process optionnel)
 * - Feuille 2 : Modèle de rôles simples SAP
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Données d'exemple pour la Feuille 1
 */
const EXAMPLE_BUSINESS_ROLE_TRANSACTIONS = [
  { Process: 'Comptabilité', 'Rôle métier': 'Accounting Clerk', Année: 2024, Mois: 10, Transaction: 'FB03', 'Nombre d\'exécutions': 150 },
  { Process: 'Comptabilité', 'Rôle métier': 'Accounting Clerk', Année: 2024, Mois: 10, Transaction: 'FB50', 'Nombre d\'exécutions': 75 },
  { Process: 'Comptabilité', 'Rôle métier': 'AP Accountant', Année: 2024, Mois: 10, Transaction: 'MIRO', 'Nombre d\'exécutions': 200 },
  { Process: 'Achats', 'Rôle métier': 'Purchaser', Année: 2024, Mois: 10, Transaction: 'ME21N', 'Nombre d\'exécutions': 120 },
  { Process: 'Achats', 'Rôle métier': 'Purchaser', Année: 2024, Mois: 10, Transaction: 'ME22N', 'Nombre d\'exécutions': 90 },
  { Process: 'Logistique', 'Rôle métier': 'Warehouse Manager', Année: 2024, Mois: 10, Transaction: 'MIGO', 'Nombre d\'exécutions': 180 },
];

/**
 * Données d'exemple pour la Feuille 2
 */
const EXAMPLE_SIMPLE_ROLE_TRANSACTIONS = [
  { 'Rôle simple': 'YS:FI:D:AP_MD_VENDORS____:', 'Description du rôle': 'BC: Compta. four. - Affichage', Transaction: 'FB03', 'Description de la transaction': 'Afficher document' },
  { 'Rôle simple': 'YS:FI:M:AP_MD_VENDORS____:', 'Description du rôle': 'BC: Compta. four. - Gestion', Transaction: 'FB50', 'Description de la transaction': 'Saisie facture' },
  { 'Rôle simple': 'YS:MM:M:INVOICE_DISPLAY__:', 'Description du rôle': 'MM: Factures - Gestion', Transaction: 'MIRO', 'Description de la transaction': 'Saisie facture fournisseur' },
];

/**
 * Génère et télécharge un template Excel pour l'analyse des rôles métier
 */
export async function generateRoleAnalysisTemplate(
  options: {
    fileName?: string;
    includeExamples?: boolean;
    onProgress?: (progress: number, message: string) => void;
  } = {}
): Promise<void> {
  const {
    fileName = 'template_role_analysis.xlsx',
    includeExamples = true,
    onProgress
  } = options;

  try {
    if (onProgress) onProgress(10, 'Création du template...');

    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // 1. Feuille 1 : Historique des transactions par rôle métier
    if (onProgress) onProgress(40, 'Création de la feuille Rôles Métier...');
    const businessRoleSheet = createBusinessRoleTransactionSheet(includeExamples);
    XLSX.utils.book_append_sheet(workbook, businessRoleSheet, 'Feuille1');

    // 2. Feuille 2 : Modèle de rôles simples SAP
    if (onProgress) onProgress(70, 'Création de la feuille Rôles Simples...');
    const simpleRoleSheet = createSimpleRoleTransactionSheet(includeExamples);
    XLSX.utils.book_append_sheet(workbook, simpleRoleSheet, 'Feuille2');

    // Générer le fichier Excel
    if (onProgress) onProgress(90, 'Génération du fichier Excel...');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
      compression: true
    });

    // Sauvegarder le fichier
    if (onProgress) onProgress(100, 'Téléchargement du template...');
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    saveAs(blob, fileName);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Impossible de générer le template Excel : ${errorMessage}`);
  }
}

/**
 * Crée la feuille Historique des transactions par rôle métier (Feuille1)
 */
function createBusinessRoleTransactionSheet(includeExamples: boolean): XLSX.WorkSheet {
  const headers = [
    'Process',              // 🆕 Colonne Process (optionnelle)
    'Rôle métier',
    'Année',
    'Mois',
    'Transaction',
    'Nombre d\'exécutions'
  ];

  const data = [headers];
  
  if (includeExamples) {
    // Ajouter les données d'exemple
    EXAMPLE_BUSINESS_ROLE_TRANSACTIONS.forEach(row => {
      data.push([
        row.Process,
        row['Rôle métier'],
        String(row.Année),
        String(row.Mois),
        row.Transaction,
        String(row['Nombre d\'exécutions'])
      ]);
    });
  } else {
    // Ajouter quelques lignes vides pour guider l'utilisateur
    for (let i = 0; i < 5; i++) {
      data.push(['', '', '', '', '', '']);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes
  worksheet['!cols'] = [
    { wch: 20 }, // Process
    { wch: 30 }, // Rôle métier
    { wch: 10 }, // Année
    { wch: 10 }, // Mois
    { wch: 15 }, // Transaction
    { wch: 20 }  // Nombre d'exécutions
  ];

  // Ajouter des commentaires sur les headers
  if (!worksheet['!comments']) worksheet['!comments'] = [];
  
  const comments = [
    { cell: 'A1', comment: 'Processus métier (ex: Comptabilité, Achats, Logistique) - OPTIONNEL' },
    { cell: 'B1', comment: 'Nom du rôle métier (ex: Accounting Clerk, AP Accountant)' },
    { cell: 'C1', comment: 'Année de référence des données (ex: 2024)' },
    { cell: 'D1', comment: 'Mois de référence (1-12, optionnel)' },
    { cell: 'E1', comment: 'Code de la transaction SAP (ex: FB03, MIRO, ME21N)' },
    { cell: 'F1', comment: 'Nombre total d\'exécutions de cette transaction pour ce rôle métier' }
  ];

  comments.forEach(({ cell, comment }) => {
    if (!worksheet[cell]) return;
    if (!worksheet[cell].c) worksheet[cell].c = [];
    worksheet[cell].c.push({ a: 'Template', t: comment });
  });

  return worksheet;
}

/**
 * Crée la feuille Modèle de rôles simples SAP (Feuille2)
 */
function createSimpleRoleTransactionSheet(includeExamples: boolean): XLSX.WorkSheet {
  const headers = [
    'Rôle simple',
    'Description du rôle',
    'Transaction',
    'Description de la transaction'
  ];

  const data = [headers];
  
  if (includeExamples) {
    // Ajouter les données d'exemple
    EXAMPLE_SIMPLE_ROLE_TRANSACTIONS.forEach(row => {
      data.push([
        row['Rôle simple'],
        row['Description du rôle'],
        row.Transaction,
        row['Description de la transaction']
      ]);
    });
  } else {
    // Ajouter quelques lignes vides pour guider l'utilisateur
    for (let i = 0; i < 5; i++) {
      data.push(['', '', '', '']);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes
  worksheet['!cols'] = [
    { wch: 40 }, // Rôle simple
    { wch: 40 }, // Description du rôle
    { wch: 15 }, // Transaction
    { wch: 40 }  // Description de la transaction
  ];

  // Ajouter des commentaires
  const comments = [
    { cell: 'A1', comment: 'Code du rôle simple SAP (ex: YS:CA:M:MD_CHANGE_CUSTOM_MASTER)' },
    { cell: 'B1', comment: 'Description du rôle simple (ex: BC: ABAP Workbench - Affichage)' },
    { cell: 'C1', comment: 'Code de la transaction SAP couverte par ce rôle (ex: FB03, MIRO)' },
    { cell: 'D1', comment: 'Description de la transaction (ex: Afficher client)' }
  ];

  comments.forEach(({ cell, comment }) => {
    if (!worksheet[cell]) return;
    if (!worksheet[cell].c) worksheet[cell].c = [];
    worksheet[cell].c.push({ a: 'Template', t: comment });
  });

  return worksheet;
}





