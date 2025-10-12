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
  resources: SodResource[]; // Gardé pour la logique interne
  resourcesDisplay: string; // Chaîne sérialisée pour l'affichage
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
  resources: SodResource[]; // Gardé pour la logique interne
  resourcesDisplay: string; // Chaîne sérialisée pour l'affichage
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
 * Sérialise les ressources en chaîne lisible pour l'affichage
 */
function serializeResources(resources: SodResource[]): string {
  return resources.map(resource => {
    const permissions = resource.externalResources?.map(extRes => {
      const values = extRes.values ? ` (${extRes.values.join(', ')})` : '';
      return `${extRes.code}${values}`;
    }).join(', ') || 'Aucune permission';
    
    return `${resource.code} → ${permissions}`;
  }).join('; ');
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
 * Vérifie si un risque est remédié
 * Un risque est remédié si AU MOINS UNE de ses fonctions est remédiée
 */
function isRiskRemediated(risk: any): boolean {
  return risk.functions.some((func: any) => {
    if ('actions' in func) {
      return isFunctionRemediated(func.actions);
    } else if ('simpleRoles' in func) {
      // Pour les fonctions composites, agréger toutes les actions
      const allActions: SodAction[] = [];
      func.simpleRoles.forEach((simpleRole: any) => {
        allActions.push(...simpleRole.actions);
      });
      return isFunctionRemediated(allActions);
    }
    return false;
  });
}

/**
 * Interface pour une option de remédiation de fonction
 */
interface FunctionRemediationOption {
  roleName: string;
  riskCode: string;
  functionCode: string;
  option: RemediationOption;
  impact: number;
}

/**
 * Génère un plan de remédiation automatique
 * CORRIGÉ : Groupe par risque et choisit la fonction avec l'impact minimal
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
  
  // Grouper par risque et analyser chaque risque
  const allRoles = [...simpleRoles, ...compositeRoles];
  const affectedRoles = new Set<string>();
  const risksProcessed = new Set<string>();
  
  allRoles.forEach(role => {
    role.risks.forEach(risk => {
      // Vérifier si le risque a déjà été traité
      const riskKey = `${role.roleName}:${risk.riskCode}`;
      if (risksProcessed.has(riskKey)) {
        return;
      }
      risksProcessed.add(riskKey);
      
      // Vérifier si le risque est déjà remédié
      if (isRiskRemediated(risk)) {
        plan.risksRemediated++;
        return;
      }
      
      // Analyser toutes les fonctions de ce risque
      const functionOptions: FunctionRemediationOption[] = [];
      
      risk.functions.forEach(func => {
        // Pour les rôles simples
        if ('actions' in func) {
          const actions = func.actions;
          
          // Vérifier si la fonction est déjà remédiée
          if (isFunctionRemediated(actions)) {
            return; // Cette fonction est déjà remédiée, pas besoin de l'inclure
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
            functionOptions.push({
              roleName: role.roleName,
              riskCode: risk.riskCode,
              functionCode: func.functionCode,
              option: bestOption,
              impact: bestOption.totalImpact
            });
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
            return; // Cette fonction est déjà remédiée
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
            functionOptions.push({
              roleName: role.roleName,
              riskCode: risk.riskCode,
              functionCode: func.functionCode,
              option: bestOption,
              impact: bestOption.totalImpact
            });
          }
        }
      });
      
      // CHOISIR LA FONCTION AVEC L'IMPACT MINIMAL pour remédier ce risque
      if (functionOptions.length > 0) {
        // Trier par impact croissant (le plus faible en premier)
        functionOptions.sort((a, b) => a.impact - b.impact);
        
        // Prendre la fonction avec l'impact minimal
        const bestFunctionOption = functionOptions[0];
        
        // Ajouter les modifications au plan
        applyRemediationOptionToPlan(plan, bestFunctionOption.option);
        affectedRoles.add(role.roleName);
        plan.risksRemediated++;
        
        console.log(`🎯 Risque ${risk.riskCode}: Choisi fonction ${bestFunctionOption.functionCode} (impact ${bestFunctionOption.impact}) au lieu de ${functionOptions.length - 1} autres options`);
      }
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
            resourcesDisplay: serializeResources(action.resources),
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
          resourcesDisplay: serializeResources(action.resources),
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
