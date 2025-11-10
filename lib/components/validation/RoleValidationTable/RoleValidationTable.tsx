'use client';

/**
 * Tableau de validation des rôles simples
 * Supporte multi-rôles métier et vue technique conditionnelle
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Typography,
  Box,
  Chip,
  Collapse,
  IconButton,
  useTheme,
  alpha,
  Skeleton,
  InputAdornment,
  Paper,
  TablePagination,
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess,
  Search as SearchIcon,
  Clear as ClearIcon,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { ApprovalSwitch } from '../ApprovalSwitch/ApprovalSwitch';
import { TransactionTableView, TransactionSortField, SortDirection } from '../TransactionTableView/TransactionTableView';
import type { ValidationResult, TransactionValidationResult } from 'lib/services/validation/validationLinkService';
import { useLazyValidationRendering } from 'lib/hooks/validation';
import { fetchRoleTransactionsChunk } from 'lib/hooks/validation';
import type { TransactionPreview } from 'lib/types/sapModule';

export type RoleType = 'AFFICHAGE' | 'GESTION';
export type SortField = 'roleId' | 'roleName' | 'businessRole' | 'validation' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface RoleData {
  roleId: string;
  roleName: string;
  businessRole: string;              // Rôle métier associé
  description: string;
  roleType?: RoleType;               // Type de rôle (AFFICHAGE ou GESTION)
  transactionCount: number;
  previewTransactions: TransactionPreview[];
  remainingTransactionCount: number;
  transactionCodes: string[];
  transactionDescriptions: Record<string, string>;
  transactionUsage: Record<string, number>;
}

interface RoleTransactionsSectionProps {
  token: string;
  businessRole: string;
  role: RoleData;
  showTechnicalView: boolean;
  readOnly: boolean;
  isExpanded: boolean;
  transactionValidations?: TransactionValidationResult[];
  onTransactionApprovalChange: (transactionCode: string, isApproved: boolean | null) => void;
  onTransactionCommentChange: (transactionCode: string, comment: string) => void;
  onTransactionsLoaded: (
    businessRole: string,
    roleId: string,
    transactions: TransactionPreview[]
  ) => void;
}

function RoleTransactionsSection({
  token,
  businessRole,
  role,
  showTechnicalView,
  readOnly,
  isExpanded,
  transactionValidations,
  onTransactionApprovalChange,
  onTransactionCommentChange,
  onTransactionsLoaded,
}: RoleTransactionsSectionProps) {
  const previewTransactions = React.useMemo(
    () => role.previewTransactions ?? [],
    [role.previewTransactions]
  );
  const transactionCodes = React.useMemo(
    () => role.transactionCodes ?? [],
    [role.transactionCodes]
  );
  const transactionDescriptions = React.useMemo(
    () => role.transactionDescriptions ?? {},
    [role.transactionDescriptions]
  );
  const transactionUsage = React.useMemo(
    () => role.transactionUsage ?? {},
    [role.transactionUsage]
  );
  const previewCount = previewTransactions.length;
  const totalTransactions = role.transactionCount;
  const [visibleTransactions, setVisibleTransactions] =
    React.useState<TransactionPreview[]>([]);
  const [hasMoreTransactions, setHasMoreTransactions] = React.useState(
    previewCount < totalTransactions
  );
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [loadedRemainingCount, setLoadedRemainingCount] = React.useState(0);
  const batchSize = 10;
  const initialPreviewLoadedRef = React.useRef(false);
  const [sortField, setSortField] = React.useState<TransactionSortField>('transaction');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortedCodes, setSortedCodes] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!showTechnicalView || !isExpanded) {
      return;
    }
    setVisibleTransactions([]);
    setSortedCodes([]);
    setHasMoreTransactions(previewTransactions.length < totalTransactions);
    setLoadedRemainingCount(0);
    initialPreviewLoadedRef.current = false;
    setSortField('transaction');
    setSortDirection('asc');
    setPage(0);
  }, [
    showTechnicalView,
    isExpanded,
    previewTransactions,
    totalTransactions,
    role.roleId,
  ]);

  React.useEffect(() => {
    if (showTechnicalView && isExpanded && previewTransactions.length > 0) {
      onTransactionsLoaded(businessRole, role.roleId, previewTransactions);
    }
  }, [
    showTechnicalView,
    isExpanded,
    previewTransactions,
    businessRole,
    role.roleId,
    onTransactionsLoaded,
  ]);

  const loadMoreTransactions = React.useCallback(
    async (includePreview = false) => {
      if (!showTechnicalView || !isExpanded) {
        return;
      }
      if (isLoadingMore) {
        return;
      }
      if (!includePreview && !hasMoreTransactions) {
        return;
      }

      setIsLoadingMore(true);
      try {
        const effectiveIncludePreview = includePreview && previewCount > 0;
        const offset = effectiveIncludePreview ? 0 : loadedRemainingCount;
        const requestLimit = effectiveIncludePreview ? previewCount : batchSize;
        const response = await fetchRoleTransactionsChunk(
          token,
          businessRole,
          role.roleId,
          offset,
          requestLimit,
          effectiveIncludePreview,
          sortField,
          sortDirection
        );

        const newTransactions = Array.isArray(response.transactions)
          ? response.transactions
          : [];

        setVisibleTransactions((current) => {
          const transactionMap = new Map<string, TransactionPreview>();
          current.forEach((tx) => {
            if (tx?.code) {
              transactionMap.set(tx.code, tx);
            }
          });
          newTransactions.forEach((tx) => {
            if (!tx?.code) {
              return;
            }
            const existing = transactionMap.get(tx.code);
            transactionMap.set(tx.code, existing ? { ...existing, ...tx } : tx);
          });

          const totalLoaded = effectiveIncludePreview
            ? response.transactions.length
            : previewCount + response.nextOffset;
          const orderedCodes =
            transactionCodes.length > 0
              ? transactionCodes.slice(0, totalLoaded)
              : Array.from(transactionMap.keys());

          return orderedCodes.map((code) => {
            const transaction = transactionMap.get(code);
            if (transaction) {
              return transaction;
            }
            return {
              code,
              description: transactionDescriptions[code] ?? code,
              usage: transactionUsage[code] ?? 0,
            };
          });
        });

        if (newTransactions.length > 0) {
          onTransactionsLoaded(businessRole, role.roleId, newTransactions);
        }

        if (effectiveIncludePreview) {
          setLoadedRemainingCount(0);
          setHasMoreTransactions(transactionCodes.length > response.transactions.length);
        } else {
          setLoadedRemainingCount(response.nextOffset);
          setHasMoreTransactions(response.hasMore);
        setSortedCodes(response.sortedCodes ?? []);
        }
      } catch (error) {
        console.error('[RoleTransactionsSection] Chargement transactions supplémentaire', error);
        setHasMoreTransactions(false);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [
      showTechnicalView,
      isExpanded,
      isLoadingMore,
      hasMoreTransactions,
      previewCount,
      loadedRemainingCount,
      token,
      businessRole,
      role.roleId,
      batchSize,
      transactionCodes,
      transactionDescriptions,
      transactionUsage,
      onTransactionsLoaded,
      sortField,
      sortDirection
    ]
  );

  const handleSortChange = React.useCallback(
    (field: TransactionSortField) => {
      setSortField((prevField) => {
        if (prevField === field) {
          setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        } else {
          setSortDirection('asc');
        }
        return field;
      });
      // reset state to trigger reload
      setVisibleTransactions([]);
      setHasMoreTransactions(true);
      setLoadedRemainingCount(0);
      initialPreviewLoadedRef.current = false;
      setPage(0);
    },
    []
  );

  const handlePageChange = React.useCallback(
    (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
      setPage(newPage);
    },
    []
  );

  const handleRowsPerPageChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  React.useEffect(() => {
    const requiredCount = (page + 1) * rowsPerPage;
    if (requiredCount > visibleTransactions.length && hasMoreTransactions && !isLoadingMore) {
      loadMoreTransactions(false);
    }
  }, [
    page,
    rowsPerPage,
    visibleTransactions.length,
    hasMoreTransactions,
    isLoadingMore,
    loadMoreTransactions,
    showTechnicalView,
    isExpanded,
  ]);

  React.useEffect(() => {
    if (!showTechnicalView || !isExpanded) {
      return;
    }
    if (totalTransactions === 0) {
      return;
    }
    if (initialPreviewLoadedRef.current) {
      return;
    }
    if (previewCount > 0) {
      loadMoreTransactions(true).finally(() => {
        if (transactionCodes.length > previewCount) {
          loadMoreTransactions(false);
        }
      });
    } else {
      loadMoreTransactions(false);
    }
    initialPreviewLoadedRef.current = true;
  }, [
    showTechnicalView,
    isExpanded,
    totalTransactions,
    loadMoreTransactions,
    previewCount,
    transactionCodes.length,
    sortField,
    sortDirection,
  ]);

  if (!showTechnicalView || !isExpanded) {
    return null;
  }

  return (
    <>
      <TransactionTableView
        transactions={visibleTransactions}
        showTechnicalView={showTechnicalView}
        transactionValidations={transactionValidations}
        onTransactionApprovalChange={onTransactionApprovalChange}
        onTransactionCommentChange={onTransactionCommentChange}
        readOnly={readOnly}
        remainingCount={remainingTransactionsCount}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        page={page}
        rowsPerPage={rowsPerPage}
        totalTransactions={totalTransactions}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        sortedCodes={sortedCodes}
      />
    </>
  );
}

export interface RoleValidationTableProps {
  roles: RoleData[];
  showTechnicalView: boolean;
  value: ValidationResult[];
  onChange: (results: ValidationResult[]) => void;
  readOnly?: boolean; // 🆕 Mode lecture seule
  token: string;
}

/**
 * Détermine le type de rôle en fonction de son ID
 * Règles :
 * - Si le rôle contient ":D:" ou ":A:" → AFFICHAGE
 * - Si le rôle contient ":M:" ou ":G:" → GESTION
 */
function determineRoleType(roleId: string): RoleType {
  const roleIdUpper = roleId.toUpperCase();
  
  if (roleIdUpper.includes(':D:') || roleIdUpper.includes(':A:')) {
    return 'AFFICHAGE';
  }
  
  if (roleIdUpper.includes(':M:') || roleIdUpper.includes(':G:')) {
    return 'GESTION';
  }
  
  // Par défaut, si aucun indicateur n'est trouvé, on considère comme AFFICHAGE
  return 'AFFICHAGE';
}

export function RoleValidationTable({
  roles,
  showTechnicalView,
  value,
  onChange,
  readOnly = false,
  token,
}: RoleValidationTableProps) {
  const theme = useTheme();
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const resultsRef = useRef<Map<string, ValidationResult>>(new Map());
  const localCommentsRef = useRef<Map<string, string>>(new Map());
  const [localComments, setLocalComments] = useState<Map<string, string>>(() => {
    const map = new Map<string, string>();
    value.forEach((result) => {
      map.set(`${result.businessRole}::${result.roleId}`, result.comment || '');
    });
    localCommentsRef.current = new Map(map);
    return map;
  });

  useEffect(() => {
    const nextResults = new Map<string, ValidationResult>();
    const ref = localCommentsRef.current;
    let commentsChanged = false;

    value.forEach((result) => {
      const key = `${result.businessRole}::${result.roleId}`;
      nextResults.set(key, result);
      const parentComment = result.comment || '';
      const currentLocal = ref.get(key);
      if (currentLocal === undefined || currentLocal === parentComment) {
        if (currentLocal !== parentComment) {
          commentsChanged = true;
        }
        ref.set(key, parentComment);
      }
    });

    for (const key of Array.from(ref.keys())) {
      if (!nextResults.has(key)) {
        ref.delete(key);
        commentsChanged = true;
      }
    }

    resultsRef.current = nextResults;
    if (commentsChanged) {
      setLocalComments(new Map(ref));
    }
  }, [value]);
  
  // 🔍 États pour le filtrage
  const [searchTerm, setSearchTerm] = useState('');
  const [businessRoleFilter, setBusinessRoleFilter] = useState('');
  
  // 📊 États pour le tri
  const [sortField, setSortField] = useState<SortField>('businessRole');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // 📄 États pour la pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const getDefaultResult = useCallback(
    (businessRole: string, roleId: string): ValidationResult | undefined => {
      const role = roles.find((item) => item.businessRole === businessRole && item.roleId === roleId);
      if (!role) {
        return undefined;
      }
      return {
        roleId: role.roleId,
        roleName: role.roleName,
        businessRole: role.businessRole,
        isApproved: null,
        comment: '',
        transactionValidations: (role.previewTransactions ?? []).map((transaction) => ({
          transactionCode: transaction.code,
          isApproved: null,
          comment: '',
        })),
      };
    },
    [roles]
  );

  const updateResult = useCallback(
    (
      businessRole: string,
      roleId: string,
      updater: (current: ValidationResult | undefined) => ValidationResult | undefined
    ) => {
      const map = new Map(resultsRef.current);
      const key = `${businessRole}::${roleId}`;
      const current = map.get(key) ?? getDefaultResult(businessRole, roleId);
      const updated = updater(current);
      if (!updated || updated === current) {
        return;
      }
      map.set(key, updated);
      resultsRef.current = map;
      onChange(Array.from(map.values()));
    },
    [onChange, getDefaultResult]
  );

  const handleApprovalChange = useCallback(
    (businessRole: string, roleId: string, isApproved: boolean | null) => {
      updateResult(businessRole, roleId, (current) =>
        current ? { ...current, isApproved } : current
      );
    },
    [updateResult]
  );

  const handleCommentChange = useCallback((businessRole: string, roleId: string, comment: string) => {
    const key = `${businessRole}::${roleId}`;
    setLocalComments((prev) => {
      const next = new Map(prev);
      next.set(key, comment);
      return next;
    });
    localCommentsRef.current.set(key, comment);
  }, []);

  const handleCommentBlur = useCallback((businessRole: string, roleId: string) => {
    const key = `${businessRole}::${roleId}`;
    const pending = localCommentsRef.current.get(key) ?? '';
    updateResult(businessRole, roleId, (current) => {
      if (!current || (current.comment || '') === pending) {
        return current;
      }
      return { ...current, comment: pending };
    });
  }, [localComments, updateResult]);

  const handleTransactionApprovalChange = useCallback(
    (businessRole: string, roleId: string, transactionCode: string, isApproved: boolean | null) => {
      updateResult(businessRole, roleId, (current) => {
        if (!current) {
          return current;
        }
        const updatedTransactions = (current.transactionValidations ?? []).map((validation) =>
          validation.transactionCode === transactionCode
            ? { ...validation, isApproved }
            : validation
        );
        return {
          ...current,
          transactionValidations: updatedTransactions,
        };
      });
    },
    [updateResult]
  );

  const handleTransactionCommentChange = useCallback(
    (businessRole: string, roleId: string, transactionCode: string, comment: string) => {
      updateResult(businessRole, roleId, (current) => {
        if (!current) {
          return current;
        }

        let changed = false;
        const updatedTransactions = (current.transactionValidations ?? []).map((validation) => {
          if (validation.transactionCode === transactionCode) {
            if ((validation.comment || '') !== comment) {
              changed = true;
              return { ...validation, comment };
            }
            return validation;
          }
          return validation;
        });

        if (!changed) {
          return current;
        }

        return {
          ...current,
          transactionValidations: updatedTransactions,
        };
      });
    },
    [updateResult]
  );

  const handleTransactionsLoaded = useCallback(
    (businessRole: string, roleId: string, transactions: TransactionPreview[]) => {
      if (transactions.length === 0) {
        return;
      }
      updateResult(businessRole, roleId, (current) => {
        if (!current) {
          return current;
        }
        const existing = new Map(
          (current.transactionValidations ?? []).map((validation) => [
            validation.transactionCode,
            validation,
          ])
        );
        const merged = [...(current.transactionValidations ?? [])];
        let hasNew = false;
        transactions.forEach((transaction) => {
          if (existing.has(transaction.code)) {
            return;
          }
          hasNew = true;
          merged.push({
            transactionCode: transaction.code,
            isApproved: null,
            comment: '',
          });
        });
        if (!hasNew) {
          return current;
        }
        return {
          ...current,
          transactionValidations: merged,
        };
      });
    },
    [updateResult]
  );

  // Toggle expansion
  const toggleExpanded = useCallback((businessRole: string, roleId: string) => {
    setExpandedRoles(prev => {
      const updated = new Set(prev);
      const uniqueKey = `${businessRole}::${roleId}`;
      if (updated.has(uniqueKey)) {
        updated.delete(uniqueKey);
      } else {
        updated.add(uniqueKey);
      }
      return updated;
    });
  }, []);

  // 🔍 Handler pour le tri
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // 🎯 Icône de tri
  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ArrowUpward sx={{ fontSize: '1rem', ml: 0.5 }} /> : 
      <ArrowDownward sx={{ fontSize: '1rem', ml: 0.5 }} />;
  }, [sortField, sortDirection]);

  // 📄 Handlers de pagination
  const handleChangePage = useCallback((event: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // 🔄 Réinitialiser la page quand les filtres changent
  React.useEffect(() => {
    setPage(0);
  }, [searchTerm, businessRoleFilter]);

  // 🔍 Filtrer et trier les rôles
  const filteredAndSortedRoles = useMemo(() => {
    // 1️⃣ Filtrage
    let filtered = roles;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(role => {
        // Rechercher dans ID, nom, description OU type
        const matchesId = role.roleId.toLowerCase().includes(search);
        const matchesName = role.roleName.toLowerCase().includes(search);
        const matchesDescription = role.description && role.description.toLowerCase().includes(search);
        const roleType = determineRoleType(role.roleId);
        const matchesType = roleType.toLowerCase().includes(search);
        return matchesId || matchesName || matchesDescription || matchesType;
      });
    }
    
    if (businessRoleFilter) {
      const filter = businessRoleFilter.toLowerCase();
      filtered = filtered.filter(role => 
        role.businessRole.toLowerCase().includes(filter)
      );
    }
    
    // 2️⃣ Tri
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'roleId':
          comparison = a.roleId.localeCompare(b.roleId);
          break;
        case 'roleName':
          comparison = a.roleName.localeCompare(b.roleName);
          break;
        case 'businessRole':
          comparison = a.businessRole.localeCompare(b.businessRole);
          break;
        case 'type':
          const aType = determineRoleType(a.roleId);
          const bType = determineRoleType(b.roleId);
          comparison = aType.localeCompare(bType);
          break;
        case 'validation':
          const aKey = `${a.businessRole}::${a.roleId}`;
          const bKey = `${b.businessRole}::${b.roleId}`;
          const aResult = resultsRef.current.get(aKey);
          const bResult = resultsRef.current.get(bKey);
          const aValue = aResult?.isApproved === true ? 1 : aResult?.isApproved === false ? -1 : 0;
          const bValue = bResult?.isApproved === true ? 1 : bResult?.isApproved === false ? -1 : 0;
          comparison = aValue - bValue;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [roles, resultsRef.current, businessRoleFilter, searchTerm, sortField, sortDirection]);

  // 📄 Paginer les rôles filtrés et triés
  const paginatedRoles = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredAndSortedRoles.slice(startIndex, endIndex);
  }, [filteredAndSortedRoles, page, rowsPerPage]);

  const {
    visibleItems: visiblePaginatedRoles,
    hasMore,
    observerRef,
    remainingCount,
    isLazyActive,
  } = useLazyValidationRendering({
    items: paginatedRoles,
    initialBatchSize: 6,
    scrollBatchSize: 3,
    threshold: 12,
  });

  // Grouper les rôles paginés par rôle métier, puis par type (AFFICHAGE/GESTION)
  const rolesByBusinessRole = useMemo(() => {
    const grouped = new Map<string, { affichage: RoleData[]; gestion: RoleData[] }>();
    
    visiblePaginatedRoles.forEach(role => {
      if (!grouped.has(role.businessRole)) {
        grouped.set(role.businessRole, { affichage: [], gestion: [] });
      }
      
      const roleType = determineRoleType(role.roleId);
      const group = grouped.get(role.businessRole)!;
      
      if (roleType === 'AFFICHAGE') {
        group.affichage.push({ ...role, roleType });
      } else {
        group.gestion.push({ ...role, roleType });
      }
    });
    
    return grouped;
  }, [visiblePaginatedRoles]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* 🔍 Barre de filtres */}
      <Paper sx={{ 
        p: 2, 
        mb: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 2,
      }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Filtrer par rôle métier..."
            value={businessRoleFilter}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setBusinessRoleFilter(event.target.value)
            }
            size="small"
            sx={{ 
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                background: theme.palette.background.paper,
                borderRadius: 2,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
              endAdornment: businessRoleFilter && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setBusinessRoleFilter('')}
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <TextField
            placeholder="Rechercher par ID, nom, description ou type..."
            value={searchTerm}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(event.target.value)
            }
            size="small"
            sx={{ 
              flexGrow: 1,
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                background: theme.palette.background.paper,
                borderRadius: 2,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: theme.palette.text.secondary }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    sx={{ p: 0.5 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {/* 📊 Tableau */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{
          border: `2px solid ${alpha(theme.palette.divider, 0.3)}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <TableHead>
            <TableRow sx={{ 
              bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.5),
              borderBottom: `2px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.3)}`,
            }}>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer', minWidth: 180, width: '15%' }}
                onClick={() => handleSort('businessRole')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Rôle Métier
                  {getSortIcon('businessRole')}
                </Box>
              </TableCell>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer', minWidth: 250, width: '30%' }}
                onClick={() => handleSort('roleId')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  ID Rôle
                  {getSortIcon('roleId')}
                </Box>
              </TableCell>
              <TableCell 
                sx={{ fontWeight: 600, textAlign: 'center', cursor: 'pointer', minWidth: 100, width: '10%' }}
                onClick={() => handleSort('type')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Type
                  {getSortIcon('type')}
                </Box>
              </TableCell>
              {showTechnicalView && (
                <TableCell sx={{ fontWeight: 600, minWidth: 120, width: '10%' }}>Transactions</TableCell>
              )}
              <TableCell 
                sx={{ fontWeight: 600, textAlign: 'center', cursor: 'pointer', minWidth: 130, width: '10%' }}
                onClick={() => handleSort('validation')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Validation
                  {getSortIcon('validation')}
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 600, minWidth: 300, width: '35%' }}>Commentaire</TableCell>
            </TableRow>
          </TableHead>

        <TableBody>
          {Array.from(rolesByBusinessRole.entries()).map(([businessRole, groups]) => (
            <React.Fragment key={businessRole}>
              {groups.affichage.map((role) => {
                const uniqueKey = `${businessRole}::${role.roleId}`;
                return (
                  <RoleRow
                    key={uniqueKey}
                    role={role}
                    businessRole={businessRole}
                    result={resultsRef.current.get(uniqueKey)}
                    isExpanded={expandedRoles.has(uniqueKey)}
                    showTechnicalView={showTechnicalView}
                    readOnly={readOnly}
                    localComment={localComments.get(uniqueKey) ?? ''}
                    onToggleExpanded={toggleExpanded}
                    onApprovalChange={handleApprovalChange}
                    onLocalCommentChange={handleCommentChange}
                    onLocalCommentBlur={handleCommentBlur}
                    onTransactionApprovalChange={handleTransactionApprovalChange}
                    onTransactionCommentChange={handleTransactionCommentChange}
                    onTransactionsLoaded={handleTransactionsLoaded}
                    token={token}
                  />
                );
              })}

              {groups.gestion.map((role) => {
                const uniqueKey = `${businessRole}::${role.roleId}`;
                return (
                  <RoleRow
                    key={uniqueKey}
                    role={role}
                    businessRole={businessRole}
                    result={resultsRef.current.get(uniqueKey)}
                    isExpanded={expandedRoles.has(uniqueKey)}
                    showTechnicalView={showTechnicalView}
                    readOnly={readOnly}
                    localComment={localComments.get(uniqueKey) ?? ''}
                    onToggleExpanded={toggleExpanded}
                    onApprovalChange={handleApprovalChange}
                    onLocalCommentChange={handleCommentChange}
                    onLocalCommentBlur={handleCommentBlur}
                    onTransactionApprovalChange={handleTransactionApprovalChange}
                    onTransactionCommentChange={handleTransactionCommentChange}
                    onTransactionsLoaded={handleTransactionsLoaded}
                    token={token}
                  />
                );
              })}
            </React.Fragment>
          ))}

          {isLazyActive && remainingCount > 0 && (
            <TableRow>
              <TableCell
                colSpan={showTechnicalView ? 6 : 5}
                sx={{ border: 0, py: 2 }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Array.from({ length: remainingCount }).map((_, index) => (
                    <Skeleton
                      key={`role-skeleton-${index}`}
                      variant="rounded"
                      height={52}
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </Box>
              </TableCell>
            </TableRow>
          )}

          {isLazyActive && hasMore && (
            <TableRow>
              <TableCell colSpan={showTechnicalView ? 6 : 5} sx={{ border: 0, py: 1 }}>
                <Box ref={observerRef} sx={{ height: 16 }} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {/* 📄 Pagination */}
      <TablePagination
        component="div"
        count={filteredAndSortedRoles.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Rôles par page:"
        labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) => 
          `${from}-${to} sur ${count}`
        }
        sx={{
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.5),
        }}
      />
      </Box>
      
      {/* 📊 Statistiques */}
      {(searchTerm || businessRoleFilter) && (
        <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredAndSortedRoles.length} rôle(s) trouvé(s) sur {roles.length} au total
          </Typography>
        </Box>
      )}
    </Box>
  );
}

interface RoleRowProps {
  role: RoleData;
  businessRole: string;
  result: ValidationResult | undefined;
  isExpanded: boolean;
  showTechnicalView: boolean;
  readOnly: boolean;
  localComment: string;
  onToggleExpanded: (businessRole: string, roleId: string) => void;
  onApprovalChange: (businessRole: string, roleId: string, value: boolean | null) => void;
  onLocalCommentChange: (businessRole: string, roleId: string, comment: string) => void;
  onLocalCommentBlur: (businessRole: string, roleId: string) => void;
  onTransactionApprovalChange: (businessRole: string, roleId: string, transactionCode: string, value: boolean | null) => void;
  onTransactionCommentChange: (businessRole: string, roleId: string, transactionCode: string, comment: string) => void;
  onTransactionsLoaded: (businessRole: string, roleId: string, transactions: TransactionPreview[]) => void;
  token: string;
}

const RoleRow = React.memo(({
  role,
  businessRole,
  result,
  isExpanded,
  showTechnicalView,
  readOnly,
  localComment,
  onToggleExpanded,
  onApprovalChange,
  onLocalCommentChange,
  onLocalCommentBlur,
  onTransactionApprovalChange,
  onTransactionCommentChange,
  onTransactionsLoaded,
  token,
}: RoleRowProps) => {
  const theme = useTheme();
  const uniqueKey = `${businessRole}::${role.roleId}`;

  return (
    <>
      <TableRow
        hover
        sx={{
          bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
          borderLeft: isExpanded ? `4px solid ${theme.palette.primary.main}` : 'none',
        }}
      >
        <TableCell>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            {businessRole}
          </Typography>
        </TableCell>
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
              {role.roleName}
            </Typography>
            {role.description && role.description !== 'N/A' && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block' }}>
                {role.description}
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell align="center">
          <Chip
            label={role.roleType === 'AFFICHAGE' ? 'Affichage' : 'Gestion'}
            size="small"
            sx={{
              bgcolor: role.roleType === 'AFFICHAGE'
                ? alpha(theme.palette.info.main, 0.1)
                : alpha(theme.palette.success.main, 0.1),
              color: role.roleType === 'AFFICHAGE'
                ? theme.palette.info.main
                : theme.palette.success.main,
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </TableCell>
        {showTechnicalView && (
          <TableCell>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={`${role.transactionCount} tx`} size="small" color="primary" variant="outlined" />
              <IconButton size="small" onClick={() => onToggleExpanded(businessRole, role.roleId)}>
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
          </TableCell>
        )}
        <TableCell>
          <ApprovalSwitch
            value={result?.isApproved ?? null}
            onChange={(value) => onApprovalChange(businessRole, role.roleId, value)}
            disabled={readOnly}
          />
        </TableCell>
        <TableCell>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={1}
            maxRows={3}
            placeholder="Commentaire (optionnel)"
            value={localComment}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onLocalCommentChange(businessRole, role.roleId, event.target.value)
            }
            onBlur={() => onLocalCommentBlur(businessRole, role.roleId)}
            disabled={readOnly}
            sx={{ minWidth: 200 }}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={showTechnicalView ? 6 : 5} sx={{ p: 0 }}>
          <Collapse in={isExpanded && showTechnicalView} timeout="auto" unmountOnExit>
            <Box
              sx={{
                p: 2,
                background:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.5)
                    : `linear-gradient(135deg, #F8F9FA 0%, #EEF2F6 100%)`,
                borderLeft: `2px solid ${alpha(theme.palette.divider, 0.3)}`,
              }}
            >
              <RoleTransactionsSection
                token={token}
                businessRole={businessRole}
                role={role}
                showTechnicalView={showTechnicalView}
                readOnly={readOnly}
                isExpanded={isExpanded}
                transactionValidations={result?.transactionValidations}
                onTransactionApprovalChange={(txCode, isApproved) =>
                  onTransactionApprovalChange(businessRole, role.roleId, txCode, isApproved)
                }
                onTransactionCommentChange={(txCode, comment) =>
                  onTransactionCommentChange(businessRole, role.roleId, txCode, comment)
                }
                onTransactionsLoaded={onTransactionsLoaded}
              />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}, (prev, next) => {
  if (prev.isExpanded !== next.isExpanded) return false;
  if (prev.readOnly !== next.readOnly) return false;
  if (prev.showTechnicalView !== next.showTechnicalView) return false;
  if (prev.localComment !== next.localComment) return false;
  if ((prev.result?.isApproved ?? null) !== (next.result?.isApproved ?? null)) return false;
  if ((prev.result?.comment || '') !== (next.result?.comment || '')) return false;
  const prevTransactions = prev.result?.transactionValidations ?? [];
  const nextTransactions = next.result?.transactionValidations ?? [];
  if (prevTransactions.length !== nextTransactions.length) return false;
  for (let i = 0; i < prevTransactions.length; i += 1) {
    const prevTx = prevTransactions[i];
    const nextTx = nextTransactions[i];
    if (prevTx.transactionCode !== nextTx.transactionCode) return false;
    if (prevTx.isApproved !== nextTx.isApproved) return false;
    if ((prevTx.comment || '') !== (nextTx.comment || '')) return false;
  }
  return true;
});
