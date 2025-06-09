/**
 * Service d'analyse des rôles - Version temporaire
 * Ce service sera remplacé par la nouvelle implémentation simplifiée
 */

export interface ExtractedRoleData {
  roles: any[];
  transactions: any[];
  mappings: any[];
}

/**
 * Extrait les données de rôles depuis un fichier Excel
 * @param file - Fichier Excel à analyser
 * @returns Données extraites
 */
export async function extractRoleDataFromExcel(file: File): Promise<ExtractedRoleData> {
  // Implémentation temporaire - retourne des données vides

  // Simuler un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    roles: [],
    transactions: [],
    mappings: []
  };
} 
