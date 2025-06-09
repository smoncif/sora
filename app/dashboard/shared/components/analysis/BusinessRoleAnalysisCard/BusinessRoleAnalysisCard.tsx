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
import { CoverageAnalysis, SimpleRoleTransaction } from '@/types/roleAnalysis';

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

// 🚀 Fonction de comparaison optimisée pour React.memo
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

  // Comparaison des rôles sélectionnés pour ce rôle métier spécifique
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

  // Comparaison des Maps de cache (par référence, car elles sont stables)
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
  
  // États pour le système de tri
  const [sortField, setSortField] = React.useState<'roleName' | 'coveragePercentage' | 'sizeScore' | 'usageFrequency' | 'globalScore'>('globalScore');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  // États pour le tri dans les tooltips
  const [tooltipSortField, setTooltipSortField] = React.useState<'transaction' | 'execution'>('execution');
  const [tooltipSortDirection, setTooltipSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  // 🎯 OPTIMISÉ : Les rôles sélectionnés sont maintenant passés directement pour ce rôle métier
  const selectedRoles = globalSelectedRoles;
  

  
  // 🎯 NOUVEAU : État local pour afficher/masquer les rôles 0% couverture
  const shouldShowZeroCoverage = showZeroCoverageRoles.get(analysis.businessRole) ?? false;
  
  // Fonction de tri
  const handleSort = React.useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Par défaut, trier par ordre décroissant pour les nouvelles colonnes
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

  // 🚀 OPTIMISATION MAJEURE : Pré-calcul de TOUS les détails une seule fois
  const precomputedData = React.useMemo(() => {
    // 🎯 GUARD : Vérifier que les données sont disponibles
    if (!businessRoleTransactions || !Array.isArray(businessRoleTransactions)) {
      return {
        businessRoleTxSet: new Set<string>(),
        txExecutionMap: new Map<string, number>(),
        transactionsByRole: new Map<string, string[]>(),
        currentBusinessRoleTransactions: [],
        originalTransactions: []
      };
    }
    
    // 🎯 CORRECTION : Filtrer pour ne garder que les transactions de CE rôle métier spécifique
    const currentBusinessRoleTransactions = businessRoleTransactions.filter(tx => 
      tx.businessRole === analysis.businessRole
    );
    
    // Étape 1: Créer des Map/Set pour des recherches O(1)
    const businessRoleTxSet = new Set(currentBusinessRoleTransactions.map(tx => tx.transaction));
    const txExecutionMap = new Map<string, number>();
    currentBusinessRoleTransactions.forEach((tx: any) => {
      txExecutionMap.set(tx.transaction, tx.executionCount || 0);
    });
    
    // Étape 2: Grouper les transactions par rôle simple pour éviter les filtres répétés
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

  // 🚀 CALCUL FIXE : Maximum atteignable calculé une seule fois (ne change jamais)
  const maxAchievableInfo = React.useMemo(() => {
    // Calculer toutes les transactions qui peuvent être couvertes par au moins un rôle simple
    const allCoverableTransactions = new Set<string>();
    analysis.simpleRoles.forEach(role => {
      (role.coveredTransactions || []).forEach(tx => {
        allCoverableTransactions.add(tx);
      });
    });
    
    // Transactions orphelines = transactions du rôle métier qui ne sont couvertes par aucun rôle simple
    const orphanTransactions = analysis.uniqueTransactions.filter(tx => !allCoverableTransactions.has(tx));
    const maxAchievableTransactions = analysis.uniqueTransactions.length - orphanTransactions.length;

    return {
      orphanTransactions,
      maxAchievableTransactions,
      totalTransactions: analysis.uniqueTransactions.length
    };
  }, [analysis.simpleRoles, analysis.uniqueTransactions]);

  // 🎯 NOUVEAU : Calcul dynamique des transactions COUVERTES (depuis 0 vers le max)
  const dynamicAnalysisData = React.useMemo(() => {
    // Étape 1: Calculer les transactions couvertes par les rôles sélectionnés
    const selectedTransactions = new Set<string>();
    const allSelectedRoleTransactions = new Set<string>(); // NOUVEAU: Toutes les transactions des rôles sélectionnés
    
    selectedRoles.forEach(roleName => {
      const roleData = analysis.simpleRoles.find(r => r.roleName === roleName);
      // Ajouter les transactions couvertes (pour le calcul de couverture)
      if (roleData) {
        (roleData.coveredTransactions || []).forEach(tx => selectedTransactions.add(tx));
      }
      
      // NOUVEAU: Ajouter TOUTES les transactions du rôle simple (pour calculer les non utilisées)
      const allRoleTransactions = precomputedData.transactionsByRole.get(roleName) || [];
      allRoleTransactions.forEach(tx => allSelectedRoleTransactions.add(tx));
    });

    // Étape 2: Calculer les transactions restantes (non encore couvertes par les sélections)
    const remainingTransactions = analysis.uniqueTransactions.filter(tx => !selectedTransactions.has(tx));
    const remainingBusinessTransactions = precomputedData.currentBusinessRoleTransactions.filter(tx => !selectedTransactions.has(tx.transaction));
    
    // Étape 3: Calculer le total des exécutions restantes pour CE rôle métier spécifiquement
    const totalRemainingExecutions = remainingBusinessTransactions.reduce((sum: number, tx: any) => sum + (tx.executionCount || 0), 0);

    // Étape 4: Créer des maps pour les calculs optimisés
    const remainingTxSet = new Set(remainingTransactions);
    const remainingExecutionMap = new Map<string, number>();
    remainingBusinessTransactions.forEach((tx: any) => {
      remainingExecutionMap.set(tx.transaction, tx.executionCount || 0);
    });

    // Étape 5: Calculer les transactions non utilisées (TOUTES les transactions des rôles sélectionnés qui ne sont pas dans le rôle métier)
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

  // 🚀 Fonction ultra-rapide de récupération des détails avec recalcul dynamique
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

    // 🎯 NOUVEAU : Séparer les transactions couvertes selon leur disponibilité
    const covered = (roleData.coveredTransactions || []).filter(tx => 
      dynamicAnalysisData.remainingTxSet.has(tx)
    );
    
    // 🎯 NOUVEAU : Transactions couvertes par ce rôle mais déjà sélectionnées par d'autres
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

  // 🚀 Calcul des scores et filtrage avec cache
  const enrichedRoles = React.useMemo(() => {
    return analysis.simpleRoles
      .map(role => {
        const details = getDetails(role.roleName);
        
        // 🚀 NOUVELLE FORMULE : Calcul du pourcentage de couverture dynamique
        const dynamicCoveragePercentage = dynamicAnalysisData.totalRemainingTransactions > 0 
          ? (details.covered.length / dynamicAnalysisData.totalRemainingTransactions) * 100 
          : 0;

        // 🚀 CACHE : Récupération des scores statiques pré-calculés avec la bonne clé
        const cacheKey = `${analysis.businessRole}:${role.roleName}`;
        const cachedScores = staticScoresCache.get(cacheKey) || {
          sizeScore: 0,
          usageFrequency: 0,
          totalRoleTransactions: 0,
          originalCoveredCount: 0,
          simpleRoleExecutions: 0,
          totalBusinessRoleExecutions: 0
        };



        // 🚀 NOUVEAU : Calcul du score de fréquence d'usage restant
        const remainingUsageScore = details.covered.reduce((sum, tx) => {
          return sum + (dynamicAnalysisData.remainingExecutionMap.get(tx) || 0);
        }, 0);

        // Score de fréquence dynamique (en pourcentage des exécutions restantes)
        const dynamicUsagePercentage = dynamicAnalysisData.totalRemainingExecutions > 0
          ? (remainingUsageScore / dynamicAnalysisData.totalRemainingExecutions) * 100
          : 0;

        // 🚀 NOUVEAU : Score global pondéré DYNAMIQUE (sur les transactions restantes)
        const globalScore = includeFrequency
          ? (dynamicCoveragePercentage * (coverageWeight / 100)) +
            (cachedScores.sizeScore * (sizeWeight / 100)) +
            (dynamicUsagePercentage * (usageWeight / 100))
          : (dynamicCoveragePercentage * (coverageWeight / 100)) +
            (cachedScores.sizeScore * (sizeWeight / 100));

        return {
          ...role,
          details,
          coveragePercentage: dynamicCoveragePercentage, // 🎯 NOUVEAU : Pourcentage dynamique
          sizeScore: cachedScores.sizeScore,
          usageFrequency: dynamicUsagePercentage, // 🎯 NOUVEAU : Fréquence dynamique
          globalScore,
          remainingUsageScore, // 🎯 NOUVEAU : Score d'usage sur les transactions restantes
          remainingCoveredCount: details.covered.length, // 🎯 NOUVEAU : Nombre de tx restantes couvertes
          alreadySelectedCount: details.coveredButAlreadySelected.length, // 🎯 NOUVEAU
          ...(includeFrequency && { 
            cachedTotalExecutions: cachedScores.totalBusinessRoleExecutions,
            cachedSimpleRoleExecutions: cachedScores.simpleRoleExecutions
          })
        };
      })
      .filter(role => {
        // 🎯 FILTRAGE : par nom de rôle
        if (simpleRoleFilter.trim()) {
          if (!role.roleName.toLowerCase().includes(simpleRoleFilter.toLowerCase())) {
            return false;
          }
        }
        
        // 🎯 NOUVEAU : Filtrage par affichage des rôles 0% couverture
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
            ~~Barrées~~ = déjà couvertes par les rôles sélectionnés
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
            // Personnalisation de la scrollbar pour réduire sa largeur
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
            {/* En-têtes fixes */}
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
                    pr: 1, // Padding supplémentaire à droite pour éviter la scrollbar
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
      setPage(0); // Remettre à la première page
    } else {
      setRowsPerPage(5);
      setPage(0); // Remettre à la première page
    }
  }, [isInFocusMode]);

  // Déclaration des catégories de rôles sélectionnés pour le scroll horizontal (triés par ordre alphabétique)
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
        {/* En-tête avec informations du rôle métier */}
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
            
            {/* Informations compactes du rôle métier */}
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
              {/* Transactions du rôle métier */}
              <Tooltip
                title={
                  <TransactionTooltipTable
                    transactions={Array.from(analysis.uniqueTransactions)}
                    title="📋 Transactions du Rôle Métier"
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
                    📋 Transactions Métier
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
                  🎯 Couverture
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
                        ⚠️ Transactions Orphelines
                </Typography>
                      <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
                        Transactions du rôle métier qui ne peuvent être couvertes par aucun rôle simple disponible.
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
                        ⚠️ Transactions Orphelines
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Transactions du rôle métier qui ne peuvent être couvertes par aucun rôle simple disponible.
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
                    ⚠️ Orphelines
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

              {/* Transactions non utilisées */}
              <Tooltip
                title={
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      🚫 Transactions Non Utilisées
                </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Transactions ajoutées par les rôles simples sélectionnés mais qui ne sont jamais utilisées par ce rôle métier.
                </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Total:</strong> {dynamicAnalysisData.unusedTransactions.length} transactions
                    </Typography>
                    {dynamicAnalysisData.unusedTransactions.length > 0 && (
                      <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Transactions non utilisées:</Typography>
                        {dynamicAnalysisData.unusedTransactions.slice(0, 20).map((tx, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.75rem' }}>
                            • {tx}
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
                    🚫 Non Utilisées
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                    {dynamicAnalysisData.unusedTransactions.length} transactions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Ajoutées par sélection mais inutiles
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

        {/* Rôles sélectionnés avec distinction - Section pleine largeur */}
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
                      ✅ Rôles Sélectionnés
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Rôles simples actuellement sélectionnés pour couvrir les transactions de ce rôle métier.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Gestion:</strong> Rôles avec permissions de modification/création
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Affichage:</strong> Rôles avec permissions de lecture/consultation
                    </Typography>
                    <Typography variant="body2">
                      <strong>Autres:</strong> Rôles avec permissions spécifiques ou mixtes
                </Typography>
              </Box>
            }
                arrow
                placement="top"
                enterDelay={300}
                leaveDelay={100}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.success.main, cursor: 'help' }}>
                  ✅ Rôles Sélectionnés ({selectedRoles.size})
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
                Tout désélectionner
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
                  
                {/* Barre de progression dynamique - Version discrète */}
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

        {/* Contrôles d'affichage */}
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
                  Afficher rôles 0% ({analysis.simpleRoles.filter(r => {
                    const details = getDetails(r.roleName);
                    return details.covered.length === 0;
                  }).length})
                </Typography>
              </Box>
            }
            sx={{ mr: 2 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            {enrichedRoles.length} rôle(s) affiché(s) sur {analysis.simpleRoles.length}
          </Typography>
                  </Box>

        {/* Tableau des rôles simples */}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Sélection</TableCell>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('roleName')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Nom du Rôle
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
              <TableCell align="center" sx={{ fontWeight: 600 }}>Détails</TableCell>
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
                          +{role.alreadySelectedCount} déjà couvertes
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
                  
                  {/* Ligne de détails expansible */}
                  <TableRow>
                    <TableCell colSpan={includeFrequency ? 7 : 6} sx={{ p: 0 }}>
                      <Collapse in={expandedRow === index} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 3, bgcolor: alpha(theme.palette.grey[50], 0.5) }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                            {/* Transactions couvertes */}
                          <TransactionBlock
                            transactions={role.details.covered}
                            execMap={dynamicAnalysisData.remainingExecutionMap}
                              title="✅ Transactions couvertes"
                            color={theme.palette.success.main}
                            emptyLabel="Aucune transaction couverte"
                            crossedOutTransactions={role.details.coveredButAlreadySelected}
                          />
                            
                            {/* Transactions non utilisées */}
                            <TransactionBlock
                              transactions={role.details.nonUtilisees}
                              execMap={new Map()} // Pas d'exécutions pour les transactions non utilisées
                              title="🚫 Transactions non utilisées"
                              color={theme.palette.error.main}
                              emptyLabel="Aucune transaction non utilisée"
                            />
                            
                            {/* Transactions non couvertes */}
                            <TransactionBlock
                              transactions={role.details.nonCouvertes}
                              execMap={dynamicAnalysisData.remainingExecutionMap}
                              title="⚠️ Transactions non couvertes"
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
          labelRowsPerPage="Rôles par page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </CardContent>
    </Card>
  );
}, arePropsEqual);

export default BusinessRoleAnalysisCard; 