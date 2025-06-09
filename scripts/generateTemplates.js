const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Fonction pour s'assurer que le répertoire de sortie existe
function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
    console.log(`Répertoire créé: ${directoryPath}`);
  }
}

// Chemin de sortie pour les modèles
const outputDir = path.resolve(__dirname, '../public/templates');
ensureDirectoryExists(outputDir);

// Fonction pour créer le modèle d'analyse des rôles
function createRoleAnalysisTemplate() {
  console.log('Génération du modèle d\'analyse des rôles...');
  
  // Créer un nouveau classeur
  const workbook = XLSX.utils.book_new();
  
  // Feuille des transactions
  const transactionsData = [
    ['ID', 'Code', 'Nom', 'Description', 'Module', 'Criticité', 'Type', 'Métadonnées'],
    ['T001', 'FI_AP_INVOICE', 'Créer facture', 'Création de facture fournisseur', 'Finance', 'Élevée', 'Transactionnel', '{"risque": "financier", "impact": "direct"}'],
    ['T002', 'FI_AR_INVOICE', 'Créer facture client', 'Création de facture client', 'Finance', 'Élevée', 'Transactionnel', '{"risque": "financier", "impact": "direct"}'],
    ['T003', 'HR_CREATE_EMP', 'Créer employé', 'Création d\'un nouvel employé', 'RH', 'Moyenne', 'Master Data', '{"risque": "confidentialité", "impact": "moyen"}'],
    ['', '', '', '', '', '', '', '']
  ];
  
  const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transactions');
  
  // Feuille des rôles
  const rolesData = [
    ['ID', 'Nom', 'Description', 'Département', 'Date de création', 'Nombre utilisateurs'],
    ['R001', 'Comptable AP', 'Gestion des comptes fournisseurs', 'Finance', '2023-01-01', 5],
    ['R002', 'Comptable AR', 'Gestion des comptes clients', 'Finance', '2023-01-01', 3],
    ['R003', 'Spécialiste RH', 'Gestion des ressources humaines', 'RH', '2023-01-01', 2],
    ['', '', '', '', '', '']
  ];
  
  const rolesSheet = XLSX.utils.aoa_to_sheet(rolesData);
  XLSX.utils.book_append_sheet(workbook, rolesSheet, 'Roles');
  
  // Feuille des mappages
  const mappingsData = [
    ['Role_ID', 'Transaction_ID'],
    ['R001', 'T001'],
    ['R002', 'T002'],
    ['R003', 'T003'],
    ['R001', 'T002'],
    ['', '']
  ];
  
  const mappingsSheet = XLSX.utils.aoa_to_sheet(mappingsData);
  XLSX.utils.book_append_sheet(workbook, mappingsSheet, 'Mappages');
  
  // Feuille des attributions utilisateurs
  const usersData = [
    ['ID_Utilisateur', 'Nom', 'Role_ID'],
    ['U001', 'Jean Dupont', 'R001'],
    ['U002', 'Marie Martin', 'R002'],
    ['U003', 'Pierre Durand', 'R003'],
    ['U004', 'Sophie Lambert', 'R001'],
    ['', '', '']
  ];
  
  const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Utilisateurs');
  
  // Feuille d'instructions
  const instructionsData = [
    ['Instructions pour compléter le modèle d\'analyse des rôles'],
    [''],
    ['1. Feuille "Transactions"'],
    ['   - Listez toutes les transactions avec leurs informations'],
    ['   - Le champ ID est obligatoire et doit être unique'],
    ['   - Le champ Criticité doit être: Faible, Moyenne, Élevée, ou Critique'],
    ['   - Le champ Métadonnées est optionnel et accepte un format JSON'],
    [''],
    ['2. Feuille "Roles"'],
    ['   - Listez tous les rôles métier avec leurs informations'],
    ['   - Le champ ID est obligatoire et doit être unique'],
    ['   - Le champ Date de création doit être au format YYYY-MM-DD'],
    [''],
    ['3. Feuille "Mappages"'],
    ['   - Associez les rôles aux transactions'],
    ['   - Chaque ligne représente une autorisation d\'un rôle pour une transaction'],
    ['   - Les valeurs Role_ID et Transaction_ID doivent exister dans leurs feuilles respectives'],
    [''],
    ['4. Feuille "Utilisateurs"'],
    ['   - Listez les utilisateurs et leurs rôles attribués'],
    ['   - Le champ ID_Utilisateur est obligatoire et doit être unique'],
    ['   - Le champ Role_ID doit correspondre à un ID existant dans la feuille Roles'],
    ['']
  ];
  
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  
  // Définir la largeur des colonnes
  const colWidths = {
    'Transactions': [{ wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 40 }],
    'Roles': [{ wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }],
    'Mappages': [{ wch: 15 }, { wch: 15 }],
    'Utilisateurs': [{ wch: 15 }, { wch: 25 }, { wch: 15 }],
    'Instructions': [{ wch: 100 }]
  };
  
  for (const sheetName in colWidths) {
    workbook.Sheets[sheetName]['!cols'] = colWidths[sheetName];
  }
  
  // Écrire le fichier
  const outputPath = path.join(outputDir, 'role_analysis_template.xlsx');
  XLSX.writeFile(workbook, outputPath);
  console.log(`Modèle d'analyse des rôles généré: ${outputPath}`);
}

// Fonction pour créer le modèle de contrôle d'accès
function createAccessControlTemplate() {
  console.log('Génération du modèle de contrôle d\'accès...');
  
  // Créer un nouveau classeur
  const workbook = XLSX.utils.book_new();
  
  // Feuille des utilisateurs
  const usersData = [
    ['ID', 'Nom', 'Email', 'Département', 'Fonction', 'Date début', 'Date fin', 'Statut'],
    ['U001', 'Jean Dupont', 'jean.dupont@example.com', 'Finance', 'Comptable', '2023-01-01', '', 'Actif'],
    ['U002', 'Marie Martin', 'marie.martin@example.com', 'Finance', 'Responsable', '2023-01-01', '', 'Actif'],
    ['U003', 'Pierre Durand', 'pierre.durand@example.com', 'RH', 'Spécialiste RH', '2023-01-01', '2023-12-31', 'Inactif'],
    ['', '', '', '', '', '', '', '']
  ];
  
  const usersSheet = XLSX.utils.aoa_to_sheet(usersData);
  XLSX.utils.book_append_sheet(workbook, usersSheet, 'Utilisateurs');
  
  // Feuille des permissions
  const permissionsData = [
    ['ID', 'Nom', 'Description', 'Type', 'Application'],
    ['P001', 'ADMIN_USERS', 'Gestion des utilisateurs', 'Admin', 'Sora'],
    ['P002', 'VIEW_REPORTS', 'Visualisation des rapports', 'View', 'Sora'],
    ['P003', 'EDIT_CONFIG', 'Modification des configurations', 'Edit', 'Sora'],
    ['', '', '', '', '']
  ];
  
  const permissionsSheet = XLSX.utils.aoa_to_sheet(permissionsData);
  XLSX.utils.book_append_sheet(workbook, permissionsSheet, 'Permissions');
  
  // Feuille des attributions
  const assignmentsData = [
    ['Utilisateur_ID', 'Permission_ID', 'Date attribution', 'Date expiration', 'Commentaire'],
    ['U001', 'P002', '2023-01-01', '', ''],
    ['U002', 'P001', '2023-01-01', '', ''],
    ['U002', 'P002', '2023-01-01', '', ''],
    ['U002', 'P003', '2023-01-01', '', ''],
    ['', '', '', '', '']
  ];
  
  const assignmentsSheet = XLSX.utils.aoa_to_sheet(assignmentsData);
  XLSX.utils.book_append_sheet(workbook, assignmentsSheet, 'Attributions');
  
  // Feuille d'instructions
  const instructionsData = [
    ['Instructions pour compléter le modèle de contrôle d\'accès'],
    [''],
    ['1. Feuille "Utilisateurs"'],
    ['   - Listez tous les utilisateurs avec leurs informations'],
    ['   - Le champ ID est obligatoire et doit être unique'],
    ['   - Le champ Email doit être une adresse email valide'],
    ['   - Le champ Statut doit être: Actif ou Inactif'],
    ['   - Les dates doivent être au format YYYY-MM-DD'],
    [''],
    ['2. Feuille "Permissions"'],
    ['   - Listez toutes les permissions disponibles avec leurs informations'],
    ['   - Le champ ID est obligatoire et doit être unique'],
    ['   - Le champ Type doit être: View, Edit, Admin, ou Delete'],
    [''],
    ['3. Feuille "Attributions"'],
    ['   - Associez les utilisateurs aux permissions'],
    ['   - Chaque ligne représente une attribution d\'une permission à un utilisateur'],
    ['   - Les valeurs Utilisateur_ID et Permission_ID doivent exister dans leurs feuilles respectives'],
    ['   - Les dates doivent être au format YYYY-MM-DD'],
    ['']
  ];
  
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
  
  // Définir la largeur des colonnes
  const colWidths = {
    'Utilisateurs': [{ wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }],
    'Permissions': [{ wch: 10 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }],
    'Attributions': [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }],
    'Instructions': [{ wch: 100 }]
  };
  
  for (const sheetName in colWidths) {
    workbook.Sheets[sheetName]['!cols'] = colWidths[sheetName];
  }
  
  // Écrire le fichier
  const outputPath = path.join(outputDir, 'access_control_template.xlsx');
  XLSX.writeFile(workbook, outputPath);
  console.log(`Modèle de contrôle d'accès généré: ${outputPath}`);
}

try {
  // Générer les modèles
  createRoleAnalysisTemplate();
  createAccessControlTemplate();
  
  console.log('Tous les modèles ont été générés avec succès!');
} catch (error) {
  console.error('Erreur lors de la génération des modèles:', error);
  process.exit(1);
} 