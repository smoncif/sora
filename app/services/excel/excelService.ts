/**
 * Service pour le traitement asynchrone des fichiers Excel
 * 
 * Ce service fournit des fonctionnalités pour parser, traiter et générer
 * des fichiers Excel, en utilisant si possible des Web Workers pour
 * éviter de bloquer le thread principal de l'interface utilisateur pendant
 * le traitement de fichiers volumineux.
 * 
 * Il offre des fonctions pour:
 * - Extraire des données structurées de fichiers Excel
 * - Convertir des données JavaScript en fichiers Excel
 * - Gérer les notifications de progression pendant le traitement
 * 
 * @module ExcelService
 */

import * as XLSX from 'xlsx';

/**
 * Type pour les données d'une feuille Excel
 * 
 * @property {string} name - Nom de la feuille Excel
 * @property {Record<string, unknown>[]} data - Données de la feuille sous forme de tableau d'objets
 */
export interface SheetData {
  name: string;
  data: Record<string, unknown>[];
}

/**
 * Résultat du parsing d'un fichier Excel
 * 
 * @property {string} fileName - Nom du fichier Excel traité
 * @property {SheetData[]} sheets - Données des feuilles du fichier
 * @property {object} stats - Statistiques sur le traitement
 * @property {number} stats.sheetCount - Nombre de feuilles traitées
 * @property {number} stats.rowsTotal - Nombre total de lignes traitées
 * @property {number} stats.processingTimeMs - Temps de traitement en millisecondes
 */
export interface ExcelParseResult {
  fileName: string;
  sheets: SheetData[];
  stats: {
    sheetCount: number;
    rowsTotal: number;
    processingTimeMs: number;
  };
}

/**
 * Options pour le parsing Excel
 * 
 * @property {(progress: number) => void} [onProgress] - Callback appelé avec le pourcentage de progression (0-100)
 * @property {boolean} [convertDates=true] - Si true, convertit les valeurs de dates Excel en objets Date JavaScript
 * @property {(sheetName: string) => boolean} [sheetFilter] - Fonction de filtre pour inclure/exclure certaines feuilles
 * @property {number} [maxRows] - Nombre maximum de lignes à extraire par feuille (utile pour les aperçus)
 */
export interface ExcelParseOptions {
  onProgress?: (progress: number) => void;
  convertDates?: boolean;
  sheetFilter?: (sheetName: string) => boolean;
  maxRows?: number;
}

/**
 * Parse un fichier Excel et convertit en objets JavaScript
 * 
 * Cette fonction accepte un fichier Excel (XLSX, XLS) et le convertit
 * en structures de données JavaScript. Pour les fichiers volumineux (>1MB),
 * elle utilise automatiquement un Web Worker pour éviter de bloquer l'interface.
 * 
 * @param {File} file - Fichier Excel à parser
 * @param {ExcelParseOptions} [options={}] - Options de configuration du parsing
 * @returns {Promise<ExcelParseResult>} Promesse résolue avec les données structurées et les statistiques
 * 
 * @example
 * // Parsing simple d'un fichier
 * const input = document.querySelector('input[type="file"]');
 * input.addEventListener('change', async (e) => {
 *   const file = e.target.files[0];
 *   try {
 *     const result = await parseExcelFile(file);
 *     *     *     *     
 *     // Accéder aux données de la première feuille
 *     const firstSheet = result.sheets[0];
 *     *   } catch (error) {
 *     *   }
 * });
 * 
 * @example
 * // Parsing avec suivi de progression
 * const parseWithProgress = async (file) => {
 *   const progressBar = document.getElementById('progress-bar');
 *   
 *   const result = await parseExcelFile(file, {
 *     onProgress: (progress) => {
 *       progressBar.style.width = `${progress}%`;
 *       progressBar.textContent = `${progress}%`;
 *     },
 *     convertDates: true,
 *     maxRows: 1000, // Limiter à 1000 lignes par feuille
 *     sheetFilter: (name) => !name.startsWith('_') // Ignorer les feuilles commençant par _
 *   });
 *   
 *   return result;
 * };
 */
export async function parseExcelFile(
  file: File,
  options: ExcelParseOptions = {}
): Promise<ExcelParseResult> {
  // Si web workers disponibles et fichier assez volumineux, utiliser le worker
  if (typeof Worker !== 'undefined' && file.size > 1024 * 1024) {
    return parseExcelWithWorker(file, options);
  } else {
    // Sinon, parser directement
    return parseExcelDirect(file, options);
  }
}

/**
 * Parse le fichier Excel directement dans le thread principal
 * 
 * Méthode interne utilisée quand le fichier est petit ou que les Web Workers
 * ne sont pas disponibles dans l'environnement.
 * 
 * @param {File} file - Fichier Excel à parser
 * @param {ExcelParseOptions} [options={}] - Options de configuration du parsing
 * @returns {Promise<ExcelParseResult>} Promesse résolue avec les données structurées
 * @private
 */
async function parseExcelDirect(
  file: File,
  options: ExcelParseOptions = {}
): Promise<ExcelParseResult> {
  const startTime = performance.now();
  const { onProgress, convertDates = true, sheetFilter, maxRows } = options;

  try {
    // Notifier 10% de progression (début du chargement)
    if (onProgress) onProgress(10);

    // Lire le fichier comme ArrayBuffer
    const buffer = await readFileAsArrayBuffer(file);
    
    // Notifier 30% de progression (fichier chargé)
    if (onProgress) onProgress(30);

    // Parser le workbook
    const workbook = XLSX.read(buffer, { 
      type: 'array',
      cellDates: convertDates
    });
    
    // Notifier 50% de progression (parsing de base terminé)
    if (onProgress) onProgress(50);

    const result: ExcelParseResult = {
      fileName: file.name,
      sheets: [],
      stats: {
        sheetCount: 0,
        rowsTotal: 0,
        processingTimeMs: 0
      }
    };

    // Filtrer les feuilles si nécessaire
    const sheetNames = sheetFilter 
      ? workbook.SheetNames.filter(sheetFilter)
      : workbook.SheetNames;

    // Nombre total de feuilles à traiter
    const totalSheets = sheetNames.length;
    result.stats.sheetCount = totalSheets;
    
    // Pour chaque feuille, convertir en JSON
    let processedSheets = 0;
    let totalRows = 0;

    for (const sheetName of sheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir la feuille en JSON (tableau d'objets)
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { 
        defval: null, // Valeur par défaut pour les cellules vides
        raw: false    // Analyser les nombres et les dates
      });
      
      // Limiter le nombre de lignes si nécessaire
      const limitedData = maxRows && jsonData.length > maxRows
        ? jsonData.slice(0, maxRows)
        : jsonData;
      
      // Stocker les données de la feuille
      result.sheets.push({
        name: sheetName,
        data: limitedData
      });
      
      totalRows += limitedData.length;
      processedSheets++;
      
      // Mettre à jour la progression (50% à 90%)
      if (onProgress) {
        const progress = 50 + Math.floor((processedSheets / totalSheets) * 40);
        onProgress(progress);
      }
    }
    
    // Mettre à jour les statistiques
    result.stats.rowsTotal = totalRows;
    result.stats.processingTimeMs = Math.round(performance.now() - startTime);
    
    // Notifier 100% de progression (terminé)
    if (onProgress) onProgress(100);
    
    return result;
  } catch (error) {

    throw error;
  }
}

/**
 * Parse le fichier Excel dans un Web Worker
 * 
 * Méthode interne utilisée pour les fichiers volumineux afin d'éviter
 * de bloquer l'interface utilisateur pendant le traitement.
 * 
 * @param {File} file - Fichier Excel à parser
 * @param {ExcelParseOptions} [options={}] - Options de configuration du parsing
 * @returns {Promise<ExcelParseResult>} Promesse résolue avec les données structurées
 * @private
 */
async function parseExcelWithWorker(
  file: File,
  options: ExcelParseOptions = {}
): Promise<ExcelParseResult> {
  return new Promise((resolve, reject) => {
    try {
      // Créer un blob URL pour le code du worker
      const workerCode = `
        importScripts('https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js');
        
        self.onmessage = async function(e) {
          try {
            const { file, options } = e.data;
            const { convertDates = true, sheetFilter, maxRows } = options || {};
            
            // Notifier du début du traitement
            self.postMessage({ type: 'progress', progress: 10 });
            
            // Lire le fichier ArrayBuffer
            const buffer = await file.arrayBuffer();
            
            // Notifier du chargement terminé
            self.postMessage({ type: 'progress', progress: 30 });
            
            // Parser le workbook
            const workbook = XLSX.read(buffer, { 
              type: 'array',
              cellDates: convertDates
            });
            
            // Notifier du parsing terminé
            self.postMessage({ type: 'progress', progress: 50 });
            
            // Filtrer les feuilles si nécessaire
            const sheetNames = sheetFilter 
              ? workbook.SheetNames.filter(name => {
                  try {
                    // Exécuter la fonction de filtre de manière sécurisée
                    return new Function('sheetName', 'return ' + sheetFilter)(name);
                  } catch (e) {
                    return true; // En cas d'erreur, inclure la feuille
                  }
                })
              : workbook.SheetNames;
            
            const result = {
              fileName: file.name,
              sheets: [],
              stats: {
                sheetCount: sheetNames.length,
                rowsTotal: 0,
                processingTimeMs: 0
              }
            };
            
            // Pour chaque feuille, convertir en JSON
            let processedSheets = 0;
            let totalRows = 0;
            const startTime = performance.now();
            
            for (const sheetName of sheetNames) {
              const worksheet = workbook.Sheets[sheetName];
              
              // Convertir la feuille en JSON
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                defval: null,
                raw: false
              });
              
              // Limiter le nombre de lignes si nécessaire
              const limitedData = maxRows && jsonData.length > maxRows
                ? jsonData.slice(0, maxRows)
                : jsonData;
              
              // Stocker les données de la feuille
              result.sheets.push({
                name: sheetName,
                data: limitedData
              });
              
              totalRows += limitedData.length;
              processedSheets++;
              
              // Mettre à jour la progression (50% à 90%)
              const progress = 50 + Math.floor((processedSheets / sheetNames.length) * 40);
              self.postMessage({ type: 'progress', progress });
            }
            
            // Mettre à jour les statistiques
            result.stats.rowsTotal = totalRows;
            result.stats.processingTimeMs = Math.round(performance.now() - startTime);
            
            // Notifier 100% de progression (terminé)
            self.postMessage({ type: 'progress', progress: 100 });
            
            // Envoyer le résultat final
            self.postMessage({ 
              type: 'result',
              data: result
            });
          } catch (error) {
            self.postMessage({ 
              type: 'error',
              error: error.message || 'Erreur inconnue lors du parsing Excel'
            });
          }
        };
      `;
      
      // Créer un blob pour le code du worker
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      // Créer et initialiser le worker
      const worker = new Worker(workerUrl);
      
      // Gérer les messages du worker
      worker.onmessage = (e) => {
        const { type, progress, data, error } = e.data;
        
        if (type === 'progress' && options.onProgress) {
          options.onProgress(progress);
        } else if (type === 'result') {
          // Nettoyage
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          
          // Renvoyer le résultat
          resolve(data);
        } else if (type === 'error') {
          // Nettoyage
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          
          // Renvoyer l'erreur
          reject(new Error(error));
        }
      };
      
      // Gérer les erreurs du worker
      worker.onerror = (e) => {
        // Nettoyage
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        
        // Renvoyer l'erreur
        reject(new Error(`Erreur du Worker: ${e.message}`));
      };
      
      // Envoyer les données au worker
      worker.postMessage({ file, options });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convertit un fichier en ArrayBuffer
 * 
 * Fonction utilitaire pour lire un fichier en mémoire sous forme d'ArrayBuffer.
 * 
 * @param {File} file - Fichier à lire
 * @returns {Promise<ArrayBuffer>} Promesse résolue avec l'ArrayBuffer du fichier
 * @private
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Options pour l'export Excel
 * 
 * @property {string} [fileName='export.xlsx'] - Nom du fichier à générer
 * @property {string} [sheetName='Données'] - Nom de la feuille Excel
 * @property {string[]} [dateFields=[]] - Liste des champs à formater comme dates
 */
export interface ExcelExportOptions {
  fileName?: string;
  sheetName?: string;
  dateFields?: string[];
}

/**
 * Exporte des données JavaScript vers un fichier Excel
 * 
 * Cette fonction prend des données JavaScript (tableaux d'objets) et les
 * convertit en fichier Excel téléchargeable. Elle peut gérer à la fois
 * une seule feuille ou plusieurs feuilles dans un même fichier.
 * 
 * @param {Record<string, unknown>[] | Record<string, Record<string, unknown>[]>} data - 
 *        Données à exporter. Peut être un tableau d'objets pour une seule feuille, 
 *        ou un objet avec des clés correspondant aux noms des feuilles et des valeurs
 *        étant des tableaux d'objets pour chaque feuille.
 * @param {ExcelExportOptions} [options={}] - Options d'export
 * @returns {Promise<Blob>} Promesse résolue avec le Blob du fichier Excel généré
 * 
 * @example
 * // Export d'une simple liste de données vers une feuille Excel
 * const data = [
 *   { nom: 'Dupont', prenom: 'Jean', age: 42, dateEmbauche: new Date('2020-01-15') },
 *   { nom: 'Martin', prenom: 'Sophie', age: 38, dateEmbauche: new Date('2019-05-20') }
 * ];
 * 
 * const excelBlob = await exportToExcel(data, {
 *   fileName: 'liste-employes.xlsx',
 *   sheetName: 'Employés',
 *   dateFields: ['dateEmbauche']
 * });
 * 
 * // Créer un lien de téléchargement pour le fichier
 * const url = URL.createObjectURL(excelBlob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'liste-employes.xlsx';
 * a.click();
 * URL.revokeObjectURL(url);
 * 
 * @example
 * // Export de données vers plusieurs feuilles dans un même fichier Excel
 * const multiSheetData = {
 *   'Employés': [
 *     { nom: 'Dupont', prenom: 'Jean', poste: 'Développeur' }
 *   ],
 *   'Départements': [
 *     { id: 1, nom: 'IT', manager: 'Sophie' },
 *     { id: 2, nom: 'RH', manager: 'Thomas' }
 *   ]
 * };
 * 
 * const excelBlob = await exportToExcel(multiSheetData, {
 *   fileName: 'donnees-entreprise.xlsx'
 * });
 * 
 * // Télécharger le fichier...
 */
export async function exportToExcel(
  data: Record<string, unknown>[] | Record<string, Record<string, unknown>[]>,
  options: ExcelExportOptions = {}
): Promise<Blob> {
  // Options par défaut
  const fileName = options.fileName || 'export.xlsx';
  const defaultSheetName = options.sheetName || 'Données';
  const dateFields = options.dateFields || [];
  
  try {
    // Créer un nouveau workbook
    const workbook = XLSX.utils.book_new();
    
    // Déterminer si nous avons une seule feuille ou plusieurs
    if (Array.isArray(data)) {
      // Cas d'une seule feuille
      // Convertir les dates en format Excel si spécifié
      const formattedData = formatDataForExport(data, dateFields);
      
      // Convertir les données en feuille de calcul
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Ajouter la feuille au workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, defaultSheetName);
    } else {
      // Cas de plusieurs feuilles
      // Pour chaque clé dans l'objet data, créer une feuille
      for (const [sheetName, sheetData] of Object.entries(data)) {
        if (Array.isArray(sheetData)) {
          // Convertir les dates en format Excel si spécifié
          const formattedData = formatDataForExport(sheetData, dateFields);
          
          // Convertir les données en feuille de calcul
          const worksheet = XLSX.utils.json_to_sheet(formattedData);
          
          // Ajouter la feuille au workbook
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      }
    }
    
    // Convertir le workbook en blob
    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array' 
    });
    
    return new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
  } catch (error) {

    throw error;
  }
}

/**
 * Formate les données pour l'export Excel
 * 
 * Fonction utilitaire interne pour préparer les données avant l'export,
 * notamment pour gérer correctement les dates.
 * 
 * @param {Record<string, unknown>[]} data - Données à formater
 * @param {string[]} dateFields - Champs à traiter comme des dates
 * @returns {Record<string, unknown>[]} Données formatées
 * @private
 */
function formatDataForExport(
  data: Record<string, unknown>[],
  dateFields: string[]
): Record<string, unknown>[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  // Si aucun champ date à traiter, retourner les données telles quelles
  if (!dateFields || dateFields.length === 0) {
    return data;
  }
  
  // Copier les données et formater les dates
  return data.map(item => {
    const newItem: Record<string, unknown> = { ...item };
    
    // Pour chaque champ date, convertir en format Excel
    for (const field of dateFields) {
      if (newItem[field] instanceof Date) {
        // Les dates sont déjà bien gérées par la librairie xlsx,
        // donc nous n'avons pas besoin de conversion spéciale ici.
        // On conserve ce bloc au cas où des conversions spécifiques
        // seraient nécessaires à l'avenir.
      }
    }
    
    return newItem;
  });
} 
