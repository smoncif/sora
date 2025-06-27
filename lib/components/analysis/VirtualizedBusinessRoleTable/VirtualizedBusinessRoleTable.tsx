'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Box,
  Paper,
  useTheme,
  alpha,
  Checkbox,
  Typography,
  Chip,
  Button,
  Collapse,
} from '@mui/material';
import { CoverageAnalysis } from 'lib/types/roleAnalysis';

interface EnrichedRole {
  roleName: string;
  coveragePercentage: number;
  sizeScore: number;
  usageFrequency: number;
  globalScore: number;
  remainingCoveredCount: number;
  alreadySelectedCount: number;
  remainingUsageScore: number;
  totalRoleTransactions: number;
  details: {
    covered: string[];
    coveredButAlreadySelected: string[];
    nonUtilisees: string[];
    nonCouvertes: string[];
    orphelines: string[];
    total: number;
  };
  isSelected?: boolean;
}

interface VirtualizedBusinessRoleTableProps {
  enrichedRoles: EnrichedRole[];
  selectedRoles: Set<string>;
  includeFrequency: boolean;
  onSelectionChange: (roleName: string, isSelected: boolean) => void;
  getScoreColor: (score: number) => string;
  getSortIcon: (field: string) => React.ReactNode;
  handleSort: (field: string) => void;
  dynamicAnalysisData: any;
  theme: any;
  height?: number;
  itemHeight?: number;
}

const VirtualizedTableRow = memo(({ 
  index, 
  style, 
  data 
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    roles: EnrichedRole[];
    selectedRoles: Set<string>;
    includeFrequency: boolean;
    onSelectionChange: (roleName: string, isSelected: boolean) => void;
    getScoreColor: (score: number) => string;
    expandedRows: Set<number>;
    onToggleExpanded: (index: number) => void;
    dynamicAnalysisData: any;
    theme: any;
  };
}) => {
  const { 
    roles, 
    selectedRoles, 
    includeFrequency, 
    onSelectionChange, 
    getScoreColor,
    expandedRows,
    onToggleExpanded,
    dynamicAnalysisData,
    theme
  } = data;
  
  const role = roles[index];
  const isRoleSelected = selectedRoles.has(role.roleName);
  const isExpanded = expandedRows.has(index);

  const handleSelectionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange(role.roleName, e.target.checked);
  }, [role.roleName, onSelectionChange]);

  const handleToggleExpanded = useCallback(() => {
    onToggleExpanded(index);
  }, [index, onToggleExpanded]);

  return (
    <div style={style}>
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          bgcolor: 'background.paper',
        }}
      >
        {/* Ligne principale */}
        <Box
          sx={{
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            px: 2,
            '&:hover': {
              backgroundColor: alpha(theme.palette.action.hover, 0.04),
            },
            transition: 'background-color 0.15s ease',
          }}
        >
          {/* Sélection */}
          <Box sx={{ width: '60px', flexShrink: 0 }}>
            <Checkbox
              checked={isRoleSelected}
              onChange={handleSelectionChange}
              size="small"
            />
          </Box>

          {/* Nom du rôle */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, noWrap: true }}>
              {role.roleName}
            </Typography>
            {role.alreadySelectedCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                +{role.alreadySelectedCount} déjà couvertes
              </Typography>
            )}
          </Box>

          {/* Couverture */}
          <Box sx={{ width: '120px', textAlign: 'center', flexShrink: 0 }}>
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
          </Box>

          {/* Score taille */}
          <Box sx={{ width: '80px', textAlign: 'center', flexShrink: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {role.sizeScore.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {role.totalRoleTransactions} tx
            </Typography>
          </Box>

          {/* Usage (si inclus) */}
          {includeFrequency && (
            <Box sx={{ width: '100px', textAlign: 'center', flexShrink: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {role.usageFrequency.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {role.remainingUsageScore} exec
              </Typography>
            </Box>
          )}

          {/* Score global */}
          <Box sx={{ width: '100px', textAlign: 'center', flexShrink: 0 }}>
            <Chip
              label={role.globalScore.toFixed(1)}
              size="small"
              sx={{
                backgroundColor: alpha(getScoreColor(role.globalScore), 0.1),
                color: getScoreColor(role.globalScore),
                fontWeight: 600
              }}
            />
          </Box>

          {/* Détails */}
          <Box sx={{ width: '80px', textAlign: 'center', flexShrink: 0 }}>
            <Button
              size="small"
              onClick={handleToggleExpanded}
              variant="outlined"
              sx={{ minWidth: 'auto', px: 1 }}
            >
              {isExpanded ? 'Masquer' : 'Voir'}
            </Button>
          </Box>
        </Box>

        {/* Ligne de détails expansible */}
        {isExpanded && (
          <Box sx={{ px: 3, py: 2, bgcolor: alpha(theme.palette.grey[50], 0.5) }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
              {/* Transactions couvertes */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: theme.palette.success.main, mb: 1 }}>
                  ✅ Transactions couvertes ({role.details.covered.length})
                </Typography>
                <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                  {role.details.covered.length > 0 ? (
                    role.details.covered.map((tx, idx) => (
                      <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
                        • {tx}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Aucune transaction couverte
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Transactions non utilisées */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: theme.palette.error.main, mb: 1 }}>
                  🚫 Transactions non utilisées ({role.details.nonUtilisees.length})
                </Typography>
                <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                  {role.details.nonUtilisees.length > 0 ? (
                    role.details.nonUtilisees.map((tx, idx) => (
                      <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
                        • {tx}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Aucune transaction non utilisée
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Transactions non couvertes */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: theme.palette.warning.main, mb: 1 }}>
                  ⚠️ Transactions non couvertes ({role.details.nonCouvertes.length})
                </Typography>
                <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                  {role.details.nonCouvertes.length > 0 ? (
                    role.details.nonCouvertes.map((tx, idx) => (
                      <Typography key={idx} variant="caption" sx={{ display: 'block' }}>
                        • {tx}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      Aucune transaction non couverte
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </div>
  );
});

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

export const VirtualizedBusinessRoleTable = memo<VirtualizedBusinessRoleTableProps>(({
  enrichedRoles,
  selectedRoles,
  includeFrequency,
  onSelectionChange,
  getScoreColor,
  getSortIcon,
  handleSort,
  dynamicAnalysisData,
  theme,
  height = 400,
  itemHeight = 48,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleToggleExpanded = useCallback((index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const itemData = useMemo(() => ({
    roles: enrichedRoles,
    selectedRoles,
    includeFrequency,
    onSelectionChange,
    getScoreColor,
    expandedRows,
    onToggleExpanded: handleToggleExpanded,
    dynamicAnalysisData,
    theme,
  }), [
    enrichedRoles, 
    selectedRoles, 
    includeFrequency, 
    onSelectionChange, 
    getScoreColor, 
    expandedRows, 
    handleToggleExpanded, 
    dynamicAnalysisData, 
    theme
  ]);

  // Calculer la hauteur dynamique des éléments (avec détails étendus)
  const getItemSize = useCallback((index: number) => {
    const baseHeight = 48;
    if (expandedRows.has(index)) {
      return baseHeight + 120; // Hauteur supplémentaire pour les détails
    }
    return baseHeight;
  }, [expandedRows]);

  if (enrichedRoles.length === 0) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell colSpan={includeFrequency ? 7 : 6} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Aucun rôle à afficher
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Box sx={{ height, width: '100%' }}>
      <TableContainer 
        component={Paper} 
        sx={{ 
          height: '100%',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* En-tête fixe */}
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '60px' }}>Sélection</TableCell>
              <TableCell 
                sx={{ fontWeight: 600, cursor: 'pointer', flex: 1 }}
                onClick={() => handleSort('roleName')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Nom du Rôle
                  {getSortIcon('roleName')}
                </Box>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer', width: '120px' }}
                onClick={() => handleSort('coveragePercentage')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Couverture Restante
                  {getSortIcon('coveragePercentage')}
                </Box>
              </TableCell>
              <TableCell 
                align="center" 
                sx={{ fontWeight: 600, cursor: 'pointer', width: '80px' }}
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
                  sx={{ fontWeight: 600, cursor: 'pointer', width: '100px' }}
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
                sx={{ fontWeight: 600, cursor: 'pointer', width: '100px' }}
                onClick={() => handleSort('globalScore')}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Score Global
                  {getSortIcon('globalScore')}
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, width: '80px' }}>Détails</TableCell>
            </TableRow>
          </TableHead>
        </Table>
        
        {/* Zone virtualisée */}
        <Box 
          sx={{ 
            height: 'calc(100% - 48px)',
            overflow: 'hidden',
          }}
        >
          <List
            height={height - 48}
            width="100%"
            itemCount={enrichedRoles.length}
            itemSize={itemHeight}
            itemData={itemData}
            overscanCount={5}
            style={{ outline: 'none' }}
          >
            {VirtualizedTableRow}
          </List>
        </Box>
      </TableContainer>
    </Box>
  );
});

VirtualizedBusinessRoleTable.displayName = 'VirtualizedBusinessRoleTable';

export default VirtualizedBusinessRoleTable; 