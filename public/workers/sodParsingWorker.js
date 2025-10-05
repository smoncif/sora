/**
 * Web Worker optimisé pour le parsing Excel SoD
 * Traite les fichiers volumineux (500k+ lignes) sans bloquer l'UI
 * 
 * Architecture:
 * 1. Lecture du fichier Excel (XLSX.read)
 * 2. Conversion en JSON par chunks
 * 3. Mapping des colonnes FR/EN
 * 4. Filtrage et dédoublonnage
 * 5. Retour des données au thread principal
 */

// Importer XLSX dans le worker
importScripts('https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js');

/**
 * Configuration du mapping des colonnes (FR/EN)
 */
const COLUMN_MAPPINGS = {
  // Obligatoires
  roleName: ['Nom du rôle', 'Role Name'],
  accessRiskId: ['ID de risque d\'accès', 'Access Risk ID'],
  riskLevel: ['Niveau du risque', 'Risk Level'],
  function: ['Fonction', 'Function'],
  system: ['Système', 'System'],
  action: ['Action', 'Action'],
  resource: ['Ressource', 'Resource'],
  resourceExtn: ['Ressource externe', 'Resource Extn'],
  valueFrom: ['Valeur de', 'Value From'],
  valueTo: ['Valeur jusq.', 'Value To'],
  roleProfile: ['Rôle/Profil', 'Role/Profile'],
  compositeBusinessRole: ['Rôle utilisateur/composite', 'Composite/Business Role'],
  
  // Optionnelles
  riskDescription: ['Description du risque', 'Risk Description'],
  ruleId: ['ID de règle', 'Rule ID'],
  functionDescription: ['Description de fonction', 'Function Description'],
  actionDescription: ['Description action', 'Action Description'],
  resourceDescription: ['Description de ressource', 'Resource Description'],
  resourceExtnDesc: ['Description externe de ressource', 'Resource Extn Desc'],
  roleProfileDescription: ['Description de rôle/profil', 'Role/Profile Description'],
  compositeRoleDescription: ['Description de rôle utilisateur/composite', 'Composite/Business Role Description'],
  control: ['Contrôle', 'Control'],
  controlDescription: ['Description de contrôle', 'Control Description'],
  monitor: ['Moniteur', 'Monitor'],
  monitorName: ['Nom du moniteur', 'Monitor Name'],
  businessProcess: ['Processus métier', 'Business Process'],
  businessProcessDescription: ['Description du processus métier', 'Business Process Description'],
  orgRuleId: ['ID de règle d\'organisation', 'Org Rule ID']
};

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
 * Parse le fichier Excel par chunks (optimisé pour 500k+ lignes)
 */
async function parseExcelFile({ arrayBuffer, chunkSize = 5000 }) {
  const startTime = Date.now();
  const fileSizeMB = (arrayBuffer.byteLength / (1024 * 1024)).toFixed(2);
  
  // Étape 1 : Lire le workbook (5%)
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 5, 
    message: `📂 Lecture du fichier (${fileSizeMB} MB)...` 
  });

  const workbook = XLSX.read(arrayBuffer, { 
    type: 'array',
    cellDates: false,
    cellNF: false,
    cellStyles: false
  });
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 10, 
    message: '✅ Fichier chargé ! Analyse de la structure...' 
  });

  // Étape 2 : Convertir en JSON avec header (15%)
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    raw: false,
    blankrows: false
  });
  
  if (jsonData.length === 0) {
    throw new Error('La feuille Excel est vide');
  }

  const headers = jsonData[0].map(h => String(h).trim());
  const totalRows = jsonData.length - 1; // -1 pour exclure le header

  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 15, 
    message: `📊 ${totalRows.toLocaleString()} lignes détectées. Mapping des colonnes...` 
  });

  // Étape 3 : Mapper les colonnes (20%)
  const columnIndexes = mapColumns(headers);
  
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 20, 
    message: '🔧 Colonnes mappées ! Début du traitement...' 
  });

  // Étape 4 : Traiter par chunks (20% -> 80%)
  const processedRecords = [];
  const numChunks = Math.ceil(totalRows / chunkSize);
  let filteredCount = 0;

  for (let i = 0; i < numChunks; i++) {
    const start = (i * chunkSize) + 1; // +1 pour skip header
    const end = Math.min(((i + 1) * chunkSize) + 1, jsonData.length);
    const chunk = jsonData.slice(start, end);

    // Traiter le chunk
    for (const row of chunk) {
      const record = normalizeRecord(row, columnIndexes);
      
      // Filtrage inline pour économiser la mémoire
      if (shouldKeepRecord(record)) {
        processedRecords.push(record);
      } else {
        filteredCount++;
      }
    }

    // Mettre à jour la progression (20% -> 80%)
    const progress = 20 + Math.floor((i + 1) / numChunks * 60);
    const processedCount = end - 1;
    self.postMessage({ 
      type: 'PROGRESS', 
      progress, 
      message: `⚙️ Traitement : ${processedCount.toLocaleString()}/${totalRows.toLocaleString()} lignes (${filteredCount.toLocaleString()} filtrées)` 
    });

    // Yield pour ne pas bloquer
    if (i % 10 === 0) {
      await sleep(0);
    }
  }

  // Étape 5 : Dédoublonnage (80% -> 95%)
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 85, 
    message: '🔍 Suppression des doublons...' 
  });

  const uniqueRecords = removeDuplicates(processedRecords);
  const duplicatesCount = processedRecords.length - uniqueRecords.length;

  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 95, 
    message: `✅ ${duplicatesCount.toLocaleString()} doublons supprimés` 
  });

  // Étape 6 : Terminer
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  self.postMessage({ 
    type: 'PROGRESS', 
    progress: 100, 
    message: `🎉 Parsing terminé en ${duration}s ! ${uniqueRecords.length.toLocaleString()} enregistrements valides.` 
  });

  self.postMessage({ 
    type: 'COMPLETE', 
    data: uniqueRecords,
    stats: {
      totalRows,
      filteredCount,
      duplicatesCount,
      finalCount: uniqueRecords.length,
      durationMs: Date.now() - startTime
    }
  });
}

/**
 * Mapper les colonnes FR/EN vers les indexes
 */
function mapColumns(headers) {
  const columnIndexes = {};
  
  for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => 
        h.toLowerCase().trim() === name.toLowerCase().trim()
      );
      if (index !== -1) {
        columnIndexes[field] = index;
        break;
      }
    }
  }
  
  return columnIndexes;
}

/**
 * Normaliser un enregistrement (mapper les colonnes)
 */
function normalizeRecord(row, columnIndexes) {
  const getValue = (field) => {
    const index = columnIndexes[field];
    if (index === undefined) return '';
    const value = row[index];
    return value ? String(value).trim() : '';
  };
  
  return {
    // Obligatoires
    roleName: getValue('roleName'),
    accessRiskId: getValue('accessRiskId'),
    riskLevel: getValue('riskLevel'),
    function: getValue('function'),
    system: getValue('system'),
    action: getValue('action'),
    resource: getValue('resource'),
    resourceExtn: getValue('resourceExtn'),
    valueFrom: getValue('valueFrom'),
    valueTo: getValue('valueTo'),
    roleProfile: getValue('roleProfile'),
    compositeBusinessRole: getValue('compositeBusinessRole'),
    
    // Optionnelles
    riskDescription: getValue('riskDescription') || undefined,
    ruleId: getValue('ruleId') || undefined,
    functionDescription: getValue('functionDescription') || undefined,
    actionDescription: getValue('actionDescription') || undefined,
    resourceDescription: getValue('resourceDescription') || undefined,
    resourceExtnDesc: getValue('resourceExtnDesc') || undefined,
    roleProfileDescription: getValue('roleProfileDescription') || undefined,
    compositeRoleDescription: getValue('compositeRoleDescription') || undefined,
    control: getValue('control') || undefined,
    controlDescription: getValue('controlDescription') || undefined,
    monitor: getValue('monitor') || undefined,
    monitorName: getValue('monitorName') || undefined,
    businessProcess: getValue('businessProcess') || undefined,
    businessProcessDescription: getValue('businessProcessDescription') || undefined,
    orgRuleId: getValue('orgRuleId') || undefined
  };
}

/**
 * Vérifier si un enregistrement doit être conservé (filtrage inline)
 */
function shouldKeepRecord(record) {
  // Règle 1 : "Control" doit être vide
  if (record.control && record.control.trim() !== '') {
    return false;
  }
  
  // Règle 2 : "Access Risk ID" ne doit pas être vide
  if (!record.accessRiskId || record.accessRiskId.trim() === '') {
    return false;
  }
  
  return true;
}

/**
 * Supprimer les doublons (basé sur une clé unique)
 */
function removeDuplicates(records) {
  const seen = new Set();
  const unique = [];
  
  for (const record of records) {
    // Créer une clé unique basée sur les champs principaux
    const key = [
      record.roleName,
      record.accessRiskId,
      record.function,
      record.system,
      record.action,
      record.resource,
      record.resourceExtn,
      record.valueFrom,
      record.valueTo,
      record.roleProfile,
      record.compositeBusinessRole
    ].join('|').toLowerCase();
    
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(record);
    }
  }
  
  return unique;
}

/**
 * Attendre (yield au navigateur)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}