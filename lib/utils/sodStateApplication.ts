/**
 * Utilitaires pour appliquer l'état global aux rôles SoD
 * 
 * Ces fonctions appliquent les suppressions et restrictions
 * stockées dans le contexte global aux rôles bruts.
 * 
 * Performance :
 * - Opérations O(1) grâce aux Maps
 * - Pas de mutation des données originales
 * - Optimisé pour les gros datasets
 */

import type {
  SodSimpleRole,
  SodCompositeRole,
  SodAction,
  SodResource,
  SodSimpleRoleFunction,
  SodCompositeRoleFunction,
} from 'lib/types/sodAnalysis';
import { extractExternalResourceValues } from './sodResourceUtils';

/**
 * Interface pour l'état des actions (depuis le contexte)
 */
export interface SodActionsState {
  isActionDeleted: (roleName: string, actionCode: string) => boolean;
  isActionRestricted: (roleName: string, actionCode: string) => { 
    isRestricted: boolean; 
    restrictedByAction: boolean 
  };
  isResourceRestricted: (
    roleName: string,
    resourceCode: string,
    externalResourceCode: string,
    values: string[]
  ) => boolean;
}

// ✅ Fonctions utilitaires déplacées vers sodResourceUtils.ts pour éviter la duplication

/**
 * Applique l'état à une ressource
 * ✅ OPTIMISATION : Retourne l'objet original si rien n'a changé
 * ✅ Vérifie si au moins une externalResource est restreinte (niveau VALEURS)
 */
function applyStateToResource(
  resource: SodResource,
  roleName: string,
  actionCode: string,
  state: SodActionsState
): SodResource {
  // ✅ Vérifier si au moins une externalResource est restreinte (niveau VALEURS)
  let isRestricted = false;
  
  for (const extRes of resource.externalResources || []) {
    const values = extractExternalResourceValues(extRes);
    
    // Vérifier si cette externalResource est restreinte
    if (state.isResourceRestricted(roleName, resource.code, extRes.code, values)) {
      isRestricted = true;
      break;
    }
  }
  
  // ✅ Si l'état est identique, retourner l'objet original (même référence)
  if (resource.isRestricted === isRestricted && resource.isDeleted === false) {
    return resource;
  }
  
  // ❌ Sinon, créer un nouvel objet
  return {
    ...resource,
    isRestricted,
    isDeleted: false, // Les ressources ne sont pas supprimées directement
  };
}

/**
 * Applique l'état à une action
 * ✅ OPTIMISATION : Retourne l'objet original si rien n'a changé
 */
function applyStateToAction(
  action: SodAction,
  roleName: string,
  state: SodActionsState
): SodAction {
  const isDeleted = state.isActionDeleted(roleName, action.code);
  const { isRestricted, restrictedByAction } = state.isActionRestricted(roleName, action.code);
  
  // Appliquer l'état aux ressources (avec actionCode pour vérifier les restrictions au niveau action)
  const resourcesWithState = action.resources.map(resource =>
    applyStateToResource(resource, roleName, action.code, state)
  );
  
  // ✅ Vérifier si les ressources ont changé (comparaison de référence)
  const resourcesChanged = resourcesWithState.some((r, i) => r !== action.resources[i]);
  
  // Vérifier si au moins une ressource non-S_TCODE est restreinte
  const hasRestrictedResource = resourcesWithState.some(
    r => r.code !== 'S_TCODE' && r.isRestricted
  );
  
  // ✅ RÈGLE PRIORITAIRE : Une action SUPPRIMÉE ne peut JAMAIS être RESTREINTE
  // Si isDeleted = true → isRestricted doit être false (peu importe l'état des ressources)
  // Sinon, appliquer la logique normale de restriction
  const finalIsRestricted = isDeleted 
    ? false 
    : (
        restrictedByAction 
          ? hasRestrictedResource 
          : (isRestricted || hasRestrictedResource)
      );
  
  // ✅ Vérifier si les flags ont changé
  const flagsChanged = 
    action.isDeleted !== isDeleted ||
    action.isRestricted !== finalIsRestricted ||
    (action as any).restrictedByAction !== restrictedByAction;
  
  // ✅ Si rien n'a changé, retourner l'objet original (même référence)
  if (!resourcesChanged && !flagsChanged) {
    return action;
  }
  
  // ❌ Sinon, créer un nouvel objet
  return {
    ...action,
    isDeleted,
    isRestricted: finalIsRestricted,
    restrictedByAction,
    resources: resourcesWithState,
  } as SodAction & { restrictedByAction?: boolean };
}

/**
 * Applique l'état à une fonction (rôle simple)
 * ✅ OPTIMISATION : Retourne l'objet original si rien n'a changé
 */
function applyStateToSimpleFunction(
  func: SodSimpleRoleFunction,
  roleName: string,
  state: SodActionsState
): SodSimpleRoleFunction {
  const actionsWithState = func.actions.map(action => 
    applyStateToAction(action, roleName, state)
  );
  
  // ✅ Vérifier si les actions ont changé (comparaison de référence)
  const actionsChanged = actionsWithState.some((a, i) => a !== func.actions[i]);
  
  // ✅ Si rien n'a changé, retourner l'objet original (même référence)
  if (!actionsChanged) {
    return func;
  }
  
  // ❌ Sinon, créer un nouvel objet
  return {
    ...func,
    actions: actionsWithState,
  };
}

/**
 * Applique l'état à une fonction (rôle composite)
 * ✅ OPTIMISATION : Retourne l'objet original si rien n'a changé
 */
function applyStateToCompositeFunction(
  func: SodCompositeRoleFunction,
  state: SodActionsState
): SodCompositeRoleFunction {
  const simpleRolesWithState = func.simpleRoles.map(simpleRole => {
    const actionsWithState = simpleRole.actions.map(action =>
      applyStateToAction(action as SodAction, simpleRole.roleName, state)
    );
    
    // ✅ Vérifier si les actions ont changé
    const actionsChanged = actionsWithState.some((a, i) => a !== simpleRole.actions[i]);
    
    // ✅ Si rien n'a changé, retourner le simpleRole original
    if (!actionsChanged) {
      return simpleRole;
    }
    
    // ❌ Sinon, créer un nouveau simpleRole
    return {
      ...simpleRole,
      actions: actionsWithState,
    };
  });
  
  // ✅ Vérifier si les simpleRoles ont changé
  const simpleRolesChanged = simpleRolesWithState.some((sr, i) => sr !== func.simpleRoles[i]);
  
  // ✅ Si rien n'a changé, retourner l'objet original
  if (!simpleRolesChanged) {
    return func;
  }
  
  // ❌ Sinon, créer un nouvel objet
  return {
    ...func,
    simpleRoles: simpleRolesWithState,
  };
}

/**
 * Applique l'état global à un rôle simple
 * ✅ OPTIMISATION : Retourne l'objet original si rien n'a changé
 */
export function applyStateToSimpleRole(
  role: SodSimpleRole,
  state: SodActionsState
): SodSimpleRole {
  const risksWithState = role.risks.map(risk => {
    const functionsWithState = risk.functions.map(func =>
      applyStateToSimpleFunction(func, role.roleName, state)
    );
    
    // ✅ Vérifier si les fonctions ont changé
    const functionsChanged = functionsWithState.some((f, i) => f !== risk.functions[i]);
    
    // ✅ Si rien n'a changé, retourner le risk original
    if (!functionsChanged) {
      return risk;
    }
    
    // ❌ Sinon, créer un nouveau risk
    return {
      ...risk,
      functions: functionsWithState,
    };
  });
  
  // ✅ Vérifier si les risks ont changé
  const risksChanged = risksWithState.some((r, i) => r !== role.risks[i]);
  
  // ✅ Si rien n'a changé, retourner l'objet original (même référence)
  if (!risksChanged) {
    return role;
  }
  
  // ❌ Sinon, créer un nouvel objet
  return {
    ...role,
    risks: risksWithState,
  };
}

/**
 * Applique l'état global à un rôle composite
 * ✅ OPTIMISATION : Retourne l'objet original si rien n'a changé
 */
export function applyStateToCompositeRole(
  role: SodCompositeRole,
  state: SodActionsState
): SodCompositeRole {
  const risksWithState = role.risks.map(risk => {
    const functionsWithState = risk.functions.map(func =>
      applyStateToCompositeFunction(func, state)
    );
    
    // ✅ Vérifier si les fonctions ont changé
    const functionsChanged = functionsWithState.some((f, i) => f !== risk.functions[i]);
    
    // ✅ Si rien n'a changé, retourner le risk original
    if (!functionsChanged) {
      return risk;
    }
    
    // ❌ Sinon, créer un nouveau risk
    return {
      ...risk,
      functions: functionsWithState,
    };
  });
  
  // ✅ Vérifier si les risks ont changé
  const risksChanged = risksWithState.some((r, i) => r !== role.risks[i]);
  
  // ✅ Si rien n'a changé, retourner l'objet original (même référence)
  if (!risksChanged) {
    return role;
  }
  
  // ❌ Sinon, créer un nouvel objet
  return {
    ...role,
    risks: risksWithState,
  };
}

/**
 * Applique l'état global à une liste de rôles simples
 */
export function applyStateToSimpleRoles(
  roles: SodSimpleRole[],
  state: SodActionsState
): SodSimpleRole[] {
  return roles.map(role => applyStateToSimpleRole(role, state));
}

/**
 * Applique l'état global à une liste de rôles composites
 */
export function applyStateToCompositeRoles(
  roles: SodCompositeRole[],
  state: SodActionsState
): SodCompositeRole[] {
  return roles.map(role => applyStateToCompositeRole(role, state));
}
