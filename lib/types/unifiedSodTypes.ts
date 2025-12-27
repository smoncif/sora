/**
 * Types unifiés pour l'affichage harmonisé des risques SoD
 * 
 * Ces types permettent d'unifier l'affichage entre :
 * - Rôles Simples (Step 1)
 * - Rôles Composites (Step 2)
 * - Utilisateurs (Step 3)
 * 
 * Objectif : Un seul composant pour tous les contextes, facilitant la maintenance
 * et garantissant la cohérence visuelle.
 */

import type { SodRiskLevel, SodAction, SodResource } from './sodAnalysis';
import type { 
  UserSodFunctionByRole, 
  UserSodFunctionByTransaction,
  UserSodCompositeRole,
  UserSodSimpleRole,
  UserSodActionByTransaction,
  UserSodRoleForAction,
} from './userSodAnalysis';
import type { 
  SodSimpleRoleFunction, 
  SodCompositeRoleFunction,
  SodSimpleRoleInComposite,
} from './sodAnalysis';

/**
 * Contexte d'affichage du risque
 */
export type UnifiedRiskContext = 'ROLE' | 'COMPOSITE' | 'USER';

/**
 * Mode d'affichage pour les utilisateurs
 */
export type UnifiedDisplayMode = 'BY_ROLE' | 'BY_TRANSACTION';

/**
 * Fonction unifiée qui peut représenter :
 * - Fonction de rôle simple (actions directes)
 * - Fonction de rôle composite (rôles simples → actions)
 * - Fonction utilisateur (composites + simples → actions)
 */
export interface UnifiedFunction {
  code: string;
  description?: string;
  system?: string;
  
  // Mode RÔLE SIMPLE : actions directes
  actions?: SodAction[];
  
  // Mode RÔLE COMPOSITE : rôles simples avec actions
  simpleRoles?: SodSimpleRoleInComposite[];
  
  // Mode UTILISATEUR (BY_ROLE) : composites + simples
  compositeRoles?: UserSodCompositeRole[];
  userSimpleRoles?: UserSodSimpleRole[];
  
  // Mode UTILISATEUR (BY_TRANSACTION) : actions avec rôles
  transactionActions?: UserSodActionByTransaction[];
  
  // Métadonnées communes
  actionCount?: number;
  simpleRoleCount?: number;
  totalActionCount?: number;
  totalExecutionCount?: number;
}

/**
 * Risque unifié qui peut représenter :
 * - Risque de rôle simple
 * - Risque de rôle composite
 * - Risque utilisateur (mode Par Rôle ou Par Transaction)
 */
export interface UnifiedRisk {
  riskId: string;
  riskLevel: SodRiskLevel;
  riskDescription?: string;
  functions: UnifiedFunction[];
  
  // Métadonnées communes
  functionCount: number;
  totalActionCount?: number;
  totalExecutionCount?: number;
  totalRoleCount?: number; // Pour utilisateurs
  
  // Statut de remédiation
  isRemediated?: boolean;
  remediationPercentage?: number;
}

/**
 * Props communes pour les composants unifiés
 */
export interface UnifiedRiskSectionProps {
  /** Risque unifié */
  risk: UnifiedRisk;
  
  /** Contexte d'affichage */
  context: UnifiedRiskContext;
  
  /** Mode d'affichage (pour utilisateurs uniquement) */
  displayMode?: UnifiedDisplayMode;
  
  /** Nom du parent (rôle ou utilisateur) */
  parentName?: string;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Tous les risques (pour calculs de statistiques) */
  allRisks?: UnifiedRisk[];
  
  /** Callbacks pour actions de remédiation */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (
    roleName: string, 
    riskId: string, 
    actionCode: string, 
    resourceCode: string, 
    externalResourceCode: string, 
    values: string[], 
    shouldRestrict?: boolean
  ) => void;
  onExcludeRole?: (compositeRoleName: string, simpleRoleName: string) => void;
  
  /** Options d'affichage */
  showNextStepButton?: boolean;
  onNextStep?: () => void;
}

/**
 * Helper pour convertir un risque de rôle simple en risque unifié
 */
export function convertSimpleRoleRiskToUnified(
  risk: import('./sodAnalysis').SodSimpleRoleRiskItem,
  roleName: string
): UnifiedRisk {
  return {
    riskId: risk.riskId,
    riskLevel: risk.riskLevel,
    riskDescription: risk.riskDescription,
    functions: risk.functions.map(func => ({
      code: func.code,
      description: func.description,
      system: func.system,
      actions: func.actions,
      actionCount: func.actionCount,
      totalActionCount: func.actionCount,
    })),
    functionCount: risk.functionCount,
    totalActionCount: risk.totalActionCount,
  };
}

/**
 * Helper pour convertir un risque de rôle composite en risque unifié
 */
export function convertCompositeRoleRiskToUnified(
  risk: import('./sodAnalysis').SodCompositeRoleRiskItem,
  compositeRoleName: string
): UnifiedRisk {
  return {
    riskId: risk.riskId,
    riskLevel: risk.riskLevel,
    riskDescription: risk.riskDescription,
    functions: risk.functions.map(func => ({
      code: func.code,
      description: func.description,
      system: func.system,
      simpleRoles: func.simpleRoles,
      simpleRoleCount: func.simpleRoleCount,
      totalActionCount: func.totalActionCount,
    })),
    functionCount: risk.functionCount,
    totalActionCount: risk.totalActionCount,
  };
}

/**
 * Helper pour convertir un risque utilisateur (mode Par Rôle) en risque unifié
 */
export function convertUserRiskByRoleToUnified(
  risk: import('./userSodAnalysis').UserSodRiskByRole
): UnifiedRisk {
  return {
    riskId: risk.riskId,
    riskLevel: risk.riskLevel,
    riskDescription: risk.riskDescription,
    functions: risk.functions.map(func => ({
      code: func.code,
      description: func.description,
      system: func.system,
      compositeRoles: func.compositeRoles,
      userSimpleRoles: func.simpleRoles,
      roleCount: func.roleCount,
      totalActionCount: func.totalActionCount,
      totalExecutionCount: func.totalExecutionCount,
    })),
    functionCount: risk.functionCount,
    totalRoleCount: risk.totalRoleCount,
    totalExecutionCount: risk.totalExecutionCount,
    isRemediated: risk.isRemediated,
    remediationPercentage: risk.remediationPercentage,
  };
}

/**
 * Helper pour convertir un risque utilisateur (mode Par Transaction) en risque unifié
 */
export function convertUserRiskByTransactionToUnified(
  risk: import('./userSodAnalysis').UserSodRiskByTransaction
): UnifiedRisk {
  return {
    riskId: risk.riskId,
    riskLevel: risk.riskLevel,
    riskDescription: risk.riskDescription,
    functions: risk.functions.map(func => ({
      code: func.code,
      description: func.description,
      system: func.system,
      transactionActions: func.actions,
      actionCount: func.actionCount,
      totalExecutionCount: func.totalExecutionCount,
    })),
    functionCount: risk.functionCount,
    totalActionCount: risk.totalActionCount,
    totalExecutionCount: risk.totalExecutionCount,
    isRemediated: risk.isRemediated,
    remediationPercentage: risk.remediationPercentage,
  };
}



