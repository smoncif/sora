/**
 * Utilitaire pour parser la hiérarchie des modules SAP
 * Parse les IDs de modules au format "MM-IV-LIV" en niveaux hiérarchiques
 */

import type { ModuleHierarchy } from 'lib/types/sapModule';

/**
 * Parse un ID de module et extrait les niveaux hiérarchiques
 * 
 * Exemples :
 * - "MM" → { level1: "MM (Description L1)" }
 * - "MM-IV" → { level1: "MM (Desc L1)", level2: "MM-IV (Desc L2)" }
 * - "MM-IV-LIV" → { level1: "MM (Desc L1)", level2: "MM-IV (Desc L2)", level3Plus: "MM-IV-LIV (Desc L3)" }
 * 
 * @param moduleId - ID du module à parser (ex: "MM-IV-LIV")
 * @param moduleData - Données du module avec descriptions par niveau
 * @returns Hiérarchie décomposée en niveaux
 */
export function parseModuleHierarchy(
  moduleId: string | undefined | null,
  moduleData?: {
    level1Description?: string;
    level2Description?: string;
    level3Description?: string;
  }
): ModuleHierarchy {
  if (!moduleId) {
    return {};
  }

  // Séparer par le délimiteur "-"
  const parts = moduleId.split('-');

  const hierarchy: ModuleHierarchy = {};

  // Niveau 1 : Premier segment
  if (parts.length >= 1) {
    hierarchy.level1 = {
      id: parts[0],
      description: moduleData?.level1Description || parts[0],
    };
  }

  // Niveau 2 : Deux premiers segments
  if (parts.length >= 2) {
    hierarchy.level2 = {
      id: `${parts[0]}-${parts[1]}`,
      description: moduleData?.level2Description || `${parts[0]}-${parts[1]}`,
    };
  }

  // Niveau 3+ : Tous les segments restants regroupés
  if (parts.length >= 3) {
    hierarchy.level3Plus = {
      id: moduleId,
      description: moduleData?.level3Description || moduleId,
    };
  }

  return hierarchy;
}

/**
 * Extrait le module de niveau 1 d'un ID de module
 * 
 * @param moduleId - ID du module (ex: "MM-IV-LIV")
 * @returns Module de niveau 1 (ex: "MM")
 */
export function getLevel1Module(moduleId: string | undefined | null): string | undefined {
  if (!moduleId) return undefined;
  return moduleId.split('-')[0];
}

/**
 * Extrait le module de niveau 2 d'un ID de module
 * 
 * @param moduleId - ID du module (ex: "MM-IV-LIV")
 * @returns Module de niveau 2 (ex: "MM-IV") ou undefined
 */
export function getLevel2Module(moduleId: string | undefined | null): string | undefined {
  if (!moduleId) return undefined;
  const parts = moduleId.split('-');
  if (parts.length < 2) return undefined;
  return `${parts[0]}-${parts[1]}`;
}

/**
 * Extrait le module de niveau 3+ d'un ID de module
 * 
 * @param moduleId - ID du module (ex: "MM-IV-LIV")
 * @returns Module de niveau 3+ (ex: "MM-IV-LIV") ou undefined
 */
export function getLevel3PlusModule(moduleId: string | undefined | null): string | undefined {
  if (!moduleId) return undefined;
  const parts = moduleId.split('-');
  if (parts.length < 3) return undefined;
  return moduleId;
}

/**
 * Détermine le niveau hiérarchique d'un module
 * 
 * @param moduleId - ID du module
 * @returns Niveau (1, 2, 3+)
 */
export function getModuleLevel(moduleId: string | undefined | null): number {
  if (!moduleId) return 0;
  const parts = moduleId.split('-');
  return Math.min(parts.length, 3); // Max 3 pour "3+"
}

/**
 * Formate l'affichage d'un module avec sa description
 * 
 * @param moduleId - ID du module
 * @param description - Description du module
 * @returns Chaîne formatée "ID (Description)" ou juste "ID"
 */
export function formatModuleDisplay(
  moduleId: string | undefined | null,
  description?: string
): string {
  if (!moduleId) return '-';
  if (!description || description === moduleId) return moduleId;
  return `${moduleId} (${description})`;
}

