import { useMemo } from 'react';
import { SimplifiedAnalysisResult, CoverageAnalysis, SimpleRoleTransaction } from 'lib/types/roleAnalysis';

/**
 * Hook pour calculer et mettre en cache les données statiques de l'analyse
 * Ces données ne changent jamais après le chargement du fichier Excel
 */

export interface StaticAnalysisData {
  // Cache des scores statiques par rôle
  staticScoresCache: Map<string, {
    sizeScore: number;
    usageFrequency: number;
    totalRoleTransactions: number;
    originalCoveredCount: number;
    simpleRoleExecutions: number;
    totalBusinessRoleExecutions: number;
  }>;
  
  // Cache des détails par rôle business
  businessRoleDataCache: Map<string, {
    businessRoleTxSet: Set<string>;
    txExecutionMap: Map<string, number>;
    currentBusinessRoleTransactions: any[];
    originalTransactions: string[];
    maxAchievableInfo: {
      orphanTransactions: string[];
      maxAchievableTransactions: number;
      totalTransactions: number;
    };
  }>;
  
  // Cache global des transactions par rôle simple
  transactionsByRoleCache: Map<string, string[]>;
  
  // Cache des détails fixes par transaction
  transactionDetailsCache: Map<string, {
    covered: string[];
    nonUtilisees: string[];
    nonCouvertes: string[];
    orphelines: string[];
    total: number;
  }>;
}

export const useStaticAnalysisData = (
  analysisResult: SimplifiedAnalysisResult | null
): StaticAnalysisData => {
  
  return useMemo(() => {
    if (!analysisResult) {
      return {
        staticScoresCache: new Map(),
        businessRoleDataCache: new Map(),
        transactionsByRoleCache: new Map(),
        transactionDetailsCache: new Map(),
      };
    }

    const startTime = Date.now();
    
    // 🎯 CACHE 1 : Transactions par rôle simple (global)
    const transactionsByRoleCache = new Map<string, string[]>();
    if (analysisResult.simpleRoleTransactions) {
      analysisResult.simpleRoleTransactions.forEach(t => {
        if (!transactionsByRoleCache.has(t.simpleRole)) {
          transactionsByRoleCache.set(t.simpleRole, []);
        }
        transactionsByRoleCache.get(t.simpleRole)!.push(t.transaction);
      });
    }

    // 🎯 CACHE 2 : Données par rôle métier
    const businessRoleDataCache = new Map<string, any>();
    const staticScoresCache = new Map<string, any>();
    const transactionDetailsCache = new Map<string, any>();

    analysisResult.coverageAnalyses.forEach((analysis: CoverageAnalysis) => {
      const businessRole = analysis.businessRole;
      
      // Filtrer les transactions pour ce rôle métier spécifique
      const currentBusinessRoleTransactions = analysisResult.businessRoleTransactions.filter(tx => 
        tx.businessRole === businessRole
      );
      
      const businessRoleTxSet = new Set(currentBusinessRoleTransactions.map(tx => tx.transaction));
      const txExecutionMap = new Map<string, number>();
      currentBusinessRoleTransactions.forEach((tx: any) => {
        txExecutionMap.set(tx.transaction, tx.executionCount || 0);
      });

      // Calculer les données maximales atteignables
      const allCoverableTransactions = new Set<string>();
      analysis.simpleRoles.forEach(role => {
        (role.coveredTransactions || []).forEach(tx => {
          allCoverableTransactions.add(tx);
        });
      });
      
      const orphanTransactions = analysis.uniqueTransactions.filter(tx => {
        return !allCoverableTransactions.has(tx);
      });
      
      const maxAchievableTransactions = analysis.uniqueTransactions.length - orphanTransactions.length;

      // Stocker les données du rôle métier
      businessRoleDataCache.set(businessRole, {
        businessRoleTxSet,
        txExecutionMap,
        currentBusinessRoleTransactions,
        originalTransactions: currentBusinessRoleTransactions.map(tx => tx.transaction),
        maxAchievableInfo: {
          orphanTransactions,
          maxAchievableTransactions,
          totalTransactions: analysis.uniqueTransactions.length
        }
      });

      // 🎯 CACHE 3 : Scores statiques par rôle simple
      analysis.simpleRoles.forEach(role => {
        const cacheKey = `${businessRole}:${role.roleName}`;
        
        // Récupérer toutes les transactions du rôle simple
        const allSimpleRoleTx = transactionsByRoleCache.get(role.roleName) || [];
        
        // Calculs statiques qui ne changent jamais
        const totalRoleTransactions = allSimpleRoleTx.length;
        const originalCoveredCount = role.coveredTransactions?.length || 0;
        
        // Calcul de la fréquence d'exécution totale du rôle simple
        let simpleRoleExecutions = 0;
        if (analysisResult.simpleRoleTransactions) {
          // Récupérer toutes les transactions de ce rôle simple
          const simpleRoleTransactionNames = analysisResult.simpleRoleTransactions
            .filter(tx => tx.simpleRole === role.roleName)
            .map(tx => tx.transaction);
          
          // Pour chaque transaction du rôle simple, additionner son executionCount depuis businessRoleTransactions
          simpleRoleTransactionNames.forEach(transactionName => {
            const businessRoleTx = currentBusinessRoleTransactions.find(tx => tx.transaction === transactionName);
            if (businessRoleTx) {
              simpleRoleExecutions += businessRoleTx.executionCount || 0;
            }
          });
        }
        
        // Calcul du total d'exécutions du rôle métier
        const totalBusinessRoleExecutions = currentBusinessRoleTransactions
          .reduce((sum: number, tx: any) => sum + (tx.executionCount || 0), 0);
        
        // Score d'usage global (basé sur les exécutions totales)
        const usageFrequency = totalBusinessRoleExecutions > 0 
          ? (simpleRoleExecutions / totalBusinessRoleExecutions) * 100
          : 0;

        staticScoresCache.set(cacheKey, {
          // Note: sizeScore supprimé car maintenant calculé dynamiquement
          usageFrequency,
          totalRoleTransactions,
          originalCoveredCount,
          simpleRoleExecutions,
          totalBusinessRoleExecutions
        });

        // 🎯 CACHE 4 : Détails statiques des transactions
        const detailsCacheKey = `${businessRole}:${role.roleName}:static`;
        
        const nonUtilisees = allSimpleRoleTx.filter(tx => 
          !businessRoleTxSet.has(tx)
        );
        
        transactionDetailsCache.set(detailsCacheKey, {
          covered: role.coveredTransactions || [],
          nonUtilisees,
          nonCouvertes: [], // Sera calculé dynamiquement
          orphelines: [], // Sera calculé dynamiquement
          total: (role.coveredTransactions?.length || 0) + nonUtilisees.length
        });
      });
    });

    const endTime = Date.now();

    return {
      staticScoresCache,
      businessRoleDataCache,
      transactionsByRoleCache,
      transactionDetailsCache,
    };
  }, [analysisResult]);
}; 