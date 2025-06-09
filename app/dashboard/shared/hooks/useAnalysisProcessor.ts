import { useState, useCallback, useEffect, useMemo } from 'react';
import { SimplifiedAnalysisResult } from '../../../types/roleAnalysis';

// Types pour le traitement d'analyse
export interface AnalysisProcessorState {
  // Sélections (source unique de vérité)
  selectedRoles: Map<string, Set<string>>;
  
  // Filtres
  businessRoleFilter: string;
  simpleRoleFilter: string;
  showFilters: boolean;
  
  // Pagination
  currentBusinessRolePage: number;
  businessRolesPerPage: number;
  
  // Focus
  focusedBusinessRole: string | null;
  
  // Affichage
  showZeroCoverageRoles: Map<string, boolean>;
  
  // Cache et optimisations
  staticScoresCache: Map<string, {
    sizeScore: number;
    usageFrequency: number;
    totalRoleTransactions: number;
    originalCoveredCount: number;
    simpleRoleExecutions: number;
    totalBusinessRoleExecutions: number;
  }>;
  transactionDetailsCache: Map<string, {
    covered: string[];
    nonUtilisees: string[];
    nonCouvertes: string[];
    orphelines: string[];
    total: number;
  }>;
}

export interface AnalysisProcessorConfig {
  analysisResult: SimplifiedAnalysisResult | null;
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  includeFrequency: boolean;
}

export interface AnalysisProcessorCallbacks {
  onSelectedRolesChange?: (roles: Map<string, Set<string>>) => void;
  onFocusChange?: (businessRole: string | null) => void;
}

export interface AnalysisProcessorReturn {
  // États
  state: AnalysisProcessorState;
  
  // Données calculées
  totalBusinessRoles: number;
  businessRolesToShow: any[];
  totalBusinessRolePages: number;
  uncoveredTransactionsData: any;
  
  // Actions de sélection
  handleSelectionChange: (businessRole: string, selectedRoles: Set<string>) => void;
  getSelectedRolesForBusinessRole: (businessRole: string) => Set<string>;
  synchronizeSelectedRoles: (selections: Map<string, Set<string>>) => void;
  
  // Actions de filtrage
  setBusinessRoleFilter: (filter: string) => void;
  setSimpleRoleFilter: (filter: string) => void;
  toggleFilters: () => void;
  clearFilters: () => void;
  
  // Actions de pagination
  setCurrentBusinessRolePage: (page: number) => void;
  setBusinessRolesPerPage: (perPage: number) => void;
  
  // Actions de focus
  handleFocusBusinessRole: (businessRole: string) => void;
  handleExitFocus: () => void;
  
  // Actions d'affichage
  handleToggleZeroCoverageRoles: (businessRole: string) => void;
  
  // Props partagées pour composants
  getSharedBusinessRoleProps: () => any;
}

export const useAnalysisProcessor = (
  config: AnalysisProcessorConfig,
  callbacks?: AnalysisProcessorCallbacks
): AnalysisProcessorReturn => {
  
  const { analysisResult, coverageWeight, sizeWeight, usageWeight, includeFrequency } = config;
  
  // État centralisé du processeur
  const [state, setState] = useState<AnalysisProcessorState>({
    // Sélections
    selectedRoles: new Map(),
    
    // Filtres
    businessRoleFilter: '',
    simpleRoleFilter: '',
    showFilters: false,
    
    // Pagination
    currentBusinessRolePage: 0,
    businessRolesPerPage: 3,
    
    // Focus
    focusedBusinessRole: null,
    
    // Affichage
    showZeroCoverageRoles: new Map(),
    
    // Cache
    staticScoresCache: new Map(),
    transactionDetailsCache: new Map(),
  });
  
  // Fonction helper pour mise à jour d'état
  const updateState = useCallback((updates: Partial<AnalysisProcessorState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 🔄 RÉINITIALISATION : Reset des sélections quand l'analyse change
  useEffect(() => {
    if (analysisResult) {
      setState(prev => ({
        ...prev,
        selectedRoles: new Map(),
        showZeroCoverageRoles: new Map(),
        staticScoresCache: new Map(),
        transactionDetailsCache: new Map(),
        currentBusinessRolePage: 0,
        businessRoleFilter: '',
        simpleRoleFilter: '',
        focusedBusinessRole: null,
      }));
    }
  }, [analysisResult]); // Inclure analysisResult dans les dépendances
  
  // 🚀 CACHE : Pré-calcul des scores statiques
  const precomputeStaticScores = useCallback(() => {
    if (!analysisResult?.coverageAnalyses) return;
    
    const newStaticCache = new Map();
    const newDetailsCache = new Map();
    
    analysisResult.coverageAnalyses.forEach(analysis => {
      const businessRoleTransactions = analysisResult.businessRoleTransactions.filter(tx => 
        tx.businessRole === analysis.businessRole
      );
      const businessRoleTxSet = new Set(businessRoleTransactions.map(tx => tx.transaction));
      const totalBusinessRoleExecutions = businessRoleTransactions.reduce((sum, tx) => sum + (tx.executionCount || 0), 0);
      
      // Grouper les transactions par rôle simple
      const transactionsByRole = new Map<string, string[]>();
      analysisResult.simpleRoleTransactions.forEach(t => {
        if (!transactionsByRole.has(t.simpleRole)) {
          transactionsByRole.set(t.simpleRole, []);
        }
        transactionsByRole.get(t.simpleRole)!.push(t.transaction);
      });
      
      analysis.simpleRoles.forEach(simple => {
        const cacheKey = `${analysis.businessRole}:${simple.roleName}`;
        
        // Score de taille
        const totalRoleTransactions = transactionsByRole.get(simple.roleName)?.length || 0;
        const originalCoveredCount = (simple.coveredTransactions || []).length;
        const sizeScore = totalRoleTransactions > 0
          ? Math.round((originalCoveredCount / totalRoleTransactions) * 100)
          : 0;
        
        // Score d'usage
        let usageFrequency = 0;
        let simpleRoleExecutions = 0;
        if (includeFrequency && Array.isArray(analysisResult.simpleRoleTransactions)) {
          simpleRoleExecutions = analysisResult.simpleRoleTransactions
            .filter(tx => tx.simpleRole === simple.roleName)
            .filter(tx => businessRoleTxSet.has(tx.transaction))
            .reduce((sum, tx) => {
              const execCount = businessRoleTransactions.find(btx => btx.transaction === tx.transaction)?.executionCount || 0;
              return sum + execCount;
            }, 0);
          
          usageFrequency = totalBusinessRoleExecutions > 0 
            ? Math.round((simpleRoleExecutions / totalBusinessRoleExecutions) * 100) 
            : 0;
        }
        
        // Stocker dans le cache
        newStaticCache.set(cacheKey, {
          sizeScore,
          usageFrequency,
          totalRoleTransactions,
          originalCoveredCount,
          simpleRoleExecutions,
          totalBusinessRoleExecutions
        });
        
        // Détails de transactions
        const allSimpleRoleTx = transactionsByRole.get(simple.roleName) || [];
        const originalCoveredTxSet = new Set(simple.coveredTransactions || []);
        const nonUtilisees = allSimpleRoleTx.filter(tx => !originalCoveredTxSet.has(tx));
        
        newDetailsCache.set(cacheKey, {
          covered: [...(simple.coveredTransactions || [])],
          nonUtilisees,
          nonCouvertes: [],
          orphelines: [],
          total: 0
        });
      });
    });
    
    updateState({ 
      staticScoresCache: newStaticCache, 
      transactionDetailsCache: newDetailsCache 
    });
  }, [analysisResult, includeFrequency, updateState]);
  
  // 🚀 CALCULS : Données dérivées
  const totalBusinessRoles = useMemo(() => {
    return analysisResult?.coverageAnalyses?.length || 0;
  }, [analysisResult]);
  
  const businessRolesToShow = useMemo(() => {
    if (!analysisResult?.coverageAnalyses) return [];
    
    let filtered = analysisResult.coverageAnalyses;
    
    // Filtre par nom de rôle métier
    if (state.businessRoleFilter) {
      filtered = filtered.filter(analysis => 
        analysis.businessRole.toLowerCase().includes(state.businessRoleFilter.toLowerCase())
      );
    }
    
    // Focus sur un rôle métier spécifique
    if (state.focusedBusinessRole) {
      filtered = filtered.filter(analysis => analysis.businessRole === state.focusedBusinessRole);
    }
    
    // Pagination
    const startIndex = state.currentBusinessRolePage * state.businessRolesPerPage;
    const endIndex = startIndex + state.businessRolesPerPage;
    
    return filtered.slice(startIndex, endIndex);
  }, [analysisResult, state.businessRoleFilter, state.focusedBusinessRole, state.currentBusinessRolePage, state.businessRolesPerPage]);
  
  const totalBusinessRolePages = useMemo(() => {
    if (!analysisResult?.coverageAnalyses) return 0;
    
    let filtered = analysisResult.coverageAnalyses;
    if (state.businessRoleFilter) {
      filtered = filtered.filter(analysis => 
        analysis.businessRole.toLowerCase().includes(state.businessRoleFilter.toLowerCase())
      );
    }
    if (state.focusedBusinessRole) {
      filtered = filtered.filter(analysis => analysis.businessRole === state.focusedBusinessRole);
    }
    
    return Math.ceil(filtered.length / state.businessRolesPerPage);
  }, [analysisResult, state.businessRoleFilter, state.focusedBusinessRole, state.businessRolesPerPage]);
  
  const uncoveredTransactionsData = useMemo(() => {
    if (!analysisResult) return null;
    
    // Calcul des transactions non couvertes
    const allTransactions = new Set<string>();
    const coveredTransactions = new Set<string>();
    
    analysisResult.businessRoleTransactions.forEach(tx => {
      allTransactions.add(tx.transaction);
    });
    
    analysisResult.simpleRoleTransactions.forEach(tx => {
      if (allTransactions.has(tx.transaction)) {
        coveredTransactions.add(tx.transaction);
      }
    });
    
    const uncovered = Array.from(allTransactions).filter(tx => !coveredTransactions.has(tx));
    
    return {
      total: allTransactions.size,
      covered: coveredTransactions.size,
      uncovered: uncovered.length,
      transactions: uncovered,
    };
  }, [analysisResult]);
  
  // 🚀 ACTIONS : Gestion des sélections - OPTIMISÉ
  const handleSelectionChange = useCallback((businessRole: string, selectedRoles: Set<string>) => {
    // 🚀 OPTIMISATION : Mise à jour uniquement de la Map des sélections
    setState(prev => {
      const newSelectedRoles = new Map(prev.selectedRoles);
      newSelectedRoles.set(businessRole, selectedRoles);
      
      return {
        ...prev,
        selectedRoles: newSelectedRoles
      };
    });
    
    // Callback avec la nouvelle Map
    const newMap = new Map(state.selectedRoles);
    newMap.set(businessRole, selectedRoles);
    callbacks?.onSelectedRolesChange?.(newMap);
  }, [callbacks, state.selectedRoles]);
  
  const getSelectedRolesForBusinessRole = useCallback((businessRole: string): Set<string> => {
    return state.selectedRoles.get(businessRole) || new Set<string>();
  }, [state.selectedRoles]);
  
  const synchronizeSelectedRoles = useCallback((selections: Map<string, Set<string>>) => {
    updateState({ selectedRoles: new Map(selections) });
    callbacks?.onSelectedRolesChange?.(new Map(selections));
  }, [updateState, callbacks]);
  
  // 🚀 ACTIONS : Filtrage
  const setBusinessRoleFilter = useCallback((filter: string) => {
    updateState({ businessRoleFilter: filter, currentBusinessRolePage: 0 });
  }, [updateState]);
  
  const setSimpleRoleFilter = useCallback((filter: string) => {
    updateState({ simpleRoleFilter: filter });
  }, [updateState]);
  
  const toggleFilters = useCallback(() => {
    setState(prev => ({ ...prev, showFilters: !prev.showFilters }));
  }, []);
  
  const clearFilters = useCallback(() => {
    updateState({ 
      businessRoleFilter: '', 
      simpleRoleFilter: '', 
      currentBusinessRolePage: 0 
    });
  }, [updateState]);
  
  // 🚀 ACTIONS : Pagination
  const setCurrentBusinessRolePage = useCallback((page: number) => {
    updateState({ currentBusinessRolePage: page });
  }, [updateState]);
  
  const setBusinessRolesPerPage = useCallback((perPage: number) => {
    updateState({ businessRolesPerPage: perPage, currentBusinessRolePage: 0 });
  }, [updateState]);
  
  // 🚀 ACTIONS : Focus
  const handleFocusBusinessRole = useCallback((businessRole: string) => {
    updateState({ focusedBusinessRole: businessRole, currentBusinessRolePage: 0 });
    callbacks?.onFocusChange?.(businessRole);
  }, [updateState, callbacks]);
  
  const handleExitFocus = useCallback(() => {
    updateState({ focusedBusinessRole: null, currentBusinessRolePage: 0 });
    callbacks?.onFocusChange?.(null);
  }, [updateState, callbacks]);
  
  // 🚀 ACTIONS : Affichage
  const handleToggleZeroCoverageRoles = useCallback((businessRole: string) => {
    setState(prev => ({
      ...prev,
      showZeroCoverageRoles: new Map(prev.showZeroCoverageRoles).set(
        businessRole, 
        !prev.showZeroCoverageRoles.get(businessRole)
      )
    }));
  }, []);
  
  // 🚀 PROPS : Props partagées pour les composants - OPTIMISÉ
  const getSharedBusinessRoleProps = useCallback(() => {
    return {
      // 🚀 OPTIMISATION : Ne pas passer selectedRoles ici, sera géré individuellement
      onGlobalSelectionChange: handleSelectionChange,
      staticScoresCache: state.staticScoresCache,
      transactionDetailsCache: state.transactionDetailsCache,
      showZeroCoverageRoles: state.showZeroCoverageRoles,
      onToggleZeroCoverageRoles: handleToggleZeroCoverageRoles,
      includeFrequency,
      coverageWeight,
      sizeWeight,
      usageWeight,
      focusedBusinessRole: state.focusedBusinessRole,
      onFocusBusinessRole: handleFocusBusinessRole,
      onExitFocus: handleExitFocus,
      simpleRoleFilter: state.simpleRoleFilter,
      businessRoleTransactions: analysisResult?.businessRoleTransactions || [],
      simpleRoleTransactions: analysisResult?.simpleRoleTransactions || [],
    };
  }, [
    // 🚀 OPTIMISATION : Retirer state.selectedRoles des dépendances
    state.staticScoresCache,
    state.transactionDetailsCache,
    state.showZeroCoverageRoles,
    state.focusedBusinessRole,
    state.simpleRoleFilter,
    handleSelectionChange,
    handleToggleZeroCoverageRoles,
    handleFocusBusinessRole,
    handleExitFocus,
    includeFrequency,
    coverageWeight,
    sizeWeight,
    usageWeight,
    analysisResult?.businessRoleTransactions,
    analysisResult?.simpleRoleTransactions,
  ]);
  
  // 🚀 EFFETS : Pré-calcul au chargement
  useEffect(() => {
    if (analysisResult) {
      precomputeStaticScores();
    }
  }, [analysisResult, precomputeStaticScores]);
  
  return {
    // États
    state,
    
    // Données calculées
    totalBusinessRoles,
    businessRolesToShow,
    totalBusinessRolePages,
    uncoveredTransactionsData,
    
    // Actions de sélection
    handleSelectionChange,
    getSelectedRolesForBusinessRole,
    synchronizeSelectedRoles,
    
    // Actions de filtrage
    setBusinessRoleFilter,
    setSimpleRoleFilter,
    toggleFilters,
    clearFilters,
    
    // Actions de pagination
    setCurrentBusinessRolePage,
    setBusinessRolesPerPage,
    
    // Actions de focus
    handleFocusBusinessRole,
    handleExitFocus,
    
    // Actions d'affichage
    handleToggleZeroCoverageRoles,
    
    // Props partagées
    getSharedBusinessRoleProps,
  };
}; 


