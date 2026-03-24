/**
 * Service d'analyse SoD pour les utilisateurs (Step 3)
 * 
 * Responsabilités :
 * 1. Identifier les RÔLES RISQUÉS selon la règle :
 *    → Un rôle est risqué s'il est présent dans TOUTES les fonctions d'un risque
 *    (quelque soit l'utilisateur)
 * 
 * 2. Distribuer les rôles risqués :
 *    → Step 1 (Rôles Simples) si compositeBusinessRole est VIDE
 *    → Step 2 (Rôles Composites) si compositeBusinessRole est NON VIDE
 * 
 * 3. Construire les hiérarchies utilisateurs pour les 2 modes d'affichage :
 *    → Mode "Par Rôle" : User → Risque → Fonction → Rôle → Action
 *    → Mode "Par Transaction" : User → Risque → Fonction → Action → Rôle
 */

import type {
  UserSodRawRecord,
  UserSodRiskyRole,
  UserSodEntry,
  UserSodRiskByRole,
  UserSodRiskByTransaction,
  UserSodFunctionByRole,
  UserSodFunctionByTransaction,
  UserSodCompositeRole,
  UserSodSimpleRole,
  UserSodAction,
  UserSodActionByTransaction,
  UserSodRoleForAction,
  UserSodMetrics,
  UserSodAnalysisSession,
  UserSodFilteringStats,
} from 'lib/types/userSodAnalysis';
import type { SodRiskLevel, SodResource, SodExternalResource, SodValue } from 'lib/types/sodAnalysis';
import { SOD_RISK_LEVEL_MAPPING } from 'lib/types/sodAnalysis';

// ============================================
// DÉTECTION DES RÔLES RISQUÉS
// ============================================

/**
 * Structure interne pour l'analyse des rôles SIMPLES
 * 
 * Un rôle simple est identifié par la colonne "Rôle/Profil".
 * Il peut être affecté :
 * - Directement (colonne composite vide)
 * - Via un ou plusieurs composites (colonne composite non vide)
 * - Les deux (mixte) selon la fonction
 */
interface SimpleRoleAnalysis {
  roleName: string;
  roleDescription?: string;
  roleType: 'SIMPLE';
  
  /** Fonctions où le rôle est affecté directement (colonne composite vide) */
  directFunctions: Set<string>;
  
  /** Map: Fonction → Set de composites parents pour cette fonction */
  compositeFunctions: Map<string, Set<string>>;
  
  /** Set de TOUS les composites parents (union de toutes les fonctions) */
  allParentComposites: Set<string>;
  
  /** Map: riskId → Set de fonctions où le rôle est présent */
  riskFunctions: Map<string, Set<string>>;
  
  /** Map: riskId → niveau de risque */
  riskLevels: Map<string, SodRiskLevel>;
  
  /** Map: riskId → Set de toutes les fonctions du risque */
  allRiskFunctions: Map<string, Set<string>>;
  
  /** 
   * ✅ NOUVEAU : Structure pour vérifier les actions complètes
   * Map: riskId → Map: fonction → Map: action → Set de lignes (combinaisons)
   * Chaque ligne est identifiée par: resource|resourceExtn|valueFrom|valueTo
   */
  riskFunctionActions: Map<string, Map<string, Map<string, Set<string>>>>;
  
  /** Utilisateurs qui ont ce rôle */
  users: Map<string, number>; // userId → executionCount total
}

/**
 * Structure interne pour l'analyse des rôles COMPOSITES
 * 
 * Un rôle composite est identifié par la valeur de la colonne "Rôle utilisateur/composite".
 * Il est construit par agrégation de tous les rôles simples qui ont ce composite comme parent.
 */
interface CompositeRoleAnalysis {
  roleName: string;
  roleDescription?: string;
  roleType: 'COMPOSITE';
  
  /** Map: simpleRoleName → Set de fonctions où ce simple est dans le composite */
  simpleRoles: Map<string, Set<string>>;
  
  /** Map: riskId → Set de fonctions où le composite est présent */
  riskFunctions: Map<string, Set<string>>;
  
  /** Map: riskId → niveau de risque */
  riskLevels: Map<string, SodRiskLevel>;
  
  /** Map: riskId → Set de toutes les fonctions du risque */
  allRiskFunctions: Map<string, Set<string>>;
  
  /** Utilisateurs qui ont ce rôle */
  users: Map<string, number>; // userId → executionCount total
}

/**
 * Identifie les rôles risqués dans les données utilisateurs
 * 
 * RÈGLE : Un rôle est risqué s'il est présent dans TOUTES les fonctions d'un risque
 * 
 * ALGORITHME EN 2 PHASES :
 * 1. Analyser tous les rôles SIMPLES (roleProfile)
 *    - Tracker si direct (colonne composite vide) ou dans composite (colonne composite non vide)
 *    - Un même rôle simple peut être direct pour certaines fonctions et dans composite pour d'autres
 * 
 * 2. Construire les rôles COMPOSITES par agrégation
 *    - Regrouper tous les rôles simples qui ont le même parent composite
 *    - Un composite est risqué si présent dans toutes les fonctions (via ses rôles simples)
 */
export function identifyRiskyRoles(records: UserSodRawRecord[]): UserSodRiskyRole[] {
  console.log(`[DEBUG] identifyRiskyRoles() - Traitement de ${records.length} enregistrements`);
  
  // ============================================
  // PHASE 1 : ANALYSER TOUS LES RÔLES SIMPLES
  // ============================================
  
  const simpleRoleAnalysis = new Map<string, SimpleRoleAnalysis>();
  
  // Étape 1.1 : D'abord, collecter toutes les fonctions par risque
  const allFunctionsByRisk = new Map<string, Set<string>>();
  
  // ✅ NOUVEAU : Collecter toutes les actions attendues par risque/fonction
  // Map: riskId → Map: fonction → Map: action → Set de lignes (toutes les lignes du fichier)
  const allActionsByRiskFunction = new Map<string, Map<string, Map<string, Set<string>>>>();
  
  for (const record of records) {
    const riskId = record.accessRiskId;
    const funcCode = record.function;
    const actionCode = record.action;
    const lineKey = `${record.resource}|${record.resourceExtn}|${record.valueFrom}|${record.valueTo}`;
    
    if (!allFunctionsByRisk.has(riskId)) {
      allFunctionsByRisk.set(riskId, new Set());
    }
    allFunctionsByRisk.get(riskId)!.add(funcCode);
    
    // ✅ NOUVEAU : Stocker toutes les lignes d'action
    if (!allActionsByRiskFunction.has(riskId)) {
      allActionsByRiskFunction.set(riskId, new Map());
    }
    if (!allActionsByRiskFunction.get(riskId)!.has(funcCode)) {
      allActionsByRiskFunction.get(riskId)!.set(funcCode, new Map());
    }
    if (!allActionsByRiskFunction.get(riskId)!.get(funcCode)!.has(actionCode)) {
      allActionsByRiskFunction.get(riskId)!.get(funcCode)!.set(actionCode, new Set());
    }
    allActionsByRiskFunction.get(riskId)!.get(funcCode)!.get(actionCode)!.add(lineKey);
  }
  
  // Étape 1.2 : Analyser chaque enregistrement pour les rôles simples
  for (const record of records) {
    const roleName = record.roleProfile; // ← Toujours un rôle SIMPLE
    const riskId = record.accessRiskId;
    const funcCode = record.function;
    const actionCode = record.action;
    const riskLevel = normalizeRiskLevel(record.riskLevel);
    const isDirect = isEmpty(record.compositeBusinessRole);
    const lineKey = `${record.resource}|${record.resourceExtn}|${record.valueFrom}|${record.valueTo}`;
    
    // Utiliser UNIQUEMENT le nom du rôle comme clé (pas de composite dans la clé)
    if (!simpleRoleAnalysis.has(roleName)) {
      simpleRoleAnalysis.set(roleName, {
        roleName,
        roleDescription: record.roleProfileDescription,
        roleType: 'SIMPLE', // ← Toujours SIMPLE pour roleProfile
        directFunctions: new Set(),
        compositeFunctions: new Map(),
        allParentComposites: new Set(),
        riskFunctions: new Map(),
        riskLevels: new Map(),
        allRiskFunctions: new Map(),
        riskFunctionActions: new Map(), // ✅ NOUVEAU
        users: new Map(),
      });
    }
    
    const analysis = simpleRoleAnalysis.get(roleName)!;
    
    // ✅ NOUVEAU : Tracker si direct ou dans composite pour CETTE fonction
    if (isDirect) {
      analysis.directFunctions.add(funcCode);
    } else {
      // Dans un composite
      if (!analysis.compositeFunctions.has(funcCode)) {
        analysis.compositeFunctions.set(funcCode, new Set());
      }
      analysis.compositeFunctions.get(funcCode)!.add(record.compositeBusinessRole);
      analysis.allParentComposites.add(record.compositeBusinessRole);
    }
    
    // Tracker les fonctions par risque (pour vérifier la règle "risqué")
    if (!analysis.riskFunctions.has(riskId)) {
      analysis.riskFunctions.set(riskId, new Set());
      analysis.riskLevels.set(riskId, riskLevel);
      analysis.allRiskFunctions.set(riskId, allFunctionsByRisk.get(riskId)!);
    }
    analysis.riskFunctions.get(riskId)!.add(funcCode);
    
    // ✅ NOUVEAU : Tracker les actions complètes pour ce rôle
    if (!analysis.riskFunctionActions.has(riskId)) {
      analysis.riskFunctionActions.set(riskId, new Map());
    }
    if (!analysis.riskFunctionActions.get(riskId)!.has(funcCode)) {
      analysis.riskFunctionActions.get(riskId)!.set(funcCode, new Map());
    }
    if (!analysis.riskFunctionActions.get(riskId)!.get(funcCode)!.has(actionCode)) {
      analysis.riskFunctionActions.get(riskId)!.get(funcCode)!.set(actionCode, new Set());
    }
    analysis.riskFunctionActions.get(riskId)!.get(funcCode)!.get(actionCode)!.add(lineKey);
    
    // Tracker les utilisateurs
    const currentCount = analysis.users.get(record.userId) || 0;
    analysis.users.set(record.userId, currentCount + record.executionCount);
  }
  
  // ============================================
  // PHASE 2 : CONSTRUIRE LES RÔLES COMPOSITES
  // ============================================
  
  const compositeRoleAnalysis = new Map<string, CompositeRoleAnalysis>();
  
  for (const [roleName, simpleAnalysis] of simpleRoleAnalysis) {
    // Pour chaque parent composite, créer/enrichir l'analyse du composite
    for (const compositeName of simpleAnalysis.allParentComposites) {
      if (!compositeRoleAnalysis.has(compositeName)) {
        compositeRoleAnalysis.set(compositeName, {
          roleName: compositeName,
          roleDescription: undefined, // Sera enrichi si disponible
          roleType: 'COMPOSITE',
          simpleRoles: new Map(),
          riskFunctions: new Map(),
          riskLevels: new Map(),
          allRiskFunctions: new Map(),
          users: new Map(),
        });
      }
      
      const compositeAnalysis = compositeRoleAnalysis.get(compositeName)!;
      
      // Ajouter le rôle simple à ce composite avec ses fonctions
      const functionsInComposite = new Set<string>();
      for (const [funcCode, composites] of simpleAnalysis.compositeFunctions) {
        if (composites.has(compositeName)) {
          functionsInComposite.add(funcCode);
        }
      }
      compositeAnalysis.simpleRoles.set(roleName, functionsInComposite);
      
      // Fusionner les riskFunctions du simple dans le composite
      for (const [riskId, functions] of simpleAnalysis.riskFunctions) {
        if (!compositeAnalysis.riskFunctions.has(riskId)) {
          compositeAnalysis.riskFunctions.set(riskId, new Set());
          compositeAnalysis.riskLevels.set(riskId, simpleAnalysis.riskLevels.get(riskId)!);
          compositeAnalysis.allRiskFunctions.set(riskId, simpleAnalysis.allRiskFunctions.get(riskId)!);
        }
        functions.forEach(func => compositeAnalysis.riskFunctions.get(riskId)!.add(func));
      }
      
      // Fusionner les utilisateurs
      for (const [userId, count] of simpleAnalysis.users) {
        const currentCount = compositeAnalysis.users.get(userId) || 0;
        compositeAnalysis.users.set(userId, currentCount + count);
      }
    }
  }
  
  // ============================================
  // PHASE 3 : IDENTIFIER LES RÔLES RISQUÉS
  // ============================================
  
  const riskyRoles: UserSodRiskyRole[] = [];
  
  // 3.1 : Rôles simples risqués
  for (const [roleName, analysis] of simpleRoleAnalysis) {
    const riskyForRisks: UserSodRiskyRole['riskyForRisks'] = [];
    
    // ✅ NOUVELLE RÈGLE : Pour chaque risque, vérifier si le rôle est risqué
    // RÈGLE : 
    // 1. Le rôle doit être présent dans TOUTES les fonctions du risque
    // 2. Pour CHAQUE fonction, le rôle doit avoir AU MOINS UNE action complète
    for (const [riskId, presentFunctions] of analysis.riskFunctions) {
      const allFunctions = analysis.allRiskFunctions.get(riskId)!;
      
      // CONDITION 1 : Vérifier que le rôle couvre TOUTES les fonctions
      const coversAllFunctions = allFunctions.size > 0 && 
        Array.from(allFunctions).every(func => presentFunctions.has(func));
      
      if (!coversAllFunctions) {
        continue; // Pas risqué si ne couvre pas toutes les fonctions
      }
      
      // CONDITION 2 : Vérifier que pour CHAQUE fonction, le rôle a AU MOINS UNE action complète
      let hasCompleteActionInAllFunctions = true;
      
      for (const funcCode of allFunctions) {
        // Actions du rôle pour cette fonction
        const roleActions = analysis.riskFunctionActions.get(riskId)?.get(funcCode);
        
        // Actions attendues (toutes les lignes du fichier) pour cette fonction
        const expectedActions = allActionsByRiskFunction.get(riskId)?.get(funcCode);
        
        if (!roleActions || !expectedActions) {
          hasCompleteActionInAllFunctions = false;
          break;
        }
        
        // Vérifier si AU MOINS UNE action est complète pour cette fonction
        let hasCompleteAction = false;
        
        for (const [actionCode, roleLines] of roleActions) {
          const expectedLines = expectedActions.get(actionCode);
          
          if (!expectedLines) continue;
          
          // Une action est complète si le rôle a TOUTES les lignes attendues pour cette action
          const isActionComplete = Array.from(expectedLines).every(line => roleLines.has(line));
          
          if (isActionComplete) {
            hasCompleteAction = true;
            break; // On a trouvé au moins une action complète, on peut passer à la fonction suivante
          }
        }
        
        if (!hasCompleteAction) {
          hasCompleteActionInAllFunctions = false;
          break; // Cette fonction n'a aucune action complète, le rôle n'est pas risqué
        }
      }
      
      // Si toutes les conditions sont remplies, le rôle est risqué pour ce risque
      if (hasCompleteActionInAllFunctions) {
        riskyForRisks.push({
          riskId,
          riskLevel: analysis.riskLevels.get(riskId)!,
          functions: Array.from(presentFunctions),
        });
      }
    }
    
    // ✅ DEBUG : Logger les rôles qui ne sont pas risqués
    if (riskyForRisks.length === 0) {
      console.log(`[DEBUG] Rôle simple "${roleName}" n'est PAS risqué (aucun risque ne satisfait les conditions)`);
    }
    
    // Si le rôle est risqué, l'ajouter avec son statut d'affectation
    if (riskyForRisks.length > 0) {
      console.log(`[DEBUG] ✅ Rôle simple "${roleName}" est RISQUÉ pour ${riskyForRisks.length} risque(s)`);
      const affectedUsers = Array.from(analysis.users.entries()).map(([userId, executionCount]) => ({
        userId,
        executionCount,
      }));
      
      // Calculer le statut d'affectation
      const hasDirectFunctions = analysis.directFunctions.size > 0;
      const hasCompositeFunctions = analysis.compositeFunctions.size > 0;
      const isDirectOnly = hasDirectFunctions && !hasCompositeFunctions;
      const isCompositeOnly = !hasDirectFunctions && hasCompositeFunctions;
      const isMixed = hasDirectFunctions && hasCompositeFunctions;
      
      // Convertir compositeFunctions (Map<string, Set<string>>) en Record<string, string[]>
      const compositeFunctionsRecord: Record<string, string[]> = {};
      for (const [funcCode, composites] of analysis.compositeFunctions) {
        compositeFunctionsRecord[funcCode] = Array.from(composites);
      }
      
      riskyRoles.push({
        roleName: analysis.roleName,
        roleDescription: analysis.roleDescription,
        roleType: 'SIMPLE',
        isDirectOnly,
        isCompositeOnly,
        isMixed,
        directFunctions: Array.from(analysis.directFunctions),
        compositeFunctions: compositeFunctionsRecord,
        parentComposites: Array.from(analysis.allParentComposites),
        riskyForRisks,
        affectedUsers,
        affectedUserCount: affectedUsers.length,
        totalExecutionCount: affectedUsers.reduce((sum, u) => sum + u.executionCount, 0),
      });
    }
  }
  
  // 3.2 : Rôles composites risqués
  for (const [compositeName, analysis] of compositeRoleAnalysis) {
    const riskyForRisks: UserSodRiskyRole['riskyForRisks'] = [];
    
    // Pour chaque risque, vérifier si le composite couvre TOUTES les fonctions
    for (const [riskId, presentFunctions] of analysis.riskFunctions) {
      const allFunctions = analysis.allRiskFunctions.get(riskId)!;
      
      const coversAllFunctions = allFunctions.size > 0 && 
        Array.from(allFunctions).every(func => presentFunctions.has(func));
      
      if (coversAllFunctions) {
        riskyForRisks.push({
          riskId,
          riskLevel: analysis.riskLevels.get(riskId)!,
          functions: Array.from(presentFunctions),
        });
      }
    }
    
    // Si le composite est risqué, l'ajouter avec ses rôles simples
    if (riskyForRisks.length > 0) {
      const affectedUsers = Array.from(analysis.users.entries()).map(([userId, executionCount]) => ({
        userId,
        executionCount,
      }));
      
      const simpleRolesArray = Array.from(analysis.simpleRoles.entries()).map(([roleName, functions]) => ({
        roleName,
        functions: Array.from(functions),
      }));
      
      riskyRoles.push({
        roleName: compositeName,
        roleDescription: analysis.roleDescription,
        roleType: 'COMPOSITE',
        simpleRoles: simpleRolesArray,
        riskyForRisks,
        affectedUsers,
        affectedUserCount: affectedUsers.length,
        totalExecutionCount: affectedUsers.reduce((sum, u) => sum + u.executionCount, 0),
      });
    }
  }
  
  // Trier par nombre d'utilisateurs affectés (décroissant)
  riskyRoles.sort((a, b) => b.affectedUserCount - a.affectedUserCount);
  
  console.log(`[DEBUG] identifyRiskyRoles() - Résultat: ${riskyRoles.length} rôles risqués identifiés`);
  console.log(`[DEBUG] - Simples: ${riskyRoles.filter(r => r.roleType === 'SIMPLE').length}`);
  console.log(`[DEBUG] - Composites: ${riskyRoles.filter(r => r.roleType === 'COMPOSITE').length}`);
  
  return riskyRoles;
}

// ============================================
// CONSTRUCTION DES HIÉRARCHIES UTILISATEURS
// ============================================

/**
 * Construit la hiérarchie utilisateur en mode "Par Rôle"
 * User → Risque → Fonction → Rôle Composite (si existe) → Rôle Simple → Action
 */
export function buildUserHierarchyByRole(records: UserSodRawRecord[]): UserSodEntry[] {
  // Regrouper par utilisateur
  const userMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!userMap.has(record.userId)) {
      userMap.set(record.userId, []);
    }
    userMap.get(record.userId)!.push(record);
  }
  
  const users: UserSodEntry[] = [];
  
  for (const [userId, userRecords] of userMap) {
    const risksByRole = buildRisksByRole(userRecords);
    const risksByTransaction = buildRisksByTransaction(userRecords);
    
    // Calculer les compteurs globaux
    const riskCount = risksByRole.length;
    const highestRiskLevel = getHighestRiskLevel(risksByRole.map(r => r.riskLevel));
    const totalExecutionCount = userRecords.reduce((sum, r) => sum + r.executionCount, 0);
    
    // Calculer le statut de remédiation (sera mis à jour par sodRulesApplication)
    const remediatedRisks = risksByRole.filter(r => r.isRemediated).length;
    const isRemediated = remediatedRisks === riskCount && riskCount > 0;
    const remediationPercentage = riskCount > 0 
      ? Math.round((remediatedRisks / riskCount) * 100) 
      : 0;
    
    users.push({
      userId,
      userGroup: userRecords[0]?.userGroup,
      risksByRole,
      risksByTransaction,
      riskCount,
      highestRiskLevel,
      totalExecutionCount,
      isRemediated,
      remediationPercentage,
    });
  }
  
  // Trier par niveau de risque puis par nombre de risques
  users.sort((a, b) => {
    const levelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const levelDiff = levelOrder[a.highestRiskLevel] - levelOrder[b.highestRiskLevel];
    if (levelDiff !== 0) return levelDiff;
    return b.riskCount - a.riskCount;
  });
  
  return users;
}

/**
 * Construit les risques en mode "Par Rôle"
 */
function buildRisksByRole(records: UserSodRawRecord[]): UserSodRiskByRole[] {
  // Regrouper par risque
  const riskMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!riskMap.has(record.accessRiskId)) {
      riskMap.set(record.accessRiskId, []);
    }
    riskMap.get(record.accessRiskId)!.push(record);
  }
  
  const risks: UserSodRiskByRole[] = [];
  
  for (const [riskId, riskRecords] of riskMap) {
    const functions = buildFunctionsByRole(riskRecords);
    
    const riskLevel = normalizeRiskLevel(riskRecords[0]?.riskLevel || '');
    const functionCount = functions.length;
    const totalRoleCount = functions.reduce((sum, f) => 
      sum + f.compositeRoles.length + f.simpleRoles.length, 0);
    const totalExecutionCount = riskRecords.reduce((sum, r) => sum + r.executionCount, 0);
    
    risks.push({
      riskId,
      riskLevel,
      riskDescription: riskRecords[0]?.riskDescription,
      functions,
      functionCount,
      totalRoleCount,
      totalExecutionCount,
      isRemediated: false, // Sera calculé par sodRulesApplication
      remediationPercentage: 0,
    });
  }
  
  // Trier par niveau de risque
  risks.sort((a, b) => {
    const levelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return levelOrder[a.riskLevel] - levelOrder[b.riskLevel];
  });
  
  return risks;
}

/**
 * Construit les fonctions en mode "Par Rôle"
 */
function buildFunctionsByRole(records: UserSodRawRecord[]): UserSodFunctionByRole[] {
  // Regrouper par fonction
  const funcMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!funcMap.has(record.function)) {
      funcMap.set(record.function, []);
    }
    funcMap.get(record.function)!.push(record);
  }
  
  const functions: UserSodFunctionByRole[] = [];
  
  for (const [funcCode, funcRecords] of funcMap) {
    // Séparer les rôles composites et simples
    const compositeRecords = funcRecords.filter(r => !isEmpty(r.compositeBusinessRole));
    const simpleRecords = funcRecords.filter(r => isEmpty(r.compositeBusinessRole));
    
    const compositeRoles = buildCompositeRoles(compositeRecords);
    const simpleRoles = buildSimpleRoles(simpleRecords);
    
    const roleCount = compositeRoles.length + simpleRoles.length;
    const totalActionCount = 
      compositeRoles.reduce((sum, cr) => sum + cr.totalActionCount, 0) +
      simpleRoles.reduce((sum, sr) => sum + sr.actionCount, 0);
    const totalExecutionCount = funcRecords.reduce((sum, r) => sum + r.executionCount, 0);
    
    functions.push({
      code: funcCode,
      description: funcRecords[0]?.functionDescription,
      system: funcRecords[0]?.system || '',
      compositeRoles,
      simpleRoles,
      roleCount,
      totalActionCount,
      totalExecutionCount,
    });
  }
  
  return functions;
}

/**
 * Construit les rôles composites
 */
function buildCompositeRoles(records: UserSodRawRecord[]): UserSodCompositeRole[] {
  // Regrouper par rôle composite
  const compositeMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    const compositeName = record.compositeBusinessRole;
    if (!compositeMap.has(compositeName)) {
      compositeMap.set(compositeName, []);
    }
    compositeMap.get(compositeName)!.push(record);
  }
  
  const composites: UserSodCompositeRole[] = [];
  
  for (const [compositeName, compRecords] of compositeMap) {
    const simpleRoles = buildSimpleRoles(compRecords);
    
    composites.push({
      roleName: compositeName,
      roleDescription: compRecords[0]?.compositeRoleDescription,
      simpleRoles,
      simpleRoleCount: simpleRoles.length,
      totalActionCount: simpleRoles.reduce((sum, sr) => sum + sr.actionCount, 0),
      totalExecutionCount: compRecords.reduce((sum, r) => sum + r.executionCount, 0),
      isExcluded: false, // Sera synchronisé avec Step 2
    });
  }
  
  return composites;
}

/**
 * Construit les rôles simples
 */
function buildSimpleRoles(records: UserSodRawRecord[]): UserSodSimpleRole[] {
  // Regrouper par rôle simple
  const roleMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    const roleName = record.roleProfile;
    if (!roleMap.has(roleName)) {
      roleMap.set(roleName, []);
    }
    roleMap.get(roleName)!.push(record);
  }
  
  const roles: UserSodSimpleRole[] = [];
  
  for (const [roleName, roleRecords] of roleMap) {
    const actions = buildActions(roleRecords);
    
    roles.push({
      roleName,
      roleDescription: roleRecords[0]?.roleProfileDescription,
      actions,
      actionCount: actions.length,
      totalExecutionCount: roleRecords.reduce((sum, r) => sum + r.executionCount, 0),
      isDeleted: false, // Sera synchronisé avec Step 1
      isRestricted: false,
    });
  }
  
  return roles;
}

/**
 * Construit les actions pour un rôle
 */
function buildActions(records: UserSodRawRecord[]): UserSodAction[] {
  // Regrouper par action
  const actionMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!actionMap.has(record.action)) {
      actionMap.set(record.action, []);
    }
    actionMap.get(record.action)!.push(record);
  }
  
  const actions: UserSodAction[] = [];
  
  for (const [actionCode, actionRecords] of actionMap) {
    const resources = buildResources(actionRecords);
    const executionCount = actionRecords.reduce((sum, r) => sum + r.executionCount, 0);
    
    actions.push({
      code: actionCode,
      description: actionRecords[0]?.actionDescription,
      resources,
      executionCount,
      isDeleted: false, // Sera synchronisé avec Steps 1/2
      isRestricted: false,
      restrictedByAction: false,
    });
  }
  
  return actions;
}

/**
 * Construit les ressources pour une action
 */
function buildResources(records: UserSodRawRecord[]): SodResource[] {
  // Regrouper par ressource
  const resourceMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!resourceMap.has(record.resource)) {
      resourceMap.set(record.resource, []);
    }
    resourceMap.get(record.resource)!.push(record);
  }
  
  const resources: SodResource[] = [];
  
  for (const [resourceCode, resourceRecords] of resourceMap) {
    const externalResources = buildExternalResources(resourceRecords);
    
    resources.push({
      code: resourceCode,
      description: resourceRecords[0]?.resourceDescription,
      externalResources,
      isDeleted: false,
      isRestricted: false,
    });
  }
  
  return resources;
}

/**
 * Construit les ressources externes
 */
function buildExternalResources(records: UserSodRawRecord[]): SodExternalResource[] {
  // Regrouper par ressource externe
  const extResourceMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!extResourceMap.has(record.resourceExtn)) {
      extResourceMap.set(record.resourceExtn, []);
    }
    extResourceMap.get(record.resourceExtn)!.push(record);
  }
  
  const externalResources: SodExternalResource[] = [];
  
  for (const [extCode, extRecords] of extResourceMap) {
    const values: SodValue[] = extRecords.map(r => ({
      valueFrom: r.valueFrom,
      valueTo: r.valueTo,
    }));
    
    externalResources.push({
      code: extCode,
      description: extRecords[0]?.resourceExtnDesc,
      values,
    });
  }
  
  return externalResources;
}

// ============================================
// CONSTRUCTION MODE "PAR TRANSACTION"
// ============================================

/**
 * Construit les risques en mode "Par Transaction"
 * User → Risque → Fonction → Action → Rôle
 */
function buildRisksByTransaction(records: UserSodRawRecord[]): UserSodRiskByTransaction[] {
  // Regrouper par risque
  const riskMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!riskMap.has(record.accessRiskId)) {
      riskMap.set(record.accessRiskId, []);
    }
    riskMap.get(record.accessRiskId)!.push(record);
  }
  
  const risks: UserSodRiskByTransaction[] = [];
  
  for (const [riskId, riskRecords] of riskMap) {
    const functions = buildFunctionsByTransaction(riskRecords);
    
    const riskLevel = normalizeRiskLevel(riskRecords[0]?.riskLevel || '');
    const functionCount = functions.length;
    const totalActionCount = functions.reduce((sum, f) => sum + f.actionCount, 0);
    const totalExecutionCount = riskRecords.reduce((sum, r) => sum + r.executionCount, 0);
    
    risks.push({
      riskId,
      riskLevel,
      riskDescription: riskRecords[0]?.riskDescription,
      functions,
      functionCount,
      totalActionCount,
      totalExecutionCount,
      isRemediated: false,
      remediationPercentage: 0,
    });
  }
  
  // Trier par niveau de risque
  risks.sort((a, b) => {
    const levelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return levelOrder[a.riskLevel] - levelOrder[b.riskLevel];
  });
  
  return risks;
}

/**
 * Construit les fonctions en mode "Par Transaction"
 */
function buildFunctionsByTransaction(records: UserSodRawRecord[]): UserSodFunctionByTransaction[] {
  // Regrouper par fonction
  const funcMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!funcMap.has(record.function)) {
      funcMap.set(record.function, []);
    }
    funcMap.get(record.function)!.push(record);
  }
  
  const functions: UserSodFunctionByTransaction[] = [];
  
  for (const [funcCode, funcRecords] of funcMap) {
    const actions = buildActionsByTransaction(funcRecords);
    
    functions.push({
      code: funcCode,
      description: funcRecords[0]?.functionDescription,
      system: funcRecords[0]?.system || '',
      actions,
      actionCount: actions.length,
      totalExecutionCount: funcRecords.reduce((sum, r) => sum + r.executionCount, 0),
    });
  }
  
  return functions;
}

/**
 * Construit les actions en mode "Par Transaction"
 */
function buildActionsByTransaction(records: UserSodRawRecord[]): UserSodActionByTransaction[] {
  // Regrouper par action
  const actionMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    if (!actionMap.has(record.action)) {
      actionMap.set(record.action, []);
    }
    actionMap.get(record.action)!.push(record);
  }
  
  const actions: UserSodActionByTransaction[] = [];
  
  for (const [actionCode, actionRecords] of actionMap) {
    const roles = buildRolesForAction(actionRecords);
    const executionCount = actionRecords.reduce((sum, r) => sum + r.executionCount, 0);
    
    actions.push({
      code: actionCode,
      description: actionRecords[0]?.actionDescription,
      executionCount,
      roles,
      isDeleted: false,
      isRestricted: false,
    });
  }
  
  return actions;
}

/**
 * Construit les rôles pour une action (mode Transaction)
 */
function buildRolesForAction(records: UserSodRawRecord[]): UserSodRoleForAction[] {
  // Regrouper par rôle (simple ou composite)
  const roleMap = new Map<string, UserSodRawRecord[]>();
  
  for (const record of records) {
    const roleKey = !isEmpty(record.compositeBusinessRole)
      ? `composite:${record.compositeBusinessRole}|${record.roleProfile}`
      : `simple:${record.roleProfile}`;
    
    if (!roleMap.has(roleKey)) {
      roleMap.set(roleKey, []);
    }
    roleMap.get(roleKey)!.push(record);
  }
  
  const roles: UserSodRoleForAction[] = [];
  
  for (const [roleKey, roleRecords] of roleMap) {
    const isComposite = roleKey.startsWith('composite:');
    const roleName = roleRecords[0].roleProfile;
    const parentComposite = isComposite ? roleRecords[0].compositeBusinessRole : undefined;
    
    const resources = buildResources(roleRecords);
    
    roles.push({
      roleName,
      roleDescription: roleRecords[0]?.roleProfileDescription,
      roleType: isComposite ? 'COMPOSITE' : 'SIMPLE',
      parentCompositeRole: parentComposite,
      resources,
      isDeleted: false,
      isRestricted: false,
      isExcluded: false,
    });
  }
  
  return roles;
}

// ============================================
// MÉTRIQUES ET SESSION
// ============================================

/**
 * Calcule les métriques pour l'analyse utilisateur
 */
export function calculateUserSodMetrics(
  users: UserSodEntry[], 
  riskyRoles: UserSodRiskyRole[]
): UserSodMetrics {
  const risksByLevel: Record<SodRiskLevel, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  
  const risksBySystem = new Map<string, number>();
  let totalRisks = 0;
  let totalFunctions = 0;
  let totalActions = 0;
  let totalExecutions = 0;
  
  for (const user of users) {
    totalExecutions += user.totalExecutionCount;
    
    for (const risk of user.risksByRole) {
      totalRisks++;
      risksByLevel[risk.riskLevel]++;
      
      for (const func of risk.functions) {
        totalFunctions++;
        
        // Compter les systèmes
        const system = func.system || 'Inconnu';
        risksBySystem.set(system, (risksBySystem.get(system) || 0) + 1);
        
        // Compter les actions
        for (const cr of func.compositeRoles) {
          for (const sr of cr.simpleRoles) {
            totalActions += sr.actionCount;
          }
        }
        for (const sr of func.simpleRoles) {
          totalActions += sr.actionCount;
        }
      }
    }
  }
  
  const riskySimpleRolesCount = riskyRoles.filter(r => r.roleType === 'SIMPLE').length;
  const riskyCompositeRolesCount = riskyRoles.filter(r => r.roleType === 'COMPOSITE').length;
  
  return {
    totalUsers: users.length,
    totalRisks,
    totalFunctions,
    totalActions,
    totalExecutions,
    risksByLevel,
    risksBySystem: Object.fromEntries(risksBySystem),
    riskySimpleRolesCount,
    riskyCompositeRolesCount,
    averageRisksPerUser: users.length > 0 ? Math.round(totalRisks / users.length * 10) / 10 : 0,
    averageExecutionsPerUser: users.length > 0 ? Math.round(totalExecutions / users.length) : 0,
  };
}

/**
 * Construit une session d'analyse utilisateur complète
 */
export function buildUserSodSession(
  records: UserSodRawRecord[],
  filteringStats: UserSodFilteringStats,
  sourceFile: { fileName: string; fileSize: number; uploadDate: Date }
): UserSodAnalysisSession {
  // 1. Identifier les rôles risqués
  const riskyRoles = identifyRiskyRoles(records);
  filteringStats.riskyRolesIdentified = riskyRoles.length;
  
  // 2. Construire les hiérarchies utilisateurs
  const users = buildUserHierarchyByRole(records);
  
  // 3. Calculer les métriques
  const metrics = calculateUserSodMetrics(users, riskyRoles);
  
  return {
    sourceFile,
    filteringStats,
    users,
    riskyRoles,
    metrics,
    displayMode: 'BY_ROLE', // Mode par défaut
  };
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Normalise le niveau de risque
 */
function normalizeRiskLevel(riskLevel: string): SodRiskLevel {
  const normalized = riskLevel.toLowerCase().trim();
  return SOD_RISK_LEVEL_MAPPING[normalized] || 'LOW';
}

/**
 * Vérifie si une valeur est vide
 */
function isEmpty(value: any): boolean {
  return value === undefined || value === null || value === '' || String(value).trim() === '';
}

/**
 * Retourne le niveau de risque le plus élevé
 */
function getHighestRiskLevel(levels: SodRiskLevel[]): SodRiskLevel {
  const order: SodRiskLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  
  for (const level of order) {
    if (levels.includes(level)) {
      return level;
    }
  }
  
  return 'LOW';
}

