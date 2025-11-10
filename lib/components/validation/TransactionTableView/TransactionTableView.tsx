'use client';

/**
 * Tableau triable pour afficher les transactions avec leur hiérarchie de modules
 * Affiche : Module L1 | Module L2 | Module L3+ | Transaction | Description | Validation | Commentaire
 */

import React, { useMemo } from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  TablePagination,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  HelpOutline,
} from '@mui/icons-material';
import { parseModuleHierarchy, formatModuleDisplay } from 'lib/utils/moduleHierarchyParser';
import type { TransactionValidationResult } from 'lib/services/validation/validationLinkService';

export type TransactionSortField = 'level1' | 'level2' | 'level3Plus' | 'transaction' | 'usage';
export type SortDirection = 'asc' | 'desc';

export interface TransactionData {
  code: string;
  description?: string;
  module?: string;
  moduleDescription?: string;
  // 🆕 Hiérarchie complète avec descriptions
  level1Module?: string;
  level1Description?: string;
  level2Module?: string;
  level2Description?: string;
  level3Module?: string;
  level3Description?: string;
  usage: number;
}

export interface TransactionTableViewProps {
  transactions: TransactionData[];
  showTechnicalView: boolean;
  transactionValidations?: TransactionValidationResult[];
  onTransactionApprovalChange: (transactionCode: string, isApproved: boolean | null) => void;
  onTransactionCommentChange: (transactionCode: string, comment: string) => void;
  readOnly?: boolean; // 🆕 Mode lecture seule
  sortField: TransactionSortField;
  sortDirection: SortDirection;
  onSortChange: (field: TransactionSortField) => void;
  page: number;
  rowsPerPage: number;
  totalTransactions: number;
  onPageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function TransactionTableView({
  transactions,
  showTechnicalView,
  transactionValidations = [],
  onTransactionApprovalChange,
  onTransactionCommentChange,
  readOnly = false,
  sortField,
  sortDirection,
  onSortChange,
  page,
  rowsPerPage,
  totalTransactions,
  onPageChange,
  onRowsPerPageChange,
}: TransactionTableViewProps) {
  const theme = useTheme();
  const totalColumns = showTechnicalView ? 7 : 5;

  // Enrichir les transactions avec la hiérarchie des modules
  const enrichedTransactions = useMemo(() => {
    return transactions.map(tx => {
      // Parser la hiérarchie du module avec descriptions par niveau
      const hierarchy = parseModuleHierarchy(tx.module, {
        level1Description: tx.level1Description,
        level2Description: tx.level2Description,
        level3Description: tx.level3Description,
      });
      
      // Récupérer la validation de cette transaction
      const validation = transactionValidations.find(tv => tv.transactionCode === tx.code);

      return {
        ...tx,
        hierarchy,
        validation,
      };
    });
  }, [transactions, transactionValidations]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return [...enrichedTransactions].slice(startIndex, endIndex);
  }, [enrichedTransactions, page, rowsPerPage]);

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Table size="small" sx={{
        '& .MuiTableCell-root': {
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }
      }}>
        <TableHead>
          <TableRow sx={{
            bgcolor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.8)
              : '#E8EDF2',
          }}>
            {/* Module Niveau 1 */}
            <TableCell sx={{ fontWeight: 600, width: 180, maxWidth: 180 }}>
              <TableSortLabel
                active={sortField === 'level1'}
                direction={sortField === 'level1' ? sortDirection : 'asc'}
                onClick={() => onSortChange('level1')}
              >
                Module L1
              </TableSortLabel>
            </TableCell>

            {/* Module Niveau 2 */}
            <TableCell sx={{ fontWeight: 600, width: 200, maxWidth: 200 }}>
              <TableSortLabel
                active={sortField === 'level2'}
                direction={sortField === 'level2' ? sortDirection : 'asc'}
                onClick={() => onSortChange('level2')}
              >
                Module L2
              </TableSortLabel>
            </TableCell>

            {/* Module Niveau 3+ */}
            <TableCell sx={{ fontWeight: 600, width: 250, maxWidth: 250 }}>
              <TableSortLabel
                active={sortField === 'level3Plus'}
                direction={sortField === 'level3Plus' ? sortDirection : 'asc'}
                onClick={() => onSortChange('level3Plus')}
              >
                Module L3+
              </TableSortLabel>
            </TableCell>

            {/* Transaction */}
            <TableCell sx={{ fontWeight: 600, minWidth: 150 }}>
              <TableSortLabel
                active={sortField === 'transaction'}
                direction={sortField === 'transaction' ? sortDirection : 'asc'}
                onClick={() => onSortChange('transaction')}
              >
                Transaction
              </TableSortLabel>
            </TableCell>

            {/* Usage */}
            <TableCell sx={{ fontWeight: 600, minWidth: 80, textAlign: 'right' }}>
              <TableSortLabel
                active={sortField === 'usage'}
                direction={sortField === 'usage' ? sortDirection : 'asc'}
                onClick={() => onSortChange('usage')}
              >
                Usage
              </TableSortLabel>
            </TableCell>

            {/* Validation (mode technique uniquement) */}
            {showTechnicalView && (
              <>
                <TableCell sx={{ fontWeight: 600, minWidth: 150, textAlign: 'center' }}>
                  Validation
                </TableCell>
                <TableCell sx={{ fontWeight: 600, minWidth: 250 }}>
                  Commentaire
                </TableCell>
              </>
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {paginatedTransactions.map((tx) => (
            <TableRow
              key={tx.code}
              hover
              sx={{
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.paper, 0.3)
                    : '#F0F4F8',
                }
              }}
            >
              {/* Module Niveau 1 */}
              <TableCell sx={{ width: 180, maxWidth: 180 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, wordWrap: 'break-word', whiteSpace: 'normal' }}>
                  {tx.hierarchy.level1 
                    ? formatModuleDisplay(tx.hierarchy.level1.id, tx.hierarchy.level1.description)
                    : '-'
                  }
                </Typography>
              </TableCell>

              {/* Module Niveau 2 */}
              <TableCell sx={{ width: 200, maxWidth: 200 }}>
                <Typography variant="caption" sx={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                  {tx.hierarchy.level2 
                    ? formatModuleDisplay(tx.hierarchy.level2.id, tx.hierarchy.level2.description)
                    : '-'
                  }
                </Typography>
              </TableCell>

              {/* Module Niveau 3+ */}
              <TableCell sx={{ width: 250, maxWidth: 250 }}>
                <Typography variant="caption" color="text.secondary" sx={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                  {tx.hierarchy.level3Plus 
                    ? formatModuleDisplay(tx.hierarchy.level3Plus.id, tx.hierarchy.level3Plus.description)
                    : '-'
                  }
                </Typography>
              </TableCell>

              {/* Transaction */}
              <TableCell>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.primary.main, display: 'block', mb: 0.3 }}>
                    {tx.code}
                  </Typography>
                  {tx.description && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block' }}>
                      {tx.description}
                    </Typography>
                  )}
                </Box>
              </TableCell>

              {/* Usage */}
              <TableCell align="right">
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {tx.usage} exec.
                </Typography>
              </TableCell>

              {/* Validation (mode technique uniquement) */}
              {showTechnicalView && (
                <>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'center' }}>
                      <Tooltip title="Valider">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onTransactionApprovalChange(tx.code, true)}
                            disabled={readOnly}
                            sx={{
                              color: tx.validation?.isApproved === true ? theme.palette.success.main : theme.palette.text.disabled,
                              bgcolor: tx.validation?.isApproved === true ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                              '&:hover': {
                                bgcolor: readOnly ? 'transparent' : alpha(theme.palette.success.main, 0.2),
                              },
                              '&.Mui-disabled': {
                                color: tx.validation?.isApproved === true ? theme.palette.success.main : theme.palette.action.disabled,
                                bgcolor: tx.validation?.isApproved === true ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                                opacity: tx.validation?.isApproved === true ? 1 : undefined,
                              },
                              '&.Mui-disabled:hover': {
                                bgcolor: tx.validation?.isApproved === true ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                              },
                            }}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="En attente">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onTransactionApprovalChange(tx.code, null)}
                            disabled={readOnly}
                            sx={{
                              color: tx.validation?.isApproved === null ? theme.palette.warning.main : theme.palette.text.disabled,
                              bgcolor: tx.validation?.isApproved === null ? alpha(theme.palette.warning.main, 0.1) : 'transparent',
                              '&:hover': {
                                bgcolor: readOnly ? 'transparent' : alpha(theme.palette.warning.main, 0.2),
                              },
                              '&.Mui-disabled': {
                                color: tx.validation?.isApproved === null ? theme.palette.warning.main : theme.palette.action.disabled,
                                bgcolor: tx.validation?.isApproved === null ? alpha(theme.palette.warning.main, 0.1) : 'transparent',
                                opacity: tx.validation?.isApproved === null ? 1 : undefined,
                              },
                              '&.Mui-disabled:hover': {
                                bgcolor: tx.validation?.isApproved === null ? alpha(theme.palette.warning.main, 0.1) : 'transparent',
                              },
                            }}
                          >
                            <HelpOutline fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Refuser">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => onTransactionApprovalChange(tx.code, false)}
                            disabled={readOnly}
                            sx={{
                              color: tx.validation?.isApproved === false ? theme.palette.error.main : theme.palette.text.disabled,
                              bgcolor: tx.validation?.isApproved === false ? alpha(theme.palette.error.main, 0.1) : 'transparent',
                              '&:hover': {
                                bgcolor: readOnly ? 'transparent' : alpha(theme.palette.error.main, 0.2),
                              },
                              '&.Mui-disabled': {
                                color: tx.validation?.isApproved === false ? theme.palette.error.main : theme.palette.action.disabled,
                                bgcolor: tx.validation?.isApproved === false ? alpha(theme.palette.error.main, 0.1) : 'transparent',
                                opacity: tx.validation?.isApproved === false ? 1 : undefined,
                              },
                              '&.Mui-disabled:hover': {
                                bgcolor: tx.validation?.isApproved === false ? alpha(theme.palette.error.main, 0.1) : 'transparent',
                              },
                            }}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={1}
                      placeholder="Commentaire (optionnel)"
                      value={tx.validation?.comment || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTransactionCommentChange(tx.code, e.target.value)}
                      disabled={readOnly}
                      sx={{ minWidth: 200 }}
                    />
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Message si aucune transaction */}
      {enrichedTransactions.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Aucune transaction à afficher
          </Typography>
        </Box>
      )}

      {enrichedTransactions.length > 0 && (
        <TablePagination
          component="div"
          count={totalTransactions}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 20, 50]}
          labelRowsPerPage="Lignes par page"
        />
      )}
    </Box>
  );
}

