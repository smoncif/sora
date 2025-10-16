/**
 * Utilitaires pour appliquer les règles de gestion SoD directement dans TanStack Query
 * 
 * Ce fichier contient les fonctions qui appliquent les règles de gestion existantes
 * directement dans les données de session TanStack Query, évitant la double gestion d'état.
 */

import type { SodAnalysisSession, SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';

/**
 * Types d'actions supportées
 */
export type SodActionType = 'DELETE_ACTION' | 'RESTRICT_ACTION' | 'RESTRICT_RESOURCE';

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
  params: DeleteActionParams | RestrictActionParams | RestrictResourceParams
): SodAnalysisSession {
  
  if (!session) {
    console.warn('⚠️ [SOD RULES] Session non trouvée');
    return session;
  }

  console.log('🔧 [SOD RULES] Application des règles:', { action, params });

  switch (action) {
    case 'DELETE_ACTION':
      return applyDeleteActionRules(session, params as DeleteActionParams);
    case 'RESTRICT_ACTION':
      return applyRestrictActionRules(session, params as RestrictActionParams);
    case 'RESTRICT_RESOURCE':
      return applyRestrictResourceRules(session, params as RestrictResourceParams);
    default:
      console.warn('⚠️ [SOD RULES] Action non supportée:', action);
      return session;
  }
}

/**
 * Applique les règles de suppression d'action
 * 
 * Règles appliquées :
 * - Propagation globale par rôle (si une action est supprimée dans un rôle, elle l'est partout)
 * - États mutuellement exclusifs (isDeleted = true, isRestricted = false)
 * - Propagation aux ressources (toutes les ressources sont marquées comme supprimées)
 */
function applyDeleteActionRules(session: SodAnalysisSession, params: DeleteActionParams): SodAnalysisSession {
  const { roleName, actionCode, resources } = params;
  
  console.log('🗑️ [SOD RULES] Suppression d\'action:', { roleName, actionCode });

  return {
    ...session,
    simpleRoles: {
      ...session.simpleRoles,
      roles: session.simpleRoles.roles.map(role => {
        if (role.roleName === roleName) {
          return applyDeleteActionToRole(role, actionCode);
        }
        return role;
      })
    },
    compositeRoles: {
      ...session.compositeRoles,
      roles: session.compositeRoles.roles.map(role => {
        return applyDeleteActionToCompositeRole(role, roleName, actionCode);
      })
    }
  };
}

/**
 * Applique la suppression d'action à un rôle simple
 */
function applyDeleteActionToRole(role: SodSimpleRole, actionCode: string): SodSimpleRole {
  return {
    ...role,
    risks: role.risks.map(risk => ({
      ...risk,
      functions: risk.functions.map(func => ({
        ...func,
        actions: func.actions.map(action => {
          if (action.code === actionCode) {
            console.log('✅ [SOD RULES] Action supprimée:', actionCode);
            return {
              ...action,
              isDeleted: true,
              isRestricted: false, // États mutuellement exclusifs
              resources: action.resources.map(resource => ({
                ...resource,
                isDeleted: true,
                isRestricted: false
              }))
            };
          }
          return action;
        })
      }))
    }))
  };
}

/**
 * Applique la suppression d'action à un rôle composite
 */
function applyDeleteActionToCompositeRole(role: SodCompositeRole, roleName: string, actionCode: string): SodCompositeRole {
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
              actions: simpleRole.actions.map(action => {
                if (action.code === actionCode) {
                  console.log('✅ [SOD RULES] Action supprimée dans rôle composite:', actionCode);
                  return {
                    ...action,
                    isDeleted: true,
                    isRestricted: false,
                    resources: action.resources.map(resource => ({
                      ...resource,
                      isDeleted: true,
                      isRestricted: false
                    }))
                  };
                }
                return action;
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
 * Applique les règles de restriction d'action
 * 
 * Règles appliquées :
 * - Propagation par valeurs (sous-ensembles automatiquement restreints)
 * - États mutuellement exclusifs (isRestricted = true, isDeleted = false)
 * - S_TCODE immunisé contre la restriction
 */
function applyRestrictActionRules(session: SodAnalysisSession, params: RestrictActionParams): SodAnalysisSession {
  const { roleName, actionCode, resources } = params;
  
  console.log('🚫 [SOD RULES] Restriction d\'action:', { roleName, actionCode });
  
  // TODO: Implémenter la logique de restriction d'action
  // Pour l'instant, retourner la session inchangée
  console.log('⚠️ [SOD RULES] Restriction d\'action non encore implémentée');
  return session;
}

/**
 * Applique les règles de restriction de ressource
 * 
 * Règles appliquées :
 * - Propagation ressource → action parente
 * - Nettoyage automatique si plus de ressources restreintes
 * - Propagation par valeurs (sous-ensembles)
 */
function applyRestrictResourceRules(session: SodAnalysisSession, params: RestrictResourceParams): SodAnalysisSession {
  const { roleName, resourceCode, externalResourceCode, values } = params;
  
  console.log('🔒 [SOD RULES] Restriction de ressource:', { roleName, resourceCode, externalResourceCode, values });
  
  // TODO: Implémenter la logique de restriction de ressource
  // Pour l'instant, retourner la session inchangée
  console.log('⚠️ [SOD RULES] Restriction de ressource non encore implémentée');
  return session;
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
