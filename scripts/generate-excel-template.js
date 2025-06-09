/**
 * Script pour générer le template Excel pour l'analyse des rôles métier
 * Structure :
 * - Feuille1 : Rôle métier, Année, Mois, Transaction, Nombre d'exécutions
 * - Feuille2 : Rôle simple, Transaction
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function generateExcelTemplate() {
  console.log('🔄 Génération du template Excel...');

  // Créer un nouveau workbook
  const workbook = XLSX.utils.book_new();

  // === FEUILLE 1 : Rôles métier ===
  const sheet1Data = [
    ['Rôle métier', 'Année', 'Mois', 'Transaction', 'Nombre d\'exécutions'],
    ['Comptable', 2024, 1, 'FB01', 15],
    ['Comptable', 2024, 1, 'FB02', 8],
    ['Comptable', 2024, 2, 'FB01', 12],
    ['Acheteur', 2024, 1, 'ME21N', 25],
    ['Acheteur', 2024, 1, 'ME22N', 18],
    ['Vendeur', 2024, 1, 'VA01', 30],
    ['Vendeur', 2024, 2, 'VA02', 22]
  ];

  const worksheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  
  // Définir la largeur des colonnes pour Feuille1
  worksheet1['!cols'] = [
    { wch: 15 }, // Rôle métier
    { wch: 8 },  // Année
    { wch: 8 },  // Mois
    { wch: 15 }, // Transaction
    { wch: 20 }  // Nombre d'exécutions
  ];

  // === FEUILLE 2 : Rôles simples ===
  const sheet2Data = [
    ['Rôle simple', 'Transaction'],
    ['SAP_FI_BASIC', 'FB01'],
    ['SAP_FI_BASIC', 'FB02'],
    ['SAP_FI_BASIC', 'FB03'],
    ['SAP_MM_BUYER', 'ME21N'],
    ['SAP_MM_BUYER', 'ME22N'],
    ['SAP_MM_BUYER', 'ME23N'],
    ['SAP_SD_SALES', 'VA01'],
    ['SAP_SD_SALES', 'VA02'],
    ['SAP_SD_SALES', 'VA03']
  ];

  const worksheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  
  // Définir la largeur des colonnes pour Feuille2
  worksheet2['!cols'] = [
    { wch: 20 }, // Rôle simple
    { wch: 15 }  // Transaction
  ];

  // Ajouter les feuilles au workbook
  XLSX.utils.book_append_sheet(workbook, worksheet1, 'Feuille1');
  XLSX.utils.book_append_sheet(workbook, worksheet2, 'Feuille2');

  // Définir le chemin de sortie
  const outputPath = path.join(__dirname, '..', 'public', 'templates', 'template_role_analysis.xlsx');
  
  // Créer le dossier si nécessaire
  const templatesDir = path.dirname(outputPath);
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // Écrire le fichier Excel
  XLSX.writeFile(workbook, outputPath);

  console.log('✅ Template Excel généré avec succès !');
  console.log(`📁 Fichier créé : ${outputPath}`);
  console.log('📊 Structure :');
  console.log('   - Feuille1 : Historique des transactions par rôle métier (7 exemples)');
  console.log('   - Feuille2 : Modèle de rôles simples SAP (9 exemples)');
  console.log('');
  console.log('🔗 Le fichier est maintenant téléchargeable depuis l\'interface web.');
}

// Exécuter la génération
if (require.main === module) {
  try {
    generateExcelTemplate();
  } catch (error) {
    console.error('❌ Erreur lors de la génération :', error.message);
    process.exit(1);
  }
}

module.exports = { generateExcelTemplate }; 