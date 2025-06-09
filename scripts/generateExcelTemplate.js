const XlsxPopulate = require('xlsx-populate');
const fs = require('fs');
const path = require('path');

// Récupérer le type de modèle depuis les arguments de ligne de commande
const templateType = process.argv[2] || 'full';

// Fonction principale pour générer les modèles Excel
async function generateTemplates() {
  console.log(`Génération du modèle Excel de type "${templateType}" pour l'importation de données...`);

  // Créer le dossier de sortie s'il n'existe pas
  const outputDir = path.join(__dirname, '../public/templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Générer le modèle spécifié
  switch (templateType) {
    case 'full':
      await generateFullTemplate(outputDir);
      break;
    case 'role':
      await generateRolesTemplate(outputDir);
      break;
    case 'transaction':
      await generateTransactionsTemplate(outputDir);
      break;
    case 'user':
      await generateUsersTemplate(outputDir);
      break;
    default:
      console.log(`Type de modèle "${templateType}" non reconnu. Génération du modèle complet par défaut.`);
      await generateFullTemplate(outputDir);
  }

  console.log('Modèle généré avec succès dans le dossier:', outputDir);
}

// Génère un modèle complet avec toutes les feuilles
async function generateFullTemplate(outputDir) {
  // Créer un nouveau workbook
  const workbook = await XlsxPopulate.fromBlankAsync();

  // Configurer les feuilles
  configureTransactionsSheet(workbook.sheet('Sheet1').name('Transactions'));
  configureRolesSheet(workbook.addSheet('Roles'));
  configureRoleMappingSheet(workbook.addSheet('RoleMapping'));
  configureUsersSheet(workbook.addSheet('Users'));
  
  // Ajouter une feuille d'aide
  const helpSheet = workbook.addSheet('Guide');
  configureHelpSheet(helpSheet);

  // Générer un timestamp pour le nom de fichier
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  
  // Enregistrer le fichier
  await workbook.toFileAsync(path.join(outputDir, `full_import_template_${timestamp}.xlsx`));
  console.log('- Modèle complet généré.');
}

// Génère un modèle pour les rôles uniquement
async function generateRolesTemplate(outputDir) {
  const workbook = await XlsxPopulate.fromBlankAsync();
  configureRolesSheet(workbook.sheet('Sheet1').name('Roles'));
  
  const helpSheet = workbook.addSheet('Guide');
  helpSheet.cell('A1').value('Guide d\'importation - Rôles');
  helpSheet.cell('A2').value('Ce modèle est destiné à l\'importation des rôles métier uniquement.');

  // Générer un timestamp pour le nom de fichier
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  
  await workbook.toFileAsync(path.join(outputDir, `roles_import_template_${timestamp}.xlsx`));
  console.log('- Modèle de rôles généré.');
}

// Génère un modèle pour les transactions uniquement
async function generateTransactionsTemplate(outputDir) {
  const workbook = await XlsxPopulate.fromBlankAsync();
  configureTransactionsSheet(workbook.sheet('Sheet1').name('Transactions'));
  
  const helpSheet = workbook.addSheet('Guide');
  helpSheet.cell('A1').value('Guide d\'importation - Transactions');
  helpSheet.cell('A2').value('Ce modèle est destiné à l\'importation des transactions uniquement.');

  // Générer un timestamp pour le nom de fichier
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  
  await workbook.toFileAsync(path.join(outputDir, `transactions_import_template_${timestamp}.xlsx`));
  console.log('- Modèle de transactions généré.');
}

// Génère un modèle pour les assignations utilisateurs
async function generateUsersTemplate(outputDir) {
  const workbook = await XlsxPopulate.fromBlankAsync();
  configureUsersSheet(workbook.sheet('Sheet1').name('Users'));
  
  const helpSheet = workbook.addSheet('Guide');
  helpSheet.cell('A1').value('Guide d\'importation - Assignations utilisateurs');
  helpSheet.cell('A2').value('Ce modèle est destiné à l\'importation des assignations utilisateurs.');

  // Générer un timestamp pour le nom de fichier
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
  
  await workbook.toFileAsync(path.join(outputDir, `users_import_template_${timestamp}.xlsx`));
  console.log('- Modèle d\'assignations utilisateurs généré.');
}

// Configure la feuille Transactions
function configureTransactionsSheet(sheet) {
  // En-têtes
  const headers = [
    'TransactionID', 'Code', 'Description', 'Category', 'Criticality', 
    'IsCore', 'Tags', 'System', 'Module'
  ];
  
  // Configurer les en-têtes
  headers.forEach((header, index) => {
    const cell = sheet.cell(1, index + 1);
    cell.value(header);
    cell.style({
      bold: true,
      fill: 'D9D9D9',
      horizontalAlignment: 'center'
    });
  });
  
  // Données d'exemple
  const exampleData = [
    ['TRX001', 'CREATE_USER', 'Create new user in system', 'User Management', 'high', true, 'admin,users', 'Core', 'Security'],
    ['TRX002', 'DELETE_USER', 'Delete user from system', 'User Management', 'high', true, 'admin,users', 'Core', 'Security'],
    ['TRX003', 'VIEW_REPORTS', 'View system reports', 'Reporting', 'medium', false, 'reporting', 'Reporting', 'Analytics'],
    ['TRX004', 'EDIT_PROFILE', 'Edit user profile', 'User Management', 'low', false, 'users,profile', 'Core', 'Profile'],
    ['TRX005', 'APPROVE_PAYMENT', 'Approve payment transaction', 'Finance', 'high', true, 'finance,payment', 'Finance', 'Payments']
  ];
  
  // Ajouter les données d'exemple
  exampleData.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      sheet.cell(rowIndex + 2, colIndex + 1).value(value);
    });
  });
  
  // Ajuster la largeur des colonnes
  for (let i = 0; i < headers.length; i++) {
    sheet.column(i + 1).width(15);
  }
  sheet.column(3).width(30); // Colonne Description plus large
  
  return sheet;
}

// Configure la feuille Roles
function configureRolesSheet(sheet) {
  // En-têtes
  const headers = [
    'RoleID', 'RoleName', 'Description', 'Department', 
    'UserCount', 'IsCustom', 'CreatedAt', 'CreatedBy'
  ];
  
  // Configurer les en-têtes
  headers.forEach((header, index) => {
    const cell = sheet.cell(1, index + 1);
    cell.value(header);
    cell.style({
      bold: true,
      fill: 'D9D9D9',
      horizontalAlignment: 'center'
    });
  });
  
  // Données d'exemple
  const exampleData = [
    ['ROLE001', 'System Administrator', 'Full system administration access', 'IT', 5, false, '2023-01-15', 'admin'],
    ['ROLE002', 'Finance Manager', 'Access to all finance functions', 'Finance', 8, false, '2023-01-15', 'admin'],
    ['ROLE003', 'HR Specialist', 'Human resources management', 'HR', 12, false, '2023-01-16', 'admin'],
    ['ROLE004', 'Sales Representative', 'Sales data and customer management', 'Sales', 25, false, '2023-01-17', 'admin'],
    ['ROLE005', 'Auditor', 'Read-only access for audit purposes', 'Compliance', 3, true, '2023-02-10', 'admin']
  ];
  
  // Ajouter les données d'exemple
  exampleData.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      sheet.cell(rowIndex + 2, colIndex + 1).value(value);
    });
  });
  
  // Ajuster la largeur des colonnes
  for (let i = 0; i < headers.length; i++) {
    sheet.column(i + 1).width(15);
  }
  sheet.column(3).width(30); // Colonne Description plus large
  
  return sheet;
}

// Configure la feuille RoleMapping
function configureRoleMappingSheet(sheet) {
  // En-têtes
  const headers = ['RoleID', 'TransactionID'];
  
  // Configurer les en-têtes
  headers.forEach((header, index) => {
    const cell = sheet.cell(1, index + 1);
    cell.value(header);
    cell.style({
      bold: true,
      fill: 'D9D9D9',
      horizontalAlignment: 'center'
    });
  });
  
  // Données d'exemple
  const exampleData = [
    ['ROLE001', 'TRX001'],
    ['ROLE001', 'TRX002'],
    ['ROLE001', 'TRX003'],
    ['ROLE001', 'TRX004'],
    ['ROLE001', 'TRX005'],
    ['ROLE002', 'TRX003'],
    ['ROLE002', 'TRX005'],
    ['ROLE003', 'TRX004'],
    ['ROLE004', 'TRX003'],
    ['ROLE004', 'TRX004'],
    ['ROLE005', 'TRX003']
  ];
  
  // Ajouter les données d'exemple
  exampleData.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      sheet.cell(rowIndex + 2, colIndex + 1).value(value);
    });
  });
  
  // Ajuster la largeur des colonnes
  sheet.column(1).width(15);
  sheet.column(2).width(15);
  
  return sheet;
}

// Configure la feuille Users
function configureUsersSheet(sheet) {
  // En-têtes
  const headers = ['UserID', 'Username', 'Email', 'Department', 'RoleIDs'];
  
  // Configurer les en-têtes
  headers.forEach((header, index) => {
    const cell = sheet.cell(1, index + 1);
    cell.value(header);
    cell.style({
      bold: true,
      fill: 'D9D9D9',
      horizontalAlignment: 'center'
    });
  });
  
  // Données d'exemple
  const exampleData = [
    ['U001', 'john.doe', 'john.doe@example.com', 'IT', 'ROLE001'],
    ['U002', 'jane.smith', 'jane.smith@example.com', 'Finance', 'ROLE002'],
    ['U003', 'bob.jones', 'bob.jones@example.com', 'HR', 'ROLE003'],
    ['U004', 'alice.white', 'alice.white@example.com', 'Sales', 'ROLE004'],
    ['U005', 'sarah.brown', 'sarah.brown@example.com', 'Compliance', 'ROLE005,ROLE003'],
    ['U006', 'mike.wilson', 'mike.wilson@example.com', 'IT', 'ROLE001,ROLE005']
  ];
  
  // Ajouter les données d'exemple
  exampleData.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      sheet.cell(rowIndex + 2, colIndex + 1).value(value);
    });
  });
  
  // Ajuster la largeur des colonnes
  for (let i = 0; i < headers.length; i++) {
    sheet.column(i + 1).width(15);
  }
  sheet.column(3).width(25); // Colonne Email plus large
  sheet.column(5).width(20); // Colonne RoleIDs plus large
  
  return sheet;
}

// Configure la feuille d'aide
function configureHelpSheet(sheet) {
  sheet.cell('A1').value('Guide d\'importation - Documentation').style({ bold: true, fontSize: 14 });
  sheet.cell('A3').value('Structure du fichier:').style({ bold: true });
  
  sheet.cell('A4').value('1. Feuille "Transactions":');
  sheet.cell('B5').value('- TransactionID: Identifiant unique de la transaction (obligatoire)');
  sheet.cell('B6').value('- Code: Code court de la transaction (obligatoire)');
  sheet.cell('B7').value('- Description: Description détaillée (obligatoire)');
  sheet.cell('B8').value('- Category: Catégorie de la transaction (obligatoire)');
  sheet.cell('B9').value('- Criticality: Niveau de criticité (low, medium, high) (obligatoire)');
  sheet.cell('B10').value('- IsCore: Indique si la transaction est critique (optionnel)');
  sheet.cell('B11').value('- Tags: Tags séparés par des virgules (optionnel)');
  sheet.cell('B12').value('- System: Système associé (optionnel)');
  sheet.cell('B13').value('- Module: Module associé (optionnel)');
  
  sheet.cell('A15').value('2. Feuille "Roles":').style({ bold: true });
  sheet.cell('B16').value('- RoleID: Identifiant unique du rôle (obligatoire)');
  sheet.cell('B17').value('- RoleName: Nom du rôle (obligatoire)');
  sheet.cell('B18').value('- Description: Description détaillée (obligatoire)');
  sheet.cell('B19').value('- Department: Département associé (optionnel)');
  sheet.cell('B20').value('- UserCount: Nombre d\'utilisateurs (optionnel)');
  sheet.cell('B21').value('- IsCustom: Indique si le rôle est personnalisé (optionnel)');
  sheet.cell('B22').value('- CreatedAt: Date de création (optionnel)');
  sheet.cell('B23').value('- CreatedBy: Créateur du rôle (optionnel)');
  
  sheet.cell('A25').value('3. Feuille "RoleMapping":').style({ bold: true });
  sheet.cell('B26').value('- RoleID: Référence à un RoleID dans la feuille Roles (obligatoire)');
  sheet.cell('B27').value('- TransactionID: Référence à un TransactionID dans la feuille Transactions (obligatoire)');
  
  sheet.cell('A29').value('4. Feuille "Users" (optionnelle):').style({ bold: true });
  sheet.cell('B30').value('- UserID: Identifiant unique de l\'utilisateur (obligatoire)');
  sheet.cell('B31').value('- Username: Nom d\'utilisateur (optionnel)');
  sheet.cell('B32').value('- Email: Adresse email (optionnel)');
  sheet.cell('B33').value('- Department: Département (optionnel)');
  sheet.cell('B34').value('- RoleIDs: Liste d\'IDs de rôles séparés par des virgules (obligatoire)');
  
  sheet.cell('A36').value('Remarques importantes:').style({ bold: true });
  sheet.cell('A37').value('- Les identifiants (TransactionID, RoleID, UserID) doivent être uniques.');
  sheet.cell('A38').value('- Les relations dans RoleMapping doivent référencer des IDs existants dans les feuilles Roles et Transactions.');
  sheet.cell('A39').value('- Pour les champs avec des valeurs spécifiques (ex: Criticality), respectez les formats indiqués.');
  
  // Ajuster la largeur des colonnes
  sheet.column('A').width(25);
  sheet.column('B').width(70);
  
  return sheet;
}

// Exécuter la fonction principale
generateTemplates().catch(err => {
  console.error('Erreur lors de la génération des modèles:', err);
  process.exit(1);
}); 