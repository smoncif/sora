'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Tooltip,
  Collapse,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  useTheme,
  alpha,
  Switch,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { TransactionBlock } from '../TransactionBlock';
import { CoverageAnalysis, SimpleRoleTransaction } from 'lib/types/roleAnalysis';

export interface BusinessRoleAnalysisCardProps {
  analysis: CoverageAnalysis;
  includeFrequency: boolean;
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  businessRoleTransactions: any[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  focusedBusinessRole: string | null;
  onFocusBusinessRole: (businessRole: string) => void;
  onExitFocus: () => void;
  simpleRoleFilter: string;
  globalSelectedRoles: Set<string>;
  onGlobalSelectionChange: (businessRole: string, selectedRoles: Set<string>) => void;
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
  showZeroCoverageRoles: Map<string, boolean>;
  onToggleZeroCoverageRoles: (businessRole: string, show: boolean) => void;
}

// ðŸš€ Fonction de comparaison optimisÃ©e pour React.memo
const arePropsEqual = (prevProps: BusinessRoleAnalysisCardProps, nextProps: BusinessRoleAnalysisCardProps) => {
  // Comparaison rapide des props simples
  if (
    prevProps.analysis.businessRole !== nextProps.analysis.businessRole ||
    prevProps.includeFrequency !== nextProps.includeFrequency ||
    prevProps.coverageWeight !== nextProps.coverageWeight ||
    prevProps.sizeWeight !== nextProps.sizeWeight ||
    prevProps.usageWeight !== nextProps.usageWeight ||
    prevProps.focusedBusinessRole !== nextProps.focusedBusinessRole ||
    prevProps.simpleRoleFilter !== nextProps.simpleRoleFilter
  ) {
    return false;
  }

  // Comparaison des rÃ´les sÃ©lectionnÃ©s pour ce rÃ´le mÃ©tier spÃ©cifique
  const prevSelected = prevProps.globalSelectedRoles;
  const nextSelected = nextProps.globalSelectedRoles;
  
  if (prevSelected.size !== nextSelected.size) {
    return false;
  }
  
  for (const role of Array.from(prevSelected)) {
    if (!nextSelected.has(role)) {
      return false;
    }
  }

  // Comparaison des Maps de cache (par rÃ©fÃ©rence, car elles sont stables)
  if (
    prevProps.staticScoresCache !== nextProps.staticScoresCache ||
    prevProps.transactionDetailsCache !== nextProps.transactionDetailsCache ||
    prevProps.showZeroCoverageRoles !== nextProps.showZeroCoverageRoles
  ) {
    return false;
  }

  return true;
};

export const BusinessRoleAnalysisCard = React.memo(function BusinessRoleAnalysisCard({ 
  analysis, 
  includeFrequency,
  coverageWeight,
  sizeWeight,
  usageWeight,
  businessRoleTransactions,
  simpleRoleTransactions,
  focusedBusinessRole,
  onFocusBusinessRole,
  onExitFocus,
  simpleRoleFilter,
  globalSelectedRoles,
  onGlobalSelectionChange,
  staticScoresCache,

  showZeroCoverageRoles,
  onToggleZeroCoverageRoles,
}: BusinessRoleAnalysisCardProps) {
  const theme = useTheme();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [expandedRow, setExpandedRow] = React.useState<number | null>(null);
  
  // Ã‰tats pour le systÃ¨me de tri
  const [sortField, setSortField] = React.useState<'roleName' | 'coveragePercentage' | 'sizeScore' | 'usageFrequency' | 'globalScore'>('globalScore');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  // Ã‰tats pour le tri dans les tooltips
  const [tooltipSortField, setTooltipSortField] = React.useState<'transaction' | 'execution'>('execution');
  const [tooltipSortDirection, setTooltipSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  // ðŸŽ¯ OPTIMISÃ‰ : Les rÃ´les sÃ©lectionnÃ©s sont maintenant passÃ©s directement pour ce rÃ´le mÃ©tier
  const selectedRoles = globalSelectedRoles;
  

  
  // ðŸŽ¯ NOUVEAU : Ã‰tat local pour afficher/masquer les rÃ´les 0% couverture
  const shouldShowZeroCoverage = showZeroCoverageRoles.get(analysis.businessRole) ?? false;
  
  // Fonction de tri
  const handleSort = React.useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Par dÃ©faut, trier par ordre dÃ©croissant pour les nouvelles colonnes
    }
  }, [sortField]);

  // Fonction de tri pour les tooltips
  const handleTooltipSort = React.useCallback((field: typeof tooltipSortField) => {
    if (tooltipSortField === field) {
      setTooltipSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTooltipSortField(field);
      setTooltipSortDirection('desc');
    }
  }, [tooltipSortField]);

  // ðŸš€ OPTIMISATION MAJEURE : PrÃ©-calcul de TOUS les dÃ©tails une seule fois
  const precomputedData = React.useMemo(() => {
    // ðŸŽ¯ GUARD : VÃ©rifier que les donnÃ©es sont disponibles
    if (!businessRoleTransactions || !Array.isArray(businessRoleTransactions)) {
      return {
        businessRoleTxSet: new Set<string>(),
        txExecutionMap: new Map<string, number>(),
        transactionsByRole: new Map<string, string[]>(),
        currentBusinessRoleTransactions: [],
        originalTransactions: []
      };
    }
    
    // ðŸŽ¯ CORRECTION : Filtrer pour ne garder que les transactions de CE rÃ´le mÃ©tier spÃ©cifique
    const currentBusinessRoleTransactions = businessRoleTransactions.filter(tx => 
      tx.businessRole === analysis.businessRole
    );
    
    // Ã‰tape 1: CrÃ©er des Map/Set pour des recherches O(1)
    const businessRoleTxSet = new Set(currentBusinessRoleTransactions.map(tx => tx.transaction));
    const txExecutionMap = new Map<string, number>();
    currentBusinessRoleTransactions.forEach((tx: any) => {
      txExecutionMap.set(tx.transaction, tx.executionCount || 0);
    });
    
    // Ã‰tape 2: Grouper les transactions par rÃ´le simple pour Ã©viter les filtres rÃ©pÃ©tÃ©s
    const transactionsByRole = new Map<string, string[]>();
    if (simpleRoleTransactions && Array.isArray(simpleRoleTransactions)) {
      simpleRoleTransactions.forEach(t => {
        if (!transactionsByRole.has(t.simpleRole)) {
          transactionsByRole.set(t.simpleRole, []);
        }
        transactionsByRole.get(t.simpleRole)!.push(t.transaction);
      });
    }
    
    return {
      businessRoleTxSet,
      txExecutionMap,
      transactionsByRole,
      currentBusinessRoleTransactions,
      originalTransactions: currentBusinessRoleTransactions.map(tx => tx.transaction)
    };
  }, [businessRoleTransactions, simpleRoleTransactions, analysis.businessRole]);

  // ðŸš€ CALCUL FIXE : Maximum atteignable calculÃ© une seule fois (ne change jamais)
  const maxAchievableInfo = React.useMemo(() => {
    // Calculer toutes les transactions qui peuvent Ãªtre couvertes par au moins un rÃ´le simple
    const allCoverableTransactions = new Set<string>();
    analysis.simpleRoles.forEach(role => {
      (role.coveredTransactions || []).forEach(tx => {
        allCoverableTransactions.add(tx);
      });
    });
    
    // Transactions orphelines = transactions du rÃ´le mÃ©tier qui ne sont couvertes par aucun rÃ´le simple
    const orphanTransactions = analysis.uniqueTransactions.filter(tx => !allCoverableTransactions.has(tx));
    const maxAchievableTransactions = analysis.uniqueTransactions.length - orphanTransactions.length;

    return {
      orphanTransactions,
      maxAchievableTransactions,
      totalTransactions: analysis.uniqueTransactions.length
    };
  }, [analysis.simpleRoles, analysis.uniqueTransactions]);

  // ðŸŽ¯ NOUVEAU : Calcul dynamique des transactions COUVERTES (depuis 0 vers le max)
  const dynamicAnalysisData = React.useMemo(() => {
    // Ã‰tape 1: Calculer les transactions couvertes par les rÃ´les sÃ©lectionnÃ©s
    const selectedTransactions = new Set<string>();
    const allSelectedRoleTransactions = new Set<string>(); // NOUVEAU: Toutes les transactions des rÃ´les sÃ©lectionnÃ©s
    
    selectedRoles.forEach(roleName => {
      const roleData = analysis.simpleRoles.find(r => r.roleName === roleName);
      // Ajouter les transactions couvertes (pour le calcul de couverture)
      if (roleData) {
        (roleData.coveredTransactions || []).forEach(tx => selectedTransactions.add(tx));
      }
      
      // NOUVEAU: Ajouter TOUTES les transactions du rÃ´le simple (pour calculer les non utilisÃ©es)
      const allRoleTransactions = precomputedData.transactionsByRole.get(roleName) || [];
      allRoleTransactions.forEach(tx => allSelectedRoleTransactions.add(tx));
    });

    // Ã‰tape 2: Calculer les transactions restantes (non encore couvertes par les sÃ©lections)
    const remainingTransactions = analysis.uniqueTransactions.filter(tx => !selectedTransactions.has(tx));
    const remainingBusinessTransactions = precomputedData.currentBusinessRoleTransactions.filter(tx => !selectedTransactions.has(tx.transaction));
    
    // Ã‰tape 3: Calculer le total des exÃ©cutions restantes pour CE rÃ´le mÃ©tier spÃ©cifiquement
    const totalRemainingExecutions = remainingBusinessTransactions.reduce((sum: number, tx: any) => sum + (tx.executionCount || 0), 0);

    // Ã‰tape 4: CrÃ©er des maps pour les calculs optimisÃ©s
    const remainingTxSet = new Set(remainingTransactions);
    const remainingExecutionMap = new Map<string, number>();
    remainingBusinessTransactions.forEach((tx: any) => {
      remainingExecutionMap.set(tx.transaction, tx.executionCount || 0);
    });

    // Ã‰tape 5: Calculer les transactions non utilisÃ©es (TOUTES les transactions des rÃ´les sÃ©lectionnÃ©s qui ne sont pas dans le rÃ´le mÃ©tier)
    const unusedTransactions = Array.from(allSelectedRoleTransactions).filter(tx => 
      !precomputedData.businessRoleTxSet.has(tx)
    );



    return {
      selectedTransactions,
      allSelectedRoleTransactions,
      remainingTransactions,
      remainingBusinessTransactions,
      totalRemainingExecutions,
      remainingTxSet,
      remainingExecutionMap,
      totalRemainingTransactions: remainingTransactions.length,
      coveredTransactionsCount: selectedTransactions.size,
      unusedTransactions
    };
  }, [selectedRoles, analysis.simpleRoles, analysis.uniqueTransactions, precomputedData.currentBusinessRoleTransactions, precomputedData.businessRoleTxSet, analysis.businessRole]);

  // ðŸš€ Fonction ultra-rapide de rÃ©cupÃ©ration des dÃ©tails avec recalcul dynamique
  const getDetails = React.useCallback((roleName: string) => {
    const allSimpleRoleTx = precomputedData.transactionsByRole.get(roleName) || [];
    const roleData = analysis.simpleRoles.find(r => r.roleName === roleName);
    
    if (!roleData) {
      return { 
        covered: [], 
        coveredButAlreadySelected: [], 
        nonUtilisees: [], 
        nonCouvertes: [], 
        orphelines: [], 
        total: 0 
      };
    }

    // ðŸŽ¯ NOUVEAU : SÃ©parer les transactions couvertes selon leur disponibilitÃ©
    const covered = (roleData.coveredTransactions || []).filter(tx => 
      dynamicAnalysisData.remainingTxSet.has(tx)
    );
    
    // ðŸŽ¯ NOUVEAU : Transactions couvertes par ce rÃ´le mais dÃ©jÃ  sÃ©lectionnÃ©es par d'autres
    const coveredButAlreadySelected = (roleData.coveredTransactions || []).filter(tx => 
      !dynamicAnalysisData.remainingTxSet.has(tx) && precomputedData.businessRoleTxSet.has(tx)
    );
    
    const nonUtilisees = allSimpleRoleTx.filter(tx => 
      !precomputedData.businessRoleTxSet.has(tx)
    );
    
    const nonCouvertes = precomputedData.originalTransactions.filter(tx => 
      !allSimpleRoleTx.includes(tx) && dynamicAnalysisData.remainingTxSet.has(tx)
    );
    
    const orphelines = maxAchievableInfo.orphanTransactions.filter(tx =>
      dynamicAnalysisData.remainingTxSet.has(tx)
    );

    return { 
      covered, 
      coveredButAlreadySelected, 
      nonUtilisees, 
      nonCouvertes, 
      orphelines, 
      total: covered.length + nonUtilisees.length + nonCouvertes.length + orphelines.length 
    };
  }, [precomputedData, analysis.simpleRoles, dynamicAnalysisData, maxAchievableInfo.orphanTransactions]);

  // ðŸš€ Calcul des scores et filtrage avec cache
  const enrichedRoles = React.useMemo(() => {
    return analysis.simpleRoles
      .map(role => {
        const details = getDetails(role.roleName);
        
        // ðŸš€ NOUVELLE FORMULE : Calcul du pourcentage de couverture dynamique
        const dynamicCoveragePercentage = dynamicAnalysisData.totalRemainingTransactions > 0 
          ? (details.covered.length / dynamicAnalysisData.totalRemainingTransactions) * 100 
          : 0;

        // ðŸš€ CACHE : RÃ©cupÃ©ration des scores statiques prÃ©-calculÃ©s avec la bonne clÃ©
        const cacheKey = `${analysis.businessRole}:${role.roleName}`;
        const cachedScores = staticScoresCache.get(cacheKey) || {
          sizeScore: 0,
          usageFrequency: 0,
          totalRoleTransactions: 0,
          originalCoveredCount: 0,
          simpleRoleExecutions: 0,
          totalBusinessRoleExecutions: 0
        };



        // ðŸš€ NOUVEAU : Calcul du score de frÃ©quence d'usage restant
        const remainingUsageScore = details.covered.reduce((sum, tx) => {
          return sum + (dynamicAnalysisData.remainingExecutionMap.get(tx) || 0);
        }, 0);

        // Score de frÃ©quence dynamique (en pourcentage des exÃ©cutions restantes)
        const dynamicUsagePercentage = dynamicAnalysisData.totalRemainingExecutions > 0
          ? (remainingUsageScore / dynamicAnalysisData.totalRemainingExecutions) * 100
          : 0;

        // ðŸš€ NOUVEAU : Score global pondÃ©rÃ© DYNAMIQUE (sur les transactions restantes)
        const globalScore = includeFrequency
          ? (dynamicCoveragePercentage * (coverageWeight / 100)) +
            (cachedScores.sizeScore * (sizeWeight / 100)) +
            (dynamicUsagePercentage * (usageWeight / 100))
          : (dynamicCoveragePercentage * (coverageWeight / 100)) +
            (cachedScores.sizeScore * (sizeWeight / 100));

        return {
          ...role,
          details,
          coveragePercentage: dynamicCoveragePercentage, // ðŸŽ¯ NOUVEAU : Pourcentage dynamique
          sizeScore: cachedScores.sizeScore,
          usageFrequency: dynamicUsagePercentage, // ðŸŽ¯ NOUVEAU : FrÃ©quence dynamique
          globalScore,
          remainingUsageScore, // ðŸŽ¯ NOUVEAU : Score d'usage sur les transactions restantes
          remainingCoveredCount: details.covered.length, // ðŸŽ¯ NOUVEAU : Nombre de tx restantes couvertes
          alreadySelectedCount: details.coveredButAlreadySelected.length, // ðŸŽ¯ NOUVEAU
          ...(includeFrequency && { 
            cachedTotalExecutions: cachedScores.totalBusinessRoleExecutions,
            cachedSimpleRoleExecutions: cachedScores.simpleRoleExecutions
          })
        };
      })
      .filter(role => {
        // ðŸŽ¯ FILTRAGE : par nom de rÃ´le
        if (simpleRoleFilter.trim()) {
          if (!role.roleName.toLowerCase().includes(simpleRoleFilter.toLowerCase())) {
            return false;
          }
        }
        
        // ðŸŽ¯ NOUVEAU : Filtrage par affichage des rÃ´les 0% couverture
        if (!shouldShowZeroCoverage && role.coveragePercentage === 0) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        let aValue: number;
        let bValue: number;
        
        switch (sortField) {
          case 'roleName':
            return sortDirection === 'asc' 
              ? a.roleName.localeCompare(b.roleName)
              : b.roleName.localeCompare(a.roleName);
          case 'coveragePercentage':
            aValue = a.coveragePercentage;
            bValue = b.coveragePercentage;
            break;
          case 'sizeScore':
            aValue = a.sizeScore;
            bValue = b.sizeScore;
            break;
          case 'usageFrequency':
            aValue = a.usageFrequency;
            bValue = b.usageFrequency;
            break;
          case 'globalScore':
          default:
            aValue = a.globalScore;
            bValue = b.globalScore;
            break;
        }
        
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
  }, [
    analysis.simpleRoles, 
    getDetails, 
    simpleRoleFilter, 
    sortField, 
    sortDirection, 
    shouldShowZeroCoverage,
    dynamicAnalysisData,
    staticScoresCache,
    includeFrequency,
    coverageWeight,
    sizeWeight,
    usageWeight,
    analysis.businessRole
  ]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectionChange = React.useCallback((roleName: string, isSelected: boolean) => {
    const newSelected = new Set(selectedRoles);
    if (isSelected) {
      newSelected.add(roleName);
    } else {
      newSelected.delete(roleName);
    }
    
    onGlobalSelectionChange(analysis.businessRole, newSelected);
  }, [selectedRoles, onGlobalSelectionChange, analysis.businessRole]);

  const paginatedRoles = enrichedRoles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.palette.success.main;
    if (score >= 60) return theme.palette.warning.main;
    if (score >= 40) return theme.palette.warning.light;
    return theme.palette.error.main;
  };

  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  const getTooltipSortIcon = (field: typeof tooltipSortField) => {
    if (tooltipSortField !== field) return null;
    return tooltipSortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
  };

  // Composant de tableau pour les tooltips avec tri - VERSION SOLIDE
  const TransactionTooltipTable = React.useCallback(({ 
    transactions, 
    title, 
    txExecutionMap,
    coveredTransactions = new Set<string>()
  }: { 
    transactions: string[], 
    title: string,
    txExecutionMap: Map<string, number>,
    coveredTransactions?: Set<string>
  }) => {
    const sortedTransactions = React.useMemo(() => {
      const transactionsWithExecution = transactions.map(tx => ({
        transaction: tx,
        execution: txExecutionMap.get(tx) || 0
      }));

      return transactionsWithExecution.sort((a, b) => {
        let comparison = 0;
        if (tooltipSortField === 'transaction') {
          comparison = a.transaction.localeCompare(b.transaction);
        } else {
          comparison = a.execution - b.execution;
        }
        return tooltipSortDirection === 'asc' ? comparison : -comparison;
      });
    }, [transactions, txExecutionMap, tooltipSortField, tooltipSortDirection]);

    return (
      <Box sx={{ 
        width: '320px',
        maxWidth: '320px',
        minWidth: '320px',
        p: 0.5,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {title && (
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.8rem' }}>
            {title}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
          <strong>Total:</strong> {transactions.length} transactions
        </Typography>
        {coveredTransactions.size > 0 && (
          <Typography variant="caption" sx={{ 
            mb: 1, 
            fontSize: '0.7rem', 
            color: theme.palette.text.secondary,
            fontStyle: 'italic',
            display: 'block'
          }}>
            ~~BarrÃ©es~~ = dÃ©jÃ  couvertes par les rÃ´les sÃ©lectionnÃ©s
          </Typography>
        )}
        
        {transactions.length > 0 && (
          <Box sx={{ 
            width: '310px',
            maxWidth: '310px',
            maxHeight: '250px', 
            overflowY: 'auto',
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            borderRadius: 1,
            bgcolor: '#fff',
            // Personnalisation de la scrollbar pour rÃ©duire sa largeur
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: alpha(theme.palette.grey[300], 0.1),
            },
            '&::-webkit-scrollbar-thumb': {
              background: alpha(theme.palette.grey[400], 0.5),
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: alpha(theme.palette.grey[400], 0.7),
            },
          }}>
            {/* En-tÃªtes fixes */}
            <Box sx={{ 
              display: 'flex',
              bgcolor: alpha(theme.palette.grey[100], 0.9),
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}>
              <Box 
                sx={{ 
                  width: '180px',
                  maxWidth: '180px',
                  minWidth: '180px',
                  px: 0.5,
                  py: 0.5,
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  borderRight: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  overflow: 'hidden'
                }}
                onClick={() => handleTooltipSort('transaction')}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Transaction
                </span>
                {getTooltipSortIcon('transaction')}
              </Box>
              <Box 
                sx={{ 
                  width: '128px',
                  maxWidth: '128px',
                  minWidth: '128px',
                  px: 0.5,
                  py: 0.5,
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 0.25,
                  overflow: 'hidden'
                }}
                onClick={() => handleTooltipSort('execution')}
              >
                <span>Exec.</span>
                {getTooltipSortIcon('execution')}
              </Box>
            </Box>

            {/* Corps du tableau */}
            <Box sx={{ overflow: 'hidden' }}>
              {sortedTransactions.map((item, idx) => (
                <Box 
                  key={idx} 
                  sx={{ 
                    display: 'flex',
                    '&:nth-of-type(odd)': { 
                      bgcolor: alpha(theme.palette.grey[50], 0.3) 
                    },
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04)
                    },
                    minHeight: '24px'
                  }}
                >
                  <Box sx={{ 
                    width: '180px',
                    maxWidth: '180px',
                    minWidth: '180px',
                    px: 0.5,
                    py: 0.25,
                    fontSize: '0.65rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: coveredTransactions.has(item.transaction) ? 'line-through' : 'none',
                    color: coveredTransactions.has(item.transaction) 
                      ? alpha(theme.palette.text.secondary, 0.6) 
                      : theme.palette.text.primary
                  }}>
                    {item.transaction}
                  </Box>
                  <Box sx={{ 
                    width: '128px',
                    maxWidth: '128px',
                    minWidth: '128px',
                    px: 0.5,
                    py: 0.25,
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    pr: 1, // Padding supplÃ©mentaire Ã  droite pour Ã©viter la scrollbar
                    textDecoration: coveredTransactions.has(item.transaction) ? 'line-through' : 'none',
                    color: coveredTransactions.has(item.transaction) 
                      ? alpha(theme.palette.text.secondary, 0.6) 
                      : theme.palette.text.primary
                  }}>
                    {item.execution.toLocaleString()}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    );
  }, [tooltipSortField, tooltipSortDirection, handleTooltipSort, getTooltipSortIcon, theme]);

  const isInFocusMode = focusedBusinessRole === analysis.businessRole;

  // Ajuster automatiquement le nombre de lignes en mode focus
  React.useEffect(() => {
    if (isInFocusMode) {
      setRowsPerPage(25);
      setPage(0); // Remettre Ã  la premiÃ¨re page
    } else {
      setRowsPerPage(5);
      setPage(0); // Remettre Ã  la premiÃ¨re page
    }
  }, [isInFocusMode]);

  // DÃ©claration des catÃ©gories de rÃ´les sÃ©lectionnÃ©s pour le scroll horizontal (triÃ©s par ordre alphabÃ©tique)
  const gestionRoles: string[] = Array.from(selectedRoles)
    .filter((r: string) => r.includes(':M:') || r.includes(':G:'))
    .sort((a, b) => a.localeCompare(b));
  const affichageRoles: string[] = Array.from(selectedRoles)
    .filter((r: string) => r.includes(':D:') || r.includes(':A:'))
    .sort((a, b) => a.localeCompare(b));
  const autresRoles: string[] = Array.from(selectedRoles)
    .filter((r: string) => !r.includes(':M:') && !r.includes(':G:') && !r.includes(':D:') && !r.includes(':A:'))
    .sort((a, b) => a.localeCompare(b));

  return (
    <Card 
      elevation={isInFocusMode ? 8 : 2} 
      sx={{ 
        mb: 3,
        transition: 'all 0.3s ease',
        border: isInFocusMode ? `2px solid ${theme.palette.primary.main}` : 'none',
        ...(isInFocusMode && {
          transform: 'scale(1.02)',
          boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
        })
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* En-tÃªte avec informations du rÃ´le mÃ©tier */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mr: 2 }}>
                {analysis.businessRole}
              </Typography>
              {isInFocusMode && (
                <Chip 
                  label="Mode Focus" 
                  color="primary" 
                  size="small" 
                  sx={{ mr: 1 }}
                />
              )}
            </Box>
            
            {/* Informations compactes du rÃ´le mÃ©tier */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 2, 
              mb: 2,
              p: 2,
              bgcolor: alpha(theme.palette.grey[50], 0.5),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
            }}>
              {/* Transactions du rÃ´le mÃ©tier */}
              <Tooltip
                title={
                  <TransactionTooltipTable
                    transactions={Array.from(analysis.uniqueTransactions)}
                    title="ðŸ“‹ Transactions du RÃ´le MÃ©tier"
                    txExecutionMap={precomputedData.txExecutionMap}
                    coveredTransactions={dynamicAnalysisData.selectedTransactions}
                  />
                }
                arrow
                placement="top"
                enterDelay={300}
                leaveDelay={100}
              >
                <Box sx={{ cursor: 'help' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary, display: 'block' }}>
                    ðŸ“‹ Transactions MÃ©tier
                </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                    {analysis.uniqueTransactions.length} transactions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {analysis.uniqueTransactions.slice(0, 3).join(', ')}
                    {analysis.uniqueTransactions.length > 3 && ` +${analysis.uniqueTransactions.length - 3} autres`}
                </Typography>
              </Box>
              </Tooltip>
              
              {/* Couverture actuelle vs maximum */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary, display: 'block' }}>
                  ðŸŽ¯ Couverture
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  <span style={{ color: getScoreColor((dynamicAnalysisData.coveredTransactionsCount / maxAchievableInfo.totalTransactions) * 100) }}>
                    {dynamicAnalysisData.coveredTransactionsCount}
                  </span>
                  <span style={{ color: theme.palette.text.secondary }}> / </span>
                  <span style={{ color: theme.palette.info.main }}>
                    {maxAchievableInfo.maxAchievableTransactions}
                  </span>
                  <span style={{ color: theme.palette.text.secondary }}> / {maxAchievableInfo.totalTransactions}</span>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {((dynamicAnalysisData.coveredTransactionsCount / maxAchievableInfo.maxAchievableTransactions) * 100).toFixed(1)}% du max possible
                </Typography>
              </Box>
              
              {/* Transactions orphelines */}
              <Tooltip
                title={
                  maxAchievableInfo.orphanTransactions.length > 0 ? (
                    <Box sx={{ 
                      width: '320px',
                      maxWidth: '320px',
                      minWidth: '320px',
                      p: 0.5,
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.8rem' }}>
                        âš ï¸ Transactions Orphelines
                </Typography>
                      <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
                        Transactions du rÃ´le mÃ©tier qui ne peuvent Ãªtre couvertes par aucun rÃ´le simple disponible.
                </Typography>
                      <TransactionTooltipTable
                        transactions={maxAchievableInfo.orphanTransactions}
                        title=""
                        txExecutionMap={precomputedData.txExecutionMap}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ p: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        âš ï¸ Transactions Orphelines
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Transactions du rÃ´le mÃ©tier qui ne peuvent Ãªtre couvertes par aucun rÃ´le simple disponible.
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        Aucune transaction orpheline
                </Typography>
              </Box>
                  )
                }
                arrow
                placement="top"
                enterDelay={300}
                leaveDelay={100}
              >
                <Box sx={{ cursor: 'help' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.warning.main, display: 'block' }}>
                    âš ï¸ Orphelines
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                    {maxAchievableInfo.orphanTransactions.length} transactions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {maxAchievableInfo.orphanTransactions.length > 0 
                      ? `${maxAchievableInfo.orphanTransactions.slice(0, 2).join(', ')}${maxAchievableInfo.orphanTransactions.length > 2 ? '...' : ''}`
                      : 'Aucune transaction orpheline'
                    }
                  </Typography>
            </Box>
              </Tooltip>

              {/* Transactions non utilisÃ©es */}
              <Tooltip
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      ðŸš« Transactions Non UtilisÃ©es
                </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Transactions ajoutÃ©es par les rÃ´les simples sÃ©lectionnÃ©s mais qui ne sont jamais utilisÃ©es par ce rÃ´le mÃ©tier.
                </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Total:</strong> {dynamicAnalysisData.unusedTransactions.length} transactions
                    </Typography>
                    {dynamicAnalysisData.unusedTransactions.length > 0 && (
                      <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Transactions non utilisÃ©es:</Typography>
                        {dynamicAnalysisData.unusedTransactions.slice(0, 20).map((tx, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.75rem' }}>
                            â€¢ {tx}
                          </Typography>
                        ))}
                        {dynamicAnalysisData.unusedTransactions.length > 20 && (
                          <Typography variant="caption" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                            ... et {dynamicAnalysisData.unusedTransactions.length - 20} autres
                          </Typography>
                        )}
              </Box>
                    )}
              </Box>
                }
                arrow
                placement="top"
                enterDelay={300}
                leaveDelay={100}
              >
                <Box sx={{ cursor: 'help' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.error.main, display: 'block' }}>
                    ðŸš« Non UtilisÃ©es
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                    {dynamicAnalysisData.unusedTransactions.length} transactions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    AjoutÃ©es par sÃ©lection mais inutiles
                  </Typography>
            </Box>
              </Tooltip>


            </Box>

          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {!isInFocusMode ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onFocusBusinessRole(analysis.businessRole)}
                sx={{ minWidth: 100 }}
              >
                Focus
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                onClick={onExitFocus}
                sx={{ minWidth: 100 }}
              >
                Quitter Focus
              </Button>
            )}
          </Box>
        </Box>

        {/* RÃ´les sÃ©lectionnÃ©s avec distinction - Section pleine largeur */}
        {selectedRoles.size > 0 && (
          <Box sx={{ 
            width: '100%', 
            mb: 3,
            p: 2,
            bgcolor: alpha(theme.palette.success.main, 0.05),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Tooltip
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      âœ… RÃ´les SÃ©lectionnÃ©s
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      RÃ´les simples actuellement sÃ©lectionnÃ©s pour couvrir les transactions de ce rÃ´le mÃ©tier.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Gestion:</strong> RÃ´les avec permissions de modification/crÃ©ation
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Affichage:</strong> RÃ´les avec permissions de lecture/consultation
                    </Typography>
                    <Typography variant="body2">
                      <strong>Autres:</strong> RÃ´les avec permissions spÃ©cifiques ou mixtes
                </Typography>
              </Box>
            }
                arrow
                placement="top"
                enterDelay={300}
                leaveDelay={100}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.success.main, cursor: 'help' }}>
                  âœ… RÃ´les SÃ©lectionnÃ©s ({selectedRoles.size})
          </Typography>
              </Tooltip>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => onGlobalSelectionChange(analysis.businessRole, new Set<string>())}
            sx={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 500,
                  minWidth: 'auto', 
                  px: 1.5,
                  py: 0.5,
                  height: 28,
                  borderRadius: 1,
                  textTransform: 'none',
                  '&:hover': { 
                    bgcolor: alpha(theme.palette.error.main, 0.1),
                    borderColor: theme.palette.error.main
                  }
                }}
              >
                Tout dÃ©sÃ©lectionner
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%' }}>
              {/* Gestion */}
                  {gestionRoles.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600, color: theme.palette.text.primary, mr: 2, flexShrink: 0, minWidth: 80 }}>
                    Gestion:
                      </Typography>
                  <Box sx={{ flex: 1, overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: 0.75, py: 0.5 }}>
                    {gestionRoles.map((roleName: string) => (
                          <Chip
                            key={roleName}
                        label={roleName.split(':').pop() || roleName}
                            onDelete={() => handleSelectionChange(roleName, false)}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.75rem',
                          height: 24,
                          '& .MuiChip-label': { px: 1, fontSize: '0.75rem', color: theme.palette.text.primary },
                          '& .MuiChip-deleteIcon': { fontSize: '0.875rem', ml: 0.5 },
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
              {/* Affichage */}
                  {affichageRoles.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600, color: theme.palette.text.primary, mr: 2, flexShrink: 0, minWidth: 80 }}>
                    Affichage:
                      </Typography>
                  <Box sx={{ flex: 1, overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: 0.75, py: 0.5 }}>
                    {affichageRoles.map((roleName: string) => (
                          <Chip
                            key={roleName}
                        label={roleName.split(':').pop() || roleName}
                            onDelete={() => handleSelectionChange(roleName, false)}
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.75rem',
                          height: 24,
                          '& .MuiChip-label': { px: 1, fontSize: '0.75rem', color: theme.palette.text.primary },
                          '& .MuiChip-deleteIcon': { fontSize: '0.875rem', ml: 0.5 },
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
              {/* Autres */}
                  {autresRoles.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600, color: theme.palette.text.primary, mr: 2, flexShrink: 0, minWidth: 80 }}>
                    Autres:
                      </Typography>
                  <Box sx={{ flex: 1, overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: 0.75, py: 0.5 }}>
                    {autresRoles.map((roleName: string) => (
                          <Chip
                            key={roleName}
                            label={roleName}
                            onDelete={() => handleSelectionChange(roleName, false)}
                            size="small"
                        color="secondary"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.75rem',
                          height: 24,
                          '& .MuiChip-label': { px: 1, fontSize: '0.75rem', color: theme.palette.text.primary },
                          '& .MuiChip-deleteIcon': { fontSize: '0.875rem', ml: 0.5 },
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                            }}
                          />
                        ))}
                  </Box>
                </Box>
              )}
                      </Box>
                    </Box>
                  )}
                  
                {/* Barre de progression dynamique - Version discrÃ¨te */}
        <Box sx={{ 
          width: '100%', 
          mb: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
              Progression de la couverture
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.75rem' }}>
              {((dynamicAnalysisData.coveredTransactionsCount / maxAchievableInfo.maxAchievableTransactions) * 100).toFixed(1)}% du maximum
            </Typography>
          </Box>
          <Box sx={{ 
            width: '100%', 
            height: 6, 
            bgcolor: alpha(theme.palette.grey[300], 0.2), 
            borderRadius: 1,
            overflow: 'hidden'
          }}>
            <Box sx={{
              width: `${(dynamicAnalysisData.coveredTransactionsCount / maxAchievableInfo.maxAchievableTransactions) * 100}%`,
              height: '100%',
              bgcolor: alpha(theme.palette.primary.main, 0.7),
              transition: 'width 0.3s ease'
            }} />
          </Box>
        </Box>

        {/* ContrÃ´les d'affichage */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={shouldShowZeroCoverage}
                onChange={(e) => onToggleZeroCoverageRoles(analysis.businessRole, e.target.checked)}
                      size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {shouldShowZeroCoverage ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                <Typography variant="caption">
                  Afficher rÃ´les 0% ({analysis.simpleRoles.filter(r => {
                    const details = getDetails(r.roleName);
                    return details.covered.length === 0;
                  }).length})
                </Typography>
              </Box>
            }
            sx={{ mr: 2 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            {enrichedRoles.length} rÃ´le(s) affichÃ©(s) sur {analysis.simpleRoles.length}
          </Typography>
                  </Box>

        {/* Tableau des rÃ´les simples */}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>SÃ©lection</TableCell>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('roleName')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Nom du RÃ´le
                  {getSortIcon('roleName')}
                </Box>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('coveragePercentage')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Couverture Restante
                  {getSortIcon('coveragePercentage')}
                </Box>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('sizeScore')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Score Taille
                  {getSortIcon('sizeScore')}
                </Box>
              </TableCell>
              {includeFrequency && (
                <TableCell 
                  align="center" 
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => handleSort('usageFrequency')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Usage Restant
                    {getSortIcon('usageFrequency')}
                  </Box>
                </TableCell>
              )}
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('globalScore')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Score Global
                  {getSortIcon('globalScore')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>DÃ©tails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRoles.map((role, index) => {
              const isRoleSelected = selectedRoles.has(role.roleName);
              
              return (
                <React.Fragment key={role.roleName}>
                  <TableRow hover>
                    <TableCell>
                      <Checkbox
                        checked={isRoleSelected}
                        onChange={(e) => handleSelectionChange(role.roleName, e.target.checked)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {role.roleName}
                      </Typography>
                      {role.alreadySelectedCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          +{role.alreadySelectedCount} dÃ©jÃ  couvertes
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${role.coveragePercentage.toFixed(1)}%`}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getScoreColor(role.coveragePercentage), 0.1),
                          color: getScoreColor(role.coveragePercentage),
                          fontWeight: 600,
                          minWidth: 60
                        }}
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        {role.remainingCoveredCount} tx
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {role.sizeScore.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    {includeFrequency && (
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {role.usageFrequency.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.remainingUsageScore} exec
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="center">
                      <Chip
                        label={role.globalScore.toFixed(1)}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getScoreColor(role.globalScore), 0.1),
                          color: getScoreColor(role.globalScore),
                          fontWeight: 600
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                        variant="outlined"
                      >
                        {expandedRow === index ? 'Masquer' : 'Voir'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {/* Ligne de dÃ©tails expansible */}
                  <TableRow>
                    <TableCell colSpan={includeFrequency ? 7 : 6} sx={{ p: 0 }}>
                      <Collapse in={expandedRow === index} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 3, bgcolor: alpha(theme.palette.grey[50], 0.5) }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                            {/* Transactions couvertes */}
                          <TransactionBlock
                            transactions={role.details.covered}
                            execMap={dynamicAnalysisData.remainingExecutionMap}
                              title="âœ… Transactions couvertes"
                            color={theme.palette.success.main}
                            emptyLabel="Aucune transaction couverte"
                            crossedOutTransactions={role.details.coveredButAlreadySelected}
                          />
                            
                            {/* Transactions non utilisÃ©es */}
                            <TransactionBlock
                              transactions={role.details.nonUtilisees}
                              execMap={new Map()} // Pas d'exÃ©cutions pour les transactions non utilisÃ©es
                              title="ðŸš« Transactions non utilisÃ©es"
                              color={theme.palette.error.main}
                              emptyLabel="Aucune transaction non utilisÃ©e"
                            />
                            
                            {/* Transactions non couvertes */}
                            <TransactionBlock
                              transactions={role.details.nonCouvertes}
                              execMap={dynamicAnalysisData.remainingExecutionMap}
                              title="âš ï¸ Transactions non couvertes"
                              color={theme.palette.warning.main}
                              emptyLabel="Aucune transaction non couverte"
                            />
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={enrichedRoles.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="RÃ´les par page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </CardContent>
    </Card>
  );
}, arePropsEqual);

export default BusinessRoleAnalysisCard; 
