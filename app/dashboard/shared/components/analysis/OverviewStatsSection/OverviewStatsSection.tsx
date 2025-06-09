'use client';

import React, { useState, useCallback } from 'react';
import { 
  Box,
  Typography,
  Grid,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  alpha,
} from '@mui/material';
import {
  Business as BusinessIcon,
  AccountTree as RoleIcon,
  Receipt as TransactionIcon,
  Warning as WarningIcon,
  ArrowUpward,
  ArrowDownward,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { StatsCard } from '@/components/common/StatsCard';

export interface OverviewStatsSectionProps {
  // États des données
  analysisResult: any;
  totalBusinessRoles: number;
  uncoveredTransactionsData: {
    count: number;
    transactions: Array<{ transaction: string; executionCount: number; businessRole: string }>;
    totalExecutions: number;
  };
}

export function OverviewStatsSection({
  analysisResult,
  totalBusinessRoles,
  uncoveredTransactionsData,
}: OverviewStatsSectionProps) {
  const theme = useTheme();

  // Fonction pour déduplicquer les transactions par combinaison unique (transaction + rôle métier)
  const deduplicateTransactions = useCallback((rawTransactions: Array<{ transaction: string; executionCount: number; businessRole: string }>) => {
    const transactionMap = new Map<string, { transaction: string; executionCount: number; businessRole: string }>();
    
    rawTransactions.forEach(tx => {
      const key = `${tx.transaction}||${tx.businessRole}`; // Clé unique par combinaison
      const existing = transactionMap.get(key);
      
      if (existing) {
        // Sommer les exécutions si la combinaison existe déjà
        existing.executionCount += tx.executionCount || 0;
      } else {
        // Créer nouvelle entrée pour cette combinaison
        transactionMap.set(key, {
          transaction: tx.transaction,
          executionCount: tx.executionCount || 0,
          businessRole: tx.businessRole
        });
      }
    });
    
    return Array.from(transactionMap.values());
  }, []);

  // Déduplicquer les transactions reçues en props
  const deduplicatedTransactions = React.useMemo(() => 
    deduplicateTransactions(uncoveredTransactionsData.transactions),
    [uncoveredTransactionsData.transactions, deduplicateTransactions]
  );

  // Recalculer le total des exécutions avec les données déduplicées
  const deduplicatedTotalExecutions = React.useMemo(() => 
    deduplicatedTransactions.reduce((sum, tx) => sum + tx.executionCount, 0),
    [deduplicatedTransactions]
  );

  // Utiliser le count dédupliqué
  const deduplicatedCount = deduplicatedTransactions.length;

  // État local pour le dialog des transactions non couvertes
  const [uncoveredTransactionsDialog, setUncoveredTransactionsDialog] = useState<{
    open: boolean;
    transactions: Array<{ transaction: string; executionCount: number; businessRole: string }>;
    totalExecutions: number;
    sortField: 'transaction' | 'businessRole' | 'executionCount' | 'percentage';
    sortDirection: 'asc' | 'desc';
  }>({
    open: false,
    transactions: [],
    totalExecutions: 0,
    sortField: 'executionCount',
    sortDirection: 'desc',
  });

  // Handler pour afficher les transactions non couvertes
  const handleShowUncoveredTransactions = useCallback(() => {
    setUncoveredTransactionsDialog({
      open: true,
      transactions: deduplicatedTransactions,
      totalExecutions: deduplicatedTotalExecutions,
      sortField: 'executionCount',
      sortDirection: 'desc',
    });
  }, [deduplicatedTransactions, deduplicatedTotalExecutions]);

  // Handler pour fermer le dialog des transactions non couvertes
  const handleCloseUncoveredTransactionsDialog = useCallback(() => {
    setUncoveredTransactionsDialog(prev => ({ ...prev, open: false }));
  }, []);

  // Handler pour trier les transactions non couvertes
  const handleSortUncoveredTransactions = useCallback((field: 'transaction' | 'businessRole' | 'executionCount' | 'percentage') => {
    setUncoveredTransactionsDialog(prev => ({
      ...prev,
      sortField: field,
      sortDirection: prev.sortField === field && prev.sortDirection === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  // Handler pour exporter les transactions non couvertes
  const handleExportUncoveredTransactions = useCallback(async () => {
    if (uncoveredTransactionsDialog.transactions.length === 0) return;

    try {
      // Utiliser l'import dynamique pour éviter les erreurs côté serveur
      const { utils, writeFile } = await import('xlsx');
      
      // Préparer les données pour l'export avec le tri actuel
      const exportData = uncoveredTransactionsDialog.transactions
        .sort((a, b) => {
          const { sortField, sortDirection } = uncoveredTransactionsDialog;
          let comparison = 0;
          
          switch (sortField) {
            case 'transaction':
              comparison = a.transaction.localeCompare(b.transaction);
              break;
            case 'businessRole':
              comparison = a.businessRole.localeCompare(b.businessRole);
              break;
            case 'executionCount':
              comparison = a.executionCount - b.executionCount;
              break;
            case 'percentage':
              // Calculer les pourcentages pour le tri
              const aTotalExec = analysisResult?.businessRoleTransactions
                .filter((brTx: any) => brTx.businessRole === a.businessRole)
                .reduce((sum: number, brTx: any) => sum + (brTx.executionCount || 0), 0) || 1;
              const bTotalExec = analysisResult?.businessRoleTransactions
                .filter((brTx: any) => brTx.businessRole === b.businessRole)
                .reduce((sum: number, brTx: any) => sum + (brTx.executionCount || 0), 0) || 1;
              const aPercentage = (a.executionCount / aTotalExec) * 100;
              const bPercentage = (b.executionCount / bTotalExec) * 100;
              comparison = aPercentage - bPercentage;
              break;
            default:
              comparison = 0;
          }
          
          return sortDirection === 'asc' ? comparison : -comparison;
        })
        .map((tx, index) => {
          // Calculer le total des exécutions pour ce rôle métier spécifique
          const businessRoleTotalExecutions = analysisResult?.businessRoleTransactions
            .filter((brTx: any) => brTx.businessRole === tx.businessRole)
            .reduce((sum: number, brTx: any) => sum + (brTx.executionCount || 0), 0) || 1;
          
          return {
            'N°': index + 1,
            'Transaction': tx.transaction,
            'Rôle Métier': tx.businessRole,
            'Nb Exécutions': tx.executionCount,
            '% du Rôle Métier': `${((tx.executionCount / businessRoleTotalExecutions) * 100).toFixed(1)}%`
          };
        });

      // Ajouter une ligne de résumé en haut
      const summaryData = [{
        'N°': '',
        'Transaction': 'RÉSUMÉ',
        'Rôle Métier': `${uncoveredTransactionsDialog.transactions.length} transactions non couvertes`,
        'Nb Exécutions': uncoveredTransactionsDialog.totalExecutions,
        '% du Rôle Métier': 'Variable par rôle'
      }];

      // Combiner résumé + ligne vide + données
      const finalData = [
        ...summaryData,
        {
          'N°': '',
          'Transaction': '',
          'Rôle Métier': '',
          'Nb Exécutions': '',
          '% du Rôle Métier': ''
        },
        ...exportData
      ];

      // Créer le workbook
      const wb = utils.book_new();
      const ws = utils.json_to_sheet(finalData);

      // Définir la largeur des colonnes
      ws['!cols'] = [
        { wch: 5 },  // N°
        { wch: 15 }, // Transaction
        { wch: 25 }, // Rôle Métier
        { wch: 15 }, // Nb Exécutions
        { wch: 12 }  // % du Total
      ];

      // Ajouter le worksheet au workbook
      utils.book_append_sheet(wb, ws, 'Transactions Non Couvertes');

      // Générer le nom de fichier
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `transactions_non_couvertes_${dateStr}.xlsx`;

      // Télécharger le fichier
      writeFile(wb, fileName);


      
    } catch {
      // Erreur silencieuse - l'utilisateur sera notifié par l'UI
    }
  }, [uncoveredTransactionsDialog, analysisResult]);

  if (!analysisResult) return null;

  return (
    <>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 600,
          color: theme.palette.text.primary,
          mb: 3,
          letterSpacing: '-0.01em',
        }}>
          Vue d'ensemble
        </Typography>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Rôles Métier"
              value={totalBusinessRoles}
              icon={BusinessIcon}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Rôles Simples"
              value={analysisResult.metadata?.totalSimpleRoles || 0}
              icon={RoleIcon}
              color="secondary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard
              title="Transactions"
              value={analysisResult.metadata?.totalTransactions || 0}
              icon={TransactionIcon}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box 
              onClick={deduplicatedCount > 0 ? handleShowUncoveredTransactions : undefined}
              sx={{ 
                cursor: deduplicatedCount > 0 ? 'pointer' : 'default',
                '&:hover': deduplicatedCount > 0 ? {
                  transform: 'translateY(-2px)',
                  transition: 'transform 0.2s ease-in-out',
                } : {},
              }}
            >
              <StatsCard
                title="Non couvertes"
                value={deduplicatedCount}
                icon={WarningIcon}
                color={deduplicatedCount > 0 ? 'warning' : 'success'}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Dialog des transactions non couvertes */}
      <Dialog 
        open={uncoveredTransactionsDialog.open} 
        onClose={handleCloseUncoveredTransactionsDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <WarningIcon sx={{ color: theme.palette.warning.main }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              Transactions non couvertes
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              <Typography variant="body2">
                <strong>{uncoveredTransactionsDialog.transactions.length} transactions</strong> ne sont couvertes par aucun rôle simple.
              </Typography>
            </Alert>
          </Box>
          
          {uncoveredTransactionsDialog.transactions.length > 0 && (
            <Box sx={{ 
              maxHeight: 400, 
              overflowY: 'auto',
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              borderRadius: 2,
            }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                    '& .MuiTableCell-head': {
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: theme.palette.text.secondary,
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                      py: 1.5,
                    }
                  }}>
                    <TableCell 
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                        userSelect: 'none',
                      }}
                      onClick={() => handleSortUncoveredTransactions('transaction')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Transaction
                        {uncoveredTransactionsDialog.sortField === 'transaction' && (
                          uncoveredTransactionsDialog.sortDirection === 'asc' 
                            ? <ArrowUpward fontSize="small" /> 
                            : <ArrowDownward fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                        userSelect: 'none',
                      }}
                      onClick={() => handleSortUncoveredTransactions('businessRole')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        Rôle Métier
                        {uncoveredTransactionsDialog.sortField === 'businessRole' && (
                          uncoveredTransactionsDialog.sortDirection === 'asc' 
                            ? <ArrowUpward fontSize="small" /> 
                            : <ArrowDownward fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                        userSelect: 'none',
                      }}
                      onClick={() => handleSortUncoveredTransactions('executionCount')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        Nb Exécutions
                        {uncoveredTransactionsDialog.sortField === 'executionCount' && (
                          uncoveredTransactionsDialog.sortDirection === 'asc' 
                            ? <ArrowUpward fontSize="small" /> 
                            : <ArrowDownward fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        cursor: 'pointer', 
                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                        userSelect: 'none',
                      }}
                      onClick={() => handleSortUncoveredTransactions('percentage')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-end' }}>
                        % du Rôle Métier
                        {uncoveredTransactionsDialog.sortField === 'percentage' && (
                          uncoveredTransactionsDialog.sortDirection === 'asc' 
                            ? <ArrowUpward fontSize="small" /> 
                            : <ArrowDownward fontSize="small" />
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uncoveredTransactionsDialog.transactions
                    .sort((a, b) => {
                      const { sortField, sortDirection } = uncoveredTransactionsDialog;
                      let comparison = 0;
                      
                      switch (sortField) {
                        case 'transaction':
                          comparison = a.transaction.localeCompare(b.transaction);
                          break;
                        case 'businessRole':
                          comparison = a.businessRole.localeCompare(b.businessRole);
                          break;
                        case 'executionCount':
                          comparison = a.executionCount - b.executionCount;
                          break;
                        case 'percentage':
                          // Calculer les pourcentages pour le tri
                          const aTotalExec = analysisResult?.businessRoleTransactions
                            .filter((brTx: any) => brTx.businessRole === a.businessRole)
                            .reduce((sum: number, brTx: any) => sum + (brTx.executionCount || 0), 0) || 1;
                          const bTotalExec = analysisResult?.businessRoleTransactions
                            .filter((brTx: any) => brTx.businessRole === b.businessRole)
                            .reduce((sum: number, brTx: any) => sum + (brTx.executionCount || 0), 0) || 1;
                          const aPercentage = (a.executionCount / aTotalExec) * 100;
                          const bPercentage = (b.executionCount / bTotalExec) * 100;
                          comparison = aPercentage - bPercentage;
                          break;
                        default:
                          comparison = 0;
                      }
                      
                      return sortDirection === 'asc' ? comparison : -comparison;
                    })
                    .map((tx) => (
                      <TableRow 
                        key={`${tx.transaction}-${tx.businessRole}`}
                        sx={{
                          '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.04) },
                          '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.neutral.main, 0.02) },
                        }}
                      >
                        <TableCell sx={{ 
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          fontWeight: 500,
                        }}>
                          {tx.transaction}
                        </TableCell>
                        <TableCell sx={{ 
                          fontSize: '0.8rem',
                          color: theme.palette.text.secondary,
                        }}>
                          {tx.businessRole}
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                        }}>
                          {tx.executionCount.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ 
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}>
                          <Chip
                            label={`${(() => {
                              // Calculer le total des exécutions pour ce rôle métier spécifique
                              const businessRoleTotalExecutions = analysisResult?.businessRoleTransactions
                                .filter((brTx: any) => brTx.businessRole === tx.businessRole)
                                .reduce((sum: number, brTx: any) => sum + (brTx.executionCount || 0), 0) || 1;
                              
                              return ((tx.executionCount / businessRoleTotalExecutions) * 100).toFixed(1);
                            })()}%`}
                            size="small"
                            color={(() => {
                              const businessRoleTotalExecutions = analysisResult?.businessRoleTransactions
                                .filter((brTx: any) => brTx.businessRole === tx.businessRole)
                                .reduce((sum: number, brTx: any) => sum + (brTx.executionCount || 0), 0) || 1;
                              const percentage = (tx.executionCount / businessRoleTotalExecutions) * 100;
                              return percentage > 5 ? 'warning' : 'default';
                            })()}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleExportUncoveredTransactions}
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={uncoveredTransactionsDialog.transactions.length === 0}
            sx={{ 
              borderRadius: 2,
              borderColor: theme.palette.success.main,
              color: theme.palette.success.main,
              '&:hover': {
                borderColor: theme.palette.success.dark,
                bgcolor: alpha(theme.palette.success.main, 0.08),
              },
            }}
          >
            Exporter Excel
          </Button>
          <Button 
            onClick={handleCloseUncoveredTransactionsDialog}
            variant="contained"
            sx={{ borderRadius: 2 }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 
