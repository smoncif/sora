/**
 * Utilitaires pour la manipulation des ressources SoD
 * 
 * Ce fichier contient toutes les fonctions partagées pour :
 * - Normaliser les valeurs
 * - Extraire les valeurs des ressources
 * - Gérer les intervalles
 */

import type { SodResource, SodExternalResource } from 'lib/types/sodAnalysis';

/**
 * Normalise une valeur (retire les zéros devant pour les nombres, uppercase pour les lettres)
 */
export function normalizeValue(value: string): string {
  const trimmed = value.trim();
  
  // Si c'est un nombre pur, retirer les zéros devant
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10).toString();
  }
  
  // Sinon, mettre en majuscules
  return trimmed.toUpperCase();
}

/**
 * Expand un intervalle en liste de valeurs
 */
export function expandInterval(from: string, to: string): string[] {
  const normFrom = normalizeValue(from);
  const normTo = normalizeValue(to);
  
  // Cas 1 : Intervalle numérique pur (ex: "03" → "06" = ["3", "4", "5", "6"])
  if (/^\d+$/.test(normFrom) && /^\d+$/.test(normTo)) {
    const start = parseInt(normFrom, 10);
    const end = parseInt(normTo, 10);
    
    if (start > end) return [normFrom, normTo];
    
    const values: string[] = [];
    for (let i = start; i <= end; i++) {
      values.push(i.toString());
    }
    return values;
  }
  
  // Cas 2 : Intervalle alphabétique pur (ex: "A" → "D" = ["A", "B", "C", "D"])
  if (/^[A-Z]$/.test(normFrom) && /^[A-Z]$/.test(normTo)) {
    const start = normFrom.charCodeAt(0);
    const end = normTo.charCodeAt(0);
    
    if (start > end) return [normFrom, normTo];
    
    const values: string[] = [];
    for (let i = start; i <= end; i++) {
      values.push(String.fromCharCode(i));
    }
    return values;
  }
  
  // Cas 3 : Autres types (retourner les bornes)
  return [normFrom, normTo];
}

/**
 * Extrait toutes les valeurs d'une external resource
 * @param extRes - External resource (avec values contenant valueFrom/valueTo)
 * @returns Liste normalisée de toutes les valeurs (intervalles expansés)
 */
export function extractExternalResourceValues(extRes: SodExternalResource): string[] {
  const allValues: string[] = [];
  
  for (const value of extRes.values || []) {
    if (value.valueFrom && value.valueTo && value.valueFrom !== value.valueTo) {
      // Intervalle - expander toutes les valeurs
      const expandedValues = expandInterval(value.valueFrom, value.valueTo);
      allValues.push(...expandedValues);
    } else if (value.valueFrom) {
      // Valeur(s) simple(s) - peut être une liste séparée par des virgules
      const fromValues = value.valueFrom
        .split(',')
        .map(v => normalizeValue(v.trim()))
        .filter(Boolean);
      allValues.push(...fromValues);
    }
  }
  
  return allValues;
}

/**
 * Extrait toutes les valeurs de toutes les external resources d'une ressource
 * @param resource - Ressource SoD complète
 * @returns Liste normalisée de toutes les valeurs
 */
export function extractResourceValues(resource: SodResource): string[] {
  const allValues: string[] = [];
  
  for (const extRes of resource.externalResources || []) {
    const values = extractExternalResourceValues(extRes);
    allValues.push(...values);
  }
  
  return allValues;
}

