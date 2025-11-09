/**
 * Types pour les modules et transactions SAP
 * Gestion de la hiérarchie des modules
 */

/**
 * Module SAP avec hiérarchie
 */
export interface SapModule {
  moduleId: string;           // Ex: "MM", "MM-IV", "MM-IV-LIV"
  description: string;         // Ex: "Gestion des matériaux", "Vérification des factures"
  level: number;              // Niveau dans la hiérarchie (1, 2, 3, etc.)
  parentModuleId?: string;    // ID du module parent (NULL pour niveau 1)
}

/**
 * Transaction SAP avec son module
 */
export interface SapTransaction {
  transactionCode: string;    // Ex: "MIR4", "FB03"
  description?: string;       // Description de la transaction
  moduleId?: string;          // Module le plus spécifique associé
}

/**
 * Hiérarchie de modules décomposée pour affichage
 */
export interface ModuleHierarchy {
  level1?: {
    id: string;
    description: string;
  };
  level2?: {
    id: string;
    description: string;
  };
  level3Plus?: {
    id: string;
    description: string;
  };
}

/**
 * Transaction avec sa hiérarchie de modules complète
 */
export interface TransactionWithModuleHierarchy {
  transactionCode: string;
  transactionDescription?: string;
  moduleId?: string;
  moduleDescription?: string;
  moduleLevel?: number;
  parentModuleId?: string;
  hierarchy?: ModuleHierarchy;
}

/**
 * Données enrichies d'une transaction pour affichage dans le tableau
 */
export interface EnrichedTransactionData extends TransactionWithModuleHierarchy {
  usage: number;              // Nombre d'exécutions
  isApproved: boolean | null; // État de validation (mode technique)
  comment?: string;           // Commentaire de validation
}

/**
 * Données de prévisualisation de transaction (chargées immédiatement)
 */
export interface TransactionPreview {
  code: string;
  description?: string;
  usage: number;
  module?: string;
  moduleDescription?: string;
  level1Module?: string;
  level1Description?: string;
  level2Module?: string;
  level2Description?: string;
  level3Module?: string;
  level3Description?: string;
}

