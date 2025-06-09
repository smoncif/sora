/**
 * Service d'exportation de données
 * 
 * Ce service fournit des méthodes pour exporter des données de l'application
 * vers différents formats (Excel, CSV, JSON, etc.)
 */

import { exportToExcel } from 'lib/services/excel';
import { ServiceResult } from '../user/userService';

// Options pour l'exportation de données
export interface ExportOptions {
  filename?: string;
  format?: 'xlsx' | 'csv' | 'json';
  sheetName?: string;
  includeHeaders?: boolean;
  customHeaders?: Record<string, string>;
  dateFormat?: string;
  onProgress?: (progress: number, stage: string) => void;
}

// Résultat d'une exportation de données
export interface ExportResult {
  filename: string;
  format: string;
  url?: string;
  size?: number;
  metadata: {
    exportDate: Date;
    rowCount: number;
    processingTimeMs: number;
    [key: string]: unknown;
  };
}

/**
 * Exporte des données vers Excel
 */
export async function exportToExcelFile<T extends object[]>(
  data: T,
  options: ExportOptions = {}
): Promise<ServiceResult<ExportResult>> {
  try {
    const startTime = Date.now();
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(10, 'Préparation des données');
    }
    
    // Mappage des options
    const filename = options.filename || `export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const sheetName = options.sheetName || 'Données';
    
    // Extraction des en-têtes si elles ne sont pas fournies
    const headers = options.customHeaders || 
      (data.length > 0 ? Object.keys(data[0]).reduce((acc, key) => {
        acc[key] = key;
        return acc;
      }, {} as Record<string, string>) : {});
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(30, 'Génération du fichier Excel');
    }
    
    // Exportation vers Excel
    const blob = await exportToExcel(data as Record<string, unknown>[], {
      sheetName
    });
    
    // Création d'une URL pour le téléchargement
    const url = URL.createObjectURL(blob);
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(90, 'Finalisation');
    }
    
    const processingTimeMs = Date.now() - startTime;
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(100, 'Exportation terminée');
    }
    
    // Retourner le résultat
    return {
      success: true,
      data: {
        filename,
        format: 'xlsx',
        url,
        size: blob.size,
        metadata: {
          exportDate: new Date(),
          rowCount: data.length,
          processingTimeMs
        }
      }
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue lors de l'exportation",
      code: "EXPORT_ERROR"
    };
  }
}

/**
 * Exporte des données vers CSV
 */
export async function exportToCsv<T extends object[]>(
  data: T,
  options: ExportOptions = {}
): Promise<ServiceResult<ExportResult>> {
  try {
    const startTime = Date.now();
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(10, 'Préparation des données');
    }
    
    // Mappage des options
    const filename = options.filename || `export_${new Date().toISOString().slice(0, 10)}.csv`;
    
    // Extraction des en-têtes
    const headers = options.customHeaders || 
      (data.length > 0 ? Object.keys(data[0]).reduce((acc, key) => {
        acc[key] = key;
        return acc;
      }, {} as Record<string, string>) : {});
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(30, 'Génération du CSV');
    }
    
    // Conversion des données en CSV
    const headerRow = options.includeHeaders !== false 
      ? Object.values(headers).join(',')
      : '';
    
    const rows = data.map(item => {
      return Object.keys(headers)
        .map(key => {
          const value = (item as any)[key];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          if (value instanceof Date) {
            if (options.dateFormat) {
              // Simple formatting with predefined patterns
              if (options.dateFormat === 'ISO') return value.toISOString();
              if (options.dateFormat === 'date') return value.toLocaleDateString();
              if (options.dateFormat === 'datetime') return value.toLocaleString();
            }
            return value.toISOString();
          }
          return String(value);
        })
        .join(',');
    });
    
    const csvContent = [
      ...(headerRow ? [headerRow] : []), 
      ...rows
    ].join('\n');
    
    // Création d'un blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(90, 'Finalisation');
    }
    
    const processingTimeMs = Date.now() - startTime;
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(100, 'Exportation terminée');
    }
    
    // Retourner le résultat
    return {
      success: true,
      data: {
        filename,
        format: 'csv',
        url,
        size: blob.size,
        metadata: {
          exportDate: new Date(),
          rowCount: data.length,
          processingTimeMs
        }
      }
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue lors de l'exportation",
      code: "EXPORT_ERROR"
    };
  }
}

/**
 * Exporte des données vers JSON
 */
export async function exportToJson<T>(
  data: T,
  options: ExportOptions = {}
): Promise<ServiceResult<ExportResult>> {
  try {
    const startTime = Date.now();
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(10, 'Préparation des données');
    }
    
    // Mappage des options
    const filename = options.filename || `export_${new Date().toISOString().slice(0, 10)}.json`;
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(50, 'Génération du JSON');
    }
    
    // Conversion des données en JSON
    const jsonContent = JSON.stringify(data, null, 2);
    
    // Création d'un blob
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(90, 'Finalisation');
    }
    
    const processingTimeMs = Date.now() - startTime;
    
    // Mise à jour de progression
    if (options.onProgress) {
      options.onProgress(100, 'Exportation terminée');
    }
    
    // Retourner le résultat
    return {
      success: true,
      data: {
        filename,
        format: 'json',
        url,
        size: blob.size,
        metadata: {
          exportDate: new Date(),
          rowCount: Array.isArray(data) ? data.length : 1,
          processingTimeMs
        }
      }
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue lors de l'exportation",
      code: "EXPORT_ERROR"
    };
  }
}

/**
 * Déclenche le téléchargement d'un fichier exporté
 */
export function downloadExportedFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
} 

