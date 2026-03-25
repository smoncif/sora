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
  IconButton,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  HelpOutline,
  Close as CloseIcon,
} from '@mui/icons-material';
import { TransactionBlock } from '../TransactionBlock';
import { UserTransactionDisplay } from '../UserTransactionDisplay/UserTransactionDisplay';
import { RoleMetricsDisplay } from '../RoleMetricsDisplay/RoleMetricsDisplay';
import { UserSelectedRoles } from '../UserSelectedRoles/UserSelectedRoles';
import { ZeroCoverageToggle } from '../ZeroCoverageToggle';
import { ComparisonIcon } from '../ComparisonIcon';
import { ComparisonSlider } from '../ComparisonSlider';
import { ComparisonModal } from '../ComparisonModal';
import { ComparisonIndicator } from '../ComparisonIndicator/ComparisonIndicator';
import { CoverageAnalysis, SimpleRoleTransaction } from 'lib/types/roleAnalysis';
import { AnalysisMode, getItemDisplayName } from 'lib/types/analysis';
import { useItemFocus } from '../../../contexts';
import { useScoreCalculation } from '../../../hooks/analysis/useScoreCalculation';
import { useComparisonContext } from '../../../contexts';
import { calculateMaxLicense } from 'lib/services/license/licenseService';
import { generateJobDescriptionPayload, sendJobDescriptionToWebhook } from 'lib/services/analysis/generateJobDescriptionService';
import { getCachedJobDescription, setCachedJobDescription, invalidateJobDescriptionCache } from 'lib/services/analysis/jobDescriptionCacheService';
import { JobDescriptionModal } from '../JobDescriptionModal/JobDescriptionModal';
import type { JobDescriptionWebhookResponse } from 'lib/services/analysis/generateJobDescriptionService';
import type { CachedJobDescription } from 'lib/services/analysis/jobDescriptionCacheService';

// 🚀 NOUVEAU : Composant isolé pour les lignes de rôles simples
// 🚀 OPTIMISÉ : SimpleRoleRow avec memoization avancée
const SimpleRoleRow = React.memo(function SimpleRoleRow({
  role,
  index,
  isSelected,
  includeFrequency,
  showLicenses,
  getScoreColor,
  isExpanded,
  onSelectionChange,
  onToggleExpansion,
  dynamicData,
  theme,
  // Props pour la comparaison
  isComparisonSelected,
  canSelectForComparison,
  onComparisonSelect,
}: {
  role: any;
  index: number;
  isSelected: boolean;
  includeFrequency: boolean;
  showLicenses: boolean;
  getScoreColor: (score: number) => string;
  isExpanded: boolean;
  onSelectionChange: (roleName: string, isSelected: boolean) => void;
  onToggleExpansion: (roleName: string) => void;
  dynamicData: any;
  theme: any;
  // Props pour la comparaison
  isComparisonSelected: boolean;
  canSelectForComparison: boolean;
  onComparisonSelect: (role: any) => void;
}) {
  
  const handleCheckboxChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange(role.roleName, e.target.checked);
  }, [role.roleName, onSelectionChange]);
  
  const handleToggleExpanded = React.useCallback(() => {
    onToggleExpansion(role.roleName);
  }, [role.roleName, onToggleExpansion]);

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
        {showLicenses && (
          <TableCell align="center">
            {role.licence ? (
              <Chip
                label={role.licence}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                }}
              />
            ) : (
              <Typography variant="caption" color="text.secondary">
                Aucune
              </Typography>
            )}
          </TableCell>
        )}
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
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Button
            size="small"
            onClick={handleToggleExpanded}
            variant="outlined"
          >
            {isExpanded ? 'Masquer' : 'Voir'}
          </Button>
            <ComparisonIcon
              role={role}
              isSelected={isComparisonSelected}
              isDisabled={!canSelectForComparison && !isComparisonSelected}
              onSelect={onComparisonSelect}
            />
          </Box>
        </TableCell>
      </TableRow>
      
      {/* Ligne de détails expansible */}
      <TableRow>
        <TableCell colSpan={6 + (includeFrequency ? 1 : 0) + (showLicenses ? 1 : 0)} sx={{ p: 0 }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ p: 3, bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 0.5) }}>
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
                
                {/* Transactions non couvertes */}
                <TransactionBlock
                  transactions={nonCouvertesTx}
                  execMap={execMap}
                  title="⚠️ Transactions non couvertes"
                  color={theme.palette.warning.main}
                  emptyLabel="Aucune transaction non couverte"
                />
                {/* Transactions non utilisées */}
                <TransactionBlock
                  transactions={nonUtiliseesTx}
                  execMap={emptyExecMap}
                  title="🚫 Transactions non utilisées"
                  color={theme.palette.error.main}
                  emptyLabel="Aucune transaction non utilisée"
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
      prevProps.showLicenses === nextProps.showLicenses &&
      prevProps.role.coveragePercentage === nextProps.role.coveragePercentage &&
      prevProps.role.globalScore === nextProps.role.globalScore &&
      prevProps.dynamicData.remainingExecutionMap === nextProps.dynamicData.remainingExecutionMap &&
      // 🔀 NOUVEAU : Comparaison des props de comparaison
      prevProps.isComparisonSelected === nextProps.isComparisonSelected &&
      prevProps.canSelectForComparison === nextProps.canSelectForComparison
    );
  }
  // Sinon, on compare tout (y compris isExpanded)
  return (
    prevProps.role.roleName === nextProps.role.roleName &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.includeFrequency === nextProps.includeFrequency &&
    prevProps.showLicenses === nextProps.showLicenses &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.role.coveragePercentage === nextProps.role.coveragePercentage &&
    prevProps.role.globalScore === nextProps.role.globalScore &&
    prevProps.dynamicData.remainingExecutionMap === nextProps.dynamicData.remainingExecutionMap &&
    // 🔀 NOUVEAU : Comparaison des props de comparaison
    prevProps.isComparisonSelected === nextProps.isComparisonSelected &&
    prevProps.canSelectForComparison === nextProps.canSelectForComparison
  );
});

export interface AnalysisCardProps {
  analysis: CoverageAnalysis;
  includeFrequency: boolean;
  showLicenses?: boolean;
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  businessRoleTransactions: any[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  targetRoleFilter: string;
  globalSelectedRoles: Set<string>;
  onGlobalSelectionChange: (itemId: string, selectedRoles: Set<string>) => void;
  mode?: AnalysisMode;
  staticScoresCache: Map<string, {
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
const arePropsEqual = (prevProps: AnalysisCardProps, nextProps: AnalysisCardProps) => {
  // 🚀 ISOLATION : Comparaison optimisée des props
  const businessRole = prevProps.analysis.businessRole;

  // Comparaison rapide des props simples
  if (
    prevProps.analysis.businessRole !== nextProps.analysis.businessRole ||
    prevProps.includeFrequency !== nextProps.includeFrequency ||
    prevProps.showLicenses !== nextProps.showLicenses ||
    prevProps.coverageWeight !== nextProps.coverageWeight ||
    prevProps.sizeWeight !== nextProps.sizeWeight ||
    prevProps.usageWeight !== nextProps.usageWeight ||
    prevProps.targetRoleFilter !== nextProps.targetRoleFilter
  ) {
    return false;
  }

  // 🚀 AMÉLIORATION : Comparaison complète des arrays de données
  if (
    prevProps.businessRoleTransactions !== nextProps.businessRoleTransactions ||
    prevProps.simpleRoleTransactions !== nextProps.simpleRoleTransactions
  ) {
    return false;
  }

  // 🚀 AMÉLIORATION : Comparaison structure analysis
  if (
    prevProps.analysis !== nextProps.analysis ||
    prevProps.analysis.simpleRoles.length !== nextProps.analysis.simpleRoles.length ||
    prevProps.analysis.uniqueTransactions.length !== nextProps.analysis.uniqueTransactions.length
  ) {
    return false;
  }

  // Comparaison optimisée des rôles sélectionnés pour ce rôle métier spécifique
  const prevSelected = prevProps.globalSelectedRoles;
  const nextSelected = nextProps.globalSelectedRoles;
  
  // Vérification rapide de la référence (si c'est le même Set, pas besoin de comparer)
  if (prevSelected === nextSelected) {
    return true;
  }
  
  // Comparaison de la taille
  if (prevSelected.size !== nextSelected.size) {
    return false;
  }
  
  // Comparaison du contenu seulement si les tailles sont identiques
  if (prevSelected.size > 0) {
    const prevArray = Array.from(prevSelected);
    for (const role of prevArray) {
      if (!nextSelected.has(role)) {
        return false;
      }
    }
  }

  // Comparaison des Maps de cache (par référence, car elles sont stables)
  if (
    prevProps.staticScoresCache !== nextProps.staticScoresCache ||
    prevProps.transactionDetailsCache !== nextProps.transactionDetailsCache
  ) {
    return false;
  }

  // 🚀 AMÉLIORATION : Comparaison des fonctions handlers (focus maintenant géré par Context)
  if (
    prevProps.onGlobalSelectionChange !== nextProps.onGlobalSelectionChange
  ) {
    // Note: On retourne true car les fonctions changent souvent mais ne nécessitent pas de re-rendu
    // Les handlers sont mémorisés au niveau parent
  }

  return true;
};

// 🚀 REFACTORISÉ : Les caches sont maintenant gérés dans scoreCalculationService
// pour une consistance totale entre affichage manuel et sélection automatique

export const AnalysisCard = React.memo(function AnalysisCard({ 
  analysis, 
  includeFrequency,
  showLicenses = false,
  coverageWeight,
  sizeWeight,
  usageWeight,
  businessRoleTransactions,
  simpleRoleTransactions,
  targetRoleFilter = '',
  globalSelectedRoles,
  onGlobalSelectionChange,
  staticScoresCache,
  transactionDetailsCache,
  mode = 'roles',
}: AnalysisCardProps) {
  
  const theme = useTheme();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [expandedRole, setExpandedRole] = React.useState<string | null>(null);
  const [transactionFilters, setTransactionFilters] = React.useState<string[]>([]);
  
  // Nom de l'élément selon le mode
  const itemId = analysis.businessRole;
  const itemName = mode === 'users' ? `${itemId}` : itemId;
  
  // 🚀 OPTIMISATION : Utilisation du Context Focus isolé
  const { isFocused: isInFocusMode, handleFocus, handleExitFocus } = useItemFocus(itemId);

  // 🔀 NOUVEAU : Gestion de la comparaison via le contexte partagé
  const {
    selectedRoles: comparisonSelectedRoles,
    isSliderOpen,
    openSlider,
    closeSlider,
    toggleRoleSelection,
    removeRole,
    clearSelection,
    canSelectMore,
    isRoleSelected,
    canCompare,
    currentContext
  } = useComparisonContext();
  
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

  // 🔀 NOUVEAU : État pour la modal de comparaison
  const [isComparisonModalOpen, setIsComparisonModalOpen] = React.useState(false);

  // 🔀 NOUVEAU : État pour la génération de fiche
  const [isGeneratingJobDescription, setIsGeneratingJobDescription] = React.useState(false);
  const [jobDescriptionModalOpen, setJobDescriptionModalOpen] = React.useState(false);
  const [jobDescriptionResponse, setJobDescriptionResponse] = React.useState<JobDescriptionWebhookResponse | null>(null);
  const [jobDescriptionFromCache, setJobDescriptionFromCache] = React.useState(false);
  const [jobDescriptionCachedAt, setJobDescriptionCachedAt] = React.useState<number | null>(null);

  // 🔀 NOUVEAU : Handlers pour la comparaison
  const handleComparisonSelect = React.useCallback((role: any) => {
    toggleRoleSelection(role, analysis.businessRole);
  }, [toggleRoleSelection, analysis.businessRole]);

  const handleStartComparison = React.useCallback(() => {
    setIsComparisonModalOpen(true);
    closeSlider(); // Fermer le slider quand on ouvre la modal
  }, [closeSlider]);

  const handleCloseComparisonModal = React.useCallback(() => {
    setIsComparisonModalOpen(false);
  }, []);

  // 🔀 NOUVEAU : Handler pour générer la fiche de poste avec cache
  const handleGenerateJobDescription = React.useCallback(async (forceRegenerate: boolean = false) => {
    if (selectedRoles.size === 0) {
      alert('Veuillez sélectionner au moins un rôle simple pour générer la fiche de poste.');
      return;
    }

    setIsGeneratingJobDescription(true);
    try {
      // Vérifier d'abord si une version en cache existe (sauf si régénération forcée)
      if (!forceRegenerate) {
        const cachedData = getCachedJobDescription(analysis.businessRole, selectedRoles);
        
        if (cachedData) {
          setJobDescriptionResponse(cachedData.response);
          setJobDescriptionFromCache(true);
          setJobDescriptionCachedAt(cachedData.cachedAt);
          setJobDescriptionModalOpen(true);
          setIsGeneratingJobDescription(false);
          return;
        }
      }

      // Générer le payload JSON
      const payload = generateJobDescriptionPayload(
        analysis.businessRole,
        selectedRoles,
        simpleRoleTransactions
      );

      // Envoyer au webhook N8N et récupérer la réponse
      const response = await sendJobDescriptionToWebhook(payload);

      // Stocker dans le cache
      setCachedJobDescription(analysis.businessRole, selectedRoles, response);

      // Ouvrir le modal avec la réponse
      setJobDescriptionResponse(response);
      setJobDescriptionFromCache(false);
      setJobDescriptionCachedAt(null);
      setJobDescriptionModalOpen(true);
    } catch (error) {
      console.error('Erreur lors de la génération de la fiche de poste:', error);
      alert(`Erreur lors de la génération de la fiche de poste: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGeneratingJobDescription(false);
    }
  }, [selectedRoles, analysis.businessRole, simpleRoleTransactions]);

  // 🏷️ Calcul optimisé de la licence maximale pour ce rôle métier
  const maxLicense = React.useMemo(() => {
    if (!showLicenses) return null;
    
    // Early return si aucun rôle sélectionné pour optimiser les performances
    if (selectedRoles.size === 0) return null;
    
    // Filtrer uniquement les rôles simples sélectionnés
    const selectedSimpleRoles = analysis.simpleRoles.filter(role => 
      selectedRoles.has(role.roleName)
    );
    
    // Early return si pas de correspondance trouvée
    if (selectedSimpleRoles.length === 0) return null;
    
    return calculateMaxLicense(selectedSimpleRoles);
  }, [showLicenses, analysis.simpleRoles, selectedRoles]);

  // 🚀 NOUVEAU : Performance tracking pour les re-rendus
  
  // 🚀 OPTIMISÉ : Handler d'expansion avec useCallback pour éviter les re-rendus
  const handleToggleExpansion = React.useCallback((roleName: string) => {
    setExpandedRole(prev => prev === roleName ? null : roleName);
  }, []); // Dépendance minimale
  
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
    const tStaticStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const currentBusinessRoleTransactions = businessRoleTransactions.filter(tx => 
      tx.businessRole === analysis.businessRole
    );
    const tAfterFilter = typeof performance !== 'undefined' ? performance.now() : Date.now();
    
    const businessRoleTxSet = new Set(currentBusinessRoleTransactions.map(tx => tx.transaction));
    const txExecutionMap = new Map<string, number>();
    currentBusinessRoleTransactions.forEach((tx: any) => {
      txExecutionMap.set(tx.transaction, tx.executionCount || 0);
    });
    const tAfterMap = typeof performance !== 'undefined' ? performance.now() : Date.now();
    
    const transactionsByRole = new Map<string, string[]>();
    if (simpleRoleTransactions && Array.isArray(simpleRoleTransactions)) {
      simpleRoleTransactions.forEach(t => {
        if (!transactionsByRole.has(t.simpleRole)) {
          transactionsByRole.set(t.simpleRole, []);
        }
        transactionsByRole.get(t.simpleRole)!.push(t.transaction);
      });
    }
    const tAfterSimpleRoleMap = typeof performance !== 'undefined' ? performance.now() : Date.now();
    
    const allCoverableTransactions = new Set<string>();
    analysis.simpleRoles.forEach(role => {
      (role.coveredTransactions || []).forEach(tx => {
        allCoverableTransactions.add(tx);
      });
    });
    const tAfterCoverable = typeof performance !== 'undefined' ? performance.now() : Date.now();
    
    const orphanTransactions = analysis.uniqueTransactions.filter(tx => !allCoverableTransactions.has(tx));
    const maxAchievableTransactions = analysis.uniqueTransactions.length - orphanTransactions.length;

    const tStaticEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (currentBusinessRoleTransactions.length > 0 || businessRoleTransactions.length > 0) {
      console.log('⏱️ [AnalysisCard] staticData', {
        businessRole: analysis.businessRole,
        businessRoleTransactions: businessRoleTransactions.length,
        simpleRoleTransactions: simpleRoleTransactions?.length ?? 0,
        currentBusinessRoleTransactions: currentBusinessRoleTransactions.length,
        filterMs: Math.round(tAfterFilter - tStaticStart),
        mapMs: Math.round(tAfterMap - tAfterFilter),
        simpleRoleMapMs: Math.round(tAfterSimpleRoleMap - tAfterMap),
        coverableMs: Math.round(tAfterCoverable - tAfterSimpleRoleMap),
        totalMs: Math.round(tStaticEnd - tStaticStart),
      });
    }

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

    // 🐛 DEBUG : Calcul des transactions restantes et leurs exécutions

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
    const hash = Array.from(selectedRoles).sort().join('|');
    
    // 🐛 CORRECTION : Vider les caches quand les sélections changent
    // Caches maintenant gérés dans scoreCalculationService
    
    return hash;
  }, [selectedRoles, itemId]);

  // 🚀 FONCTION DE DÉTAILS OPTIMISÉE v2 (cache global + éviter reduce répétés)
  const getDetails = React.useCallback((roleName: string) => {
    // 🚀 CACHE GLOBAL : Utilisation du cache persistent entre renders
    const globalCacheKey = `${itemId}:${roleName}:${selectionHash}`;
    
    // Cache maintenant géré dans scoreCalculationService

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
      // Cache maintenant géré dans scoreCalculationService
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
    
    // Calcul des transactions orphelines pour l'utilisateur individuel
    let orphelines: string[] = [];
    
    if (mode === 'users') {
      // Pour les utilisateurs : comparer directement les transactions de l'utilisateur avec les transactions des rôles métier
      const allBusinessRoleTransactions = new Set<string>();
      staticData.transactionsByRole.forEach((transactions, roleName) => {
        transactions.forEach(tx => allBusinessRoleTransactions.add(tx));
      });
      
      // Calculer les transactions orphelines : transactions utilisateur restantes qui ne sont pas dans les rôles métier
      orphelines = staticData.originalTransactions.filter(tx => {
        const isRemaining = dynamicData.remainingTxSet.has(tx);
        const isNotInBusinessRoles = !allBusinessRoleTransactions.has(tx);
        return isRemaining && isNotInBusinessRoles;
      });
      
    } else {
      // Pour les rôles : utiliser la logique existante
      orphelines = staticData.maxAchievableInfo.orphanTransactions.filter(tx => {
        return dynamicData.remainingTxSet.has(tx);
      });
    }

    const result = { 
      covered, 
      coveredButAlreadySelected, 
      nonUtilisees, 
      nonCouvertes, 
      orphelines, 
      total: covered.length + nonUtilisees.length + nonCouvertes.length + orphelines.length 
    };

    // Cache maintenant géré dans scoreCalculationService
    return result;
  }, [staticData, analysis.simpleRoles, analysis.businessRole, dynamicData, selectionHash]);



  // 🚀 OPTIMISÉ : Stabilisation des critères de filtrage et tri
  const stableFilterSort = React.useMemo(() => ({
    filter: targetRoleFilter.trim().toLowerCase(),
    sortField,
    sortDirection,
    shouldShowZeroCoverage
  }), [targetRoleFilter, sortField, sortDirection, shouldShowZeroCoverage]);

  // 🚀 NOUVEAU : Utilisation du service scoreCalculationService pour consistance avec auto-sélection
  const { enrichedRoles } = useScoreCalculation(
    analysis,
    selectedRoles,
    {
      coverageWeight,
      sizeWeight,
      usageWeight,
      includeFrequency,
      businessRoleTransactions,
      simpleRoleTransactions,
      staticScoresCache,
      transactionDetailsCache,
      targetRoleFilter: stableFilterSort.filter,
      shouldShowZeroCoverage: stableFilterSort.shouldShowZeroCoverage,
    }
  );

  // 🚀 TRI OPTIMISÉ : Application du tri sur les rôles enrichis (sans mutation)
  const sortedEnrichedRoles = React.useMemo(() => {
    const tSortStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const sorted = [...enrichedRoles].sort((a, b) => {
      if (stableFilterSort.sortField === 'roleName') {
        const comparison = a.roleName.localeCompare(b.roleName);
        return stableFilterSort.sortDirection === 'asc' ? comparison : -comparison;
      }
      
      const aValue = (a[stableFilterSort.sortField as keyof typeof a] as number) || 0;
      const bValue = (b[stableFilterSort.sortField as keyof typeof b] as number) || 0;
      const comparison = aValue - bValue;
      
      return stableFilterSort.sortDirection === 'asc' ? comparison : -comparison;
    });
    const tSortEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (enrichedRoles.length > 0) {
      console.log('⏱️ [AnalysisCard] sortedEnrichedRoles', {
        businessRole: analysis.businessRole,
        enrichedRoles: enrichedRoles.length,
        sortField: stableFilterSort.sortField,
        sortMs: Math.round(tSortEnd - tSortStart),
      });
    }
    return sorted;
  }, [enrichedRoles, stableFilterSort]);

  const handleTransactionChipClick = React.useCallback((tx: string) => {
    setTransactionFilters((prev) =>
      prev.includes(tx) ? prev.filter((c) => c !== tx) : [...prev, tx]
    );
    setPage(0);
  }, []);

  const rolesAfterTransactionFilter = React.useMemo(() => {
    if (transactionFilters.length === 0) return sortedEnrichedRoles;
    return sortedEnrichedRoles.filter((role) => {
      const txs = staticData.transactionsByRole.get(role.roleName) ?? [];
      return transactionFilters.every((code) => txs.includes(code));
    });
  }, [sortedEnrichedRoles, transactionFilters, staticData.transactionsByRole]);

  const transactionFilterCaption = React.useMemo(() => {
    if (transactionFilters.length === 0) return '';
    const n = transactionFilters.length;
    const maxShow = 4;
    const shown = transactionFilters.slice(0, maxShow);
    const suffix =
      n > maxShow ? ` … (+${n - maxShow})` : '';
    return ` — filtre : ${n} transaction(s) — ${shown.join(', ')}${suffix}`;
  }, [transactionFilters]);

  const handleClearTransactionFilters = React.useCallback(() => {
    setTransactionFilters([]);
    setPage(0);
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 🚀 OPTIMISÉ : Handler stable pour les sélections
  const handleSelectionChange = React.useCallback((roleName: string, isSelected: boolean) => {
    
    // Appeler la fonction passée en props
    onGlobalSelectionChange(itemId, isSelected ? 
      new Set([...Array.from(selectedRoles), roleName]) : 
      new Set(Array.from(selectedRoles).filter(r => r !== roleName))
    );
  }, [itemId, selectedRoles, onGlobalSelectionChange]);

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
    return rolesAfterTransactionFilter.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [rolesAfterTransactionFilter, page, rowsPerPage]);

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
            border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
            borderRadius: 1,
            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.neutral.main, 0.02) : '#f5f5f5',
            // Personnalisation de la scrollbar pour réduire sa largeur
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: alpha(theme.palette.divider, 0.1),
            },
            '&::-webkit-scrollbar-thumb': {
              background: alpha(theme.palette.text.secondary, 0.3),
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: alpha(theme.palette.text.secondary, 0.5),
            },
          }}>
            {/* En-têtes fixes */}
            <Box sx={{ 
              display: 'flex',
              bgcolor: theme.palette.mode === 'dark' 
                ? alpha(theme.palette.neutral.main, 0.04)
                : alpha(theme.palette.common.black, 0.08),
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
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.primary.main, 0.04)
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

  // ✅ isInFocusMode maintenant fourni par useItemFocus

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
    <>
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
                {itemName}
              </Typography>
              {isInFocusMode && (
                <Chip 
                  label="Mode Focus" 
                  color="primary" 
                  size="small" 
                  sx={{ mr: 1 }}
                />
              )}
              {showLicenses && maxLicense?.maxLicence && (
                <Chip
                  label={`Licence: ${maxLicense.maxLicence}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    ml: 1,
                    borderColor: theme.palette.secondary.main,
                    color: theme.palette.secondary.main,
                    fontWeight: 600,
                    '& .MuiChip-label': {
                      fontSize: '0.75rem',
                    },
                  }}
                />
              )}
            </Box>
            
          </Box>
          
          {/* Bouton Focus et Générer fiche sur la même ligne que le titre */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {!isInFocusMode ? (
              <Button
                size="small"
                variant="outlined"
                onClick={handleFocus}
                sx={{ 
                  minWidth: 100,
                  borderColor: alpha(theme.palette.info.main, 0.5),
                  color: theme.palette.info.main,
                  '&:hover': {
                    borderColor: theme.palette.info.main,
                    bgcolor: alpha(theme.palette.info.main, 0.08),
                  }
                }}
              >
                Focus
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                onClick={handleExitFocus}
                sx={{ 
                  minWidth: 100,
                  bgcolor: theme.palette.info.main,
                  '&:hover': {
                    bgcolor: theme.palette.info.dark,
                  }
                }}
              >
                Quitter Focus
              </Button>
            )}
            {mode === 'roles' && (
              <Button
                size="small"
                variant="contained"
                onClick={() => handleGenerateJobDescription(false)}
                disabled={isGeneratingJobDescription || selectedRoles.size === 0}
                sx={{ 
                  minWidth: 120,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  }
                }}
              >
                {isGeneratingJobDescription ? 'Génération...' : 'Générer fiche'}
              </Button>
            )}
          </Box>
        </Box>
        
        {/* Section des transactions maintenant en pleine largeur */}
        <Box sx={{ width: '100%' }}>
          {/* Informations compactes du rôle métier */}
          {mode === 'roles' ? (
            <RoleMetricsDisplay
              uniqueTransactions={analysis.uniqueTransactions}
              coveredTransactionsCount={dynamicData.coveredTransactionsCount}
              selectedTransactions={Array.from(dynamicData.selectedTransactions)}
              maxAchievableTransactions={staticData.maxAchievableInfo.maxAchievableTransactions}
              totalTransactions={staticData.maxAchievableInfo.totalTransactions}
              orphanTransactions={staticData.maxAchievableInfo.orphanTransactions}
              unusedTransactions={dynamicData.unusedTransactions}
              executionMap={staticData.txExecutionMap}
              mode="detailed"
              onTransactionChipClick={handleTransactionChipClick}
              activeTransactionFilters={transactionFilters}
            />
          ) : (
            /* Mode utilisateur - Nouveau composant d'affichage unifié des transactions */
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              mb: 0,
              bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 0.7),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              width: '100%'
            }}>

              <UserTransactionDisplay
                userTransactions={analysis.uniqueTransactions}
                selectedTransactions={Array.from(dynamicData.selectedTransactions)}
                orphanTransactions={staticData.maxAchievableInfo.orphanTransactions}
                unusedTransactions={dynamicData.unusedTransactions}
                executionMap={staticData.txExecutionMap}
                mode="detailed"
                onTransactionChipClick={handleTransactionChipClick}
                activeTransactionFilters={transactionFilters}
              />
            </Box>
          )}
        </Box>

        {/* Section des rôles sélectionnés pour le mode utilisateur */}
        {selectedRoles.size > 0 && mode === 'users' && (
          <UserSelectedRoles
            selectedRoles={Array.from(selectedRoles)}
            onRemoveRole={(roleName) => handleSelectionChange(roleName, false)}
            onClearAll={() => onGlobalSelectionChange(itemId, new Set<string>())}
          />
        )}

        {/* Rôles sélectionnés avec distinction - Section pleine largeur */}
        {selectedRoles.size > 0 && mode === 'roles' && (
          <Box sx={{ 
            width: '100%', 
            mb: 3,
            p: 2,
            bgcolor: alpha(theme.palette.info.main, 0.05),
            borderRadius: 2
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => onGlobalSelectionChange(itemId, new Set<string>())}
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
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.75rem',
                          height: 24,
                          borderColor: alpha(theme.palette.text.primary, 0.23),
                          color: theme.palette.text.primary,
                          bgcolor: 'transparent',
                          '& .MuiChip-label': { px: 1, fontSize: '0.75rem', color: theme.palette.text.primary },
                          '& .MuiChip-deleteIcon': { 
                            fontSize: '0.875rem', 
                            ml: 0.5, 
                            color: theme.palette.text.primary,
                            transition: 'color 0.2s ease',
                            '&:hover': {
                              color: theme.palette.error.main,
                            }
                          },
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
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.75rem',
                          height: 24,
                          borderColor: alpha(theme.palette.text.primary, 0.23),
                          color: theme.palette.text.primary,
                          bgcolor: 'transparent',
                          '& .MuiChip-label': { px: 1, fontSize: '0.75rem', color: theme.palette.text.primary },
                          '& .MuiChip-deleteIcon': { 
                            fontSize: '0.875rem', 
                            ml: 0.5, 
                            color: theme.palette.text.primary,
                            transition: 'color 0.2s ease',
                            '&:hover': {
                              color: theme.palette.error.main,
                            }
                          },
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
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.75rem',
                          height: 24,
                          borderColor: alpha(theme.palette.text.primary, 0.23),
                          color: theme.palette.text.primary,
                          bgcolor: 'transparent',
                          '& .MuiChip-label': { px: 1, fontSize: '0.75rem', color: theme.palette.text.primary },
                          '& .MuiChip-deleteIcon': { 
                            fontSize: '0.875rem', 
                            ml: 0.5, 
                            color: theme.palette.text.primary,
                            transition: 'color 0.2s ease',
                            '&:hover': {
                              color: theme.palette.error.main,
                            }
                          },
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
            bgcolor: alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.3 : 0.2), 
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
            businessRole={itemId}
            isChecked={shouldShowZeroCoverage}
            zeroCoverageCount={analysis.simpleRoles.filter(r => {
              const details = getDetails(r.roleName);
              return details.covered.length === 0;
            }).length}
            onToggle={handleToggleZeroCoverage}
          />
          
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.25,
              maxWidth: '100%',
              justifyContent: 'flex-end',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
              {rolesAfterTransactionFilter.length} rôle(s) affiché(s) sur{' '}
              {analysis.simpleRoles.length}
              {transactionFilterCaption}
            </Typography>
            {transactionFilters.length > 0 && (
              <Tooltip title="Retirer le filtre sur les transactions">
                <IconButton
                  size="small"
                  aria-label="Retirer le filtre sur les transactions"
                  onClick={handleClearTransactionFilters}
                  sx={{
                    p: 0.25,
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Tableau des rôles simples */}
        <Table size="small" sx={{
          border: `2px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.5 : 0.3)}`,
          borderRadius: 2,
          overflow: 'hidden',
          '& .MuiTableCell-root': {
            borderBottom: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.3 : 0.2)}`,
            borderRight: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.2 : 0.1)}`,
            '&:last-child': {
              borderRight: 'none'
            }
          },
          '& .MuiTableHead-root .MuiTableCell-root': {
            backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.5),
            borderBottom: `2px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.3)}`,
            fontWeight: 600
          }
        }}>
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
              {showLicenses && (
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  Licence
                </TableCell>
              )}
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('coveragePercentage')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  Couverture
                  <Tooltip
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography sx={{ fontWeight: 600, mb: 1, fontSize: '0.75rem' }}>
                          📊 Couverture Restante
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          Mesure le pourcentage de transactions du rôle métier qui peuvent encore être couvertes par ce rôle simple.
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          <strong>Calcul :</strong> (Transactions couvertes par ce rôle / Total transactions restantes non couvertes) × 100
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          <strong>Plus élevé = Meilleur :</strong> Ce rôle peut couvrir beaucoup de transactions restantes
                        </Typography>
                        <Typography sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                          Par exemple : S'il reste 30 transactions non couvertes et qu'un rôle simple peut en couvrir 20, son score sera de 66.7%
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="top"
                    enterDelay={300}
                    leaveDelay={100}
                  >
                    <HelpOutline sx={{ fontSize: '0.875rem', color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                                      {stableUtilityFunctions.getSortIcon('coveragePercentage')}
                </Box>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('sizeScore')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  Taille
                  <Tooltip
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography sx={{ fontWeight: 600, mb: 1, fontSize: '0.75rem' }}>
                          📏 Score Taille (Transactions Utiles)
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          Mesure le pourcentage de transactions de ce rôle simple qui sont réellement utilisées par le rôle métier.
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          <strong>Calcul :</strong> (Transactions utilisées / Total transactions du rôle simple) × 100
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          <strong>Plus élevé = Meilleur :</strong> Ce rôle contient peu de transactions inutiles
                        </Typography>
                        <Typography sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                          Un rôle avec 50 transactions dont 33 sont utilisées par le rôle métier aura un score de 66%
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="top"
                    enterDelay={300}
                    leaveDelay={100}
                  >
                    <HelpOutline sx={{ fontSize: '0.875rem', color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                                      {stableUtilityFunctions.getSortIcon('sizeScore')}
                </Box>
              </TableCell>
              {includeFrequency && (
                <TableCell 
                  align="center" 
                  sx={{ fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => handleSort('usageFrequency')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    Usage
                    <Tooltip
                      title={
                        <Box sx={{ p: 1 }}>
                          <Typography sx={{ fontWeight: 600, mb: 1, fontSize: '0.75rem' }}>
                            📈 Usage Restant (Fréquence d'utilisation)
                          </Typography>
                          <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                            Mesure la fréquence d'utilisation des transactions encore non couvertes que ce rôle peut apporter.
                          </Typography>
                          <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                            <strong>Calcul :</strong> (Nombre d'exécutions des transactions restantes couvertes / Total exécutions restantes) × 100
                          </Typography>
                          <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                            <strong>Plus élevé = Meilleur :</strong> Ce rôle couvre les transactions les plus fréquemment utilisées
                          </Typography>
                          <Typography sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                            Prioritise les rôles qui couvrent les transactions avec le plus d'exécutions
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="top"
                      enterDelay={300}
                      leaveDelay={100}
                    >
                      <HelpOutline sx={{ fontSize: '0.875rem', color: 'text.secondary', cursor: 'help' }} />
                    </Tooltip>
                    {stableUtilityFunctions.getSortIcon('usageFrequency')}
                  </Box>
                </TableCell>
              )}
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleSort('globalScore')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  Score Global
                  <Tooltip
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography sx={{ fontWeight: 600, mb: 1, fontSize: '0.75rem' }}>
                          🏆 Score Global (Pondéré)
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          Score global calculé en combinant tous les paramètres avec leurs pondérations respectives.
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          <strong>Formule :</strong> (Couverture × Poids) + (Taille × Poids) + (Usage × Poids)
                        </Typography>
                        <Typography sx={{ mb: 1, fontSize: '0.75rem' }}>
                          <strong>Plus élevé = Meilleur :</strong> Représente la valeur optimale selon vos critères
                        </Typography>
                        <Typography sx={{ fontStyle: 'italic', fontSize: '0.7rem' }}>
                          Les pondérations permettent d'ajuster l'importance relative de chaque critère dans le calcul final
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="top"
                    enterDelay={300}
                    leaveDelay={100}
                  >
                    <HelpOutline sx={{ fontSize: '0.875rem', color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                  {stableUtilityFunctions.getSortIcon('globalScore')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>Détails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRoles.map((role, index) => {
              const isMainSelectionSelected = selectedRoles.has(role.roleName);
              const isComparisonSelected = isRoleSelected(role.roleName, analysis.businessRole);
              
              // 🎯 NOUVEAU : Logique spécifique au contexte pour la sélection
              // Si pas de contexte actuel OU contexte différent : toujours autorisé (changement de contexte)
              // Si même contexte : vérifier la limite de 3 rôles
              const canSelectForComparison = !currentContext || 
                                           currentContext !== analysis.businessRole || 
                                           canSelectMore ||
                                           isComparisonSelected; // Déjà sélectionné = peut désélectionner
              
              return (
                <SimpleRoleRow
                  key={role.roleName}
                  role={role}
                  index={index}
                  isSelected={isMainSelectionSelected}
                  includeFrequency={includeFrequency}
                  showLicenses={showLicenses}
                  getScoreColor={stableUtilityFunctions.getScoreColor}
                  isExpanded={expandedRole === role.roleName}
                  onSelectionChange={handleSelectionChange}
                  onToggleExpansion={handleToggleExpansion}
                  dynamicData={dynamicData}
                  theme={theme}
                  isComparisonSelected={isComparisonSelected}
                  canSelectForComparison={canSelectForComparison}
                  onComparisonSelect={handleComparisonSelect}
                />
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={sortedEnrichedRoles.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rôles par page:"
          labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => `${from}-${to} sur ${count}`}
        />
      </CardContent>
    </Card>

    {/* 🔀 NOUVEAU : Slider de comparaison - Affiché uniquement si c'est la carte active */}
    {currentContext === analysis.businessRole && (
      <ComparisonSlider
        isOpen={isSliderOpen}
        selectedRoles={comparisonSelectedRoles}
        onClose={closeSlider}
        onCompare={handleStartComparison}
        onRemoveRole={removeRole}
      />
    )}

    {/* 🔀 NOUVEAU : Modal de comparaison - Affichée uniquement si c'est la carte active */}
    {currentContext === analysis.businessRole && (
      <ComparisonModal
        open={isComparisonModalOpen}
        onClose={handleCloseComparisonModal}
        selectedRoles={comparisonSelectedRoles}
        businessRoleTransactions={businessRoleTransactions}
      />
    )}

    {/* 🔀 NOUVEAU : Indicateur pour réouvrir le slider de comparaison - Affiché uniquement si c'est la carte active */}
    {currentContext === analysis.businessRole && (
      <ComparisonIndicator
        selectedRoles={comparisonSelectedRoles}
        isSliderOpen={isSliderOpen}
        onOpenSlider={openSlider}
      />
    )}

    {/* Modal de fiche de poste */}
    <JobDescriptionModal
      open={jobDescriptionModalOpen}
      onClose={() => {
        setJobDescriptionModalOpen(false);
        setJobDescriptionResponse(null);
        setJobDescriptionFromCache(false);
        setJobDescriptionCachedAt(null);
      }}
      response={jobDescriptionResponse}
      profileName={analysis.businessRole}
      fromCache={jobDescriptionFromCache}
      cachedAt={jobDescriptionCachedAt}
      onRegenerate={() => handleGenerateJobDescription(true)}
    />
  </>
  );
}, arePropsEqual);

export default AnalysisCard; 