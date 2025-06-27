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
  Checkbox,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { TransactionBlock } from '../TransactionBlock';
import { ZeroCoverageToggle } from '../ZeroCoverageToggle';
import { CoverageAnalysis, SimpleRoleTransaction } from 'lib/types/roleAnalysis';
import { useBusinessRoleFocus } from '../../../contexts/FocusContext';

// 🚀 NOUVEAU : Composant isolé pour les lignes de rôles simples
// 🚀 OPTIMISÉ : SimpleRoleRow avec memoization avancée
const SimpleRoleRow = React.memo(function SimpleRoleRow({
  role,
  index,
  isSelected,
  includeFrequency,
  getScoreColor,
  isExpanded,
  onSelectionChange,
  onToggleExpansion,
  dynamicData,
  theme,
}: {
  role: any;
  index: number;
  isSelected: boolean;
  includeFrequency: boolean;
  getScoreColor: (score: number) => string;
  isExpanded: boolean;
  onSelectionChange: (roleName: string, isSelected: boolean) => void;
  onToggleExpansion: (index: number) => void;
  dynamicData: any;
  theme: any;
}) {
  console.log(`[PERF] RENDU SimpleRoleRow pour ${role.roleName}, index ${index}`);
  
  const handleCheckboxChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange(role.roleName, e.target.checked);
  }, [role.roleName, onSelectionChange]);
  
  const handleToggleExpanded = React.useCallback(() => {
    onToggleExpansion(index);
  }, [index, onToggleExpansion]);

  // 🚀 OPTIMISATION : Props stables pour TransactionBlock
  const coveredTx = React.useMemo(() => role.details.covered, [role.details]);
  const nonUtiliseesTx = React.useMemo(() => role.details.nonUtilisees, [role.details]);
  const nonCouvertesTx = React.useMemo(() => role.details.nonCouvertes, [role.details]);
  const coveredButAlreadySelected = React.useMemo(() => role.details.coveredButAlreadySelected, [role.details]);
  const execMap = React.useMemo(() => dynamicData.remainingExecutionMap, [dynamicData]);
  const emptyExecMap = React.useMemo(() => new Map(), []);

  return (
    <React.Fragment>
      <TableRow hover>
        <TableCell>
          <Checkbox
            checked={isSelected}
            onChange={handleCheckboxChange}
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
          <Typography variant="caption" color="text.secondary">
            {role.totalRoleTransactions} tx
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
            onClick={handleToggleExpanded}
            variant="outlined"
          >
            {isExpanded ? 'Masquer' : 'Voir'}
          </Button>
        </TableCell>
      </TableRow>
      
      {/* Ligne de détails expansible */}
      <TableRow>
        <TableCell colSpan={includeFrequency ? 7 : 6} sx={{ p: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3, bgcolor: alpha(theme.palette.grey[50], 0.5) }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                {/* Transactions couvertes */}
                <TransactionBlock
                  transactions={coveredTx}
                  execMap={execMap}
                  title="✅ Transactions couvertes"
                  color={theme.palette.success.main}
                  emptyLabel="Aucune transaction couverte"
                  crossedOutTransactions={coveredButAlreadySelected}
                />
                
                {/* Transactions non utilisées */}
                <TransactionBlock
                  transactions={nonUtiliseesTx}
                  execMap={emptyExecMap}
                  title="🚫 Transactions non utilisées"
                  color={theme.palette.error.main}
                  emptyLabel="Aucune transaction non utilisée"
                />
                
                {/* Transactions non couvertes */}
                <TransactionBlock
                  transactions={nonCouvertesTx}
                  execMap={execMap}
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
}, (prevProps, nextProps) => {
  // Comparaison optimisée :
  // - Si la ligne n'est pas concernée par l'expansion, on ignore isExpanded
  // - Sinon, on compare tout
  if (!prevProps.isExpanded && !nextProps.isExpanded) {
    // Props stables hors expansion
    return (
      prevProps.role.roleName === nextProps.role.roleName &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.includeFrequency === nextProps.includeFrequency &&
      prevProps.role.coveragePercentage === nextProps.role.coveragePercentage &&
      prevProps.role.globalScore === nextProps.role.globalScore &&
      prevProps.dynamicData.remainingExecutionMap === nextProps.dynamicData.remainingExecutionMap
    );
  }
  // Sinon, on compare tout (y compris isExpanded)
  return (
    prevProps.role.roleName === nextProps.role.roleName &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.includeFrequency === nextProps.includeFrequency &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.role.coveragePercentage === nextProps.role.coveragePercentage &&
    prevProps.role.globalScore === nextProps.role.globalScore &&
    prevProps.dynamicData.remainingExecutionMap === nextProps.dynamicData.remainingExecutionMap
  );
});

export interface BusinessRoleAnalysisCardProps {
  analysis: CoverageAnalysis;
  includeFrequency: boolean;
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  businessRoleTransactions: any[];
  simpleRoleTransactions: SimpleRoleTransaction[];
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

}

// 🚀 Fonction de comparaison optimisée pour React.memo
const arePropsEqual = (prevProps: BusinessRoleAnalysisCardProps, nextProps: BusinessRoleAnalysisCardProps) => {
  // 🚀 ISOLATION : Log pour debug des re-rendus
  const businessRole = prevProps.analysis.businessRole;
  console.log(`[PERF] Comparaison props pour ${businessRole}`);

  // Comparaison rapide des props simples
  if (
    prevProps.analysis.businessRole !== nextProps.analysis.businessRole ||
    prevProps.includeFrequency !== nextProps.includeFrequency ||
    prevProps.coverageWeight !== nextProps.coverageWeight ||
    prevProps.sizeWeight !== nextProps.sizeWeight ||
    prevProps.usageWeight !== nextProps.usageWeight ||

    prevProps.simpleRoleFilter !== nextProps.simpleRoleFilter
  ) {
    console.log(`[PERF] CHANGE détecté pour ${businessRole} - Props de base`);
    return false;
  }

  // 🚀 AMÉLIORATION : Comparaison complète des arrays de données
  if (
    prevProps.businessRoleTransactions !== nextProps.businessRoleTransactions ||
    prevProps.simpleRoleTransactions !== nextProps.simpleRoleTransactions
  ) {
    console.log(`[PERF] CHANGE détecté pour ${businessRole} - Données transactions`);
    return false;
  }

  // 🚀 AMÉLIORATION : Comparaison structure analysis
  if (
    prevProps.analysis !== nextProps.analysis ||
    prevProps.analysis.simpleRoles.length !== nextProps.analysis.simpleRoles.length ||
    prevProps.analysis.uniqueTransactions.length !== nextProps.analysis.uniqueTransactions.length
  ) {
    console.log(`[PERF] CHANGE détecté pour ${businessRole} - Structure analysis`);
    return false;
  }

  // Comparaison optimisée des rôles sélectionnés pour ce rôle métier spécifique
  const prevSelected = prevProps.globalSelectedRoles;
  const nextSelected = nextProps.globalSelectedRoles;
  
  // Vérification rapide de la référence (si c'est le même Set, pas besoin de comparer)
  if (prevSelected === nextSelected) {
    console.log(`[PERF] SAME référence pour ${businessRole} - Pas de re-rendu`);
    return true;
  }
  
  // Comparaison de la taille
  if (prevSelected.size !== nextSelected.size) {
    console.log(`[PERF] CHANGE détecté pour ${businessRole} - Taille sélections (${prevSelected.size} → ${nextSelected.size})`);
    return false;
  }
  
  // Comparaison du contenu seulement si les tailles sont identiques
  if (prevSelected.size > 0) {
    const prevArray = Array.from(prevSelected);
    for (const role of prevArray) {
      if (!nextSelected.has(role)) {
        console.log(`[PERF] CHANGE détecté pour ${businessRole} - Contenu sélections`);
        return false;
      }
    }
  }

  // Comparaison des Maps de cache (par référence, car elles sont stables)
  if (
    prevProps.staticScoresCache !== nextProps.staticScoresCache ||
    prevProps.transactionDetailsCache !== nextProps.transactionDetailsCache
  ) {
    console.log(`[PERF] CHANGE détecté pour ${businessRole} - Caches/Maps`);
    return false;
  }

  // 🚀 AMÉLIORATION : Comparaison des fonctions handlers (focus maintenant géré par Context)
  if (
    prevProps.onGlobalSelectionChange !== nextProps.onGlobalSelectionChange
  ) {
    console.log(`[PERF] CHANGE détecté pour ${businessRole} - Handlers (normal, peut être ignoré)`);
    // Note: On retourne true car les fonctions changent souvent mais ne nécessitent pas de re-rendu
    // Les handlers sont mémorisés au niveau parent
  }

  console.log(`[PERF] MEMO hit pour ${businessRole} - Aucun re-rendu nécessaire`);
  return true;
};

// Cache global pour les détails des rôles - PERSISTANT entre renders
const detailsGlobalCache = new Map<string, any>();

// Version avec cache des remainingUsageScore pour éviter les reduce répétés
const usageScoreCache = new Map<string, number>();

// 🚀 NETTOYAGE AUTOMATIQUE : Éviter la fuite mémoire des caches
const cleanupCaches = () => {
  const maxCacheSize = 1000; // Limite pour éviter la fuite mémoire
  
  if (detailsGlobalCache.size > maxCacheSize) {
    console.log(`[PERF] Nettoyage cache détails: ${detailsGlobalCache.size} → ${maxCacheSize / 2}`);
    // Garder seulement la moitié des entrées les plus récentes
    const entries = Array.from(detailsGlobalCache.entries());
    detailsGlobalCache.clear();
    entries.slice(-maxCacheSize / 2).forEach(([key, value]) => {
      detailsGlobalCache.set(key, value);
    });
  }
  
  if (usageScoreCache.size > maxCacheSize) {
    console.log(`[PERF] Nettoyage cache usage: ${usageScoreCache.size} → ${maxCacheSize / 2}`);
    const entries = Array.from(usageScoreCache.entries());
    usageScoreCache.clear();
    entries.slice(-maxCacheSize / 2).forEach(([key, value]) => {
      usageScoreCache.set(key, value);
    });
  }
};

export const BusinessRoleAnalysisCard = React.memo(function BusinessRoleAnalysisCard({ 
  analysis, 
  includeFrequency,
  coverageWeight,
  sizeWeight,
  usageWeight,
  businessRoleTransactions,
  simpleRoleTransactions,
  simpleRoleFilter,
  globalSelectedRoles,
  onGlobalSelectionChange,
  staticScoresCache,
  transactionDetailsCache,
}: BusinessRoleAnalysisCardProps) {
  const theme = useTheme();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [expandedRow, setExpandedRow] = React.useState<number | null>(null);
  
  // 🚀 OPTIMISATION : Utilisation du Context Focus isolé
  const { isFocused: isInFocusMode, handleFocus, handleExitFocus } = useBusinessRoleFocus(analysis.businessRole);
  
  // États pour le système de tri
  const [sortField, setSortField] = React.useState<'roleName' | 'coveragePercentage' | 'sizeScore' | 'usageFrequency' | 'globalScore'>('globalScore');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  // États pour le tri dans les tooltips
  const [tooltipSortField, setTooltipSortField] = React.useState<'transaction' | 'execution'>('execution');
  const [tooltipSortDirection, setTooltipSortDirection] = React.useState<'asc' | 'desc'>('desc');
  
  // 🎯 OPTIMISÉ : Les rôles sélectionnés sont maintenant passés directement pour ce rôle métier
  const selectedRoles = globalSelectedRoles;
  

  
  // 🎯 NOUVEAU : État local pour afficher/masquer les rôles 0% couverture
  const [shouldShowZeroCoverage, setShouldShowZeroCoverage] = React.useState(false);

  // Handler local pour le toggle indépendant
  const handleToggleZeroCoverage = React.useCallback((_businessRole: string, show: boolean) => {
    setShouldShowZeroCoverage(show);
  }, []);

  // 🚀 NOUVEAU : Log de performance pour traquer les re-rendus
  console.log(`[PERF] RENDU BusinessRoleAnalysisCard pour ${analysis.businessRole}`);
  
  // 🚀 OPTIMISÉ : Handler d'expansion avec useCallback pour éviter les re-rendus
  const handleToggleExpansion = React.useCallback((index: number) => {
    console.log(`[PERF] EXPANSION pour ${analysis.businessRole}, rôle index ${index}`);
    setExpandedRow(prev => prev === index ? null : index);
  }, [analysis.businessRole]); // Dépendance minimale
  
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

  // 🚀 RÉCUPÉRATION DES DONNÉES STATIQUES PRÉ-CALCULÉES DEPUIS LE CACHE GLOBAL
  const staticData = React.useMemo(() => {
    if (!businessRoleTransactions || !Array.isArray(businessRoleTransactions)) {
      return {
        businessRoleTxSet: new Set<string>(),
        txExecutionMap: new Map<string, number>(),
        transactionsByRole: new Map<string, string[]>(),
        currentBusinessRoleTransactions: [],
        originalTransactions: [],
        maxAchievableInfo: {
          orphanTransactions: [],
          maxAchievableTransactions: 0,
          totalTransactions: 0
        }
      };
    }
    
    // Calcul direct et simple des données pour ce rôle métier
    const currentBusinessRoleTransactions = businessRoleTransactions.filter(tx => 
      tx.businessRole === analysis.businessRole
    );
    
    const businessRoleTxSet = new Set(currentBusinessRoleTransactions.map(tx => tx.transaction));
    const txExecutionMap = new Map<string, number>();
    currentBusinessRoleTransactions.forEach((tx: any) => {
      txExecutionMap.set(tx.transaction, tx.executionCount || 0);
    });
    
    const transactionsByRole = new Map<string, string[]>();
    if (simpleRoleTransactions && Array.isArray(simpleRoleTransactions)) {
      simpleRoleTransactions.forEach(t => {
        if (!transactionsByRole.has(t.simpleRole)) {
          transactionsByRole.set(t.simpleRole, []);
        }
        transactionsByRole.get(t.simpleRole)!.push(t.transaction);
      });
    }
    
    const allCoverableTransactions = new Set<string>();
    analysis.simpleRoles.forEach(role => {
      (role.coveredTransactions || []).forEach(tx => {
        allCoverableTransactions.add(tx);
      });
    });
    
    const orphanTransactions = analysis.uniqueTransactions.filter(tx => !allCoverableTransactions.has(tx));
    const maxAchievableTransactions = analysis.uniqueTransactions.length - orphanTransactions.length;

    return {
      businessRoleTxSet,
      txExecutionMap,
      transactionsByRole,
      currentBusinessRoleTransactions,
      originalTransactions: currentBusinessRoleTransactions.map(tx => tx.transaction),
      maxAchievableInfo: {
      orphanTransactions,
      maxAchievableTransactions,
      totalTransactions: analysis.uniqueTransactions.length
      }
    };
  }, [businessRoleTransactions, simpleRoleTransactions, analysis.businessRole, analysis.simpleRoles, analysis.uniqueTransactions]);

  // 🔄 DONNÉES DYNAMIQUES (recalculées uniquement quand les sélections changent)
  const dynamicData = React.useMemo(() => {
    console.log(`[PERF] Calcul DYNAMIQUE pour ${analysis.businessRole} - Sélections: ${selectedRoles.size} rôles`);
    
    // Calculer les transactions couvertes par les rôles sélectionnés
    const selectedTransactions = new Set<string>();
    const allSelectedRoleTransactions = new Set<string>();
    
    selectedRoles.forEach(roleName => {
      const roleData = analysis.simpleRoles.find(r => r.roleName === roleName);
      if (roleData) {
        (roleData.coveredTransactions || []).forEach(tx => selectedTransactions.add(tx));
      }
      
      const allRoleTransactions = staticData.transactionsByRole.get(roleName) || [];
      allRoleTransactions.forEach(tx => allSelectedRoleTransactions.add(tx));
    });

    // Calculer les transactions restantes
    const remainingTransactions = analysis.uniqueTransactions.filter(tx => !selectedTransactions.has(tx));
    const remainingBusinessTransactions = staticData.currentBusinessRoleTransactions.filter(tx => !selectedTransactions.has(tx.transaction));
    
    const totalRemainingExecutions = remainingBusinessTransactions.reduce((sum: number, tx: any) => sum + (tx.executionCount || 0), 0);

    const remainingTxSet = new Set(remainingTransactions);
    const remainingExecutionMap = new Map<string, number>();
    remainingBusinessTransactions.forEach((tx: any) => {
      remainingExecutionMap.set(tx.transaction, tx.executionCount || 0);
    });

    const unusedTransactions = Array.from(allSelectedRoleTransactions).filter(tx => 
      !staticData.businessRoleTxSet.has(tx)
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
  }, [selectedRoles, analysis.simpleRoles, analysis.uniqueTransactions, staticData]);

  // 🚀 OPTIMISÉ : Hash des sélections pour détecter les vrais changements
  const selectionHash = React.useMemo(() => {
    return Array.from(selectedRoles).sort().join('|');
  }, [selectedRoles]);

  // 🚀 FONCTION DE DÉTAILS OPTIMISÉE v2 (cache global + éviter reduce répétés)
  const getDetails = React.useCallback((roleName: string) => {
    // 🚀 CACHE GLOBAL : Utilisation du cache persistent entre renders
    const globalCacheKey = `${analysis.businessRole}:${roleName}:${selectionHash}`;
    
    if (detailsGlobalCache.has(globalCacheKey)) {
      return detailsGlobalCache.get(globalCacheKey);
    }

    const allSimpleRoleTx = staticData.transactionsByRole.get(roleName) || [];
    const roleData = analysis.simpleRoles.find(r => r.roleName === roleName);
    
    if (!roleData) {
      const emptyResult = { 
        covered: [], 
        coveredButAlreadySelected: [], 
        nonUtilisees: [], 
        nonCouvertes: [], 
        orphelines: [], 
        total: 0 
      };
      detailsGlobalCache.set(globalCacheKey, emptyResult);
      return emptyResult;
    }

    // 🚀 OPTIMISÉ : Calculs avec Sets pré-existants (plus rapide que filter)
    const coveredTransactions = roleData.coveredTransactions || [];
    const covered: string[] = [];
    const coveredButAlreadySelected: string[] = [];
    
    // Une seule boucle au lieu de 2 filter()
    for (const tx of coveredTransactions) {
      if (dynamicData.remainingTxSet.has(tx)) {
        covered.push(tx);
      } else if (staticData.businessRoleTxSet.has(tx)) {
        coveredButAlreadySelected.push(tx);
      }
    }
    
    // 🚀 OPTIMISÉ : Calcul des non utilisées avec Set intersection
    const nonUtilisees = allSimpleRoleTx.filter(tx => 
      !staticData.businessRoleTxSet.has(tx)
    );
    
    // 🚀 OPTIMISÉ : Pre-filter avec Sets pour éviter double parcours
    const nonCouvertes: string[] = [];
    for (const tx of staticData.originalTransactions) {
      if (!allSimpleRoleTx.includes(tx) && dynamicData.remainingTxSet.has(tx)) {
        nonCouvertes.push(tx);
      }
    }
    
    const orphelines = staticData.maxAchievableInfo.orphanTransactions.filter(tx =>
      dynamicData.remainingTxSet.has(tx)
    );

    const result = { 
      covered, 
      coveredButAlreadySelected, 
      nonUtilisees, 
      nonCouvertes, 
      orphelines, 
      total: covered.length + nonUtilisees.length + nonCouvertes.length + orphelines.length 
    };

    // 🚀 CACHE GLOBAL : Sauvegarder pour éviter recalculs
    detailsGlobalCache.set(globalCacheKey, result);
    return result;
  }, [staticData, analysis.simpleRoles, analysis.businessRole, dynamicData, selectionHash]);

  // 🚀 OPTIMISÉ : Stabilisation des coefficients de pondération
  const stableWeights = React.useMemo(() => ({
    coverage: coverageWeight / 100,
    size: sizeWeight / 100,
    usage: usageWeight / 100
  }), [coverageWeight, sizeWeight, usageWeight]);

  // 🚀 OPTIMISÉ : Stabilisation des critères de filtrage et tri
  const stableFilterSort = React.useMemo(() => ({
    filter: simpleRoleFilter.trim().toLowerCase(),
    sortField,
    sortDirection,
    shouldShowZeroCoverage
  }), [simpleRoleFilter, sortField, sortDirection, shouldShowZeroCoverage]);

  // 🚀 SCORES ENRICHIS v2 (cache global + optimisation reduce)
  const enrichedRoles = React.useMemo(() => {
    console.log(`[PERF] 🚀 Calcul OPTIMISÉ v2 des SCORES pour ${analysis.businessRole} - ${analysis.simpleRoles.length} rôles`);
    
    // 🚀 NETTOYAGE : Maintenir la performance des caches
    cleanupCaches();
    
    // Processing en chunks pour éviter les blocages UI
    const CHUNK_SIZE = 50;
    const processChunk = (startIdx: number, endIdx: number) => {
      return analysis.simpleRoles.slice(startIdx, endIdx).map(role => {
        // 🚀 CACHE GLOBAL : Vérifier le cache des détails
        const globalCacheKey = `${analysis.businessRole}:${role.roleName}:${selectionHash}`;
        let details = detailsGlobalCache.get(globalCacheKey);
        
        if (!details) {
          details = getDetails(role.roleName);
        }
        
        // 🚀 CALCUL OPTIMISÉ : Couverture dynamique avec cache
        const dynamicCoveragePercentage = dynamicData.totalRemainingTransactions > 0 
          ? (details.covered.length / dynamicData.totalRemainingTransactions) * 100 
          : 0;

        // 🚀 CACHE STATIQUE : Récupération rapide des scores pré-calculés
        const staticCacheKey = `${analysis.businessRole}:${role.roleName}`;
        const cachedScores = staticScoresCache.get(staticCacheKey) || {
          sizeScore: 0,
          usageFrequency: 0,
          totalRoleTransactions: 0,
          originalCoveredCount: 0,
          simpleRoleExecutions: 0,
          totalBusinessRoleExecutions: 0
        };

        // 🚀 OPTIMISATION MAJEURE : Cache des remainingUsageScore pour éviter reduce répétés
        const usageCacheKey = `${globalCacheKey}:usage`;
        let remainingUsageScore = usageScoreCache.get(usageCacheKey);
        
        if (remainingUsageScore === undefined) {
          // 🚀 OPTIMISÉ : Calcul direct avec Map.get au lieu de reduce
          remainingUsageScore = 0;
          for (const tx of details.covered) {
            const execCount = dynamicData.remainingExecutionMap.get(tx);
            if (execCount !== undefined) {
              remainingUsageScore += execCount;
            }
          }
          usageScoreCache.set(usageCacheKey, remainingUsageScore);
        }

        const dynamicUsagePercentage = dynamicData.totalRemainingExecutions > 0
          ? (remainingUsageScore / dynamicData.totalRemainingExecutions) * 100
          : 0;

        // 🚀 SCORE PONDÉRÉ OPTIMISÉ : Calcul rapide avec coefficients stables
        const globalScore = includeFrequency
          ? (dynamicCoveragePercentage * stableWeights.coverage) +
            (cachedScores.sizeScore * stableWeights.size) +
            (dynamicUsagePercentage * stableWeights.usage)
          : (dynamicCoveragePercentage * stableWeights.coverage) +
            (cachedScores.sizeScore * stableWeights.size);

        return {
          ...role,
          details,
          coveragePercentage: dynamicCoveragePercentage,
          sizeScore: cachedScores.sizeScore,
          usageFrequency: dynamicUsagePercentage,
          globalScore,
          remainingUsageScore,
          remainingCoveredCount: details.covered.length,
          alreadySelectedCount: details.coveredButAlreadySelected.length,
          totalRoleTransactions: cachedScores.totalRoleTransactions,
          ...(includeFrequency && { 
            cachedTotalExecutions: cachedScores.totalBusinessRoleExecutions,
            cachedSimpleRoleExecutions: cachedScores.simpleRoleExecutions
          })
        };
      });
    };

    // Traitement par chunks
    let allProcessedRoles: any[] = [];
    for (let i = 0; i < analysis.simpleRoles.length; i += CHUNK_SIZE) {
      const endIdx = Math.min(i + CHUNK_SIZE, analysis.simpleRoles.length);
      allProcessedRoles = allProcessedRoles.concat(processChunk(i, endIdx));
    }

    // 🚀 FILTRAGE OPTIMISÉ : Une seule passe avec conditions pré-calculées
    const filteredRoles = stableFilterSort.filter 
      ? allProcessedRoles.filter(role => 
          role.roleName.toLowerCase().includes(stableFilterSort.filter) &&
          (stableFilterSort.shouldShowZeroCoverage || role.coveragePercentage > 0)
        )
      : allProcessedRoles.filter(role => 
          stableFilterSort.shouldShowZeroCoverage || role.coveragePercentage > 0
        );

    // 🚀 TRI OPTIMISÉ : Comparateur stable
    return filteredRoles.sort((a, b) => {
      if (stableFilterSort.sortField === 'roleName') {
        const comparison = a.roleName.localeCompare(b.roleName);
        return stableFilterSort.sortDirection === 'asc' ? comparison : -comparison;
      }
      
      const aValue = a[stableFilterSort.sortField] || 0;
      const bValue = b[stableFilterSort.sortField] || 0;
      const comparison = aValue - bValue;
      
      return stableFilterSort.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [
    analysis.simpleRoles, 
    analysis.businessRole,
    getDetails, 
    stableFilterSort,
    dynamicData,
    includeFrequency,
    stableWeights,
    staticScoresCache,
    selectionHash
  ]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 🚀 OPTIMISÉ : Handler stable pour les sélections
  const handleSelectionChange = React.useCallback((roleName: string, isSelected: boolean) => {
    const newSelected = new Set(selectedRoles);
    if (isSelected) {
      newSelected.add(roleName);
    } else {
      newSelected.delete(roleName);
    }
    
    onGlobalSelectionChange(analysis.businessRole, newSelected);
  }, [selectedRoles, onGlobalSelectionChange, analysis.businessRole]);

  // 🚀 OPTIMISÉ : Pagination stable
  const stablePaginationHandlers = React.useMemo(() => ({
    changePage: (event: unknown, newPage: number) => setPage(newPage),
    changeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    }
  }), []);

  // 🚀 OPTIMISÉ : Fonctions utilitaires stables
  const stableUtilityFunctions = React.useMemo(() => ({
    getScoreColor: (score: number) => {
      if (score >= 80) return theme.palette.success.main;
      if (score >= 60) return theme.palette.warning.main;
      if (score >= 40) return theme.palette.warning.light;
      return theme.palette.error.main;
    },
    getSortIcon: (field: typeof sortField) => {
      if (sortField !== field) return null;
      return sortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
    },
    getTooltipSortIcon: (field: typeof tooltipSortField) => {
      if (tooltipSortField !== field) return null;
      return tooltipSortDirection === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />;
    }
  }), [theme.palette, sortField, sortDirection, tooltipSortField, tooltipSortDirection]);

  // 🚀 OPTIMISÉ : Pagination memoizée pour éviter recalculs
  const paginatedRoles = React.useMemo(() => {
    return enrichedRoles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [enrichedRoles, page, rowsPerPage]);

  // Composant de tableau pour les tooltips avec tri - VERSION CORRIGÉE
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
    // Tri direct sans useMemo pour éviter les erreurs de hooks
    const transactionsWithExecution = transactions.map(tx => ({
      transaction: tx,
      execution: txExecutionMap.get(tx) || 0
    }));

    const sortedTransactions = transactionsWithExecution.sort((a, b) => {
      let comparison = 0;
      if (tooltipSortField === 'transaction') {
        comparison = a.transaction.localeCompare(b.transaction);
      } else {
        comparison = a.execution - b.execution;
      }
      return tooltipSortDirection === 'asc' ? comparison : -comparison;
    });

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
                {stableUtilityFunctions.getTooltipSortIcon('transaction')}
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
                {stableUtilityFunctions.getTooltipSortIcon('execution')}
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
  }, [tooltipSortField, tooltipSortDirection, handleTooltipSort, stableUtilityFunctions]);

  // ✅ isInFocusMode maintenant fourni par useBusinessRoleFocus

  // Ajuster automatiquement le nombre de lignes en mode focus
  React.useEffect(() => {
    if (isInFocusMode) {
      setRowsPerPage(25);
      setPage(0); // Remettre à la première page
    } else {
      setRowsPerPage(10);
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
                    txExecutionMap={staticData.txExecutionMap}
                    coveredTransactions={dynamicData.selectedTransactions}
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
                  <span style={{ color: stableUtilityFunctions.getScoreColor((dynamicData.coveredTransactionsCount / staticData.maxAchievableInfo.maxAchievableTransactions) * 100) }}>
                    {dynamicData.coveredTransactionsCount}
                  </span>
                  <span style={{ color: theme.palette.text.secondary }}> / </span>
                  <span style={{ color: theme.palette.info.main }}>
                    {staticData.maxAchievableInfo.maxAchievableTransactions}
                  </span>
                  <span style={{ color: theme.palette.text.secondary }}> / {staticData.maxAchievableInfo.totalTransactions}</span>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {((dynamicData.coveredTransactionsCount / staticData.maxAchievableInfo.maxAchievableTransactions) * 100).toFixed(1)}% du max possible
                </Typography>
              </Box>
              
              {/* Transactions orphelines */}
              <Tooltip
                title={
                  staticData.maxAchievableInfo.orphanTransactions.length > 0 ? (
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
                        transactions={staticData.maxAchievableInfo.orphanTransactions}
                        title=""
                        txExecutionMap={staticData.txExecutionMap}
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
                    {staticData.maxAchievableInfo.orphanTransactions.length} transactions
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {staticData.maxAchievableInfo.orphanTransactions.length > 0 
                      ? `${staticData.maxAchievableInfo.orphanTransactions.slice(0, 2).join(', ')}${staticData.maxAchievableInfo.orphanTransactions.length > 2 ? '...' : ''}`
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
                      <strong>Total:</strong> {dynamicData.unusedTransactions.length} transactions
                    </Typography>
                    {dynamicData.unusedTransactions.length > 0 && (
                      <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Transactions non utilisées:</Typography>
                        {dynamicData.unusedTransactions.slice(0, 20).map((tx, idx) => (
                          <Typography key={idx} variant="caption" sx={{ display: 'block', fontSize: '0.75rem' }}>
                            • {tx}
                          </Typography>
                        ))}
                        {dynamicData.unusedTransactions.length > 20 && (
                          <Typography variant="caption" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                            ... et {dynamicData.unusedTransactions.length - 20} autres
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
                    {dynamicData.unusedTransactions.length} transactions
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
                onClick={handleFocus}
                sx={{ minWidth: 100 }}
              >
                Focus
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                onClick={handleExitFocus}
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
              {((dynamicData.coveredTransactionsCount / staticData.maxAchievableInfo.maxAchievableTransactions) * 100).toFixed(1)}% du maximum
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
              width: `${(dynamicData.coveredTransactionsCount / staticData.maxAchievableInfo.maxAchievableTransactions) * 100}%`,
              height: '100%',
              bgcolor: alpha(theme.palette.primary.main, 0.7),
              transition: 'width 0.3s ease'
            }} />
          </Box>
        </Box>

        {/* Contrôles d'affichage */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ZeroCoverageToggle
            businessRole={analysis.businessRole}
            isChecked={shouldShowZeroCoverage}
            zeroCoverageCount={analysis.simpleRoles.filter(r => {
              const details = getDetails(r.roleName);
              return details.covered.length === 0;
            }).length}
            onToggle={handleToggleZeroCoverage}
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
                  {stableUtilityFunctions.getSortIcon('roleName')}
                </Box>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('coveragePercentage')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Couverture Restante
                                      {stableUtilityFunctions.getSortIcon('coveragePercentage')}
                </Box>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('sizeScore')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Score Taille
                                      {stableUtilityFunctions.getSortIcon('sizeScore')}
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
                    {stableUtilityFunctions.getSortIcon('usageFrequency')}
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
                  {stableUtilityFunctions.getSortIcon('globalScore')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Détails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRoles.map((role, index) => {
              const isRoleSelected = selectedRoles.has(role.roleName);
              
              return (
                <SimpleRoleRow
                  key={role.roleName}
                  role={role}
                  index={index}
                  isSelected={isRoleSelected}
                  includeFrequency={includeFrequency}
                  getScoreColor={stableUtilityFunctions.getScoreColor}
                  isExpanded={expandedRow === index}
                  onSelectionChange={handleSelectionChange}
                  onToggleExpansion={handleToggleExpansion}
                  dynamicData={dynamicData}
                  theme={theme}
                />
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
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rôles par page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </CardContent>
    </Card>
  );
}, arePropsEqual);

export default BusinessRoleAnalysisCard; 