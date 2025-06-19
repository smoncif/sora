import { useMemo } from 'react';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

// Types pour les calculs d'analyse
export interface AnalysisCalculationsConfig {
  analysisResult: SimplifiedAnalysisResult | null;
  businessRoleFilter: string;
  focusedBusinessRole: string | null;
  currentBusinessRolePage: number;
  businessRolesPerPage: number;
}

export interface AnalysisCalculationsReturn {
  // Données calculées
  totalBusinessRoles: number;
  businessRolesToShow: any[];
  totalBusinessRolePages: number;
  uncoveredTransactionsData: {
    count: number;
    transactions: Array<{ transaction: string; executionCount: number; businessRole: string }>;
    totalExecutions: number;
  };
  
  // Données utilitaires
  filteredBusinessRoles: any[];
  paginationInfo: {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    startIndex: number;
    endIndex: number;
  };
}

export const useAnalysisCalculations = (
  config: AnalysisCalculationsConfig
): AnalysisCalculationsReturn => {
  
  const { 
    analysisResult, 
    businessRoleFilter, 
    focusedBusinessRole, 
    currentBusinessRolePage, 
    businessRolesPerPage 
  } = config;
  
  // 🔢 CALCUL : Nombre total de rôles métier
  const totalBusinessRoles = useMemo(() => {
    return analysisResult?.coverageAnalyses?.length || 0;
  }, [analysisResult]);
  
  // 🔍 CALCUL : Rôles métier filtrés (sans pagination)
  const filteredBusinessRoles = useMemo(() => {
    if (!analysisResult?.coverageAnalyses) return [];
    
    let filtered = analysisResult.coverageAnalyses;
    
    // Filtre par nom de rôle métier
    if (businessRoleFilter) {
      filtered = filtered.filter(analysis => 
        analysis.businessRole.toLowerCase().includes(businessRoleFilter.toLowerCase())
      );
    }
    
    // Focus sur un rôle métier spécifique
    if (focusedBusinessRole) {
      filtered = filtered.filter(analysis => analysis.businessRole === focusedBusinessRole);
    }
    
    return filtered;
  }, [analysisResult, businessRoleFilter, focusedBusinessRole]);
  
  // 📄 CALCUL : Rôles métier à afficher (avec pagination)
  const businessRolesToShow = useMemo(() => {
    const startIndex = currentBusinessRolePage * businessRolesPerPage;
    const endIndex = startIndex + businessRolesPerPage;
    
    return filteredBusinessRoles.slice(startIndex, endIndex);
  }, [filteredBusinessRoles, currentBusinessRolePage, businessRolesPerPage]);
  
  // 📊 CALCUL : Nombre total de pages
  const totalBusinessRolePages = useMemo(() => {
    return Math.ceil(filteredBusinessRoles.length / businessRolesPerPage);
  }, [filteredBusinessRoles.length, businessRolesPerPage]);
  
  // 📈 CALCUL : Données des transactions non couvertes (format compatible OverviewStatsSection)
  const uncoveredTransactionsData = useMemo(() => {
    if (!analysisResult) {
      return {
        count: 0,
        transactions: [],
        totalExecutions: 0
      };
    }
    
    // Collecter toutes les transactions métier avec leurs détails
    const allBusinessTransactions = new Map<string, { transaction: string; executionCount: number; businessRole: string }>();
    const coveredTransactions = new Set<string>();
    
    // Indexer toutes les transactions métier
    analysisResult.businessRoleTransactions.forEach(tx => {
      const key = `${tx.transaction}_${tx.businessRole}`;
      allBusinessTransactions.set(key, {
        transaction: tx.transaction,
        executionCount: tx.executionCount || 0,
        businessRole: tx.businessRole
      });
    });
    
    // Identifier les transactions couvertes par les rôles simples
    analysisResult.simpleRoleTransactions.forEach(tx => {
      coveredTransactions.add(tx.transaction);
    });
    
    // Filtrer les transactions non couvertes
    const uncoveredList: Array<{ transaction: string; executionCount: number; businessRole: string }> = [];
    let totalExecutions = 0;
    
    allBusinessTransactions.forEach(txData => {
      if (!coveredTransactions.has(txData.transaction)) {
        uncoveredList.push(txData);
        totalExecutions += txData.executionCount;
      }
    });
    
    return {
      count: uncoveredList.length,
      transactions: uncoveredList,
      totalExecutions
    };
  }, [analysisResult]);
  
  // 📋 CALCUL : Informations de pagination
  const paginationInfo = useMemo(() => {
    const startIndex = currentBusinessRolePage * businessRolesPerPage;
    const endIndex = Math.min(startIndex + businessRolesPerPage, filteredBusinessRoles.length);
    
    return {
      currentPage: currentBusinessRolePage,
      totalPages: totalBusinessRolePages,
      itemsPerPage: businessRolesPerPage,
      startIndex,
      endIndex,
    };
  }, [currentBusinessRolePage, businessRolesPerPage, totalBusinessRolePages, filteredBusinessRoles.length]);
  
  return {
    // Données principales
    totalBusinessRoles,
    businessRolesToShow,
    totalBusinessRolePages,
    uncoveredTransactionsData,
    
    // Données utilitaires
    filteredBusinessRoles,
    paginationInfo,
  };
}; 