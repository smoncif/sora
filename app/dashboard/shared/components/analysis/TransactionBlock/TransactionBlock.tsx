'use client';

import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowDownward,
  ArrowUpward,
} from '@mui/icons-material';

export interface TransactionBlockProps {
  transactions: string[];
  execMap: Map<string, number>;
  title: string;
  color: string;
  emptyLabel: string;
  crossedOutTransactions?: string[]; // Transactions à barrer
}

export const TransactionBlock = memo(function TransactionBlock({ 
  transactions, 
  execMap, 
  title, 
  color, 
  emptyLabel, 
  crossedOutTransactions 
}: TransactionBlockProps) {
  const theme = useTheme();
  const [sortBy, setSortBy] = useState<'transaction' | 'exec'>('transaction');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Virtualisation : Pagination simple pour les gros datasets
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 20;
  
  // Combiner les transactions normales et celles à barrer
  const allTransactions = useMemo(() => {
    const combined = [...transactions];
    if (crossedOutTransactions) {
      crossedOutTransactions.forEach(tx => {
        if (!combined.includes(tx)) {
          combined.push(tx);
        }
      });
    }
    return combined;
  }, [transactions, crossedOutTransactions]);

  // Optimisation : Mémoise le tri (maintenant avec toutes les transactions)
  const sorted = useMemo(() => {
    return [...allTransactions].sort((a, b) => {
      if (sortBy === 'transaction') return sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
      return sortOrder === 'asc' ? (execMap.get(a)||0)-(execMap.get(b)||0) : (execMap.get(b)||0)-(execMap.get(a)||0);
    });
  }, [allTransactions, execMap, sortBy, sortOrder]);

  // Virtualisation : Découpage des données en pages
  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const startIndex = currentPage * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sorted.length);
  const visibleItems = sorted.slice(startIndex, endIndex);

  // Reset de la page quand les données changent
  useEffect(() => {
    setCurrentPage(0);
  }, [sorted.length]);

  // Optimisation : Mémoise les handlers
  const handleTransactionSort = useCallback(() => {
    if (sortBy === 'transaction') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy('transaction'); setSortOrder('asc'); }
    setCurrentPage(0); // Reset à la première page lors du tri
  }, [sortBy, sortOrder]);

  const handleExecSort = useCallback(() => {
    if (sortBy === 'exec') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy('exec'); setSortOrder('desc'); }
    setCurrentPage(0); // Reset à la première page lors du tri
  }, [sortBy, sortOrder]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2.5, 
        borderRadius: 1.5, 
        minHeight: 270, 
        maxHeight: 270, 
        height: 270, 
        width: '100%', 
        flex: '1 1 0', 
        display: 'flex', 
        flexDirection: 'column', 
        border: `1px solid ${alpha(color, 0.15)}`,
        bgcolor: alpha(color, 0.02),
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '3px',
          background: color,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, bgcolor: color, borderRadius: '50%' }} />
          <Typography variant="subtitle2" sx={{ 
            fontWeight: 600, 
            fontSize: '0.85rem', 
            color: theme.palette.text.primary,
          }}>
            {title}
          </Typography>
        </Box>
        {/* Pagination info pour les gros datasets */}
        {totalPages > 1 && (
          <Typography variant="caption" sx={{ 
            fontSize: '0.7rem', 
            color: theme.palette.text.secondary,
            bgcolor: alpha(theme.palette.neutral.main, 0.05),
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}>
            {startIndex + 1}-{endIndex} / {sorted.length}
          </Typography>
        )}
      </Box>
      
      {(transactions.length > 0 || (crossedOutTransactions && crossedOutTransactions.length > 0)) ? (
        <>
          <Box sx={{ 
            maxHeight: 150, 
            minHeight: 150, 
            overflowY: 'auto', 
            display: 'block', 
            flex: 1,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 2,
          }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{
                  bgcolor: alpha(theme.palette.neutral.main, 0.04),
                  '& .MuiTableCell-head': {
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    color: theme.palette.text.secondary,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                    py: 1,
                  }
                }}>
                  <TableCell
                    sx={{ 
                      cursor: 'pointer', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      maxWidth: 90, 
                      verticalAlign: 'middle',
                      '&:hover': { bgcolor: alpha(theme.palette.neutral.main, 0.08) },
                    }}
                    onClick={handleTransactionSort}
                  >
                    Transaction
                    {sortBy === 'transaction' && (
                      sortOrder === 'asc'
                        ? <ArrowDownward fontSize="inherit" sx={{ fontSize: 12, verticalAlign: 'middle', ml: 0.5 }} />
                        : <ArrowUpward fontSize="inherit" sx={{ fontSize: 12, verticalAlign: 'middle', ml: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell
                    sx={{ 
                      cursor: 'pointer', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      maxWidth: 50, 
                      verticalAlign: 'middle',
                      '&:hover': { bgcolor: alpha(theme.palette.neutral.main, 0.08) },
                    }}
                    onClick={handleExecSort}
                    align="right"
                  >
                    Exéc.
                    {sortBy === 'exec' && (
                      sortOrder === 'asc'
                        ? <ArrowDownward fontSize="inherit" sx={{ fontSize: 12, verticalAlign: 'middle', ml: 0.5 }} />
                        : <ArrowUpward fontSize="inherit" sx={{ fontSize: 12, verticalAlign: 'middle', ml: 0.5 }} />
                    )}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleItems.map((tx) => {
                  // Vérifier si cette transaction doit être barrée
                  const isCrossedOut = crossedOutTransactions?.includes(tx) || false;
                  
                  return (
                    <TableRow key={tx} sx={{
                      '&:hover': { bgcolor: alpha(color, 0.04) },
                      '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.neutral.main, 0.02) },
                      ...(isCrossedOut && {
                        opacity: 0.6,
                        bgcolor: alpha(theme.palette.text.disabled, 0.05),
                      }),
                    }}>
                      <TableCell sx={{ 
                        textAlign: 'left', 
                        fontSize: '0.75rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        maxWidth: 90,
                        color: isCrossedOut ? theme.palette.text.disabled : theme.palette.text.primary,
                        py: 1,
                        textDecoration: isCrossedOut ? 'line-through' : 'none',
                        position: 'relative',
                      }}>
                        {tx}
                        {/* Indicateur visuel pour les transactions déjà sélectionnées */}
                        {isCrossedOut && (
                          <Box sx={{
                            position: 'absolute',
                            right: 2,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 4,
                            height: 4,
                            bgcolor: theme.palette.warning.main,
                            borderRadius: '50%',
                          }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ 
                        textAlign: 'right', 
                        fontSize: '0.75rem', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        maxWidth: 50,
                        color: isCrossedOut ? theme.palette.text.disabled : theme.palette.text.secondary,
                        fontWeight: 500,
                        py: 1,
                        textDecoration: isCrossedOut ? 'line-through' : 'none',
                      }}>
                        {execMap.get(tx) || 0}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
          
          {/* Navigation pour les gros datasets */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 1.5 }}>
              <Button
                size="small"
                variant="text"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                sx={{ 
                  minWidth: 'auto', 
                  width: 28,
                  height: 28,
                  fontSize: '0.75rem',
                  color: theme.palette.text.secondary,
                  '&:hover': { bgcolor: alpha(color, 0.08) },
                  '&:disabled': { color: alpha(theme.palette.text.secondary, 0.3) },
                }}
              >
                ←
              </Button>
              <Typography variant="caption" sx={{ 
                fontSize: '0.7rem', 
                color: theme.palette.text.secondary, 
                minWidth: 50, 
                textAlign: 'center',
                bgcolor: alpha(theme.palette.neutral.main, 0.05),
                px: 1,
                py: 0.3,
                borderRadius: 1,
              }}>
                {currentPage + 1}/{totalPages}
              </Typography>
              <Button
                size="small"
                variant="text"
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                sx={{ 
                  minWidth: 'auto', 
                  width: 28,
                  height: 28,
                  fontSize: '0.75rem',
                  color: theme.palette.text.secondary,
                  '&:hover': { bgcolor: alpha(color, 0.08) },
                  '&:disabled': { color: alpha(theme.palette.text.secondary, 0.3) },
                }}
              >
                →
              </Button>
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flex: 1,
          border: `1px dashed ${alpha(theme.palette.divider, 0.3)}`,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.neutral.main, 0.02),
        }}>
          <Typography variant="body2" sx={{ 
            color: theme.palette.text.secondary, 
            fontSize: '0.8rem',
            fontStyle: 'italic',
          }}>
            {emptyLabel}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}); 

