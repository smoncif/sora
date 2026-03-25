import { useMemo } from 'react';
import { SimplifiedAnalysisResult, CoverageAnalysis } from 'lib/types/roleAnalysis';
import { AnalysisMode } from 'lib/types/analysis';

declare global {
  interface Window {
    __analysisPrecomputeEndAt?: number;
  }
}

export interface AnalysisCalculationsConfig {
  analysisResult: SimplifiedAnalysisResult | null;
  primaryFilter: string;
  focusedItem: string | null;
  currentPage: number;
  itemsPerPage: number;
  mode: AnalysisMode;
}

export interface AnalysisCalculationsReturn {
  // Données principales
  totalItems: number;
  itemsToShow: CoverageAnalysis[];
  totalPages: number;
  uncoveredTransactionsData: {
    count: number;
    transactions: Array<{ transaction: string; executionCount: number; businessRole: string }>;
    totalExecutions: number;
  };
  
  // Données utilitaires
  filteredItems: CoverageAnalysis[];
  paginationInfo: {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    startIndex: number;
    endIndex: number;
  };
}

/**
 * Hook pour calculer les données d'analyse avec pagination et filtrage
 */
export const useAnalysisCalculations = (
  config: AnalysisCalculationsConfig
): AnalysisCalculationsReturn => {
  // Extraction des paramètres de configuration avec valeurs par défaut
  const { 
    primaryFilter = '', 
    focusedItem = null, 
    currentPage = 0, 
    itemsPerPage = 3 
  } = config;
  const { analysisResult, mode } = config;
  
  // 📊 CALCUL : Éléments totaux
  const totalItems = useMemo(() => {
    return analysisResult?.coverageAnalyses?.length || 0;
  }, [analysisResult]);
  
  // 🔍 CALCUL : Éléments filtrés
  const filteredItems = useMemo(() => {
    if (!analysisResult?.coverageAnalyses) return [];
    
    let filtered = analysisResult.coverageAnalyses;
    
    // Filtre par texte
    if (primaryFilter && primaryFilter.trim()) {
      const filterLower = primaryFilter.toLowerCase();
      filtered = filtered.filter(analysis => 
        analysis.businessRole.toLowerCase().includes(filterLower)
      );
    }
    
    // Filtre par élément focalisé
    if (focusedItem) {
      filtered = filtered.filter(analysis => analysis.businessRole === focusedItem);
    }
    
    return filtered;
  }, [analysisResult, primaryFilter, focusedItem]);
  
  // 📄 CALCUL : Éléments à afficher (avec pagination)
  const itemsToShow = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);
  
  // 📊 CALCUL : Nombre total de pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredItems.length / itemsPerPage);
  }, [filteredItems.length, itemsPerPage]);
  
  // 📈 CALCUL : Données des transactions non couvertes (format compatible OverviewStatsSection)
  const uncoveredTransactionsData = useMemo(() => {
    const precomputeEndAt =
      typeof window !== 'undefined' ? window.__analysisPrecomputeEndAt : undefined;
    const nowAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const delaySincePrecompute =
      precomputeEndAt != null ? Math.round(nowAt - precomputeEndAt) : null;

    if (delaySincePrecompute != null) {
      console.log('⏱️ [analysis] uncoveredTransactionsData start', {
        mode,
        delaySincePrecomputeMs: delaySincePrecompute,
      });
    }

    if (!analysisResult) {
      return {
        count: 0,
        transactions: [],
        totalExecutions: 0
      };
    }
    
    if (mode === 'users') {
      // APPROCHE SIMPLE : Comparer directement les transactions utilisateurs vs transactions rôles métier
      
      // CORRECTION : Utiliser userAnalysisData.users qui contient TOUTES les transactions des utilisateurs
      console.log('🔍 DEBUG analysisResult:', analysisResult);
      console.log('🔍 DEBUG analysisResult.userAnalysisData:', analysisResult.userAnalysisData);
      console.log('🔍 DEBUG analysisResult.userAnalysisData?.users:', analysisResult.userAnalysisData?.users);
      
      const allUserTransactions = new Set<string>();
      const userTransactionDetails = new Map<string, Array<{ executionCount: number; item: string }>>();
      
      // CORRECTION : Utiliser businessRoleTransactions qui contient le bon executionCount par transaction
      if (analysisResult.businessRoleTransactions) {
        console.log('🔍 DEBUG Processing businessRoleTransactions:', analysisResult.businessRoleTransactions.length);
        analysisResult.businessRoleTransactions.forEach((brTx, index) => {
          console.log(`🔍 DEBUG BusinessRoleTransaction ${index}:`, brTx);
          
          allUserTransactions.add(brTx.transaction);
          
          // Si la transaction n'existe pas encore, créer un tableau
          if (!userTransactionDetails.has(brTx.transaction)) {
            userTransactionDetails.set(brTx.transaction, []);
          }
          
          // Ajouter cet utilisateur à la liste pour cette transaction avec le bon executionCount
          userTransactionDetails.get(brTx.transaction)!.push({
            executionCount: brTx.executionCount || 0, // Nombre d'exécutions spécifique à cette transaction
            item: brTx.businessRole // Le nom de l'utilisateur (businessRole = userId)
          });
          
          console.log(`🔍 DEBUG Transaction ${brTx.transaction} -> item: ${brTx.businessRole}, executionCount: ${brTx.executionCount || 0}`);
        });
      } else {
        console.log('🔍 DEBUG No businessRoleTransactions found!');
      }
      
      // Récupérer toutes les transactions disponibles dans les rôles métier (feuilles 2+3)
      const allBusinessRoleTransactions = new Set<string>();
      analysisResult.simpleRoleTransactions?.forEach(tx => {
        allBusinessRoleTransactions.add(tx.transaction);
      });
      
      // Calcul simple des transactions orphelines
      const orphanTransactions = new Set<string>();
      allUserTransactions.forEach(userTx => {
        if (!allBusinessRoleTransactions.has(userTx)) {
          orphanTransactions.add(userTx);
        }
      });
      
      // Préparer le résultat avec les détails d'exécution
      console.log('🔍 DEBUG orphanTransactions:', Array.from(orphanTransactions));
      console.log('🔍 DEBUG userTransactionDetails:', userTransactionDetails);
      
      const uncoveredList: Array<{ transaction: string; executionCount: number; businessRole: string }> = [];
      let totalExecutions = 0;
      
      orphanTransactions.forEach(orphanTx => {
        const usersList = userTransactionDetails.get(orphanTx);
        console.log(`🔍 DEBUG Orphan transaction ${orphanTx} -> usersList:`, usersList);
        
        if (usersList && usersList.length > 0) {
          // Créer une entrée pour chaque utilisateur qui utilise cette transaction
          usersList.forEach(userDetails => {
            uncoveredList.push({
              transaction: orphanTx,
              executionCount: userDetails.executionCount,
              businessRole: userDetails.item  // Nom de l'utilisateur
            });
            totalExecutions += userDetails.executionCount;
            console.log(`🔍 DEBUG Added to uncoveredList: ${orphanTx} -> businessRole: ${userDetails.item}, executionCount: ${userDetails.executionCount}`);
          });
        } else {
          console.log(`🔍 DEBUG No users found for orphan transaction: ${orphanTx}`);
        }
      });
      
      console.log('🔍 DEBUG Final uncoveredList:', uncoveredList);
      
      return {
        count: uncoveredList.length,
        transactions: uncoveredList,
        totalExecutions
      };
    } else {
      // Mode rôles (existant)
      const tUncoveredStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const allBusinessTransactions = new Map<string, { transaction: string; executionCount: number; item: string }>();
      const coveredTransactions = new Set<string>();
      
      // Indexer toutes les transactions métier
      const tIndexStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      analysisResult.businessRoleTransactions.forEach(tx => {
        const key = `${tx.transaction}_${tx.businessRole}`;
        allBusinessTransactions.set(key, {
          transaction: tx.transaction,
          executionCount: tx.executionCount || 0,
          item: tx.businessRole
        });
      });
      const tIndexEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      
      // Identifier les transactions couvertes par les rôles simples
      const tCoveredStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      analysisResult.simpleRoleTransactions.forEach(tx => {
        coveredTransactions.add(tx.transaction);
      });
      const tCoveredEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      
      // Filtrer les transactions non couvertes
      const uncoveredList: Array<{ transaction: string; executionCount: number; businessRole: string }> = [];
      let totalExecutions = 0;
      
      const tUncoveredFilterStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      allBusinessTransactions.forEach(txData => {
        if (!coveredTransactions.has(txData.transaction)) {
          uncoveredList.push({
            transaction: txData.transaction,
            executionCount: txData.executionCount,
            businessRole: txData.item  // Utiliser businessRole au lieu de item
          });
          totalExecutions += txData.executionCount;
        }
      });
      const tUncoveredFilterEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const tUncoveredEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.log('⏱️ [analysis] uncoveredTransactionsData(roles) done', {
        tTotalMs: Math.round(tUncoveredEnd - tUncoveredStart),
        tIndexMs: Math.round(tIndexEnd - tIndexStart),
        tCoveredMs: Math.round(tCoveredEnd - tCoveredStart),
        tFilterMs: Math.round(tUncoveredFilterEnd - tUncoveredFilterStart),
        businessRoleTransactions: analysisResult.businessRoleTransactions.length,
        simpleRoleTransactions: analysisResult.simpleRoleTransactions.length,
        uncoveredItems: uncoveredList.length,
      });
      
      return {
        count: uncoveredList.length,
        transactions: uncoveredList,
        totalExecutions
      };
    }
  }, [analysisResult, mode]);
  
  // 📋 CALCUL : Informations de pagination
  const paginationInfo = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
    
    return {
      currentPage,
      totalPages,
      itemsPerPage,
      startIndex,
      endIndex,
    };
  }, [currentPage, itemsPerPage, totalPages, filteredItems.length]);
  
  return {
    // Nouvelles propriétés génériques
    totalItems,
    itemsToShow,
    totalPages,
    uncoveredTransactionsData,
    filteredItems,
    paginationInfo,
  };
};