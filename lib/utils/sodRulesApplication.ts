/**
 * Utilitaires pour appliquer les règles de gestion SoD directement dans TanStack Query
 * 
 * ============================================
 * ARCHITECTURE : Maps Globales = Source Unique de Vérité
 * ============================================
 * 
 * Ce fichier implémente le pattern suivant :
 * 
 * 1. **Maps Globales** (ligne 21-32) :
 *    - deletedActionsMap : Stocke les actions supprimées
 *    - restrictedActionsMap : Stocke les actions restreintes (directement)
 *    - restrictedResourcesMap : Stocke les valeurs restreintes par ressource
 *    - actionResourcesMap : Stocke toutes les ressources d'une action (pour propagation globale)
 *    ✅ Ces Maps sont LA source de vérité
 * 
 * 2. **Mutations** (ligne 292-850) :
 *    - applyDeleteActionRules : Met à jour deletedActionsMap et restrictedResourcesMap
 *    - applyRestrictActionRules : Met à jour restrictedActionsMap et restrictedResourcesMap
 *    - applyRestrictResourceRules : Met à jour restrictedResourcesMap
 *    ✅ Les mutations modifient UNIQUEMENT les Maps
 * 
 * 3. **Session TanStack Query** :
 *    - La session est RECALCULÉE depuis les Maps
 *    - action.isDeleted, action.isRestricted, resource.isRestricted sont DÉRIVÉS des Maps
 *    ✅ La session reflète toujours l'état des Maps
 * 
 * 4. **Composants UI** :
 *    - Lisent depuis la Session TanStack Query
 *    - La session est automatiquement mise à jour via invalidation
 *    ✅ Les composants voient toujours l'état correct
 * 
 * FLOW COMPLET :
 * User Click → Mutation → Maps Globales → Session Recalculée → UI Re-render
 * 
 * ============================================
 * RÉPLIQUÉE DU SODACTIONSCONTEXT
 * ============================================
 * 
 * Ce fichier réplique exactement la logique du SodActionsContext :
 * - toggleDeleteAction (ligne 283-338)
 * - toggleRestrictAction (ligne 467-546)
 * - toggleRestrictResource (ligne 551-576)
 * - updateActionRestrictionState (ligne 150-177)
 */

import type { SodAnalysisSession, SodSimpleRole, SodCompositeRole, SodAction, SodResource, SodExternalResource } from 'lib/types/sodAnalysis';
import { extractExternalResourceValues, normalizeValue } from 'lib/utils/sodResourceUtils';

// ============================================
// ARCHITECTURE RÉPLIQUÉE DU CONTEXT
// ============================================

/**
 * Maps globales pour tracker l'état des restrictions (répliquées du SodActionsContext)
 * 
 * ✅ EXPORTÉES : Ces Maps sont la source unique de vérité pour l'état des actions/ressources
 * Elles peuvent être lues depuis d'autres composants (ex: debug panel) pour éviter les recalculs
 */
export const restrictedResourcesMap = new Map<string, Set<string>>();
export const restrictedActionsMap = new Map<string, { restrictedByAction: boolean }>();
export const deletedActionsMap = new Map<string, boolean>();
export const excludedSimpleRolesMap = new Map<string, boolean>();

/**
 * Map globale : toutes les ressources d'une action dans un rôle (avec leurs données complètes)
 * Clé : "roleName|actionCode|resourceCode", Valeur : resource complète avec externalResources
 * 
 * ✅ Cette Map permet de tracker toutes les ressources pour appliquer la propagation globale
 */
export const actionResourcesMap = new Map<string, any>();

/**
 * Fonction utilitaire pour créer une clé de ressource d'action
 */
export function getActionResourceKey(
  roleName: string,
  actionCode: string,
  resourceCode: string
): string {
  return `${roleName}|${actionCode}|${resourceCode}`;
}

/**
 * Fonctions utilitaires pour générer les clés (répliquées du SodActionsContext)
 * 
 * ✅ EXPORTÉES : Ces fonctions peuvent être utilisées par d'autres composants
 * pour construire les clés et accéder aux Maps globales
 */
export function getResourceKey(roleName: string, resourceCode: string, externalResourceCode: string): string {
  return `${roleName}|${resourceCode}|${externalResourceCode}`;
}

export function getActionKey(roleName: string, actionCode: string): string {
  return `${roleName}|${actionCode}`;
}

export function getExcludedRoleKey(compositeRoleName: string, simpleRoleName: string): string {
  return `${compositeRoleName}|${simpleRoleName}`;
}

/**
 * Construire la Map globale des ressources par action
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 228-277
 * 
 * Cette fonction parcourt tous les rôles et leurs actions pour construire
 * une Map globale qui permet de retrouver facilement toutes les ressources
 * d'une action donnée, peu importe la fonction dans laquelle elle apparaît.
 */
export function buildActionResourcesMap(session: SodAnalysisSession): void {
  actionResourcesMap.clear();
  
  // Fonction helper pour fusionner les ressources externes
  function mergeExternalResources(existingResource: any, newResource: any): any {
    if (!existingResource) return newResource;
    
    const existingExternalResources = existingResource.externalResources || [];
    const newExternalResources = newResource.externalResources || [];
    
    // Créer un Map pour éviter les doublons par code
    const externalResourcesMap = new Map();
    
    // Ajouter les ressources externes existantes
    existingExternalResources.forEach((extRes: any) => {
      externalResourcesMap.set(extRes.code, extRes);
    });
    
    // Ajouter les nouvelles ressources externes (écrasent si même code)
    newExternalResources.forEach((extRes: any) => {
      externalResourcesMap.set(extRes.code, extRes);
    });
    
    // Retourner la ressource fusionnée
    return {
      ...existingResource,
      externalResources: Array.from(externalResourcesMap.values())
    };
  }
  
  // Parcourir les rôles simples
  session.simpleRoles?.roles?.forEach((role: any) => {
    role.risks?.forEach((risk: any) => {
      risk.functions?.forEach((func: any) => {
        func.actions?.forEach((action: any) => {
          action.resources?.forEach((resource: any) => {
            const key = getActionResourceKey(role.roleName, action.code, resource.code);
            const existingResource = actionResourcesMap.get(key);
            const mergedResource = mergeExternalResources(existingResource, resource);
            actionResourcesMap.set(key, mergedResource);
            
          });
        });
      });
    });
  });

  // Parcourir les rôles composites
  session.compositeRoles?.roles?.forEach((role: any) => {
    role.risks?.forEach((risk: any) => {
      risk.functions?.forEach((func: any) => {
        func.simpleRoles?.forEach((simpleRole: any) => {
          simpleRole.actions?.forEach((action: any) => {
            action.resources?.forEach((resource: any) => {
              const key = getActionResourceKey(simpleRole.roleName, action.code, resource.code);
              const existingResource = actionResourcesMap.get(key);
              const mergedResource = mergeExternalResources(existingResource, resource);
              actionResourcesMap.set(key, mergedResource);
              
            });
          });
        });
      });
    });
  });
  
}

/**
 * Met à jour l'état de restriction d'une action dans restrictedActionsMap
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 347-384
 * 
 * Cette fonction vérifie l'état complet de restriction (direct + indirect) 
 * et met à jour restrictedActionsMap en conséquence.
 * 
 * Appelée APRÈS modification de restrictedResourcesMap pour maintenir la cohérence.
 */
function updateActionRestrictionState(roleName: string, actionCode: string): void {
  const key = getActionKey(roleName, actionCode);
  
  // ✅ VÉRIFICATION GLOBALE : Utiliser actionResourcesMap pour voir TOUTES les ressources
  let globalRestrictedResources: string[] = [];
  
  // Vérifier TOUTES les ressources globales de cette action
  actionResourcesMap.forEach((resource, mapKey) => {
    const [mapRoleName, mapActionCode, ] = mapKey.split('|');
    if (mapRoleName === roleName && mapActionCode === actionCode) {
      if (resource.code !== 'S_TCODE') {
        resource.externalResources?.forEach((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          const resKey = getResourceKey(roleName, resource.code, extRes.code);
          const restrictedValuesSet = restrictedResourcesMap.get(resKey);
          
          if (restrictedValuesSet && restrictedValuesSet.size > 0) {
            const isRestricted = values.length > 0 && values.every(v => restrictedValuesSet.has(v));
            if (isRestricted) {
              globalRestrictedResources.push(`${resource.code}|${extRes.code} (${values.length} valeurs)`);
            }
          }
        });
      }
    }
  });
  
  // Si l'action n'a plus de ressources restreintes GLOBALEMENT, la nettoyer
  if (globalRestrictedResources.length === 0) {
    restrictedActionsMap.delete(key);
  }
}

/**
 * Fonction pour appliquer la restriction de ressource (répliquée du SodActionsContext)
 */
/**
 * Fonction pour FORCER l'état de restriction d'une ressource (sans toggle)
 * Utilisée en interne par applyDeleteActionRules, applyRestrictActionRules et applyRestrictResourceRules (mode force)
 */
function forceResourceRestrictionState(
  roleName: string,
  resourceCode: string,
  externalResourceCode: string,
  values: string[],
  shouldBeRestricted: boolean
): void {
  const key = getResourceKey(roleName, resourceCode, externalResourceCode);
  const existingSet = restrictedResourcesMap.get(key);
  const restrictedValuesSet = existingSet || new Set<string>();
  const normalizedValues = values.map(v => normalizeValue(v));
  
  if (shouldBeRestricted) {
    normalizedValues.forEach(v => {
      restrictedValuesSet.add(v);
    });
    restrictedResourcesMap.set(key, restrictedValuesSet);
  } else {
    normalizedValues.forEach(v => {
      restrictedValuesSet.delete(v);
    });
    
    if (restrictedValuesSet.size === 0) {
      restrictedResourcesMap.delete(key);
    } else {
      restrictedResourcesMap.set(key, restrictedValuesSet);
    }
  }
}

function applyResourceRestriction(
  roleName: string,
  resourceCode: string,
  externalResourceCode: string,
  values: string[]
): void {
  const key = getResourceKey(roleName, resourceCode, externalResourceCode);
  const restrictedValuesSet = restrictedResourcesMap.get(key) || new Set<string>();
  const normalizedValues = values.map(v => normalizeValue(v));
  const alreadyRestricted = normalizedValues.every(v => restrictedValuesSet.has(v));
  
  if (alreadyRestricted) {
    normalizedValues.forEach(v => {
      restrictedValuesSet.delete(v);
    });
    
    if (restrictedValuesSet.size === 0) {
      restrictedResourcesMap.delete(key);
    } else {
      restrictedResourcesMap.set(key, restrictedValuesSet);
    }
  } else {
    normalizedValues.forEach(v => {
      restrictedValuesSet.add(v);
    });
    restrictedResourcesMap.set(key, restrictedValuesSet);
  }
}

/**
 * Fonction pour vérifier si une ressource est restreinte (répliquée du SodActionsContext)
 */
function isResourceRestricted(
  roleName: string,
  resourceCode: string,
  externalResourceCode: string,
  values: string[]
): boolean {
  const key = getResourceKey(roleName, resourceCode, externalResourceCode);
  const restrictedValuesSet = restrictedResourcesMap.get(key);
  
  if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
    return false;
  }
  
  // Toutes les valeurs doivent être dans le set
  return values.length > 0 && values.every(v => restrictedValuesSet.has(v));
}

/**
 * Fonction pour vérifier si un rôle simple est exclu dans un rôle composite
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 598-604
 */
export function isSimpleRoleExcluded(compositeRoleName: string, simpleRoleName: string): boolean {
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  return excludedSimpleRolesMap.get(key) || false;
}

/**
 * Fonction pour vérifier si une action est restreinte (répliquée du SodActionsContext)
 */
function isActionRestricted(roleName: string, actionCode: string, resources?: any[]): {
  isRestricted: boolean;
  restrictedByAction: boolean;
} {
  const key = getActionKey(roleName, actionCode);
  const restriction = restrictedActionsMap.get(key);
  
  // ✅ Vérifier restriction directe
  const directlyRestricted = !!restriction;
  
  // ✅ Vérifier restriction indirecte (via ressources)
  let indirectlyRestricted = false;
  
  if (resources && resources.length > 0) {
    // ✅ Utiliser les resources fournis
    indirectlyRestricted = resources.some(resource => {
      if (resource.code === 'S_TCODE') return false;
      
      return resource.externalResources?.some((extRes: any) => {
        const values = extractExternalResourceValues(extRes);
        // ✅ CORRECTION : Passer les valeurs à getResourceKey pour cohérence avec applyRestrictActionRules
        const resKey = getResourceKey(roleName, resource.code, extRes.code);
        const restrictedValuesSet = restrictedResourcesMap.get(resKey);
        
        if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
          return false;
        }
        
        // ✅ CORRECTION : Normaliser les valeurs pour la comparaison
        const normalizedValues = values.map(v => normalizeValue(v));
        // Toutes les valeurs normalisées doivent être dans le set pour que la ressource soit restreinte
        return normalizedValues.length > 0 && normalizedValues.every(v => restrictedValuesSet.has(v));
      });
    });
  } else {
    // ✅ NOUVEAU : Utiliser actionResourcesMap si resources non fourni
    actionResourcesMap.forEach((resource, mapKey) => {
      const [mapRoleName, mapActionCode, ] = mapKey.split('|');
      if (mapRoleName === roleName && mapActionCode === actionCode) {
        if (resource.code === 'S_TCODE') return;

        const hasResourceRestricted = resource.externalResources?.some((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          // ✅ CORRECTION : Passer les valeurs à getResourceKey pour cohérence avec applyRestrictActionRules
          const resKey = getResourceKey(roleName, resource.code, extRes.code);
          const restrictedValuesSet = restrictedResourcesMap.get(resKey);

          if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
            return false;
          }

          // ✅ CORRECTION : Normaliser les valeurs pour la comparaison
          const normalizedValues = values.map(v => normalizeValue(v));
          return normalizedValues.length > 0 && normalizedValues.every(v => restrictedValuesSet.has(v));
        });

        if (hasResourceRestricted) {
          indirectlyRestricted = true;
        }
      }
    });
  }
  
  const isRestricted = directlyRestricted || indirectlyRestricted;
  
  return {
    isRestricted,
    restrictedByAction: restriction?.restrictedByAction || false
  };
}

/**
 * Types d'actions supportées
 */
export type SodActionType = 'DELETE_ACTION' | 'RESTRICT_ACTION' | 'RESTRICT_RESOURCE' | 'EXCLUDE_ROLE';

/**
 * Paramètres pour la suppression d'action
 */
export interface DeleteActionParams {
  roleName: string;
  actionCode: string;
  resources: any[];
}

/**
 * Paramètres pour la restriction d'action
 */
export interface RestrictActionParams {
  roleName: string;
  actionCode: string;
  resources: any[];
}

/**
 * Paramètres pour la restriction de ressource
 */
export interface RestrictResourceParams {
  roleName: string;
  resourceCode: string;
  externalResourceCode: string;
  values: string[];
  /** Si fourni, force l'état au lieu de toggle (utilisé par "restreindre tout") */
  shouldRestrict?: boolean;
}

/**
 * Paramètres pour l'exclusion de rôle simple
 */
export interface ExcludeRoleParams {
  compositeRoleName: string;
  simpleRoleName: string;
}

/**
 * Fonction principale pour appliquer les règles de gestion SoD
 * 
 * @param session - Session SoD actuelle
 * @param action - Type d'action à appliquer
 * @param params - Paramètres de l'action
 * @returns Session mise à jour avec les règles appliquées
 */
export function applySodRulesToSession(
  session: SodAnalysisSession, 
  action: SodActionType,
  params: DeleteActionParams | RestrictActionParams | RestrictResourceParams | ExcludeRoleParams
): SodAnalysisSession {
  
  if (!session) {
    console.warn('⚠️ [SOD RULES] Session non trouvée');
    return session;
  }

  buildActionResourcesMap(session);

  let result: SodAnalysisSession;

  switch (action) {
    case 'DELETE_ACTION':
      result = applyDeleteActionRules(session, params as DeleteActionParams);
      break;
    case 'RESTRICT_ACTION':
      result = applyRestrictActionRules(session, params as RestrictActionParams);
      break;
    case 'RESTRICT_RESOURCE':
      result = applyRestrictResourceRules(session, params as RestrictResourceParams);
      break;
    case 'EXCLUDE_ROLE':
      result = applyExcludeRoleRules(session, params as ExcludeRoleParams);
      break;
    default:
      console.warn('⚠️ [SOD RULES] Action non supportée:', action);
      return session;
  }

  return result;
}

/**
 * Applique les règles de suppression d'action (avec TOGGLE)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 283-338
 * 
 * Règles appliquées :
 * - TOGGLE : Si action déjà supprimée → RESTAURER + DÉ-RESTREINDRE toutes les ressources
 * - SINON : SUPPRIMER + RESTREINDRE toutes les ressources (toutes valeurs)
 * - Propagation globale par rôle (via actionResourcesMap)
 * - États mutuellement exclusifs (isDeleted = true, isRestricted = false)
 */
function applyDeleteActionRules(session: SodAnalysisSession, params: DeleteActionParams): SodAnalysisSession {
  const { roleName, actionCode, resources } = params;
  
  // Delete action rules removed

  const key = getActionKey(roleName, actionCode);
  const isDeleted = deletedActionsMap.get(key);
  
  if (isDeleted) {
    // ♻️ RESTAURER l'action
    // Action restoration removed
    deletedActionsMap.delete(key);
    
    // ✅ Parcourir TOUTES les ressources de cette action dans la Map globale
    // et DÉ-RESTREINDRE toutes leurs valeurs
    let restoredCount = 0;
    actionResourcesMap.forEach((resource, mapKey) => {
      const [mapRoleName, mapActionCode, ] = mapKey.split('|');
      if (mapRoleName === roleName && mapActionCode === actionCode) {
        // Ignorer S_TCODE (ne doit jamais être restreinte)
        if (resource?.code === 'S_TCODE') {
          return;
        }
        // ✅ DÉLÉGATION : Utiliser forceResourceRestrictionState pour FORCER la dé-restriction
        // (pas de toggle, on force l'état selon l'intention de l'action parente)
        resource.externalResources?.forEach((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          forceResourceRestrictionState(roleName, resource.code, extRes.code, values, false);
          restoredCount++;
        });
      }
    });
    
    // Resources unrestricted removed
  } else {
    // 🗑️ SUPPRIMER l'action
    // Action deletion removed
    deletedActionsMap.set(key, true);
    restrictedActionsMap.delete(key);
    
    // ✅ Parcourir TOUTES les ressources de cette action dans la Map globale
    // et RESTREINDRE toutes leurs valeurs
    const restrictedResources: string[] = [];
    actionResourcesMap.forEach((resource, mapKey) => {
      const [mapRoleName, mapActionCode, ] = mapKey.split('|');
      if (mapRoleName === roleName && mapActionCode === actionCode) {
        // Ignorer S_TCODE (ne doit jamais être restreinte)
        if (resource?.code === 'S_TCODE') {
          return;
        }
        // ✅ DÉLÉGATION : Utiliser forceResourceRestrictionState pour FORCER la restriction
        // (pas de toggle, on force l'état selon l'intention de l'action parente)
        resource.externalResources?.forEach((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          forceResourceRestrictionState(roleName, resource.code, extRes.code, values, true);
          restrictedResources.push(`${resource.code}/${extRes.code}: [${values.join(', ')}]`);
        });
      }
    });
    
    // Resources restricted removed
  }

  // ✅ Appliquer les changements à la session
  const result = {
    ...session,
    simpleRoles: {
      ...session.simpleRoles,
      roles: session.simpleRoles.roles.map(role => {
        if (role.roleName === roleName) {
          const updatedRole = applyDeleteActionToRole(role, actionCode, isDeleted);
          // Simple role updated removed
          return updatedRole;
        }
        return role;
      })
    },
    compositeRoles: {
      ...session.compositeRoles,
      roles: session.compositeRoles.roles.map(role => {
        const updatedRole = applyDeleteActionToCompositeRole(role, roleName, actionCode, isDeleted);
        // Composite role updated removed
        return updatedRole;
      })
    }
  };

  // Session updated with delete action removed

  return result;
}

/**
 * Applique la suppression/restauration d'action à un rôle simple
 * ✅ LECTURE DEPUIS LES MAPS : L'état réel est dans deletedActionsMap et restrictedResourcesMap
 */
function applyDeleteActionToRole(role: SodSimpleRole, actionCode: string, wasDeleted?: boolean): SodSimpleRole {
  return {
    ...role,
    risks: role.risks.map(risk => ({
      ...risk,
      functions: risk.functions.map(func => ({
        ...func,
        // ✅ RECONSTRUIRE TOUTES LES ACTIONS (pas uniquement actionCode)
        // Règle de propagation : Si une ressource/valeur est restreinte dans un rôle,
        // elle est propagée à toutes les instances du rôle (quelque soit l'action)
        actions: func.actions.map(action => {
          // ✅ LIRE l'état depuis les Maps globales pour CHAQUE action
          const actionKey = getActionKey(role.roleName, action.code);
          const isActionDeleted = deletedActionsMap.get(actionKey) || false;
          
          // ✅ Mettre à jour les ressources en lisant depuis restrictedResourcesMap
          const updatedResources = action.resources.map(resource => {
            // Jamais de suppression de ressource en étape 1
            const isResourceDeleted = false;
            // Vérifier si cette ressource est restreinte dans les Maps globales
            let isResourceRestricted = false;
            
            resource.externalResources?.forEach((extRes: any) => {
              const values = extractExternalResourceValues(extRes);
              const resKey = getResourceKey(role.roleName, resource.code, extRes.code);
              const restrictedValuesSet = restrictedResourcesMap.get(resKey);
              
              if (restrictedValuesSet && restrictedValuesSet.size > 0) {
                // Toutes les valeurs doivent être dans le set
                if (values.length > 0 && values.every(v => restrictedValuesSet.has(v))) {
                  isResourceRestricted = true;
                }
              }
            });
            
            // S_TCODE ne doit jamais être restreinte
            if (resource.code === 'S_TCODE') {
              isResourceRestricted = false;
            }

            return {
              ...resource,
              isDeleted: isResourceDeleted,
              isRestricted: isResourceRestricted
            };
          });
          
          // ✅ Vérifier si l'action est restreinte (directe ou indirecte)
          const actionRestrictionState = isActionRestricted(role.roleName, action.code, updatedResources);
          
          return {
            ...action,
            isDeleted: isActionDeleted,
            // ✅ Exclusivité visuelle: si supprimée, ne pas marquer restreinte côté session
            isRestricted: isActionDeleted ? false : actionRestrictionState.isRestricted,
            restrictedByAction: actionRestrictionState.restrictedByAction,
            resources: updatedResources
          };
        })
      }))
    }))
  };
}

/**
 * Applique la suppression/restauration d'action à un rôle composite
 * ✅ LECTURE DEPUIS LES MAPS : L'état réel est dans deletedActionsMap et restrictedResourcesMap
 */
function applyDeleteActionToCompositeRole(role: SodCompositeRole, roleName: string, actionCode: string, wasDeleted?: boolean): SodCompositeRole {
  return {
    ...role,
    risks: role.risks.map(risk => ({
      ...risk,
      functions: risk.functions.map(func => ({
        ...func,
        simpleRoles: func.simpleRoles.map(simpleRole => {
          if (simpleRole.roleName === roleName) {
            return {
              ...simpleRole,
              // ✅ RECONSTRUIRE TOUTES LES ACTIONS (pas uniquement actionCode)
              // Règle de propagation : Si une ressource/valeur est restreinte dans un rôle,
              // elle est propagée à toutes les instances du rôle (quelque soit l'action)
              actions: simpleRole.actions.map(action => {
                // ✅ LIRE l'état depuis les Maps globales pour CHAQUE action
                const actionKey = getActionKey(simpleRole.roleName, action.code);
                const isActionDeleted = deletedActionsMap.get(actionKey) || false;
                
                // ✅ Mettre à jour les ressources en lisant depuis restrictedResourcesMap
                const updatedResources = action.resources.map(resource => {
                  // Jamais de suppression de ressource en étape 2 (la suppression se fait au niveau action)
                  const isResourceDeleted = false;
                  // Vérifier si cette ressource est restreinte dans les Maps globales
                  let isResourceRestricted = false;
                  
                  resource.externalResources?.forEach((extRes: any) => {
                    const values = extractExternalResourceValues(extRes);
                    const resKey = getResourceKey(simpleRole.roleName, resource.code, extRes.code);
                    const restrictedValuesSet = restrictedResourcesMap.get(resKey);
                    
                    if (restrictedValuesSet && restrictedValuesSet.size > 0) {
                      // Toutes les valeurs doivent être dans le set
                      if (values.length > 0 && values.every(v => restrictedValuesSet.has(v))) {
                        isResourceRestricted = true;
                      }
                    }
                  });
                  
                  // S_TCODE ne doit jamais être restreinte
                  if (resource.code === 'S_TCODE') {
                    isResourceRestricted = false;
                  }

                  return {
                    ...resource,
                    isDeleted: isResourceDeleted,
                    isRestricted: isResourceRestricted
                  };
                });
                
                // ✅ Vérifier si l'action est restreinte (directe ou indirecte)
                const actionRestrictionState = isActionRestricted(simpleRole.roleName, action.code, updatedResources);
                
                return {
                  ...action,
                  isDeleted: isActionDeleted,
                  // ✅ Exclusivité visuelle: si supprimée, ne pas marquer restreinte côté session
                  isRestricted: isActionDeleted ? false : actionRestrictionState.isRestricted,
                  restrictedByAction: actionRestrictionState.restrictedByAction,
                  resources: updatedResources
                };
              })
            };
          }
          return simpleRole;
        })
      }))
    }))
  };
}

/**
 * Applique les règles de restriction d'action (avec TOGGLE)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 467-546
 * 
 * Règles appliquées :
 * - TOGGLE : Si action déjà restreinte → DÉ-RESTREINDRE + retirer toutes les valeurs
 * - SINON : RESTREINDRE + ajouter toutes les valeurs non-S_TCODE
 * - PROPAGATION GLOBALE : Mettre à jour TOUTES les actions qui utilisent les ressources modifiées
 *   (exactement comme applyRestrictResourceRules ligne 977-987)
 * - États mutuellement exclusifs (isRestricted = true, isDeleted = false)
 * - S_TCODE immunisé contre la restriction
 */
function applyRestrictActionRules(session: SodAnalysisSession, params: RestrictActionParams): SodAnalysisSession {
  const { roleName, actionCode, resources } = params;
  

  const key = getActionKey(roleName, actionCode);
  
  // ✅ Vérifier restriction directe
  const actionDirectlyRestricted = restrictedActionsMap.get(key);
  
    // ✅ Vérifier restriction indirecte (via ressources)
    // ⚠️ IMPORTANT : Utiliser params.resources (instance cliquée) au lieu de actionResourcesMap (valeurs fusionnées)
    let hasRestrictedResource = false;
    
    
    if (resources && resources.length > 0) {
      resources.forEach((resource: any) => {
        if (resource.code === 'S_TCODE') return;

        // ✅ CORRECTION : Utiliser les valeurs DE L'INSTANCE CLIQUÉE (params.resources)
        const hasResourceRestricted = resource.externalResources?.some((extRes: any) => {
          // ✅ Utiliser les valeurs DE CETTE INSTANCE spécifique (celle qui a été cliquée)
          const values = extractExternalResourceValues(extRes);
          const resKey = getResourceKey(roleName, resource.code, extRes.code);
          const restrictedValuesSet = restrictedResourcesMap.get(resKey);
          
          const normalizedValues = values.map(v => normalizeValue(v));
          const isRestricted = restrictedValuesSet && restrictedValuesSet.size > 0 && values.length > 0 && normalizedValues.every(v => restrictedValuesSet.has(v));


          if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
            return false;
          }

          // Toutes les valeurs doivent être dans le set
          return values.length > 0 && normalizedValues.every(v => restrictedValuesSet.has(v));
        });

        if (hasResourceRestricted) {
          hasRestrictedResource = true;
        }
      });
    }
  
  // ✅ État final calculé
  const isCurrentlyRestricted = !!actionDirectlyRestricted || hasRestrictedResource;
  
  
  if (isCurrentlyRestricted) {
    // ✅ DÉ-RESTREINDRE
    
    // ✅ SUPPRIMÉ : Ne plus supprimer directement l'action de restrictedActionsMap
    // L'état de restriction sera déterminé par isActionRestricted basé sur les ressources
    
    // ✅ CORRECTION : Utiliser les ressources spécifiques de l'action cliquée
    // au lieu des ressources fusionnées de actionResourcesMap
    const resourcesToUnrestrict: string[] = [];
    
    if (resources && resources.length > 0) {
      resources.forEach((resource: any) => {
        // Ignorer S_TCODE (ne doit jamais être restreinte)
        if (resource?.code === 'S_TCODE') {
          return;
        }

        resource.externalResources?.forEach((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          
          
          // ✅ DÉLÉGATION : Utiliser forceResourceRestrictionState pour FORCER la dé-restriction
          // (pas de toggle, on force l'état selon l'intention de l'action parente)
          forceResourceRestrictionState(roleName, resource.code, extRes.code, values, false);
          
          resourcesToUnrestrict.push(`${resource.code}/${extRes.code}: [${values.join(', ')}]`);
        });
      });
    } else {
      console.warn('⚠️ [RESTRICT ACTION] Aucune ressource fournie pour l\'action', actionCode);
    }
      
  } else {
    // ✅ RESTREINDRE
    
    // ✅ SUPPRIMÉ : Ne plus ajouter directement l'action à restrictedActionsMap
    // L'état de restriction sera déterminé par isActionRestricted basé sur les ressources
    
    // Si on restreint, on retire la suppression
    const wasDeleted = deletedActionsMap.has(key);
    if (wasDeleted) {
      deletedActionsMap.delete(key);
      // Action restored removed
    }
    
    // ✅ CORRECTION : Utiliser les ressources spécifiques de l'action cliquée
    // au lieu des ressources fusionnées de actionResourcesMap
    const restrictedResources: string[] = [];
    
    if (resources && resources.length > 0) {
      resources.forEach((resource: any) => {
        // Ignorer S_TCODE (ne doit jamais être restreinte)
        if (resource?.code === 'S_TCODE') {
          return;
        }

        resource.externalResources?.forEach((extRes: any) => {
          const values = extractExternalResourceValues(extRes);
          
          
          // ✅ DÉLÉGATION : Utiliser forceResourceRestrictionState pour FORCER la restriction
          // (pas de toggle, on force l'état selon l'intention de l'action parente)
          forceResourceRestrictionState(roleName, resource.code, extRes.code, values, true);
          
          restrictedResources.push(`${resource.code}/${extRes.code}: [${values.join(', ')}]`);
        });
      });
    } else {
      console.warn('⚠️ [RESTRICT ACTION] Aucune ressource fournie pour l\'action', actionCode);
    }
      
  }
  
  // ✅ MISE À JOUR POST-MODIFICATION : Utiliser les ressources spécifiques
  // Collecter toutes les ressources modifiées depuis params.resources
  const modifiedResources = new Set<string>();
  
  if (resources && resources.length > 0) {
    resources.forEach((resource: any) => {
      if (resource.code !== 'S_TCODE') {
        modifiedResources.add(resource.code);
      }
    });
  }
  
  // Pour chaque ressource modifiée, mettre à jour TOUTES les actions qui l'utilisent
  const actionsToUpdate: string[] = [];
  modifiedResources.forEach(modifiedResourceCode => {
    actionResourcesMap.forEach((resource, mapKey) => {
      const [mapRoleName, mapActionCode, mapResourceCode] = mapKey.split('|');
      if (mapRoleName === roleName && mapResourceCode === modifiedResourceCode) {
        actionsToUpdate.push(`${mapRoleName}|${mapActionCode}`);
        updateActionRestrictionState(mapRoleName, mapActionCode);
      }
    });
  });
  
  // ✅ Appliquer les changements à la session
  
  const result = {
    ...session,
    simpleRoles: {
      ...session.simpleRoles,
      roles: session.simpleRoles.roles.map(role => {
        if (role.roleName === roleName) {
          const updatedRole = applyRestrictActionToRole(role, actionCode, isCurrentlyRestricted);
          return updatedRole;
        }
        return role;
      })
    },
    compositeRoles: {
      ...session.compositeRoles,
      roles: session.compositeRoles.roles.map(role => {
        const updatedRole = applyRestrictActionToCompositeRole(role, roleName, actionCode, isCurrentlyRestricted);
        return updatedRole;
      })
    }
  };


  return result;
}

/**
 * Applique la restriction/dé-restriction d'action à un rôle simple
 * ✅ LECTURE DEPUIS LES MAPS : L'état réel est dans restrictedActionsMap et restrictedResourcesMap
 */
function applyRestrictActionToRole(role: SodSimpleRole, actionCode: string, wasRestricted?: boolean): SodSimpleRole {
  
  return {
    ...role,
    risks: role.risks.map(risk => ({
      ...risk,
      functions: risk.functions.map(func => ({
        ...func,
        // ✅ RECONSTRUIRE TOUTES LES ACTIONS (pas uniquement actionCode)
        // Règle de propagation : Si une ressource/valeur est restreinte dans un rôle,
        // elle est propagée à toutes les instances du rôle (quelque soit l'action)
        actions: func.actions.map(action => {
          // ✅ LIRE l'état depuis les Maps globales pour CHAQUE action
          const actionKey = getActionKey(role.roleName, action.code);
          const isActionDeleted = deletedActionsMap.get(actionKey) || false;
          
          // ✅ Mettre à jour les ressources en lisant depuis restrictedResourcesMap
          const updatedResources = action.resources.map(resource => {
            // Vérifier si cette ressource est restreinte dans les Maps globales
            let isResourceRestricted = false;
            
            resource.externalResources?.forEach((extRes: any) => {
              const values = extractExternalResourceValues(extRes);
              const resKey = getResourceKey(role.roleName, resource.code, extRes.code);
              const restrictedValuesSet = restrictedResourcesMap.get(resKey);
              
              // ✅ CORRECTION : Normaliser les valeurs pour la comparaison
              const normalizedValues = values.map(v => normalizeValue(v));
              
              if (restrictedValuesSet && restrictedValuesSet.size > 0) {
                // Toutes les valeurs normalisées doivent être dans le set
                if (normalizedValues.length > 0 && normalizedValues.every(v => restrictedValuesSet.has(v))) {
                  isResourceRestricted = true;
                }
              }
            });
            
            return {
              ...resource,
              isDeleted: false,  // Les ressources ne sont jamais supprimées
              isRestricted: isResourceRestricted
            };
          });
          
          // ✅ Vérifier si l'action est restreinte (directe ou indirecte)
          const actionRestrictionState = isActionRestricted(role.roleName, action.code, updatedResources);
          
          return {
            ...action,
            isDeleted: isActionDeleted,
            isRestricted: actionRestrictionState.isRestricted,
            restrictedByAction: actionRestrictionState.restrictedByAction,
            resources: updatedResources
          };
        })
      }))
    }))
  };
}

/**
 * Applique la restriction/dé-restriction d'action à un rôle composite
 * ✅ LECTURE DEPUIS LES MAPS : L'état réel est dans restrictedActionsMap et restrictedResourcesMap
 */
function applyRestrictActionToCompositeRole(role: SodCompositeRole, roleName: string, actionCode: string, wasRestricted?: boolean): SodCompositeRole {
  return {
    ...role,
    risks: role.risks.map(risk => ({
      ...risk,
      functions: risk.functions.map(func => ({
        ...func,
        simpleRoles: func.simpleRoles.map(simpleRole => {
          if (simpleRole.roleName === roleName) {
            return {
              ...simpleRole,
              // ✅ RECONSTRUIRE TOUTES LES ACTIONS (pas uniquement actionCode)
              // Règle de propagation : Si une ressource/valeur est restreinte dans un rôle,
              // elle est propagée à toutes les instances du rôle (quelque soit l'action)
              actions: simpleRole.actions.map(action => {
                // ✅ LIRE l'état depuis les Maps globales pour CHAQUE action
                const actionKey = getActionKey(simpleRole.roleName, action.code);
                const isActionDeleted = deletedActionsMap.get(actionKey) || false;
                
                // ✅ Mettre à jour les ressources en lisant depuis restrictedResourcesMap
                const updatedResources = action.resources.map(resource => {
                  // Vérifier si cette ressource est restreinte dans les Maps globales
                  let isResourceRestricted = false;
                  
                  resource.externalResources?.forEach((extRes: any) => {
                    const values = extractExternalResourceValues(extRes);
                    const resKey = getResourceKey(simpleRole.roleName, resource.code, extRes.code);
                    const restrictedValuesSet = restrictedResourcesMap.get(resKey);
                    
                    // ✅ CORRECTION : Normaliser les valeurs pour la comparaison
                    const normalizedValues = values.map(v => normalizeValue(v));
                    
                    if (restrictedValuesSet && restrictedValuesSet.size > 0) {
                      // Toutes les valeurs normalisées doivent être dans le set
                      if (normalizedValues.length > 0 && normalizedValues.every(v => restrictedValuesSet.has(v))) {
                        isResourceRestricted = true;
                      }
                    }
                  });
                  
                  return {
                    ...resource,
                    isDeleted: false,  // Les ressources ne sont jamais supprimées
                    isRestricted: isResourceRestricted
                  };
                });
                
                // ✅ Vérifier si l'action est restreinte (directe ou indirecte)
                const actionRestrictionState = isActionRestricted(simpleRole.roleName, action.code, updatedResources);
                
                return {
                  ...action,
                  isDeleted: isActionDeleted,
                  isRestricted: actionRestrictionState.isRestricted,
                  restrictedByAction: actionRestrictionState.restrictedByAction,
                  resources: updatedResources
                };
              })
            };
          }
          return simpleRole;
        })
      }))
    }))
  };
}

/**
 * Applique les règles de restriction de ressource
 * 
 * Règles appliquées :
 * - Si shouldRestrict est fourni : FORCE l'état (pas de toggle) - utilisé par "restreindre tout"
 * - Sinon : TOGGLE l'état (comportement par défaut)
 * - Propagation Valeur → Ressource : Si toutes les valeurs d'une ressource sont restreintes, la ressource l'est aussi
 * - Propagation Ressource → Action : Si au moins une ressource est restreinte, l'action l'est aussi
 * - Nettoyage automatique : Si une des valeurs de la ressource n'est plus restreinte, la ressource n'est plus restreinte
 */
function applyRestrictResourceRules(session: SodAnalysisSession, params: RestrictResourceParams): SodAnalysisSession {
  const { roleName, resourceCode, externalResourceCode, values, shouldRestrict } = params;
  
  // ✅ ÉTAPE 1 : Appliquer la restriction dans les Maps globales
  if (shouldRestrict !== undefined) {
    // Mode FORCE : utilisé par "restreindre tout"
    forceResourceRestrictionState(roleName, resourceCode, externalResourceCode, values, shouldRestrict);
  } else {
    // Mode TOGGLE : comportement par défaut (clic individuel)
    applyResourceRestriction(roleName, resourceCode, externalResourceCode, values);
  }

  // ✅ ÉTAPE 1.5 : NETTOYER LES ACTIONS PARENTES
  // Après modification de restrictedResourcesMap, nettoyer toutes les actions 
  // qui pourraient être affectées par cette modification de ressource
  const actionsUpdated: string[] = [];
  actionResourcesMap.forEach((resource, mapKey) => {
    const [mapRoleName, mapActionCode, mapResourceCode] = mapKey.split('|');
    if (mapRoleName === roleName && mapResourceCode === resourceCode) {
      actionsUpdated.push(`${mapRoleName}|${mapActionCode}`);
      updateActionRestrictionState(mapRoleName, mapActionCode);
    }
  });

  
  // ✅ ÉTAPE 2 : Mettre à jour la session avec les états calculés depuis les Maps
  const result = {
    ...session,
    simpleRoles: {
      ...session.simpleRoles,
      roles: session.simpleRoles.roles.map(role => {
        if (role.roleName === roleName) {
          return applyRestrictResourceToRole(role, params);
        }
        return role;
      })
    },
    compositeRoles: {
      ...session.compositeRoles,
      roles: session.compositeRoles.roles.map(role => {
        return applyRestrictResourceToCompositeRole(role, roleName, params);
      })
    }
  };


  return result;
}

/**
 * Applique les règles d'exclusion de rôle simple (avec TOGGLE)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 576-591
 * 
 * RÈGLE MÉTIER :
 * - Si déjà exclu → DÉ-EXCLURE (supprimer de excludedSimpleRolesMap)
 * - Si non exclu → EXCLURE (ajouter à excludedSimpleRolesMap)
 * 
 * @param session - Session SoD actuelle
 * @param params - Paramètres de l'exclusion
 * @returns Session avec isExcluded mis à jour
 */
function applyExcludeRoleRules(
  session: SodAnalysisSession,
  params: ExcludeRoleParams
): SodAnalysisSession {
  const { compositeRoleName, simpleRoleName } = params;
  
  // ✅ ÉTAPE 1 : TOGGLE dans la Map globale
  const key = getExcludedRoleKey(compositeRoleName, simpleRoleName);
  const isCurrentlyExcluded = excludedSimpleRolesMap.get(key) || false;
  
  if (isCurrentlyExcluded) {
    excludedSimpleRolesMap.delete(key);
  } else {
    excludedSimpleRolesMap.set(key, true);
  }
  
  // ✅ ÉTAPE 2 : Reconstruire la session pour mettre à jour isExcluded
  const result = {
    ...session,
    compositeRoles: {
      ...session.compositeRoles,
      roles: session.compositeRoles.roles.map(role => {
        if (role.roleName !== compositeRoleName) {
          return role;
        }
        
        // Mettre à jour le rôle composite concerné
        return {
          ...role,
          risks: role.risks.map(risk => ({
            ...risk,
            functions: risk.functions.map(func => ({
              ...func,
              simpleRoles: func.simpleRoles.map(sr => {
                if (sr.roleName !== simpleRoleName) {
                  return sr;
                }
                
                // Mettre à jour isExcluded depuis la Map
                const newIsExcluded = excludedSimpleRolesMap.get(key) || false;
                return {
                  ...sr,
                  isExcluded: newIsExcluded
                };
              })
            }))
          }))
        };
      })
    }
  };
  
  return result;
}

/**
 * Applique la restriction de ressource à un rôle simple
 */
function applyRestrictResourceToRole(role: SodSimpleRole, params: RestrictResourceParams): SodSimpleRole {
  const { resourceCode, externalResourceCode, values } = params;
  
  return {
    ...role,
    risks: role.risks.map(risk => ({
      ...risk,
      functions: risk.functions.map(func => ({
        ...func,
        actions: func.actions.map(action => 
          applyRestrictResourceToAction({ ...action, roleName: role.roleName }, resourceCode, externalResourceCode, values)
        )
      }))
    }))
  };
}

/**
 * Applique la restriction de ressource à un rôle composite
 */
function applyRestrictResourceToCompositeRole(role: SodCompositeRole, roleName: string, params: RestrictResourceParams): SodCompositeRole {
  const { resourceCode, externalResourceCode, values } = params;
  
  return {
    ...role,
    risks: role.risks.map(risk => ({
      ...risk,
      functions: risk.functions.map(func => ({
        ...func,
        simpleRoles: func.simpleRoles.map(simpleRole => {
          if (simpleRole.roleName === roleName) {
            return {
              ...simpleRole,
              actions: simpleRole.actions.map(action => 
                applyRestrictResourceToAction({ ...action, roleName: roleName }, resourceCode, externalResourceCode, values)
              )
            };
          }
          return simpleRole;
        })
      }))
    }))
  };
}

/**
 * Applique la restriction de ressource à une action
 * 
 * Logique métier :
 * 1. Utiliser les Maps globales pour déterminer l'état des ressources
 * 2. Recalculer resource.isRestricted basé sur les valeurs dans les Maps
 * 3. Recalculer action.isRestricted basé sur les ressources restreintes
 */
function applyRestrictResourceToAction(
  action: SodAction | any,
  resourceCode: string,
  externalResourceCode: string,
  valuesToRestrict: string[]
): SodAction | any {
  // Mapper les ressources en appliquant la restriction
  const updatedResources = action.resources.map((resource: SodResource) => {
    if (resource.code !== resourceCode) {
      return resource; // Ressource non concernée
    }
    
    // ✅ NOUVELLE LOGIQUE : Utiliser les Maps globales pour déterminer l'état
    const isResourceRestricted = resource.externalResources.some((extRes: SodExternalResource) => {
      if (extRes.code !== externalResourceCode) {
        return false;
      }
      
      const values = extractExternalResourceValues(extRes);
      // ✅ CORRECTION : Utiliser les valeurs dans la clé pour cohérence avec applyResourceRestriction
      const key = getResourceKey(action.roleName || 'unknown', resource.code, extRes.code);
      const restrictedValuesSet = restrictedResourcesMap.get(key);
      
      if (!restrictedValuesSet || restrictedValuesSet.size === 0) {
        return false;
      }
      
      // Toutes les valeurs doivent être dans le set
      return values.length > 0 && values.every(v => restrictedValuesSet.has(v));
    });
    
    return {
      ...resource,
      isRestricted: isResourceRestricted
    };
  });
  
  // ✅ Recalcule l'état de l'action à partir des Maps (direct + propagation)
  const actionRestrictionState = isActionRestricted(
    action.roleName || 'unknown',
    action.code,
    updatedResources
  );

  // ✅ Lire l'état de suppression depuis les Maps (ne jamais l'écraser côté ressource)
  const isActionDeleted = !!deletedActionsMap.get(
    getActionKey(action.roleName || 'unknown', action.code)
  );
  
  return {
    ...action,
    resources: updatedResources,
    // Exclusivité: si supprimée, elle n'est pas restreinte visuellement
    isRestricted: isActionDeleted ? false : actionRestrictionState.isRestricted,
    restrictedByAction: actionRestrictionState.restrictedByAction,
    isDeleted: isActionDeleted
  };
}

/**
 * Utilitaires pour extraire l'état des actions depuis la session
 */
export function extractActionState(session: SodAnalysisSession, roleName: string, actionCode: string) {
  // TODO: Implémenter l'extraction de l'état d'action
  return {
    isDeleted: false,
    isRestricted: false,
    restrictedByAction: false
  };
}

/**
 * Utilitaires pour extraire l'état des rôles depuis la session
 */
export function extractRoleState(session: SodAnalysisSession, roleName: string) {
  // TODO: Implémenter l'extraction de l'état de rôle
  return {
    isDeleted: false,
    isRestricted: false
  };
}

// ============================================
// FONCTIONS DE CALCUL DE REMÉDIATION
// ============================================

/**
 * Calcule si une fonction est remediée (RÔLES SIMPLES)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 688-795
 * 
 * RÈGLE MÉTIER :
 * - Fonction remediée si AU MOINS UNE condition est vraie :
 *   1. Toutes les actions supprimables sont supprimées
 *   OU
 *   2. Toutes les actions restrainables sont restreintes
 * 
 * @param roleName - Nom du rôle simple
 * @param actions - Liste des actions de la fonction
 * @returns Statut de remédiation avec compteurs
 */
export function calculateFunctionRemediation(
  roleName: string,
  actions: any[]
): {
  isRemediated: boolean;
  totalActions: number;
  remediatedActions: number;
} {
  console.log(`🔍 [REMEDIATION FUNCTION] === DÉBUT ===`);
  console.log(`🔍 [REMEDIATION FUNCTION] roleName:`, roleName);
  console.log(`🔍 [REMEDIATION FUNCTION] actions count:`, actions.length);
  console.log(`🔍 [REMEDIATION FUNCTION] Maps globales:`, {
    deletedActionsCount: deletedActionsMap.size,
    restrictedActionsCount: restrictedActionsMap.size,
    restrictedResourcesCount: restrictedResourcesMap.size
  });
  
  let suppressableCount = 0;
  let suppressedCount = 0;
  let restrainableCount = 0;
  let restrictedCount = 0;
  
  actions.forEach(action => {
    console.log(`🔍 [REMEDIATION FUNCTION] Analyse action:`, action.code);
    const hasTCode = action.resources?.some((r: any) => r.code === 'S_TCODE') || false;
    const hasOtherResources = action.resources?.some((r: any) => r.code !== 'S_TCODE') || false;
    
    console.log(`🔍 [REMEDIATION FUNCTION] Action ${action.code}:`, { hasTCode, hasOtherResources });
    
    // Ignorer les actions sans ressources valides
    if (!hasTCode && !hasOtherResources) {
      console.log(`🔍 [REMEDIATION FUNCTION] Action ${action.code} ignorée (pas de ressources)`);
      return;
    }
    
    const actionKey = getActionKey(roleName, action.code);
    const isDeleted = deletedActionsMap.get(actionKey) || false;
    const restriction = restrictedActionsMap.get(actionKey);
    const isActionDirectlyRestricted = !!restriction;
    
    console.log(`🔍 [REMEDIATION FUNCTION] Action ${action.code} - États:`, {
      actionKey,
      isDeleted,
      isActionDirectlyRestricted
    });
    
    // Vérifier si au moins une ressource non-S_TCODE est restreinte
    let hasRestrictedResource = false;
    if (hasOtherResources && action.resources && Array.isArray(action.resources)) {
      for (const resource of action.resources) {
        if (resource.code === 'S_TCODE') continue;
        
        if (resource.externalResources && Array.isArray(resource.externalResources)) {
          for (const extRes of resource.externalResources) {
            const values = extractExternalResourceValues(extRes);
            const resKey = getResourceKey(roleName, resource.code, extRes.code);
            const restrictedValuesSet = restrictedResourcesMap.get(resKey);
            
            if (restrictedValuesSet && restrictedValuesSet.size > 0) {
              const allValuesRestricted = values.length > 0 && values.every(v => restrictedValuesSet.has(v));
              if (allValuesRestricted) {
                hasRestrictedResource = true;
                break;
              }
            }
          }
        }
        
        if (hasRestrictedResource) break;
      }
    }
    
    const isRestricted = isActionDirectlyRestricted || hasRestrictedResource;
    
    console.log(`🔍 [REMEDIATION FUNCTION] Action ${action.code} - Restriction:`, {
      hasRestrictedResource,
      isRestricted
    });
    
    // Compter les actions supprimables et restrainables
    if (hasTCode) {
      suppressableCount++;
      if (isDeleted) {
        suppressedCount++;
      }
    }
    
    if (hasOtherResources) {
      restrainableCount++;
      if (isRestricted) {
        restrictedCount++;
      }
    }
  });
  
  console.log(`🔍 [REMEDIATION FUNCTION] Compteurs:`, {
    suppressableCount,
    suppressedCount,
    restrainableCount,
    restrictedCount
  });
  
  // Fonction remediée si AU MOINS UNE condition est vraie
  const allSuppressablesSuppressed = suppressableCount > 0 && suppressedCount === suppressableCount;
  const allRestrainablesRestricted = restrainableCount > 0 && restrictedCount === restrainableCount;
  
  const isRemediated = allSuppressablesSuppressed || allRestrainablesRestricted;
  
  console.log(`🔍 [REMEDIATION FUNCTION] Résultat:`, {
    allSuppressablesSuppressed,
    allRestrainablesRestricted,
    isRemediated
  });
  console.log(`🔍 [REMEDIATION FUNCTION] === FIN ===`);
  
  const totalRemediable = Math.max(suppressableCount, restrainableCount);
  const totalRemediated = Math.max(suppressedCount, restrictedCount);
  
  return {
    isRemediated,
    totalActions: totalRemediable,
    remediatedActions: totalRemediated
  };
}

/**
 * Calcule si un risque est remedié (RÔLES SIMPLES)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 801-824
 * 
 * RÈGLE MÉTIER :
 * - Un risque est remedié si AU MOINS UNE de ses fonctions est remediée
 * 
 * @param roleName - Nom du rôle simple
 * @param functions - Liste des fonctions du risque
 * @returns Statut de remédiation avec compteurs et pourcentage
 */
export function calculateRiskRemediation(
  roleName: string,
  functions: any[]
): {
  isRemediated: boolean;
  totalFunctions: number;
  remediatedFunctions: number;
  remediationPercentage: number;
} {
  console.log(`🔍 [REMEDIATION RISK] === DÉBUT ===`);
  console.log(`🔍 [REMEDIATION RISK] roleName:`, roleName);
  console.log(`🔍 [REMEDIATION RISK] functions count:`, functions.length);
  
  let remediatedFunctions = 0;
  
  functions.forEach(func => {
    const funcStatus = calculateFunctionRemediation(roleName, func.actions);
    console.log(`🔍 [REMEDIATION RISK] Fonction ${func.code}:`, funcStatus);
    if (funcStatus.isRemediated) {
      remediatedFunctions++;
    }
  });
  
  const totalFunctions = functions.length;
  const isRemediated = remediatedFunctions > 0;
  
  console.log(`🔍 [REMEDIATION RISK] Résultat:`, {
    totalFunctions,
    remediatedFunctions,
    isRemediated
  });
  console.log(`🔍 [REMEDIATION RISK] === FIN ===`);
  
  return {
    isRemediated,
    totalFunctions,
    remediatedFunctions,
    remediationPercentage: totalFunctions > 0 
      ? Math.round((remediatedFunctions / totalFunctions) * 100) 
      : 0
  };
}

/**
 * Calcule si un rôle simple est remedié
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 830-853
 * 
 * RÈGLE MÉTIER :
 * - Un rôle est remedié si TOUS ses risques sont remediés
 * 
 * @param roleName - Nom du rôle simple
 * @param risks - Liste des risques du rôle
 * @returns Statut de remédiation avec compteurs et pourcentage
 */
export function calculateRoleRemediation(
  roleName: string,
  risks: any[]
): {
  isRemediated: boolean;
  totalRisks: number;
  remediatedRisks: number;
  remediationPercentage: number;
} {
  let remediatedRisks = 0;
  
  risks.forEach(risk => {
    const riskStatus = calculateRiskRemediation(roleName, risk.functions);
    if (riskStatus.isRemediated) {
      remediatedRisks++;
    }
  });
  
  const totalRisks = risks.length;
  
  return {
    isRemediated: remediatedRisks === totalRisks && totalRisks > 0,
    totalRisks,
    remediatedRisks,
    remediationPercentage: totalRisks > 0 
      ? Math.round((remediatedRisks / totalRisks) * 100) 
      : 0
  };
}

/**
 * Calcule si une fonction composite est remediée (RÔLES COMPOSITES)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 877-1016
 * 
 * RÈGLE MÉTIER :
 * - Agrège TOUTES les actions de TOUS les rôles simples NON EXCLUS
 * - Fonction remediée si AU MOINS UNE condition est vraie :
 *   1. Toutes les actions supprimables sont supprimées
 *   OU
 *   2. Toutes les actions restrainables sont restreintes
 * 
 * @param compositeRoleName - Nom du rôle composite
 * @param func - Fonction composite (contient plusieurs rôles simples)
 * @returns Statut de remédiation avec compteurs
 */
export function calculateCompositeFunctionRemediation(
  compositeRoleName: string,
  func: any
): {
  isRemediated: boolean;
  totalSimpleRoles: number;
  remediatedSimpleRoles: number;
} {
  if (!func.simpleRoles || func.simpleRoles.length === 0) {
    return {
      isRemediated: false,
      totalSimpleRoles: 0,
      remediatedSimpleRoles: 0
    };
  }
  
  // ÉTAPE 1 : Agréger toutes les actions de tous les rôles simples NON EXCLUS
  const allActions: any[] = [];
  let totalSimpleRoles = 0;
  
  func.simpleRoles.forEach((simpleRole: any) => {
    // Ignorer les rôles simples exclus
    const isExcluded = isSimpleRoleExcluded(compositeRoleName, simpleRole.roleName);
    if (isExcluded) {
      return;
    }
    
    totalSimpleRoles++;
    
    // Ajouter toutes les actions avec leur sourceRoleName
    if (simpleRole.actions && simpleRole.actions.length > 0) {
      simpleRole.actions.forEach((action: any) => {
        allActions.push({
          ...action,
          sourceRoleName: simpleRole.roleName
        });
      });
    }
  });

  if (allActions.length === 0) {
    return {
      isRemediated: false,
      totalSimpleRoles,
      remediatedSimpleRoles: 0
    };
  }
  
  // ÉTAPE 2 : Analyser chaque action agrégée
  let suppressableCount = 0;
  let suppressedCount = 0;
  let restrainableCount = 0;
  let restrictedCount = 0;
  
  allActions.forEach(action => {
    const sourceRoleName = action.sourceRoleName || '';
    const actionKey = getActionKey(sourceRoleName, action.code || '');
    const isDeleted = deletedActionsMap.get(actionKey) || false;
    
    const resources = action.resources || [];
    const hasTCode = resources.some((r: any) => r.code === 'S_TCODE');
    const hasOtherResources = resources.some((r: any) => r.code !== 'S_TCODE');
    
    if (!hasTCode && !hasOtherResources) {
      return;
    }
    
    const restriction = restrictedActionsMap.get(actionKey);
    const isActionDirectlyRestricted = !!restriction;
    
    // Vérifier si au moins une ressource non-S_TCODE est restreinte
    let hasRestrictedResource = false;
    if (hasOtherResources && resources && Array.isArray(resources)) {
      for (const resource of resources) {
        if (resource.code === 'S_TCODE') continue;
        
        if (resource.externalResources && Array.isArray(resource.externalResources)) {
          for (const extRes of resource.externalResources) {
            const values = extractExternalResourceValues(extRes);
            const resKey = getResourceKey(sourceRoleName, resource.code, extRes.code);
            const restrictedValuesSet = restrictedResourcesMap.get(resKey);
            
            if (restrictedValuesSet && restrictedValuesSet.size > 0) {
              const allValuesRestricted = values.length > 0 && values.every(v => restrictedValuesSet.has(v));
              if (allValuesRestricted) {
                hasRestrictedResource = true;
                break;
              }
            }
          }
        }
        
        if (hasRestrictedResource) break;
      }
    }
    
    const isRestricted = isActionDirectlyRestricted || hasRestrictedResource;
    
    // Compter
    if (hasTCode) {
      suppressableCount++;
      if (isDeleted) {
        suppressedCount++;
      }
    }
    
    if (hasOtherResources) {
      restrainableCount++;
      if (isRestricted) {
        restrictedCount++;
      }
    }
  });
  
  // ÉTAPE 3 : Déterminer si la fonction est remediée
  const allSuppressablesSuppressed = suppressableCount > 0 && suppressedCount === suppressableCount;
  const allRestrainablesRestricted = restrainableCount > 0 && restrictedCount === restrainableCount;
  const isRemediated = allSuppressablesSuppressed || allRestrainablesRestricted;
  
  return {
    isRemediated,
    totalSimpleRoles,
    remediatedSimpleRoles: isRemediated ? totalSimpleRoles : 0
  };
}

/**
 * Calcule si un risque composite est remedié (RÔLES COMPOSITES)
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 1030-1078
 * 
 * RÈGLE MÉTIER :
 * - Un risque est remedié si AU MOINS UNE de ses fonctions est remediée
 * 
 * @param compositeRoleName - Nom du rôle composite
 * @param functions - Liste des fonctions du risque
 * @returns Statut de remédiation avec compteurs et pourcentage
 */
export function calculateCompositeRiskRemediation(
  compositeRoleName: string,
  functions: any[]
): {
  isRemediated: boolean;
  totalFunctions: number;
  remediatedFunctions: number;
  remediationPercentage: number;
} {
  if (!functions || functions.length === 0) {
    return {
      isRemediated: false,
      totalFunctions: 0,
      remediatedFunctions: 0,
      remediationPercentage: 0
    };
  }
  
  let remediatedFunctions = 0;
  
  functions.forEach(func => {
    const funcStatus = calculateCompositeFunctionRemediation(compositeRoleName, func);
    if (funcStatus.isRemediated) {
      remediatedFunctions++;
    }
  });
  
  const totalFunctions = functions.length;
  const remediationPercentage = totalFunctions > 0
    ? Math.round((remediatedFunctions / totalFunctions) * 100)
    : 0;
  const isRemediated = remediatedFunctions > 0;

  return {
    isRemediated,
    totalFunctions,
    remediatedFunctions,
    remediationPercentage
  };
}

/**
 * Calcule si un rôle composite est remedié
 * ✅ RÉPLIQUÉE du SodActionsContext ligne 1092-1141
 * 
 * RÈGLE MÉTIER :
 * - Un rôle est remedié si TOUS ses risques sont remediés
 * 
 * @param compositeRoleName - Nom du rôle composite
 * @param risks - Liste des risques du rôle
 * @returns Statut de remédiation avec compteurs et pourcentage
 */
export function calculateCompositeRoleRemediation(
  compositeRoleName: string,
  risks: any[]
): {
  isRemediated: boolean;
  totalRisks: number;
  remediatedRisks: number;
  remediationPercentage: number;
} {
  if (!risks || risks.length === 0) {
    return {
      isRemediated: false,
      totalRisks: 0,
      remediatedRisks: 0,
      remediationPercentage: 0
    };
  }
  
  let remediatedRisks = 0;
  
  risks.forEach(risk => {
    const riskStatus = calculateCompositeRiskRemediation(compositeRoleName, risk.functions || []);
    if (riskStatus.isRemediated) {
      remediatedRisks++;
    }
  });
  
  const totalRisks = risks.length;
  const remediationPercentage = totalRisks > 0
    ? Math.round((remediatedRisks / totalRisks) * 100)
    : 0;
  const isRemediated = remediatedRisks === totalRisks && totalRisks > 0;

  return {
    isRemediated,
    totalRisks,
    remediatedRisks,
    remediationPercentage
  };
}
