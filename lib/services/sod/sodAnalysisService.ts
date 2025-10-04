 /**
 * Service d'analyse SoD - Construction des hiérarchies
 * 
 * Responsabilités :
 * 1. Construire la hiérarchie pour Rôles Simples
 * 2. Construire la hiérarchie pour Rôles Composites
 * 3. Calculer les métriques
 */

import {
    SodRawRecord,
    SodSimpleRole,
    SodCompositeRole,
    SodSimpleRoleMetrics,
    SodCompositeRoleMetrics,
    SodRiskLevel,
    SodSimpleRoleRiskItem,
    SodCompositeRoleRiskItem,
    SodSimpleRoleFunction,
    SodCompositeRoleFunction,
    SodAction,
    SodResource,
    SodExternalResource,
    SodValue,
    SodSimpleRoleInComposite,
    SodSimpleRoleAction,
    SOD_RISK_LEVEL_MAPPING,
    SodHierarchyBuildOptions,
  } from 'lib/types/sodAnalysis';
  
  /**
   * Options par défaut pour la construction des hiérarchies
   */
  const DEFAULT_BUILD_OPTIONS: SodHierarchyBuildOptions = {
    includeDescriptions: true,
    calculateMetrics: true,
    sortByRiskLevel: true,
  };
  
  /**
   * Ordre de priorité des niveaux de risque (pour tri)
   */
  const RISK_LEVEL_PRIORITY: Record<SodRiskLevel, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  
  /**
   * Normalise le niveau de risque
   */
  function normalizeRiskLevel(riskLevel: string): SodRiskLevel {
    const normalized = riskLevel.toLowerCase().trim();
    return SOD_RISK_LEVEL_MAPPING[normalized] || 'LOW';
  }
  
  /**
   * Détermine le niveau de risque le plus élevé
   */
  function getHighestRiskLevel(levels: SodRiskLevel[]): SodRiskLevel {
    if (levels.length === 0) return 'LOW';
    
    return levels.reduce((highest, current) => {
      return RISK_LEVEL_PRIORITY[current] > RISK_LEVEL_PRIORITY[highest] ? current : highest;
    }, levels[0]);
  }
  
  /**
   * Construit la hiérarchie pour les RÔLES SIMPLES
   * 
   * Hiérarchie : Rôle → Risque → Fonction → Action → Resource → External Resource → Valeurs
   */
  export function buildSimpleRoleHierarchy(
    records: SodRawRecord[],
    options: Partial<SodHierarchyBuildOptions> = {}
  ): SodSimpleRole[] {
    const opts = { ...DEFAULT_BUILD_OPTIONS, ...options };
    
    // Grouper par rôle
    const roleMap = new Map<string, SodRawRecord[]>();
    
    for (const record of records) {
      const roleName = record.roleName.trim();
      if (!roleMap.has(roleName)) {
        roleMap.set(roleName, []);
      }
      roleMap.get(roleName)!.push(record);
    }
    
    // Construire la hiérarchie pour chaque rôle
    const roles: SodSimpleRole[] = [];
    
    for (const [roleName, roleRecords] of Array.from(roleMap.entries())) {
      // Grouper par risque
      const riskMap = new Map<string, SodRawRecord[]>();
      
      for (const record of roleRecords) {
        const riskId = record.accessRiskId.trim();
        if (!riskMap.has(riskId)) {
          riskMap.set(riskId, []);
        }
        riskMap.get(riskId)!.push(record);
      }
      
      // Construire les risques
      const risks: SodSimpleRoleRiskItem[] = [];
      
      for (const [riskId, riskRecords] of Array.from(riskMap.entries())) {
        const riskLevel = normalizeRiskLevel(riskRecords[0].riskLevel);
        const riskDescription = opts.includeDescriptions ? riskRecords[0].riskDescription : undefined;
        
        // Grouper par fonction
        const functionMap = new Map<string, SodRawRecord[]>();
        
        for (const record of riskRecords) {
          const functionKey = `${record.function}|${record.system}`;
          if (!functionMap.has(functionKey)) {
            functionMap.set(functionKey, []);
          }
          functionMap.get(functionKey)!.push(record);
        }
        
        // Construire les fonctions
        const functions: SodSimpleRoleFunction[] = [];
        
        for (const [functionKey, functionRecords] of Array.from(functionMap.entries())) {
          const firstRecord = functionRecords[0];
          const functionCode = firstRecord.function.trim();
          const system = firstRecord.system.trim();
          const functionDescription = opts.includeDescriptions ? firstRecord.functionDescription : undefined;
          
          // Grouper par action
          const actionMap = new Map<string, SodRawRecord[]>();
          
          for (const record of functionRecords) {
            const actionCode = record.action.trim();
            if (!actionMap.has(actionCode)) {
              actionMap.set(actionCode, []);
            }
            actionMap.get(actionCode)!.push(record);
          }
          
          // Construire les actions
          const actions: SodAction[] = [];
          
          for (const [actionCode, actionRecords] of Array.from(actionMap.entries())) {
            const actionDescription = opts.includeDescriptions ? actionRecords[0].actionDescription : undefined;
            
            // Grouper par resource
            const resourceMap = new Map<string, SodRawRecord[]>();
            
            for (const record of actionRecords) {
              const resourceCode = record.resource.trim();
              if (!resourceMap.has(resourceCode)) {
                resourceMap.set(resourceCode, []);
              }
              resourceMap.get(resourceCode)!.push(record);
            }
            
            // Construire les resources
            const resources: SodResource[] = [];
            
            for (const [resourceCode, resourceRecords] of Array.from(resourceMap.entries())) {
              const resourceDescription = opts.includeDescriptions ? resourceRecords[0].resourceDescription : undefined;
              
              // Grouper par external resource
              const externalResourceMap = new Map<string, SodRawRecord[]>();
              
              for (const record of resourceRecords) {
                const externalResourceCode = record.resourceExtn.trim();
                if (!externalResourceMap.has(externalResourceCode)) {
                  externalResourceMap.set(externalResourceCode, []);
                }
                externalResourceMap.get(externalResourceCode)!.push(record);
              }
              
              // Construire les external resources
              const externalResources: SodExternalResource[] = [];
              
              for (const [externalResourceCode, externalResourceRecords] of Array.from(externalResourceMap.entries())) {
                const externalResourceDescription = opts.includeDescriptions ? externalResourceRecords[0].resourceExtnDesc : undefined;
                
                // Construire les valeurs
                const values: SodValue[] = externalResourceRecords.map((record: SodRawRecord) => ({
                  valueFrom: record.valueFrom.trim(),
                  valueTo: record.valueTo.trim(),
                }));
                
                externalResources.push({
                  code: externalResourceCode,
                  description: externalResourceDescription,
                  values,
                });
              }
              
              resources.push({
                code: resourceCode,
                description: resourceDescription,
                externalResources,
              });
            }
            
            actions.push({
              code: actionCode,
              description: actionDescription,
              resources,
            });
          }
          
          functions.push({
            code: functionCode,
            description: functionDescription,
            system,
            actions,
            actionCount: actions.length,
          });
        }
        
        // Compter les actions totales
        const totalActionCount = functions.reduce((sum, func) => sum + func.actions.length, 0);
        
        risks.push({
          riskId,
          riskLevel,
          riskDescription,
          functions,
          functionCount: functions.length,
          totalActionCount,
        });
      }
      
      // Trier les risques par niveau si demandé
      if (opts.sortByRiskLevel) {
        risks.sort((a, b) => RISK_LEVEL_PRIORITY[b.riskLevel] - RISK_LEVEL_PRIORITY[a.riskLevel]);
      }
      
      // Déterminer le niveau de risque le plus élevé
      const riskLevels = risks.map(r => r.riskLevel);
      const highestRiskLevel = getHighestRiskLevel(riskLevels);
      
      // Obtenir la description du rôle (du premier enregistrement)
      const roleDescription = opts.includeDescriptions ? roleRecords[0].roleProfileDescription : undefined;
      
      roles.push({
        roleName,
        roleDescription,
        risks,
        riskCount: risks.length,
        highestRiskLevel,
      });
    }
    
    return roles;
  }
  
  /**
   * Construit la hiérarchie pour les RÔLES COMPOSITES
   * 
   * Hiérarchie : Rôle → Risque → Fonction → Rôle Simple → Action → Resource → External Resource → Valeurs
   */
  export function buildCompositeRoleHierarchy(
    records: SodRawRecord[],
    options: Partial<SodHierarchyBuildOptions> = {}
  ): SodCompositeRole[] {
    const opts = { ...DEFAULT_BUILD_OPTIONS, ...options };
    
    // Grouper par rôle composite
    const roleMap = new Map<string, SodRawRecord[]>();
    
    for (const record of records) {
      const compositeRoleName = record.compositeBusinessRole.trim();
      if (!roleMap.has(compositeRoleName)) {
        roleMap.set(compositeRoleName, []);
      }
      roleMap.get(compositeRoleName)!.push(record);
    }
    
    // Construire la hiérarchie pour chaque rôle composite
    const roles: SodCompositeRole[] = [];
    
    for (const [compositeRoleName, roleRecords] of Array.from(roleMap.entries())) {
      // Grouper par risque
      const riskMap = new Map<string, SodRawRecord[]>();
      
      for (const record of roleRecords) {
        const riskId = record.accessRiskId.trim();
        if (!riskMap.has(riskId)) {
          riskMap.set(riskId, []);
        }
        riskMap.get(riskId)!.push(record);
      }
      
      // Construire les risques
      const risks: SodCompositeRoleRiskItem[] = [];
      const involvedSimpleRoles = new Set<string>();
      
      for (const [riskId, riskRecords] of Array.from(riskMap.entries())) {
        const riskLevel = normalizeRiskLevel(riskRecords[0].riskLevel);
        const riskDescription = opts.includeDescriptions ? riskRecords[0].riskDescription : undefined;
        
        // Grouper par fonction
        const functionMap = new Map<string, SodRawRecord[]>();
        
        for (const record of riskRecords) {
          const functionKey = `${record.function}|${record.system}`;
          if (!functionMap.has(functionKey)) {
            functionMap.set(functionKey, []);
          }
          functionMap.get(functionKey)!.push(record);
        }
        
        // Construire les fonctions
        const functions: SodCompositeRoleFunction[] = [];
        
        for (const [functionKey, functionRecords] of Array.from(functionMap.entries())) {
          const firstRecord = functionRecords[0];
          const functionCode = firstRecord.function.trim();
          const system = firstRecord.system.trim();
          const functionDescription = opts.includeDescriptions ? firstRecord.functionDescription : undefined;
          
          // Grouper par rôle simple (roleProfile)
          const simpleRoleMap = new Map<string, SodRawRecord[]>();
          
          for (const record of functionRecords) {
            const simpleRoleName = record.roleProfile.trim();
            if (!simpleRoleMap.has(simpleRoleName)) {
              simpleRoleMap.set(simpleRoleName, []);
            }
            simpleRoleMap.get(simpleRoleName)!.push(record);
            
            // Ajouter au set des rôles simples impliqués
            involvedSimpleRoles.add(simpleRoleName);
          }
          
          // Construire les rôles simples
          const simpleRoles: SodSimpleRoleInComposite[] = [];
          
          for (const [simpleRoleName, simpleRoleRecords] of Array.from(simpleRoleMap.entries())) {
            const roleDescription = opts.includeDescriptions ? simpleRoleRecords[0].roleProfileDescription : undefined;
            
            // Grouper par action
            const actionMap = new Map<string, SodRawRecord[]>();
            
            for (const record of simpleRoleRecords) {
              const actionCode = record.action.trim();
              if (!actionMap.has(actionCode)) {
                actionMap.set(actionCode, []);
              }
              actionMap.get(actionCode)!.push(record);
            }
            
            // Construire les actions
            const actions: SodSimpleRoleAction[] = [];
            
            for (const [actionCode, actionRecords] of Array.from(actionMap.entries())) {
              const actionDescription = opts.includeDescriptions ? actionRecords[0].actionDescription : undefined;
              
              // Grouper par resource
              const resourceMap = new Map<string, SodRawRecord[]>();
              
              for (const record of actionRecords) {
                const resourceCode = record.resource.trim();
                if (!resourceMap.has(resourceCode)) {
                  resourceMap.set(resourceCode, []);
                }
                resourceMap.get(resourceCode)!.push(record);
              }
              
              // Construire les resources
              const resources: SodResource[] = [];
              
              for (const [resourceCode, resourceRecords] of Array.from(resourceMap.entries())) {
                const resourceDescription = opts.includeDescriptions ? resourceRecords[0].resourceDescription : undefined;
                
                // Grouper par external resource
                const externalResourceMap = new Map<string, SodRawRecord[]>();
                
                for (const record of resourceRecords) {
                  const externalResourceCode = record.resourceExtn.trim();
                  if (!externalResourceMap.has(externalResourceCode)) {
                    externalResourceMap.set(externalResourceCode, []);
                  }
                  externalResourceMap.get(externalResourceCode)!.push(record);
                }
                
                // Construire les external resources
                const externalResources: SodExternalResource[] = [];
                
                for (const [externalResourceCode, externalResourceRecords] of Array.from(externalResourceMap.entries())) {
                  const externalResourceDescription = opts.includeDescriptions ? externalResourceRecords[0].resourceExtnDesc : undefined;
                  
                  // Construire les valeurs
                  const values: SodValue[] = externalResourceRecords.map((record: SodRawRecord) => ({
                    valueFrom: record.valueFrom.trim(),
                    valueTo: record.valueTo.trim(),
                  }));
                  
                  externalResources.push({
                    code: externalResourceCode,
                    description: externalResourceDescription,
                    values,
                  });
                }
                
                resources.push({
                  code: resourceCode,
                  description: resourceDescription,
                  externalResources,
                });
              }
              
              actions.push({
                code: actionCode,
                description: actionDescription,
                resources,
              });
            }
            
            // Vérifier si le rôle simple a un risque élevé
            const hasHighRisk = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
            
            simpleRoles.push({
              roleName: simpleRoleName,
              roleDescription,
              actions,
              actionCount: actions.length,
              hasHighRisk,
            });
          }
          
          // Compter les actions totales
          const totalActionCount = simpleRoles.reduce((sum, role) => sum + role.actions.length, 0);
          
          functions.push({
            code: functionCode,
            description: functionDescription,
            system,
            simpleRoles,
            simpleRoleCount: simpleRoles.length,
            totalActionCount,
          });
        }
        
        // Compter les rôles simples et actions totales
        const totalSimpleRoleCount = functions.reduce((sum, func) => sum + func.simpleRoles.length, 0);
        const totalActionCount = functions.reduce((sum, func) => sum + func.totalActionCount, 0);
        
        risks.push({
          riskId,
          riskLevel,
          riskDescription,
          functions,
          functionCount: functions.length,
          totalSimpleRoleCount,
          totalActionCount,
        });
      }
      
      // Trier les risques par niveau si demandé
      if (opts.sortByRiskLevel) {
        risks.sort((a, b) => RISK_LEVEL_PRIORITY[b.riskLevel] - RISK_LEVEL_PRIORITY[a.riskLevel]);
      }
      
      // Déterminer le niveau de risque le plus élevé
      const riskLevels = risks.map(r => r.riskLevel);
      const highestRiskLevel = getHighestRiskLevel(riskLevels);
      
      // Obtenir les descriptions du rôle (du premier enregistrement)
      const roleName = roleRecords[0].roleName.trim();
      const roleDescription = opts.includeDescriptions ? roleRecords[0].roleProfileDescription : undefined;
      const compositeRoleDescription = opts.includeDescriptions ? roleRecords[0].compositeRoleDescription : undefined;
      
      roles.push({
        roleName,
        roleDescription,
        compositeRoleName,
        compositeRoleDescription,
        risks,
        riskCount: risks.length,
        highestRiskLevel,
        involvedSimpleRoleCount: involvedSimpleRoles.size,
      });
    }
    
    return roles;
  }
  
  /**
   * Calcule les métriques pour les rôles simples
   */
  export function calculateSimpleRoleMetrics(roles: SodSimpleRole[]): SodSimpleRoleMetrics {
    const risksByLevel: Record<SodRiskLevel, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    
    const risksBySystem: Record<string, number> = {};
    
    let totalRisks = 0;
    let totalFunctions = 0;
    let totalActions = 0;
    
    for (const role of roles) {
      for (const risk of role.risks) {
        totalRisks++;
        risksByLevel[risk.riskLevel]++;
        
        for (const func of risk.functions) {
          totalFunctions++;
          
          // Compter par système
          if (!risksBySystem[func.system]) {
            risksBySystem[func.system] = 0;
          }
          risksBySystem[func.system]++;
          
          totalActions += func.actions.length;
        }
      }
    }
    
    return {
      totalRoles: roles.length,
      totalRisks,
      totalFunctions,
      totalActions,
      risksByLevel,
      risksBySystem,
      averageRisksPerRole: roles.length > 0 ? totalRisks / roles.length : 0,
      averageFunctionsPerRisk: totalRisks > 0 ? totalFunctions / totalRisks : 0,
    };
  }
  
  /**
   * Calcule les métriques pour les rôles composites
   */
  export function calculateCompositeRoleMetrics(roles: SodCompositeRole[]): SodCompositeRoleMetrics {
    const risksByLevel: Record<SodRiskLevel, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    
    const risksBySystem: Record<string, number> = {};
    
    let totalRisks = 0;
    let totalFunctions = 0;
    let totalSimpleRolesInvolved = 0;
    let totalActions = 0;
    
    for (const role of roles) {
      totalSimpleRolesInvolved += role.involvedSimpleRoleCount;
      
      for (const risk of role.risks) {
        totalRisks++;
        risksByLevel[risk.riskLevel]++;
        
        for (const func of risk.functions) {
          totalFunctions++;
          
          // Compter par système
          if (!risksBySystem[func.system]) {
            risksBySystem[func.system] = 0;
          }
          risksBySystem[func.system]++;
          
          for (const simpleRole of func.simpleRoles) {
            totalActions += simpleRole.actions.length;
          }
        }
      }
    }
    
    return {
      totalCompositeRoles: roles.length,
      totalRisks,
      totalFunctions,
      totalSimpleRolesInvolved,
      totalActions,
      risksByLevel,
      risksBySystem,
      averageRisksPerComposite: roles.length > 0 ? totalRisks / roles.length : 0,
      averageSimpleRolesPerRisk: totalRisks > 0 ? totalSimpleRolesInvolved / totalRisks : 0,
    };
  }
  