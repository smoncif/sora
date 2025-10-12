/**
 * Service de remédiation automatique SOD
 * Implémente l'algorithme de remédiation avec hiérarchie de priorité
 */

import type { 
  SodSimpleRole, 
  SodCompositeRole, 
  SodAction,
  SodResource 
} from 'lib/types/sodAnalysis';

/**
 * Plan de remédiation généré automatiquement
 */
export interface RemediationPlan {
  // Actions triées par ordre de priorité (impact croissant)
  resourceRestrictions: ResourceRestriction[];
  actionRestrictions: ActionRestriction[];
  roleRestrictions: RoleRestriction[];
  actionDeletions: ActionDeletion[];
  roleDeletions: RoleDeletion[];
  
  // Métriques
  totalModifications: number;
  estimatedImpact: 'minimal' | 'modéré' | 'important' | 'critique';
  risksRemediated: number;
  rolesAffected: number;
}

export interface ResourceRestriction {
  roleName: string;
  actionCode: string;
  resourceCode: string;
  externalResourceCode: string;
  values: string[];
  impact: number; // Score d'impact
  reason: string; // Explication
}

export interface ActionRestriction {
  roleName: string;
  actionCode: string;
  resources: SodResource[];
  impact: number;
  reason: string;
}

export interface RoleRestriction {
  roleName: string;
  impact: number;
  reason: string;
}

export interface ActionDeletion {
  roleName: string;
  actionCode: string;
  resources: SodResource[];
  impact: number;
  reason: string;
}

export interface RoleDeletion {
  roleName: string;
  impact: number;
  reason: string;
}

/**
 * Configuration pour la remédiation automatique
 */
export interface RemediationConfig {
  enableUsageAnalysis: boolean;
  maxModifications?: number;
  priorityThreshold?: number;
}

/**
 * Calcule le score d'impact d'une modification
 */
function calculateImpactScore(
  type: 'resource' | 'action' | 'role',
  operation: 'restrict' | 'delete'
): number {
  const baseScores = {
    resource: { restrict: 1, delete: 0 },
    action: { restrict: 5, delete: 50 },
    role: { restrict: 20, delete: 200 }
  };
  
  return baseScores[type][operation];
}

/**
 * Vérifie si une fonction est remédiée
 */
function isFunctionRemediated(actions: SodAction[]): boolean {
  let suppressableCount = 0;
  let suppressedCount = 0;
  let restrainableCount = 0;
  let restrictedCount = 0;
  
  actions.forEach(action => {
    // Vérifier si l'action contient S_TCODE (supprimable)
    const hasTCode = action.resources.some(r => r.code === 'S_TCODE');
    if (hasTCode) {
      suppressableCount++;
      if (action.isDeleted) {
        suppressedCount++;
      }
    }
    
    // Vérifier si l'action contient des ressources non-S_TCODE (restrainable)
    const hasOtherResources = action.resources.some(r => r.code !== 'S_TCODE');
    if (hasOtherResources) {
      restrainableCount++;
      if (action.isRestricted) {
        restrictedCount++;
      }
    }
  });
  
  // Fonction remédiée si toutes les supprimables sont supprimées OU toutes les restrainables sont restreintes
  return (suppressableCount > 0 && suppressedCount === suppressableCount) ||
         (restrainableCount > 0 && restrictedCount === restrainableCount);
}

/**
 * Génère un plan de remédiation automatique
 */
export function generateRemediationPlan(
  simpleRoles: SodSimpleRole[],
  compositeRoles: SodCompositeRole[],
  config: RemediationConfig
): RemediationPlan {
  const plan: RemediationPlan = {
    resourceRestrictions: [],
    actionRestrictions: [],
    roleRestrictions: [],
    actionDeletions: [],
    roleDeletions: [],
    totalModifications: 0,
    estimatedImpact: 'minimal',
    risksRemediated: 0,
    rolesAffected: 0
  };
  
  // Parcourir tous les rôles pour identifier les actions à remédier
  const allRoles = [...simpleRoles, ...compositeRoles];
  const affectedRoles = new Set<string>();
  
  allRoles.forEach(role => {
    role.risks.forEach(risk => {
      risk.functions.forEach(func => {
        // Pour les rôles simples
        if ('actions' in func) {
          const actions = func.actions;
          
          // Vérifier si la fonction est déjà remédiée
          if (isFunctionRemediated(actions)) {
            plan.risksRemediated++;
            return;
          }
          
          // Générer les options de remédiation pour cette fonction
          const remediationOptions = generateFunctionRemediationOptions(
            role.roleName,
            actions,
            config
          );
          
          // Choisir l'option avec le score d'impact le plus bas
          const bestOption = selectBestRemediationOption(remediationOptions);
          
          if (bestOption) {
            // Ajouter les modifications au plan
            applyRemediationOptionToPlan(plan, bestOption);
            affectedRoles.add(role.roleName);
          }
        }
        // Pour les rôles composites
        else if ('simpleRoles' in func) {
          // Agréger toutes les actions de tous les rôles simples
          const allActions: Array<{ action: SodAction; sourceRole: string }> = [];
          
          func.simpleRoles.forEach(simpleRole => {
            simpleRole.actions.forEach(action => {
              allActions.push({
                action,
                sourceRole: simpleRole.roleName
              });
            });
          });
          
          // Vérifier si la fonction composite est déjà remédiée
          const functionActions = allActions.map(item => item.action);
          if (isFunctionRemediated(functionActions)) {
            plan.risksRemediated++;
            return;
          }
          
          // Générer les options de remédiation pour cette fonction composite
          const remediationOptions = generateCompositeFunctionRemediationOptions(
            role.roleName,
            allActions,
            config
          );
          
          // Choisir l'option avec le score d'impact le plus bas
          const bestOption = selectBestRemediationOption(remediationOptions);
          
          if (bestOption) {
            // Ajouter les modifications au plan
            applyRemediationOptionToPlan(plan, bestOption);
            affectedRoles.add(role.roleName);
          }
        }
      });
    });
  });
  
  plan.rolesAffected = affectedRoles.size;
  plan.totalModifications = plan.resourceRestrictions.length + 
                           plan.actionRestrictions.length + 
                           plan.roleRestrictions.length + 
                           plan.actionDeletions.length + 
                           plan.roleDeletions.length;
  
  // Déterminer l'impact estimé
  const totalImpact = plan.resourceRestrictions.reduce((sum, r) => sum + r.impact, 0) +
                     plan.actionRestrictions.reduce((sum, a) => sum + a.impact, 0) +
                     plan.roleRestrictions.reduce((sum, r) => sum + r.impact, 0) +
                     plan.actionDeletions.reduce((sum, a) => sum + a.impact, 0) +
                     plan.roleDeletions.reduce((sum, r) => sum + r.impact, 0);
  
  if (totalImpact < 50) plan.estimatedImpact = 'minimal';
  else if (totalImpact < 200) plan.estimatedImpact = 'modéré';
  else if (totalImpact < 500) plan.estimatedImpact = 'important';
  else plan.estimatedImpact = 'critique';
  
  return plan;
}

/**
 * Analyse les ressources communes partagées entre actions
 */
interface ResourceAnalysis {
  resourceKey: string; // "RESOURCE_CODE::EXTERNAL_CODE"
  resourceCode: string;
  externalCode: string;
  actions: SodAction[];
  totalValues: Set<string>;
  score: number; // actions_couvertes / valeurs_nécessaires
}

function analyserRessourcesCommunes(actions: SodAction[]): ResourceAnalysis[] {
  const resourceMap = new Map<string, ResourceAnalysis>();
  
  // Regrouper les actions par ressource
  actions.forEach(action => {
    action.resources.forEach(resource => {
      if (resource.code === 'S_TCODE' || resource.isRestricted) return;
      
      resource.externalResources?.forEach(extRes => {
        const key = `${resource.code}::${extRes.code}`;
        
        if (!resourceMap.has(key)) {
          resourceMap.set(key, {
            resourceKey: key,
            resourceCode: resource.code,
            externalCode: extRes.code,
            actions: [],
            totalValues: new Set<string>(),
            score: 0
          });
        }
        
        const analysis = resourceMap.get(key)!;
        analysis.actions.push(action);
        
        // Ajouter toutes les valeurs de cette ressource
        if (extRes.values) {
          extRes.values.forEach(val => analysis.totalValues.add(val));
        }
      });
    });
  });
  
  // Calculer les scores (actions_couvertes / valeurs_nécessaires)
  const results: ResourceAnalysis[] = [];
  resourceMap.forEach(analysis => {
    const actionsCount = analysis.actions.length;
    const valuesCount = analysis.totalValues.size || 1; // Éviter division par zéro
    analysis.score = actionsCount / valuesCount;
    results.push(analysis);
  });
  
  // Trier par score décroissant (meilleur score en premier)
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Calcule l'impact total des restrictions de ressources
 */
function calculerImpactRestrictions(ressources: ResourceAnalysis[]): number {
  // Impact = nombre total de valeurs à restreindre
  return ressources.reduce((sum, r) => sum + r.totalValues.size, 0);
}

/**
 * Génère les options de remédiation pour une fonction simple
 * Utilise l'algorithme optimisé basé sur le ratio suppressibles/restrainables
 */
function generateFunctionRemediationOptions(
  roleName: string,
  actions: SodAction[],
  config: RemediationConfig
): RemediationOption[] {
  const options: RemediationOption[] = [];
  
  // Identifier les actions restrainables et suppressables
  const restrainableActions = actions.filter(action => 
    action.resources.some(r => r.code !== 'S_TCODE') && !action.isRestricted
  );
  
  const suppressableActions = actions.filter(action => 
    action.resources.some(r => r.code === 'S_TCODE') && !action.isDeleted
  );
  
  // Calculer le ratio
  const ratio = suppressableActions.length / (restrainableActions.length || 1);
  
  // CAS 1 : Beaucoup de suppressibles, peu de restrainables (ratio > 2.0)
  // → Toujours privilégier les restrictions
  if (ratio > 2.0 && restrainableActions.length > 0) {
    // Analyser les ressources communes
    const ressourcesCommunes = analyserRessourcesCommunes(restrainableActions);
    
    if (ressourcesCommunes.length > 0) {
      // Générer l'option de restriction de ressources
      const resourceRestrictions: any[] = [];
      ressourcesCommunes.forEach(ressource => {
        ressource.actions.forEach(action => {
          const resource = action.resources.find(r => r.code === ressource.resourceCode);
          const extRes = resource?.externalResources?.find(er => er.code === ressource.externalCode);
          
          if (resource && extRes) {
            resourceRestrictions.push({
              roleName,
              actionCode: action.code,
              resourceCode: ressource.resourceCode,
              externalResourceCode: ressource.externalCode,
              values: Array.from(ressource.totalValues),
              impact: ressource.totalValues.size, // Impact = nombre de valeurs
              reason: `Restreindre ${ressource.resourceCode}::${ressource.externalCode} (couvre ${ressource.actions.length} actions avec ${ressource.totalValues.size} valeurs)`
            });
          }
        });
      });
      
      options.push({
        type: 'resource_restrictions',
        modifications: resourceRestrictions,
        totalImpact: calculerImpactRestrictions(ressourcesCommunes),
        description: `Restreindre ${ressourcesCommunes.length} ressource(s) commune(s) (ratio ${ratio.toFixed(2)} > 2.0)`
      });
    }
  }
  
  // CAS 2 : Peu de suppressibles, beaucoup de restrainables (ratio < 0.5)
  // → Analyser ressources communes et comparer
  else if (ratio < 0.5 && restrainableActions.length > 0) {
    const ressourcesCommunes = analyserRessourcesCommunes(restrainableActions);
    
    if (ressourcesCommunes.length > 0) {
      const impactRestrictions = calculerImpactRestrictions(ressourcesCommunes);
      const impactSuppressions = suppressableActions.length * calculateImpactScore('action', 'delete');
      
      // Si restrictions <= suppressions, privilégier restrictions
      if (impactRestrictions <= impactSuppressions) {
        const resourceRestrictions: any[] = [];
        ressourcesCommunes.forEach(ressource => {
          ressource.actions.forEach(action => {
            const resource = action.resources.find(r => r.code === ressource.resourceCode);
            const extRes = resource?.externalResources?.find(er => er.code === ressource.externalCode);
            
            if (resource && extRes) {
              resourceRestrictions.push({
                roleName,
                actionCode: action.code,
                resourceCode: ressource.resourceCode,
                externalResourceCode: ressource.externalCode,
                values: Array.from(ressource.totalValues),
                impact: ressource.totalValues.size,
                reason: `Restreindre ${ressource.resourceCode}::${ressource.externalCode} (couvre ${ressource.actions.length} actions)`
              });
            }
          });
        });
        
        options.push({
          type: 'resource_restrictions',
          modifications: resourceRestrictions,
          totalImpact: impactRestrictions,
          description: `Restreindre ${ressourcesCommunes.length} ressource(s) (impact ${impactRestrictions} ≤ ${impactSuppressions} suppressions)`
        });
      }
    }
    
    // Ajouter option de suppression
    if (suppressableActions.length > 0) {
      options.push({
        type: 'action_deletions',
        modifications: suppressableActions.map(action => ({
          roleName,
          actionCode: action.code,
          resources: action.resources,
          impact: calculateImpactScore('action', 'delete'),
          reason: `Supprimer l'action ${action.code}`
        })),
        totalImpact: suppressableActions.length * calculateImpactScore('action', 'delete'),
        description: `Supprimer ${suppressableActions.length} action(s) supprimable(s)`
      });
    }
  }
  
  // CAS 3 : Ratio équilibré (0.5 ≤ ratio ≤ 2.0)
  // → Comparer toutes les options
  else {
    // Option A : Restrictions de ressources
    if (restrainableActions.length > 0) {
      const ressourcesCommunes = analyserRessourcesCommunes(restrainableActions);
      
      if (ressourcesCommunes.length > 0) {
        const impactRestrictions = calculerImpactRestrictions(ressourcesCommunes);
        const resourceRestrictions: any[] = [];
        
        ressourcesCommunes.forEach(ressource => {
          ressource.actions.forEach(action => {
            const resource = action.resources.find(r => r.code === ressource.resourceCode);
            const extRes = resource?.externalResources?.find(er => er.code === ressource.externalCode);
            
            if (resource && extRes) {
              resourceRestrictions.push({
                roleName,
                actionCode: action.code,
                resourceCode: ressource.resourceCode,
                externalResourceCode: ressource.externalCode,
                values: Array.from(ressource.totalValues),
                impact: ressource.totalValues.size,
                reason: `Restreindre ${ressource.resourceCode}::${ressource.externalCode}`
              });
            }
          });
        });
        
        options.push({
          type: 'resource_restrictions',
          modifications: resourceRestrictions,
          totalImpact: impactRestrictions,
          description: `Restreindre ${ressourcesCommunes.length} ressource(s) (impact ${impactRestrictions})`
        });
      }
    }
    
    // Option B : Suppressions d'actions
    if (suppressableActions.length > 0) {
      options.push({
        type: 'action_deletions',
        modifications: suppressableActions.map(action => ({
          roleName,
          actionCode: action.code,
          resources: action.resources,
          impact: calculateImpactScore('action', 'delete'),
          reason: `Supprimer l'action ${action.code}`
        })),
        totalImpact: suppressableActions.length * calculateImpactScore('action', 'delete'),
        description: `Supprimer ${suppressableActions.length} action(s) (impact ${suppressableActions.length})`
      });
    }
  }
  
  return options;
}

/**
 * Génère les options de remédiation pour une fonction composite
 */
function generateCompositeFunctionRemediationOptions(
  compositeRoleName: string,
  allActions: Array<{ action: SodAction; sourceRole: string }>,
  config: RemediationConfig
): RemediationOption[] {
  // Similaire à generateFunctionRemediationOptions mais pour les fonctions composites
  // TODO: Implémenter la logique spécifique aux fonctions composites
  return [];
}

/**
 * Interface pour les options de remédiation
 */
interface RemediationOption {
  type: 'resource_restrictions' | 'action_restrictions' | 'action_deletions' | 'role_restrictions' | 'role_deletions';
  modifications: any[];
  totalImpact: number;
  description: string;
}

/**
 * Sélectionne la meilleure option de remédiation
 * Priorité : Impact minimal, puis restrictions > suppressions
 */
function selectBestRemediationOption(options: RemediationOption[]): RemediationOption | null {
  if (options.length === 0) return null;
  
  // Trier par impact croissant (le plus faible en premier)
  options.sort((a, b) => {
    // 1. Comparer les impacts
    if (a.totalImpact !== b.totalImpact) {
      return a.totalImpact - b.totalImpact;
    }
    
    // 2. À impact égal, privilégier restrictions > suppressions
    const priorityOrder = {
      'resource_restrictions': 1,
      'action_restrictions': 2,
      'action_deletions': 3,
      'role_restrictions': 4,
      'role_deletions': 5
    };
    
    return priorityOrder[a.type] - priorityOrder[b.type];
  });
  
  return options[0];
}

/**
 * Applique une option de remédiation au plan
 */
function applyRemediationOptionToPlan(plan: RemediationPlan, option: RemediationOption): void {
  switch (option.type) {
    case 'resource_restrictions':
      plan.resourceRestrictions.push(...option.modifications);
      break;
    case 'action_restrictions':
      plan.actionRestrictions.push(...option.modifications);
      break;
    case 'action_deletions':
      plan.actionDeletions.push(...option.modifications);
      break;
    case 'role_restrictions':
      plan.roleRestrictions.push(...option.modifications);
      break;
    case 'role_deletions':
      plan.roleDeletions.push(...option.modifications);
      break;
  }
}
