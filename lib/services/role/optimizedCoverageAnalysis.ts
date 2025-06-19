import { BusinessRoleTransaction, SimpleRoleTransaction, CoverageAnalysis, SimpleRoleCoverage } from 'lib/types/roleAnalysis';

/**
 * 🚀 OPTIMISATION 3 : Version super optimisée de calculateCoverageAnalysis
 * Utilise le cache pour éviter les re-calculs et sépare les données statiques des dynamiques
 */
export function calculateCoverageAnalysisOptimized(
  businessRoleTransactions: BusinessRoleTransaction[],
  simpleRoleTransactions: SimpleRoleTransaction[],
  selectedRoles: Set<string>,
  staticMetrics: any,
  transactionsLookup: Map<string, any[]>,
  minCoverageThreshold: number = 0
): CoverageAnalysis[] {
  
  // Si nous avons des métriques statiques en cache, les utiliser
  if (staticMetrics && transactionsLookup) {
    return calculateWithCachedData(businessRoleTransactions, simpleRoleTransactions, selectedRoles, staticMetrics, transactionsLookup, minCoverageThreshold);
  }

  // Fallback vers la méthode classique si pas de cache
  return calculateCoverageAnalysisClassic(businessRoleTransactions, simpleRoleTransactions, minCoverageThreshold);
}

/**
 * Calcul optimisé avec données en cache
 */
function calculateWithCachedData(
  businessRoleTransactions: BusinessRoleTransaction[],
  simpleRoleTransactions: SimpleRoleTransaction[],
  selectedRoles: Set<string>,
  staticMetrics: any,
  transactionsLookup: Map<string, any[]>,
  minCoverageThreshold: number
): CoverageAnalysis[] {

  // 🚀 OPTIMISATION : Grouper les rôles simples une seule fois
  const simpleRoleGroups = new Map<string, SimpleRoleTransaction[]>();
  simpleRoleTransactions.forEach((transaction: SimpleRoleTransaction) => {
    const role = transaction.simpleRole;
    if (!simpleRoleGroups.has(role)) {
      simpleRoleGroups.set(role, []);
    }
    simpleRoleGroups.get(role)!.push(transaction);
  });

  // 🚀 OPTIMISATION : Grouper les transactions métier une seule fois
  const businessRoleGroups = new Map<string, BusinessRoleTransaction[]>();
  businessRoleTransactions.forEach((transaction: BusinessRoleTransaction) => {
    const role = transaction.businessRole;
    if (!businessRoleGroups.has(role)) {
      businessRoleGroups.set(role, []);
    }
    businessRoleGroups.get(role)!.push(transaction);
  });

  const analyses: CoverageAnalysis[] = [];

  // Pour chaque rôle métier, utiliser les données pré-calculées
  businessRoleGroups.forEach((transactions: BusinessRoleTransaction[], businessRole: string) => {
    
    // 🚀 UTILISER LES DONNÉES STATIQUES DU CACHE
    const businessRoleMetrics = staticMetrics.find((m: any) => m.businessRole === businessRole);
    if (!businessRoleMetrics) {
      // Fallback vers calcul classique si pas de métrique
      return;
    }

    const totalTransactions = businessRoleMetrics.totalTransactions;
    const uniqueTransactions = [...new Set(transactions.map(t => t.transaction))];

    // 🚀 OPTIMISATION : Pré-calculer les maps de lookup
    const businessTransactionSet = new Set(uniqueTransactions);
    const executionFrequencyMap = new Map<string, number>();
    
    transactions.forEach((transaction: BusinessRoleTransaction) => {
      const freq = executionFrequencyMap.get(transaction.transaction) || 0;
      executionFrequencyMap.set(transaction.transaction, freq + (transaction.executionFrequency || 1));
    });

    // 🚀 CALCUL RAPIDE : Identifier les rôles simples pertinents
    const relevantSimpleRoles = new Map<string, { transactions: Set<string>; intersectionSize: number; }>();
    
    simpleRoleGroups.forEach((simpleTransactions: SimpleRoleTransaction[], simpleRole: string) => {
      const simpleRoleTransactionSet = new Set(simpleTransactions.map(t => t.transaction));
      
      // Calculer l'intersection directement
      let intersectionSize = 0;
      simpleRoleTransactionSet.forEach(transaction => {
        if (businessTransactionSet.has(transaction)) {
          intersectionSize++;
        }
      });

      // Seulement garder les rôles avec intersection
      if (intersectionSize > 0) {
        relevantSimpleRoles.set(simpleRole, {
          transactions: simpleRoleTransactionSet,
          intersectionSize
        });
      }
    });

    // 🚀 GÉNÉRATION RAPIDE : Créer les objets de couverture
    const simpleRoles: SimpleRoleCoverage[] = [];
    
    relevantSimpleRoles.forEach((roleData: { transactions: Set<string>; intersectionSize: number; }, simpleRole: string) => {
      const { transactions: simpleRoleTransactionSet, intersectionSize } = roleData;
      
      const coveragePercentage = totalTransactions > 0 
        ? Math.round((intersectionSize / totalTransactions) * 100)
        : 0;

      // Appliquer le seuil minimum
      if (coveragePercentage >= minCoverageThreshold) {
        
        // Calcul rapide des transactions couvertes/non couvertes
        const coveredTransactions: string[] = [];
        const uncoveredTransactions: string[] = [];
        
        uniqueTransactions.forEach((transaction: string) => {
          if (simpleRoleTransactionSet.has(transaction)) {
            coveredTransactions.push(transaction);
          } else {
            uncoveredTransactions.push(transaction);
          }
        });

        // Calcul rapide de la fréquence d'exécution
        let executionFrequency = 0;
        coveredTransactions.forEach((transaction: string) => {
          executionFrequency += executionFrequencyMap.get(transaction) || 1;
        });

        simpleRoles.push({
          roleName: simpleRole,
          coveragePercentage,
          coveredTransactions,
          uncoveredTransactions,
          isSelected: selectedRoles.has(simpleRole), // 🚀 ÉTAT SYNCHRONISÉ
          executionFrequency
        });
      }
    });

    // Tri optimisé
    simpleRoles.sort((a, b) => {
      const coverageDiff = b.coveragePercentage - a.coveragePercentage;
      if (coverageDiff !== 0) return coverageDiff;
      return (b.executionFrequency || 0) - (a.executionFrequency || 0);
    });

    analyses.push({
      businessRole,
      totalTransactions,
      uniqueTransactions,
      simpleRoles
    });
  });

  return analyses;
}

/**
 * Méthode classique comme fallback
 */
function calculateCoverageAnalysisClassic(
  businessRoleTransactions: BusinessRoleTransaction[],
  simpleRoleTransactions: SimpleRoleTransaction[],
  minCoverageThreshold: number
): CoverageAnalysis[] {
  
  // Implémentation classique simplifiée pour le fallback
  const businessRoleGroups = new Map<string, BusinessRoleTransaction[]>();
  const simpleRoleGroups = new Map<string, SimpleRoleTransaction[]>();
  
  businessRoleTransactions.forEach((transaction: BusinessRoleTransaction) => {
    const role = transaction.businessRole;
    if (!businessRoleGroups.has(role)) {
      businessRoleGroups.set(role, []);
    }
    businessRoleGroups.get(role)!.push(transaction);
  });
  
  simpleRoleTransactions.forEach((transaction: SimpleRoleTransaction) => {
    const role = transaction.simpleRole;
    if (!simpleRoleGroups.has(role)) {
      simpleRoleGroups.set(role, []);
    }
    simpleRoleGroups.get(role)!.push(transaction);
  });
  
  const analyses: CoverageAnalysis[] = [];
  
  businessRoleGroups.forEach((transactions: BusinessRoleTransaction[], businessRole: string) => {
    const totalTransactions = transactions.length;
    const uniqueTransactions = [...new Set(transactions.map(t => t.transaction))];
    const businessTransactionSet = new Set(uniqueTransactions);
    
    const simpleRoles: SimpleRoleCoverage[] = [];
    
    simpleRoleGroups.forEach((simpleTransactions: SimpleRoleTransaction[], simpleRole: string) => {
      const simpleRoleTransactionSet = new Set(simpleTransactions.map(t => t.transaction));
      
      let intersectionSize = 0;
      simpleRoleTransactionSet.forEach(transaction => {
        if (businessTransactionSet.has(transaction)) {
          intersectionSize++;
        }
      });
      
      const coveragePercentage = totalTransactions > 0 
        ? Math.round((intersectionSize / totalTransactions) * 100)
        : 0;
      
      if (coveragePercentage >= minCoverageThreshold) {
        const coveredTransactions: string[] = [];
        const uncoveredTransactions: string[] = [];
        
        uniqueTransactions.forEach((transaction: string) => {
          if (simpleRoleTransactionSet.has(transaction)) {
            coveredTransactions.push(transaction);
          } else {
            uncoveredTransactions.push(transaction);
          }
        });
        
        simpleRoles.push({
          roleName: simpleRole,
          coveragePercentage,
          coveredTransactions,
          uncoveredTransactions,
          isSelected: false,
          executionFrequency: 0
        });
      }
    });
    
    simpleRoles.sort((a, b) => b.coveragePercentage - a.coveragePercentage);
    
    analyses.push({
      businessRole,
      totalTransactions,
      uniqueTransactions,
      simpleRoles
    });
  });
  
  return analyses;
}

/**
 * 🚀 OPTIMISATION 4 : Calcul incrémental des sélections
 * Met à jour seulement les rôles affectés par un changement de sélection
 */
export function updateCoverageAnalysisSelections(
  existingAnalyses: CoverageAnalysis[],
  businessRole: string,
  selectedRoles: Set<string>
): CoverageAnalysis[] {
  return existingAnalyses.map(analysis => {
    if (analysis.businessRole === businessRole) {
      // Mettre à jour seulement ce rôle métier
      return {
        ...analysis,
        simpleRoles: analysis.simpleRoles.map(role => ({
          ...role,
          isSelected: selectedRoles.has(role.roleName)
        }))
      };
    }
    return analysis; // Garder les autres inchangés
  });
} 