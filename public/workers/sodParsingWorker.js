/**
 * Web Worker pour le parsing Excel asynchrone
 * Traite les fichiers SoD volumineux (jusqu'à 1M de lignes) sans bloquer l'UI
 */

// Importer XLSX dans le worker
importScripts('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js');

/**
 * Message handler principal
 */
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'PARSE_FILE':
        await parseExcelFile(payload);
        break;

      case 'CANCEL':
        // Annuler le parsing en cours
        self.postMessage({ type: 'CANCELLED' });
        self.close();
        break;

      default:
        self.postMessage({ 
          type: 'ERROR', 
          error: `Unknown message type: ${type}` 
        });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      error: error.message || 'Unknown error during parsing' 
    });
  }
});

/**
 * Parse le fichier Excel par chunks
 */
async function parseExcelFile({ arrayBuffer, chunkSize = 10000 }) {
  // Étape 1 : Lire le workbook
  const fileSizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
  
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 5, 
    message: `Lecture du fichier (${fileSizeMB} MB)...` 
  });

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 8, 
    message: 'Fichier chargé ! Analyse de la structure...' 
  });

  // Étape 2 : Convertir en JSON (optimisé)
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 10, 
    message: 'Initialisation de la conversion...' 
  });

  // Options optimisées pour la performance
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    defval: '',        // Valeur par défaut pour cellules vides
    raw: false,        // Convertir tout en texte (plus rapide)
    blankrows: false   // Ignorer les lignes vides
  });
  
  const totalRows = jsonData.length;

  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 25, 
    message: `Conversion terminée ! ${totalRows.toLocaleString()} lignes détectées. Traitement...` 
  });

  // Étape 3 : Traiter par chunks pour éviter de bloquer
  const processedRecords = [];
  const numChunks = Math.ceil(totalRows / chunkSize);

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min((i + 1) * chunkSize, totalRows);
    const chunk = jsonData.slice(start, end);

    // Traiter le chunk
    const processed = chunk.map(row => normalizeRecord(row));
    processedRecords.push(...processed);

    // Mettre à jour la progression
    const progress = 25 + Math.floor((i + 1) / numChunks * 60);
    self.postMessage({ 
      type: 'PROGRESS', 
      progress, 
      message: `Traitement : ${end}/${totalRows} lignes` 
    });

    // Donner du temps au navigateur
    await sleep(0);
  }

  // Étape 4 : Appliquer les filtres de pré-traitement
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 90, 
    message: 'Application des filtres...' 
  });

  const filteredRecords = applyPreFilters(processedRecords);

  // Étape 5 : Terminer
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 100, 
    message: 'Parsing terminé !' 
  });

  self.postMessage({ 
    type: 'COMPLETE', 
    data: filteredRecords 
  });
}

/**
 * Normaliser un enregistrement (mapper les colonnes FR/EN)
 */
function normalizeRecord(row) {
  return {
    ruleId: row['Rule ID'] || row['ID de règle'] || '',
    riskId: row['Access Risk ID'] || row['ID de risque d\'accès'] || '',
    riskLevel: row['Risk Level'] || row['Niveau de risque'] || '',
    riskDescription: row['Risk Description'] || row['Description du risque'] || '',
    control: row['Control'] || row['Contrôle'] || '',
    roleName: row['Role Name'] || row['Nom du rôle'] || '',
    roleDescription: row['Role Description'] || row['Description du rôle'] || '',
    userCompositeRole: row['User/Composite Role'] || row['Rôle utilisateur/composite'] || '',
    roleProfile: row['Role/Profile'] || row['Rôle/Profil'] || '',
    tCode: row['T-Code'] || row['Code transaction'] || '',
    tCodeDescription: row['T-Code Description'] || row['Description code transaction'] || '',
    authObject: row['Authorization Object'] || row['Objet d\'autorisation'] || '',
    authObjectDescription: row['Authorization Object Description'] || row['Description objet d\'autorisation'] || '',
    authField: row['Authorization Field'] || row['Champ d\'autorisation'] || '',
    authFieldDescription: row['Authorization Field Description'] || row['Description champ d\'autorisation'] || '',
    authValueFrom: row['Authorization Value From'] || row['Valeur d\'autorisation de'] || '',
    authValueTo: row['Authorization Value To'] || row['Valeur d\'autorisation jusque'] || '',
    authValueFromDescription: row['Authorization Value From Description'] || row['Description valeur de'] || '',
    authValueToDescription: row['Authorization Value To Description'] || row['Description valeur jusque'] || '',
    system: row['System'] || row['Système'] || '',
    riskCategory: row['Risk Category'] || row['Catégorie de risque'] || '',
    riskSubcategory: row['Risk Subcategory'] || row['Sous-catégorie de risque'] || '',
    businessProcess: row['Business Process'] || row['Processus métier'] || '',
    function: row['Function'] || row['Fonction'] || '',
    functionDescription: row['Function Description'] || row['Description de la fonction'] || '',
    mitigationControl: row['Mitigation Control'] || row['Contrôle d\'atténuation'] || '',
    mitigationControlDescription: row['Mitigation Control Description'] || row['Description contrôle d\'atténuation'] || '',
    riskPriority: row['Risk Priority'] || row['Priorité du risque'] || ''
  };
}

/**
 * Appliquer les filtres de pré-traitement
 */
function applyPreFilters(records) {
  // Règle 1 : Supprimer la colonne Rule ID (déjà fait dans normalizeRecord)
  // Règle 2 : Garder uniquement les lignes où "Control" est vide
  let filtered = records.filter(record => !record.control || record.control.trim() === '');
  
  // Règle 3 : Garder uniquement les lignes où "Access Risk ID" n'est pas vide
  filtered = filtered.filter(record => record.riskId && record.riskId.trim() !== '');
  
  // Règle 4 : Supprimer les doublons (comparaison JSON pour simplicité)
  const seen = new Set();
  filtered = filtered.filter(record => {
    const key = JSON.stringify(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return filtered;
}

/**
 * Attendre un certain temps (pour ne pas bloquer)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

