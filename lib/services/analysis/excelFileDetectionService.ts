/**
 * Service de détection automatique du type de fichier Excel
 * 
 * Détermine automatiquement si un fichier Excel est destiné à :
 * - Analyse des rôles (2 feuilles)
 * - Analyse des utilisateurs (3 feuilles)
 * - Analyse SoD (1 feuille avec colonnes spécifiques)
 */

import * as XLSX from 'xlsx';

export type ExcelFileType = 'roles' | 'users' | 'sod' | 'unknown';

export interface ExcelFileInfo {
  type: ExcelFileType;
  sheetsFound: string[];
  sheetCount: number;
  confidence: number; // 0-100, niveau de confiance de la détection
  reasoning: string[];  // Explications sur les critères de détection
}

/**
 * Détecte automatiquement le type de fichier Excel
 */
export async function detectExcelFileType(file: File): Promise<ExcelFileInfo> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const sheetsFound = workbook.SheetNames;
    const sheetCount = sheetsFound.length;
    const reasoning: string[] = [];
    
    // Critères de détection
    let rolesScore = 0;
    let usersScore = 0;
    let sodScore = 0;
    
    // 1. Nombre de feuilles
    if (sheetCount === 1) {
      sodScore += 50;
      reasoning.push(`1 feuille détectée (typique pour analyse SoD)`);
    } else if (sheetCount === 2) {
      rolesScore += 50;
      reasoning.push(`2 feuilles détectées (typique pour analyse rôles)`);
    } else if (sheetCount === 3) {
      usersScore += 50;
      reasoning.push(`3 feuilles détectées (typique pour analyse utilisateurs)`);
    } else {
      reasoning.push(`${sheetCount} feuilles (nombre non standard)`);
    }
    
    // 2. Analyse des noms de feuilles
    const sheetNamesLower = sheetsFound.map(name => name.toLowerCase());
    
    // Mots-clés pour rôles
    const roleKeywords = ['role', 'rôle', 'business', 'simple', 'metier', 'métier'];
    const userKeywords = ['user', 'utilisateur', 'utilis', 'mapping', 'map'];
    const sodKeywords = ['sod', 'segregation', 'séparation', 'risk', 'risque', 'conflict'];
    
    let roleKeywordMatches = 0;
    let userKeywordMatches = 0;
    let sodKeywordMatches = 0;
    
    sheetNamesLower.forEach(sheetName => {
      roleKeywords.forEach(keyword => {
        if (sheetName.includes(keyword)) {
          roleKeywordMatches++;
          rolesScore += 10;
        }
      });
      
      userKeywords.forEach(keyword => {
        if (sheetName.includes(keyword)) {
          userKeywordMatches++;
          usersScore += 10;
        }
      });
      
      sodKeywords.forEach(keyword => {
        if (sheetName.includes(keyword)) {
          sodKeywordMatches++;
          sodScore += 10;
        }
      });
    });
    
    if (roleKeywordMatches > 0) {
      reasoning.push(`${roleKeywordMatches} nom(s) de feuille suggèrent analyse rôles`);
    }
    if (userKeywordMatches > 0) {
      reasoning.push(`${userKeywordMatches} nom(s) de feuille suggèrent analyse utilisateurs`);
    }
    if (sodKeywordMatches > 0) {
      reasoning.push(`${sodKeywordMatches} nom(s) de feuille suggèrent analyse SoD`);
    }
    
    // 3. Analyse du contenu des feuilles (headers)
    const firstSheetHeaders = getSheetHeaders(workbook.Sheets[sheetsFound[0]]);
    
    // Patterns typiques pour SoD (1 feuille)
    const sodHeaders = ['access risk', 'risque d\'accès', 'risk level', 'niveau du risque', 
                        'composite', 'business role', 'segregation', 'control', 'contrôle'];
    
    let sodHeaderMatches = 0;
    
    firstSheetHeaders.forEach(header => {
      const headerLower = header.toLowerCase();
      
      sodHeaders.forEach(sodHeader => {
        if (headerLower.includes(sodHeader)) {
          sodHeaderMatches++;
          sodScore += 15;
        }
      });
    });
    
    if (sodHeaderMatches > 0) {
      reasoning.push(`${sodHeaderMatches} en-tête(s) typiques analyse SoD`);
    }
    
    if (sheetCount >= 2) {
      const secondSheetHeaders = getSheetHeaders(workbook.Sheets[sheetsFound[1]]);
      
      // Patterns typiques pour rôles
      const roleHeaders = ['rôle métier', 'role metier', 'business role', 'rôle simple', 'simple role'];
      const transactionHeaders = ['transaction', 'année', 'mois', 'nombre', 'execution'];
      
      // Patterns typiques pour utilisateurs  
      const userHeaders = ['utilisateur', 'user', 'utilis'];
      
      let roleHeaderMatches = 0;
      let userHeaderMatches = 0;
      
      [...firstSheetHeaders, ...secondSheetHeaders].forEach(header => {
        const headerLower = header.toLowerCase();
        
        roleHeaders.forEach(roleHeader => {
          if (headerLower.includes(roleHeader)) {
            roleHeaderMatches++;
            rolesScore += 15;
          }
        });
        
        userHeaders.forEach(userHeader => {
          if (headerLower.includes(userHeader)) {
            userHeaderMatches++;
            usersScore += 15;
          }
        });
        
        transactionHeaders.forEach(transHeader => {
          if (headerLower.includes(transHeader)) {
            rolesScore += 5; // Bonus léger car commun aux deux
            usersScore += 5;
          }
        });
      });
      
      if (roleHeaderMatches > 0) {
        reasoning.push(`${roleHeaderMatches} en-tête(s) typiques analyse rôles`);
      }
      if (userHeaderMatches > 0) {
        reasoning.push(`${userHeaderMatches} en-tête(s) typiques analyse utilisateurs`);
      }
    }
    
    // 4. Analyse de la 3ème feuille si elle existe
    if (sheetCount >= 3) {
      const thirdSheetHeaders = getSheetHeaders(workbook.Sheets[sheetsFound[2]]);
      usersScore += 20; // Bonus pour avoir une 3ème feuille
      reasoning.push(`3ème feuille présente (requis pour analyse utilisateurs)`);
      
      // Vérifier si la 3ème feuille ressemble à mapping rôle-transaction
      const mappingHeaders = ['simple', 'transaction'];
      let mappingMatches = 0;
      
      thirdSheetHeaders.forEach(header => {
        mappingHeaders.forEach(mappingHeader => {
          if (header.toLowerCase().includes(mappingHeader)) {
            mappingMatches++;
            usersScore += 10;
          }
        });
      });
      
      if (mappingMatches > 0) {
        reasoning.push(`3ème feuille contient ${mappingMatches} mapping(s) attendu(s)`);
      }
    }
    
    // 5. Déterminer le type final
    let finalType: ExcelFileType;
    let confidence: number;
    
    const scores = [
      { type: 'sod' as ExcelFileType, score: sodScore },
      { type: 'roles' as ExcelFileType, score: rolesScore },
      { type: 'users' as ExcelFileType, score: usersScore }
    ];
    
    // Trier par score décroissant
    scores.sort((a, b) => b.score - a.score);
    
    if (scores[0].score === 0) {
      finalType = 'unknown';
      confidence = 0;
      reasoning.push(`Aucun type détecté (SoD: ${sodScore}, Rôles: ${rolesScore}, Utilisateurs: ${usersScore})`);
    } else if (scores[0].score === scores[1].score) {
      finalType = 'unknown';
      confidence = 0;
      reasoning.push(`Scores égaux entre plusieurs types (SoD: ${sodScore}, Rôles: ${rolesScore}, Utilisateurs: ${usersScore})`);
    } else {
      finalType = scores[0].type;
      const totalScore = sodScore + rolesScore + usersScore;
      confidence = Math.min(95, Math.round((scores[0].score / totalScore) * 100));
    }
    
    // Assurer un minimum de confiance basé sur des critères stricts
    if (sheetCount === 1 && finalType === 'sod') {
      confidence = Math.max(confidence, 70);
    } else if (sheetCount === 2 && finalType === 'roles') {
      confidence = Math.max(confidence, 70);
    } else if (sheetCount === 3 && finalType === 'users') {
      confidence = Math.max(confidence, 70);
    }
    
    return {
      type: finalType,
      sheetsFound,
      sheetCount,
      confidence,
      reasoning
    };
    
  } catch (error) {
    return {
      type: 'unknown',
      sheetsFound: [],
      sheetCount: 0,
      confidence: 0,
      reasoning: [`Erreur lors de la lecture du fichier: ${error}`]
    };
  }
}

/**
 * Extrait les en-têtes d'une feuille Excel
 */
function getSheetHeaders(worksheet: XLSX.WorkSheet): string[] {
  try {
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (jsonData.length === 0) return [];
    
    // Première ligne = headers
    const headers = jsonData[0] || [];
    return headers
      .filter(header => header && typeof header === 'string')
      .map(header => String(header).trim());
  } catch {
    return [];
  }
}

/**
 * Valide qu'un fichier est compatible avec un type d'analyse spécifique
 */
export async function validateExcelFileForType(
  file: File, 
  expectedType: ExcelFileType
): Promise<{ 
  isValid: boolean; 
  confidence: number; 
  warnings: string[]; 
  errors: string[]; 
}> {
  const detection = await detectExcelFileType(file);
  const warnings: string[] = [];
  const errors: string[] = [];
  
  if (detection.type === 'unknown') {
    errors.push('Impossible de déterminer le type de fichier Excel');
    errors.push(...detection.reasoning);
    return { isValid: false, confidence: 0, warnings, errors };
  }
  
  if (detection.type !== expectedType) {
    const expectedSheets = 
      expectedType === 'sod' ? '1 feuille' :
      expectedType === 'roles' ? '2 feuilles' : 
      '3 feuilles';
    const detectedSheets = `${detection.sheetCount} feuille(s)`;
    
    errors.push(`Type de fichier non compatible`);
    errors.push(`Attendu: Analyse ${expectedType} (${expectedSheets})`);
    errors.push(`Détecté: Analyse ${detection.type} (${detectedSheets})`);
    errors.push(`Feuilles trouvées: ${detection.sheetsFound.join(', ')}`);
    
    return { isValid: false, confidence: detection.confidence, warnings, errors };
  }
  
  if (detection.confidence < 70) {
    warnings.push(`Confiance de détection faible (${detection.confidence}%)`);
    warnings.push('Le fichier pourrait ne pas être dans le format attendu');
    warnings.push(...detection.reasoning);
  }
  
  return { 
    isValid: true, 
    confidence: detection.confidence, 
    warnings, 
    errors 
  };
}

