/**
 * Service de génération de template Excel pour l'analyse des utilisateurs
 * 
 * Génère un fichier Excel avec 3 feuilles :
 * - Feuille 1 : User ↔ Transaction
 * - Feuille 2 : Business Role ↔ Simple Role  
 * - Feuille 3 : Simple Role ↔ Transaction
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Structure des données d'exemple pour le template
 */
const EXAMPLE_USER_TRANSACTIONS = [
  { Utilisateur: 'USER001', Transaction: 'FB03', 'Nombre d\'exécutions': 150, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER001', Transaction: 'FB50', 'Nombre d\'exécutions': 75, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER001', Transaction: 'MIRO', 'Nombre d\'exécutions': 30, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER002', Transaction: 'FB03', 'Nombre d\'exécutions': 200, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER002', Transaction: 'FB50', 'Nombre d\'exécutions': 100, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER002', Transaction: 'F110', 'Nombre d\'exécutions': 45, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER003', Transaction: 'MIRO', 'Nombre d\'exécutions': 80, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER003', Transaction: 'ME21N', 'Nombre d\'exécutions': 120, Année: 2024, Mois: 1 },
  { Utilisateur: 'USER003', Transaction: 'ME22N', 'Nombre d\'exécutions': 90, Année: 2024, Mois: 1 },
];

const EXAMPLE_BUSINESS_ROLE_MAPPINGS = [
  { 'Rôle Métier': 'Accounting_Specialist', 'Rôle Simple': 'YS:CA:M:MD_CHANGE_CUSTOM_MASTER' },
  { 'Rôle Métier': 'Accounting_Specialist', 'Rôle Simple': 'YS:MM:D:INVOICE_DISPLAY_MINIMAL' },
  { 'Rôle Métier': 'Accounting_Specialist', 'Rôle Simple': 'YS:SD:D:OUTBOUND_DELIVERY_DISPLAY' },
  { 'Rôle Métier': 'AP_Specialist', 'Rôle Simple': 'YS:FI:M:AP_RECONCILIATION_MAINTAIN' },
  { 'Rôle Métier': 'AP_Specialist', 'Rôle Simple': 'YS:FI:M:AR_PAYMENT_AUTOMATION_MAINTAIN' },
  { 'Rôle Métier': 'AP_Specialist', 'Rôle Simple': 'YS:FI:D:PAYMENT_PROPOSAL_DISPLAY' },
  { 'Rôle Métier': 'Procurement_Specialist', 'Rôle Simple': 'YS:MM:D:BLOCKED_INVOICES_DISPLAY' },
  { 'Rôle Métier': 'Procurement_Specialist', 'Rôle Simple': 'YS:SD:M:CREA_SLS_DOCUMENT_MAINTAIN' },
  { 'Rôle Métier': 'Procurement_Specialist', 'Rôle Simple': 'YS:MM:D:IM_GOODS_ISSUE_DISPLAY' },
];

const EXAMPLE_SIMPLE_ROLE_TRANSACTIONS = [
  { 'Rôle Simple': 'YS:CA:M:MD_CHANGE_CUSTOM_MASTER', Transaction: 'FB03' },
  { 'Rôle Simple': 'YS:CA:M:MD_CHANGE_CUSTOM_MASTER', Transaction: 'FB50' },
  { 'Rôle Simple': 'YS:MM:D:INVOICE_DISPLAY_MINIMAL', Transaction: 'MIRO' },
  { 'Rôle Simple': 'YS:MM:D:INVOICE_DISPLAY_MINIMAL', Transaction: 'ME21N' },
  { 'Rôle Simple': 'YS:SD:D:OUTBOUND_DELIVERY_DISPLAY', Transaction: 'ME22N' },
  { 'Rôle Simple': 'YS:FI:M:AP_RECONCILIATION_MAINTAIN', Transaction: 'FB03' },
  { 'Rôle Simple': 'YS:FI:M:AP_RECONCILIATION_MAINTAIN', Transaction: 'F110' },
  { 'Rôle Simple': 'YS:FI:M:AR_PAYMENT_AUTOMATION_MAINTAIN', Transaction: 'FB50' },
  { 'Rôle Simple': 'YS:FI:D:PAYMENT_PROPOSAL_DISPLAY', Transaction: 'F110' },
  { 'Rôle Simple': 'YS:MM:D:BLOCKED_INVOICES_DISPLAY', Transaction: 'MIRO' },
  { 'Rôle Simple': 'YS:SD:M:CREA_SLS_DOCUMENT_MAINTAIN', Transaction: 'ME21N' },
  { 'Rôle Simple': 'YS:MM:D:IM_GOODS_ISSUE_DISPLAY', Transaction: 'ME22N' },
];

/**
 * Génère et télécharge un template Excel pour l'analyse des utilisateurs
 */
export async function generateUserAnalysisTemplate(
  options: {
    fileName?: string;
    includeExamples?: boolean;
    onProgress?: (progress: number, message: string) => void;
  } = {}
): Promise<void> {
  const {
    fileName = 'template_user_analysis.xlsx',
    includeExamples = true,
    onProgress
  } = options;

  try {
    if (onProgress) onProgress(10, 'Création du template...');

    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();

    // 1. Feuille 1 : User ↔ Transaction
    if (onProgress) onProgress(30, 'Création de la feuille Utilisateur-Transaction...');
    const userTransactionSheet = createUserTransactionSheet(includeExamples);
    XLSX.utils.book_append_sheet(workbook, userTransactionSheet, 'User-Transaction');

    // 2. Feuille 2 : Business Role ↔ Simple Role
    if (onProgress) onProgress(60, 'Création de la feuille Mapping Rôles...');
    const businessRoleMappingSheet = createBusinessRoleMappingSheet(includeExamples);
    XLSX.utils.book_append_sheet(workbook, businessRoleMappingSheet, 'BusinessRole-SimpleRole');

    // 3. Feuille 3 : Simple Role ↔ Transaction
    if (onProgress) onProgress(80, 'Création de la feuille Rôle-Transaction...');
    const simpleRoleTransactionSheet = createSimpleRoleTransactionSheet(includeExamples);
    XLSX.utils.book_append_sheet(workbook, simpleRoleTransactionSheet, 'SimpleRole-Transaction');

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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Impossible de générer le template Excel : ${errorMessage}`);
  }
}

/**
 * Crée la feuille User ↔ Transaction
 */
function createUserTransactionSheet(includeExamples: boolean): XLSX.WorkSheet {
  const headers = [
    'Utilisateur',
    'Transaction', 
    'Nombre d\'exécutions',
    'Année',
    'Mois'
  ];

  const data = [headers];
  
  if (includeExamples) {
    // Ajouter les données d'exemple
    EXAMPLE_USER_TRANSACTIONS.forEach(row => {
      data.push([
        row.Utilisateur,
        row.Transaction,
        String(row['Nombre d\'exécutions']),
        String(row.Année),
        String(row.Mois)
      ]);
    });
  } else {
    // Ajouter quelques lignes vides pour guider l'utilisateur
    for (let i = 0; i < 5; i++) {
      data.push(['', '', '', '', '']);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes
  worksheet['!cols'] = [
    { wch: 15 }, // Utilisateur
    { wch: 15 }, // Transaction
    { wch: 20 }, // Nombre d'exécutions
    { wch: 10 }, // Année
    { wch: 10 }  // Mois
  ];

  // Ajouter des commentaires sur les headers
  if (!worksheet['!comments']) worksheet['!comments'] = [];
  
  // Commentaires explicatifs
  const comments = [
    { cell: 'A1', comment: 'ID unique de l\'utilisateur (ex: USER001, john.doe, etc.)' },
    { cell: 'B1', comment: 'Code de la transaction SAP (ex: FB03, MIRO, ME21N)' },
    { cell: 'C1', comment: 'Nombre total d\'exécutions de cette transaction par cet utilisateur' },
    { cell: 'D1', comment: 'Année de référence des données (ex: 2024)' },
    { cell: 'E1', comment: 'Mois de référence (1-12, optionnel)' }
  ];

  comments.forEach(({ cell, comment }) => {
    if (!worksheet[cell]) return;
    if (!worksheet[cell].c) worksheet[cell].c = [];
    worksheet[cell].c.push({ a: 'Template', t: comment });
  });

  return worksheet;
}

/**
 * Crée la feuille Business Role ↔ Simple Role
 */
function createBusinessRoleMappingSheet(includeExamples: boolean): XLSX.WorkSheet {
  const headers = [
    'Rôle Métier',
    'Rôle Simple'
  ];

  const data = [headers];
  
  if (includeExamples) {
    // Ajouter les données d'exemple
    EXAMPLE_BUSINESS_ROLE_MAPPINGS.forEach(row => {
      data.push([
        row['Rôle Métier'],
        row['Rôle Simple']
      ]);
    });
  } else {
    // Ajouter quelques lignes vides pour guider l'utilisateur
    for (let i = 0; i < 5; i++) {
      data.push(['', '']);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  
  // Définir la largeur des colonnes
  worksheet['!cols'] = [
    { wch: 25 }, // Rôle Métier
    { wch: 40 }  // Rôle Simple
  ];

  // Ajouter des commentaires
  const comments = [
    { cell: 'A1', comment: 'Nom du rôle métier (ex: Accounting_Specialist, AP_Specialist)' },
    { cell: 'B1', comment: 'Code du rôle simple SAP associé (ex: YS:CA:M:MD_CHANGE_CUSTOM_MASTER)' }
  ];

  comments.forEach(({ cell, comment }) => {
    if (!worksheet[cell]) return;
    if (!worksheet[cell].c) worksheet[cell].c = [];
    worksheet[cell].c.push({ a: 'Template', t: comment });
  });

  return worksheet;
}

/**
 * Crée la feuille Simple Role ↔ Transaction
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
        row['Rôle Simple'],
        '', // Description du rôle (vide dans les exemples)
        row.Transaction,
        '' // Description de la transaction (vide dans les exemples)
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

/**
 * Génère un template sans exemples (version propre)
 */
export async function generateCleanUserAnalysisTemplate(
  fileName: string = 'template_user_analysis_clean.xlsx'
): Promise<void> {
  return generateUserAnalysisTemplate({
    fileName,
    includeExamples: false
  });
}

