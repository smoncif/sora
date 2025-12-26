/**
 * Utilitaires pour la détection de conflits dans l'analyse SoD
 */

import { 
  SodAction, 
  SodSimpleRoleRiskItem, 
  SodCompositeRoleRiskItem,
  SodSimpleRoleFunction,
  SodCompositeRoleFunction 
} from 'lib/types/sodAnalysis';

/**
 * Extrait uniquement les données techniques d'une action (sans descriptions)
 * pour la comparaison : codes, valeurs, mais pas les descriptions
 */
export function extractActionSignature(action: SodAction): string {
  const resources = action.resources.map(resource => ({
    code: resource.code,
    externalResources: resource.externalResources?.map(ext => ({
      code: ext.code,
      values: ext.values?.map(v => ({
        valueFrom: v.valueFrom,
        valueTo: v.valueTo
      }))
    }))
  }));
  
  // Trier les ressources pour éviter les différences d'ordre
  const normalizedResources = [...resources].sort((a, b) => a.code.localeCompare(b.code));
  
  // Trier aussi les ressources externes et valeurs
  normalizedResources.forEach(resource => {
    if (resource.externalResources) {
      resource.externalResources = [...resource.externalResources].sort((a, b) => a.code.localeCompare(b.code));
      resource.externalResources.forEach(ext => {
        if (ext.values) {
          ext.values = [...ext.values].sort((a, b) => 
            (a.valueFrom || '').localeCompare(b.valueFrom || '')
          );
        }
      });
    }
  });
  
  return `${action.code}_${JSON.stringify(normalizedResources)}`;
}

/**
 * Compare deux actions pour déterminer si elles sont identiques
 * (même code ET mêmes ressources/sous-catégories, sans tenir compte des descriptions)
 */
export function areActionsIdentical(action1: SodAction, action2: SodAction): boolean {
  return extractActionSignature(action1) === extractActionSignature(action2);
}

/**
 * Détecte les actions dupliquées dans un risque POUR UN RÔLE SIMPLE SPÉCIFIQUE
 * Une action est considérée comme dupliquée si elle apparaît avec les mêmes sous-catégories
 * dans plusieurs fonctions différentes du même risque ET du même rôle simple
 * 
 * @param risk Le risque à analyser
 * @param roleName Nom du rôle simple (optionnel pour rôles simples, requis pour composites)
 * @returns Map avec le code de l'action comme clé et un tableau des indices de fonctions où elle apparaît
 */
export function detectDuplicateActionsInRisk(
  risk: SodSimpleRoleRiskItem | SodCompositeRoleRiskItem,
  roleName?: string
): Map<string, { functionIndices: number[]; isDuplicate: boolean }> {
  const actionMap = new Map<string, { functionIndices: number[]; isDuplicate: boolean }>();
  
  risk.functions.forEach((func, funcIndex) => {
    let actions: any[] = [];
    
    // Pour les fonctions simples (rôles simples)
    if ('actions' in func) {
      actions = func.actions;
    } 
    // Pour les fonctions composites (rôles composites)
    else if ('simpleRoles' in func) {
      // Filtrer uniquement les actions du rôle simple concerné
      if (roleName) {
        const simpleRole = func.simpleRoles.find(sr => sr.roleName === roleName);
        if (simpleRole) {
          actions = simpleRole.actions;
        }
      } else {
        // Si pas de roleName spécifié, prendre toutes les actions (pour compatibilité)
        actions = func.simpleRoles.flatMap(sr => sr.actions);
      }
    }
    
    actions.forEach((action) => {
      // Utiliser la signature technique (sans descriptions)
      const key = extractActionSignature(action);
      
      if (!actionMap.has(key)) {
        actionMap.set(key, { functionIndices: [funcIndex], isDuplicate: false });
      } else {
        const entry = actionMap.get(key)!;
        entry.functionIndices.push(funcIndex);
        entry.isDuplicate = true; // Marquer comme dupliqué si trouvé dans plusieurs fonctions
      }
    });
  });
  
  return actionMap;
}

/**
 * Vérifie si une action spécifique est dupliquée dans un risque pour un rôle simple
 */
export function isActionDuplicatedInRisk(
  action: SodAction,
  functionIndex: number,
  risk: SodSimpleRoleRiskItem | SodCompositeRoleRiskItem,
  roleName?: string
): boolean {
  const duplicates = detectDuplicateActionsInRisk(risk, roleName);
  const key = extractActionSignature(action);
  const entry = duplicates.get(key);
  
  return entry ? entry.isDuplicate && entry.functionIndices.includes(functionIndex) : false;
}

/**
 * Détecte les actions qui n'ont QUE S_TCODE comme ressource dans une FONCTION
 * Pour les rôles simples : agrège les ressources au sein de la fonction
 * Pour les rôles composites : agrège les ressources à travers tous les rôles simples de la fonction
 * 
 * @param func La fonction à analyser (simple ou composite)
 * @returns Map<actionCode, hasOnlyTCode> - true si l'action n'a que S_TCODE dans toute la fonction
 */
export function detectActionsWithOnlyTCodeInFunction(
  func: SodSimpleRoleFunction | SodCompositeRoleFunction
): Map<string, boolean> {
  // Map: actionCode → Set de tous les codes ressource trouvés dans la fonction
  const actionResourcesMap = new Map<string, Set<string>>();
  
  // Collecter toutes les actions de la fonction
  let allActions: SodAction[] = [];
  
  // Pour les fonctions simples (rôles simples) : actions directes
  if ('actions' in func) {
    allActions = func.actions;
  }
  // Pour les fonctions composites : actions de tous les rôles simples
  else if ('simpleRoles' in func) {
    allActions = func.simpleRoles.flatMap(sr => sr.actions as SodAction[]);
  }
  
  // Agréger les ressources par code action
  allActions.forEach(action => {
    const actionCode = action.code;
    
    if (!actionResourcesMap.has(actionCode)) {
      actionResourcesMap.set(actionCode, new Set<string>());
    }
    
    // Ajouter tous les codes ressource de cette action
    action.resources.forEach(resource => {
      actionResourcesMap.get(actionCode)!.add(resource.code);
    });
  });
  
  // Convertir en Map<actionCode, hasOnlyTCode>
  const result = new Map<string, boolean>();
  actionResourcesMap.forEach((resourceCodes, actionCode) => {
    // True si la seule ressource est S_TCODE (ou si aucune ressource)
    const hasOnlyTCode = resourceCodes.size === 0 || 
      (resourceCodes.size === 1 && resourceCodes.has('S_TCODE'));
    result.set(actionCode, hasOnlyTCode);
  });
  
  return result;
}

