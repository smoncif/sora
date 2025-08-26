/**
 * Service de parsing Excel pour la gestion des licences admin
 * 
 * Parse un fichier Excel avec 2 feuilles :
 * - Feuille 1 : Associations Rôle simple | Licence
 * - Feuille 2 : Types de licences avec Licence | Ordre | Description (optionnel)
 */

import * as XLSX from 'xlsx';
import { LicenseType } from 'lib/types/roleAnalysis';

/**
 * Configuration pour le parsing des licences avec 2 feuilles
 */
export interface LicenseParsingConfig {
  maxFileSize: number;
  sheet1Name?: string; // Nom de la feuille des associations (optionnel)
  sheet2Name?: string; // Nom de la feuille des types de licences (optionnel)
  sheet1ColumnMappings: {
    simpleRole: string;
    licenceType: string;
  };
  sheet2ColumnMappings: {
    licenceType: string;
    ordre: string;
    description?: string;
  };
}

/**
 * Configuration par défaut pour le parsing des licences
 */
const DEFAULT_CONFIG: Required<LicenseParsingConfig> = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  sheet1Name: undefined, // Prendra la première feuille
  sheet2Name: undefined, // Prendra la deuxième feuille
  sheet1ColumnMappings: {
    simpleRole: 'Rôle simple',
    licenceType: 'Licence'
  },
  sheet2ColumnMappings: {
    licenceType: 'Licence',
    ordre: 'Ordre',
    description: 'Description'
  }
};

/**
 * Résultat du parsing Excel licences avec 2 feuilles
 */
export interface LicenseParsingResult {
  licenseTypes: {
    name: string;
    displayOrder: number;
    description?: string;
  }[];
  roleLicenseAssociations: {
    simpleRole: string;
    licenceType: string;
  }[];
  metadata: {
    fileName: string;
    fileSize: number;
    totalLicenseTypes: number;
    totalAssociations: number;
    processingTimeMs: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Parse un fichier Excel de licences avec 2 feuilles
 * Feuille 1 : Associations Rôle simple <-> Licence
 * Feuille 2 : Types de licences avec ordres
 */
export async function parseLicenseExcelFile(
  file: File,
  config: Partial<LicenseParsingConfig> = {}
): Promise<LicenseParsingResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Validation de la taille du fichier
  if (file.size > finalConfig.maxFileSize) {
    throw new Error(`Le fichier est trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Taille maximale : ${Math.round(finalConfig.maxFileSize / 1024 / 1024)}MB`);
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Lecture du fichier Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Vérification qu'il y a au moins 2 feuilles
    if (workbook.SheetNames.length < 2) {
      throw new Error('Le fichier Excel doit contenir au moins 2 feuilles : une pour les associations rôle-licence et une pour les types de licences');
    }

    // Déterminer les noms des feuilles
    const sheet1Name = finalConfig.sheet1Name || workbook.SheetNames[0];
    const sheet2Name = finalConfig.sheet2Name || workbook.SheetNames[1];
    


    const worksheet1 = workbook.Sheets[sheet1Name];
    const worksheet2 = workbook.Sheets[sheet2Name];

    if (!worksheet1) {
      throw new Error(`Impossible de lire la feuille '${sheet1Name}' (associations rôle-licence)`);
    }

    if (!worksheet2) {
      throw new Error(`Impossible de lire la feuille '${sheet2Name}' (types de licences)`);
    }


    // Parser les types de licences (feuille 2) en premier
    const licenseTypes = parseLicenseTypesSheet(worksheet2, finalConfig.sheet2ColumnMappings, warnings, errors);


    // Créer un Set des noms de licences valides pour valider la feuille 1
    const validLicenseNames = new Set(licenseTypes.map(lt => lt.name));



    // Parser les associations rôle-licence (feuille 1)
    const roleLicenseAssociations = parseRoleLicenseAssociationsSheet(
      worksheet1, 
      finalConfig.sheet1ColumnMappings, 
      validLicenseNames, 
      warnings, 
      errors
    );


    const processingTimeMs = Date.now() - startTime;

    return {
      licenseTypes,
      roleLicenseAssociations,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        totalLicenseTypes: licenseTypes.length,
        totalAssociations: roleLicenseAssociations.length,
        processingTimeMs
      },
      warnings,
      errors
    };

  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    
    return {
      licenseTypes: [],
      roleLicenseAssociations: [],
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        totalLicenseTypes: 0,
        totalAssociations: 0,
        processingTimeMs
      },
      warnings,
      errors: [...errors, error instanceof Error ? error.message : 'Erreur inconnue lors du parsing']
    };
  }
}

/**
 * Parse la feuille des types de licences (Feuille 2)
 */
function parseLicenseTypesSheet(
  sheet: XLSX.WorkSheet,
  columnMapping: LicenseParsingConfig['sheet2ColumnMappings'],
  warnings: string[],
  errors: string[]
): { name: string; displayOrder: number; description?: string; }[] {

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  

  
  if (data.length === 0) {
    throw new Error('La feuille des types de licences est vide');
  }

  const headers = data[0] || [];


  
  // Trouver les index des colonnes
  const licenseTypeIndex = headers.findIndex((h: string) => 
    h?.toString().toLowerCase().trim() === columnMapping.licenceType.toLowerCase()
  );
  const orderIndex = headers.findIndex((h: string) => 
    h?.toString().toLowerCase().trim() === columnMapping.ordre.toLowerCase()
  );
  const descriptionIndex = columnMapping.description 
    ? headers.findIndex((h: string) => 
        h?.toString().toLowerCase().trim() === columnMapping.description!.toLowerCase()
      )
    : -1;
    


  if (licenseTypeIndex === -1) {
    throw new Error(`Colonne "${columnMapping.licenceType}" non trouvée dans la feuille des types de licences`);
  }
  
  if (orderIndex === -1) {
    throw new Error(`Colonne "${columnMapping.ordre}" non trouvée dans la feuille des types de licences`);
  }

  const licenseTypes: { name: string; displayOrder: number; description?: string; }[] = [];
  const seenNames = new Set<string>();
  const seenOrders = new Set<number>();

  // Parser les données (en commençant à la ligne 2)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (!row || row.length === 0) continue;

    const rawName = row[licenseTypeIndex];
    const rawOrder = row[orderIndex];
    const rawDescription = descriptionIndex !== -1 ? row[descriptionIndex] : undefined;

    // Valider le nom de licence
    if (!rawName || typeof rawName !== 'string') {
      warnings.push(`Ligne ${i + 1} : Nom de licence manquant ou invalide, ligne ignorée`);
      continue;
    }

    const cleanName = rawName.toString().trim();
    if (cleanName === '') {
      warnings.push(`Ligne ${i + 1} : Nom de licence vide, ligne ignorée`);
      continue;
    }

    // Vérifier l'unicité du nom
    if (seenNames.has(cleanName)) {
      warnings.push(`Ligne ${i + 1} : Type de licence "${cleanName}" déjà défini, ligne ignorée`);
      continue;
    }

    // Valider l'ordre
    const order = parseInt(rawOrder);
    if (isNaN(order) || order <= 0) {
      errors.push(`Ligne ${i + 1} : Ordre invalide "${rawOrder}" pour la licence "${cleanName}"`);
      continue;
    }

    // Vérifier l'unicité de l'ordre
    if (seenOrders.has(order)) {
      warnings.push(`Ligne ${i + 1} : Ordre ${order} déjà utilisé pour une autre licence, ligne ignorée`);
      continue;
    }

    // Traiter la description
    const description = rawDescription 
      ? rawDescription.toString().trim() 
      : undefined;

    seenNames.add(cleanName);
    seenOrders.add(order);
    
    licenseTypes.push({
      name: cleanName,
      displayOrder: order,
      description: description || undefined
    });
  }

  if (licenseTypes.length === 0) {
    throw new Error('Aucun type de licence valide trouvé dans la feuille');
  }

  return licenseTypes;
}

/**
 * Parse la feuille des associations rôle-licence (Feuille 1)
 */
function parseRoleLicenseAssociationsSheet(
  sheet: XLSX.WorkSheet,
  columnMapping: LicenseParsingConfig['sheet1ColumnMappings'],
  validLicenseNames: Set<string>,
  warnings: string[],
  errors: string[]
): { simpleRole: string; licenceType: string; }[] {

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  

  
  if (data.length === 0) {
    throw new Error('La feuille des associations rôle-licence est vide');
  }

  const headers = data[0] || [];


  
  // Trouver les index des colonnes
  const simpleRoleIndex = headers.findIndex((h: string) => 
    h?.toString().toLowerCase().trim() === columnMapping.simpleRole.toLowerCase()
  );
  const licenseTypeIndex = headers.findIndex((h: string) => 
    h?.toString().toLowerCase().trim() === columnMapping.licenceType.toLowerCase()
  );
  


  if (simpleRoleIndex === -1) {
    throw new Error(`Colonne "${columnMapping.simpleRole}" non trouvée dans la feuille des associations`);
  }
  
  if (licenseTypeIndex === -1) {
    throw new Error(`Colonne "${columnMapping.licenceType}" non trouvée dans la feuille des associations`);
  }

  const associations: { simpleRole: string; licenceType: string; }[] = [];
  const seenRoles = new Set<string>();

  // Parser les données (en commençant à la ligne 2)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (!row || row.length === 0) continue;

    const rawSimpleRole = row[simpleRoleIndex];
    const rawLicenseType = row[licenseTypeIndex];

    // Valider le rôle simple
    if (!rawSimpleRole || typeof rawSimpleRole !== 'string') {
      warnings.push(`Ligne ${i + 1} : Rôle simple manquant ou invalide, ligne ignorée`);
      continue;
    }

    const cleanSimpleRole = rawSimpleRole.toString().trim();
    if (cleanSimpleRole === '') {
      warnings.push(`Ligne ${i + 1} : Rôle simple vide, ligne ignorée`);
      continue;
    }

    // Valider le type de licence
    if (!rawLicenseType || typeof rawLicenseType !== 'string') {
      warnings.push(`Ligne ${i + 1} : Type de licence manquant ou invalide, ligne ignorée`);
      continue;
    }

    const cleanLicenseType = rawLicenseType.toString().trim();
    if (cleanLicenseType === '') {
      warnings.push(`Ligne ${i + 1} : Type de licence vide, ligne ignorée`);
      continue;
    }

    // Vérifier l'unicité du rôle simple
    if (seenRoles.has(cleanSimpleRole)) {
      warnings.push(`Ligne ${i + 1} : Rôle simple "${cleanSimpleRole}" déjà associé à une licence, ligne ignorée`);
      continue;
    }

    // Vérifier que le type de licence existe dans la feuille 2
    if (!validLicenseNames.has(cleanLicenseType)) {
      errors.push(`Ligne ${i + 1} : Type de licence "${cleanLicenseType}" non défini dans la feuille des types de licences`);
      continue;
    }

    seenRoles.add(cleanSimpleRole);
    associations.push({
      simpleRole: cleanSimpleRole,
      licenceType: cleanLicenseType
    });
  }

  return associations;
}