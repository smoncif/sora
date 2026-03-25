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
      `2 feuilles requises — trouvé ${sheetsFound.length} (${sheetsFound.join(', ') || 'aucune'}).`
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
    errors.push(`Feuille « rôles métier » introuvable (${sheetsFound.join(', ')}).`);
  }
  if (!simpleSheet) {
    errors.push(`Feuille « rôles simples » introuvable (${sheetsFound.join(', ')}).`);
  }
  if (errors.length) {
    return { ok: false, errors };
  }

  const brHeaders = getHeaderRow(workbook.Sheets[businessSheet!]);
  const srHeaders = getHeaderRow(workbook.Sheets[simpleSheet!]);

  if (!brHeaders.length) {
    errors.push(`« ${businessSheet} » : en-têtes absents (ligne 1).`);
  } else {
    const bm = cfg.columnMappings.businessRoles;
    if (findColumnIndex(brHeaders, bm.businessRole) === -1) {
      errors.push(`« ${businessSheet} » : « ${bm.businessRole} » manquant.`);
    }
    if (findColumnIndex(brHeaders, bm.transaction) === -1) {
      errors.push(`« ${businessSheet} » : « ${bm.transaction} » manquant.`);
    }
  }

  if (!srHeaders.length) {
    errors.push(`« ${simpleSheet} » : en-têtes absents (ligne 1).`);
  } else {
    const sm = cfg.columnMappings.simpleRoles;
    if (findColumnIndex(srHeaders, sm.simpleRole) === -1) {
      errors.push(`« ${simpleSheet} » : « ${sm.simpleRole} » manquant.`);
    }
    if (findColumnIndex(srHeaders, sm.transaction) === -1) {
      errors.push(`« ${simpleSheet} » : « ${sm.transaction} » manquant.`);
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
      `3 feuilles requises — trouvé ${sheetsFound.length} (${sheetsFound.join(', ') || 'aucune'}).`
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
    errors.push(`Feuille « utilisateurs / transactions » introuvable (${sheetsFound.join(', ')}).`);
  }
  if (!mappingSheet) {
    errors.push(`Feuille « mapping rôles » introuvable (${sheetsFound.join(', ')}).`);
  }
  if (!simpleTxSheet) {
    errors.push(`Feuille « rôles simples / transactions » introuvable (${sheetsFound.join(', ')}).`);
  }
  if (errors.length) {
    return { ok: false, errors };
  }

  const uHeaders = getHeaderRow(workbook.Sheets[userTxSheet!]);
  const mHeaders = getHeaderRow(workbook.Sheets[mappingSheet!]);
  const sHeaders = getHeaderRow(workbook.Sheets[simpleTxSheet!]);

  if (!uHeaders.length) {
    errors.push(`« ${userTxSheet} » : en-têtes absents (ligne 1).`);
  } else {
    const um = cfg.columnMappings.userTransactions;
    if (findColumnIndex(uHeaders, um.userId) === -1) {
      errors.push(`« ${userTxSheet} » : « ${um.userId} » manquant.`);
    }
    if (findColumnIndex(uHeaders, um.transaction) === -1) {
      errors.push(`« ${userTxSheet} » : « ${um.transaction} » manquant.`);
    }
  }

  if (!mHeaders.length) {
    errors.push(`« ${mappingSheet} » : en-têtes absents (ligne 1).`);
  } else {
    const mm = cfg.columnMappings.businessRoleMappings;
    if (findColumnIndex(mHeaders, mm.businessRole) === -1) {
      errors.push(`« ${mappingSheet} » : « ${mm.businessRole} » manquant.`);
    }
    if (findColumnIndex(mHeaders, mm.simpleRole) === -1) {
      errors.push(`« ${mappingSheet} » : « ${mm.simpleRole} » manquant.`);
    }
  }

  if (!sHeaders.length) {
    errors.push(`« ${simpleTxSheet} » : en-têtes absents (ligne 1).`);
  } else {
    const sm = cfg.columnMappings.simpleRoleTransactions;
    if (findColumnIndex(sHeaders, sm.simpleRole) === -1) {
      errors.push(`« ${simpleTxSheet} » : « ${sm.simpleRole} » manquant.`);
    }
    if (findColumnIndex(sHeaders, sm.transaction) === -1) {
      errors.push(`« ${simpleTxSheet} » : « ${sm.transaction} » manquant.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
