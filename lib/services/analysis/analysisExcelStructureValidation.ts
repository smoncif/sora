/**
 * Validation structurelle des templates Excel (rôles / utilisateurs) avant parsing worker.
 * Une seule lecture légère (sheetRows: 1) : noms de feuilles + première ligne (en-têtes).
 */

import * as XLSX from 'xlsx';
import { DEFAULT_CONFIG } from 'lib/services/role/simplifiedAnalysisService';
import { DEFAULT_USER_CONFIG } from 'lib/services/analysis/userAnalysisParsingService';
import {
  findSheetForRoleAnalysisTemplate,
  findSheetForUserAnalysisTemplate,
} from './analysisExcelSheetFinders';

function findColumnIndex(headerRow: unknown[], columnName: string): number {
  return headerRow.findIndex(
    (header) =>
      String(header).toLowerCase().trim() === columnName.toLowerCase().trim()
  );
}

function getHeaderRow(worksheet: XLSX.WorkSheet): unknown[] {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
  if (!data.length) return [];
  return data[0] ?? [];
}

export function validateRolesAnalysisStructure(arrayBuffer: ArrayBuffer): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const cfg = DEFAULT_CONFIG;

  const workbook = XLSX.read(arrayBuffer, { type: 'array', sheetRows: 1 });
  const sheetsFound = workbook.SheetNames;

  if (sheetsFound.length !== 2) {
    errors.push(
      `Analyse rôles : le fichier doit contenir exactement 2 feuilles. Trouvé : ${sheetsFound.length} (${sheetsFound.join(', ')}).`
    );
    return { ok: false, errors };
  }

  const businessSheet = findSheetForRoleAnalysisTemplate(
    cfg.sheetNames.businessRoles,
    sheetsFound
  );
  const simpleSheet = findSheetForRoleAnalysisTemplate(
    cfg.sheetNames.simpleRoles,
    sheetsFound
  );

  if (!businessSheet) {
    errors.push(
      `Feuille des rôles métier introuvable (référence attendue : « ${cfg.sheetNames.businessRoles} »). Feuilles présentes : ${sheetsFound.join(', ')}.`
    );
  }
  if (!simpleSheet) {
    errors.push(
      `Feuille des rôles simples introuvable (référence attendue : « ${cfg.sheetNames.simpleRoles} »). Feuilles présentes : ${sheetsFound.join(', ')}.`
    );
  }
  if (errors.length) {
    return { ok: false, errors };
  }

  const brHeaders = getHeaderRow(workbook.Sheets[businessSheet!]);
  const srHeaders = getHeaderRow(workbook.Sheets[simpleSheet!]);

  if (!brHeaders.length) {
    errors.push(`La feuille « ${businessSheet} » (rôles métier) n’a pas de ligne d’en-tête.`);
  } else {
    const bm = cfg.columnMappings.businessRoles;
    if (findColumnIndex(brHeaders, bm.businessRole) === -1) {
      errors.push(
        `Feuille « ${businessSheet} » : colonne obligatoire « ${bm.businessRole} » absente.`
      );
    }
    if (findColumnIndex(brHeaders, bm.transaction) === -1) {
      errors.push(
        `Feuille « ${businessSheet} » : colonne obligatoire « ${bm.transaction} » absente.`
      );
    }
  }

  if (!srHeaders.length) {
    errors.push(`La feuille « ${simpleSheet} » (rôles simples) n’a pas de ligne d’en-tête.`);
  } else {
    const sm = cfg.columnMappings.simpleRoles;
    if (findColumnIndex(srHeaders, sm.simpleRole) === -1) {
      errors.push(
        `Feuille « ${simpleSheet} » : colonne obligatoire « ${sm.simpleRole} » absente.`
      );
    }
    if (findColumnIndex(srHeaders, sm.transaction) === -1) {
      errors.push(
        `Feuille « ${simpleSheet} » : colonne obligatoire « ${sm.transaction} » absente.`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateUsersAnalysisStructure(arrayBuffer: ArrayBuffer): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const cfg = DEFAULT_USER_CONFIG;

  const workbook = XLSX.read(arrayBuffer, { type: 'array', sheetRows: 1 });
  const sheetsFound = workbook.SheetNames;

  if (sheetsFound.length !== 3) {
    errors.push(
      `Analyse utilisateurs : le fichier doit contenir exactement 3 feuilles. Trouvé : ${sheetsFound.length} (${sheetsFound.join(', ')}).`
    );
    return { ok: false, errors };
  }

  const userTxSheet = findSheetForUserAnalysisTemplate(
    cfg.sheetNames.userTransactions,
    sheetsFound
  );
  const mappingSheet = findSheetForUserAnalysisTemplate(
    cfg.sheetNames.businessRoleMappings,
    sheetsFound
  );
  const simpleTxSheet = findSheetForUserAnalysisTemplate(
    cfg.sheetNames.simpleRoleTransactions,
    sheetsFound
  );

  if (!userTxSheet) {
    errors.push(
      `Feuille des transactions utilisateurs introuvable (référence : « ${cfg.sheetNames.userTransactions} »). Feuilles présentes : ${sheetsFound.join(', ')}.`
    );
  }
  if (!mappingSheet) {
    errors.push(
      `Feuille des mappings rôle métier ↔ rôle simple introuvable (référence : « ${cfg.sheetNames.businessRoleMappings} »). Feuilles présentes : ${sheetsFound.join(', ')}.`
    );
  }
  if (!simpleTxSheet) {
    errors.push(
      `Feuille des transactions par rôle simple introuvable (référence : « ${cfg.sheetNames.simpleRoleTransactions} »). Feuilles présentes : ${sheetsFound.join(', ')}.`
    );
  }
  if (errors.length) {
    return { ok: false, errors };
  }

  const uHeaders = getHeaderRow(workbook.Sheets[userTxSheet!]);
  const mHeaders = getHeaderRow(workbook.Sheets[mappingSheet!]);
  const sHeaders = getHeaderRow(workbook.Sheets[simpleTxSheet!]);

  if (!uHeaders.length) {
    errors.push(`La feuille « ${userTxSheet} » (transactions utilisateurs) n’a pas de ligne d’en-tête.`);
  } else {
    const um = cfg.columnMappings.userTransactions;
    if (findColumnIndex(uHeaders, um.userId) === -1) {
      errors.push(
        `Feuille « ${userTxSheet} » : colonne obligatoire « ${um.userId} » absente.`
      );
    }
    if (findColumnIndex(uHeaders, um.transaction) === -1) {
      errors.push(
        `Feuille « ${userTxSheet} » : colonne obligatoire « ${um.transaction} » absente.`
      );
    }
  }

  if (!mHeaders.length) {
    errors.push(`La feuille « ${mappingSheet} » (mappings) n’a pas de ligne d’en-tête.`);
  } else {
    const mm = cfg.columnMappings.businessRoleMappings;
    if (findColumnIndex(mHeaders, mm.businessRole) === -1) {
      errors.push(
        `Feuille « ${mappingSheet} » : colonne obligatoire « ${mm.businessRole} » absente.`
      );
    }
    if (findColumnIndex(mHeaders, mm.simpleRole) === -1) {
      errors.push(
        `Feuille « ${mappingSheet} » : colonne obligatoire « ${mm.simpleRole} » absente.`
      );
    }
  }

  if (!sHeaders.length) {
    errors.push(`La feuille « ${simpleTxSheet} » (transactions rôle simple) n’a pas de ligne d’en-tête.`);
  } else {
    const sm = cfg.columnMappings.simpleRoleTransactions;
    if (findColumnIndex(sHeaders, sm.simpleRole) === -1) {
      errors.push(
        `Feuille « ${simpleTxSheet} » : colonne obligatoire « ${sm.simpleRole} » absente.`
      );
    }
    if (findColumnIndex(sHeaders, sm.transaction) === -1) {
      errors.push(
        `Feuille « ${simpleTxSheet} » : colonne obligatoire « ${sm.transaction} » absente.`
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
