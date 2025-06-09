/**
 * Services d'Excel
 * 
 * Exporte les services liés au traitement des fichiers Excel
 */

import * as ExcelService from './excelService';
import * as ValidationService from './validationService';
import * as UploadService from './uploadService';

// Exporter chaque service comme espace de noms
export {
  ExcelService,
  ValidationService,
  UploadService
};

// Exporter certaines fonctions et types couramment utilisés directement
export {
  parseExcelFile,
  exportToExcel
} from './excelService';

export type {
  ExcelParseResult,
  ExcelParseOptions,
  SheetData,
  ExcelExportOptions
} from './excelService';

export {
  uploadFile,
  deleteFile,
  getFileUrl
} from './uploadService';

export type {
  UploadOptions,
  UploadResult
} from './uploadService';

export {
  validateExcelFile,
  generateValidationReport
} from './validationService';

export type {
  ValidationRule,
  ValidationRules
} from './validationService'; 

