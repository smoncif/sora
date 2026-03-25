'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';

export interface UserTransactionDisplayProps {
  // Transactions de l'utilisateur
  userTransactions: string[];
  // Transactions sélectionnées (vert)
  selectedTransactions: string[];
  // Transactions orphelines (rouge)
  orphanTransactions: string[];
  // Transactions ajoutées par le rôle mais jamais utilisées (orange)
  unusedTransactions: string[];
  // Map des exécutions pour l'index d'usage
  executionMap: Map<string, number>;
  // Mode d'affichage
  mode?: 'compact' | 'detailed';
  /** Clic sur une pastille : filtre les rôles simples (AnalysisCard) */
  onTransactionChipClick?: (transaction: string) => void;
  /** Transaction actuellement sélectionnée pour le filtre (style actif) */
  activeTransactionFilter?: string | null;
}

export const UserTransactionDisplay = React.memo(function UserTransactionDisplay({
  userTransactions,
  selectedTransactions,
  orphanTransactions,
  unusedTransactions,
  executionMap,
  mode = 'detailed',
  onTransactionChipClick,
  activeTransactionFilter = null,
}: UserTransactionDisplayProps) {
  const theme = useTheme();

  // Catégoriser les transactions selon les règles
  const categorizedTransactions = useMemo(() => {
    const selected = new Set(selectedTransactions);
    const orphan = new Set(orphanTransactions);
    const unused = new Set(unusedTransactions);

    // Ligne 1: Transactions sélectionnées (vert) + non sélectionnées (gris) + orphelines (rouge)
    const line1Transactions: Array<{
      transaction: string;
      category: 'selected' | 'unselected' | 'orphan';
      usage: number;
    }> = [];

    // Ligne 2: Transactions ajoutées par le rôle mais jamais utilisées (orange)
    const line2Transactions: Array<{
      transaction: string;
      category: 'unused';
      usage: number;
    }> = [];

    // Traiter toutes les transactions de l'utilisateur
    userTransactions.forEach(tx => {
      const usage = executionMap.get(tx) || 0;
      
      if (selected.has(tx)) {
        line1Transactions.push({ transaction: tx, category: 'selected', usage });
      } else if (orphan.has(tx)) {
        line1Transactions.push({ transaction: tx, category: 'orphan', usage });
      } else {
        line1Transactions.push({ transaction: tx, category: 'unselected', usage });
      }
    });

    // Ajouter les transactions non utilisées
    unusedTransactions.forEach(tx => {
      const usage = executionMap.get(tx) || 0;
      line2Transactions.push({ transaction: tx, category: 'unused', usage });
    });

    // Tri par couleur puis par usage (plus utilisées en premier)
    const categoryOrder: Record<
      'selected' | 'unselected' | 'orphan' | 'unused',
      number
    > = { selected: 0, unselected: 1, orphan: 2, unused: 3 };

    const sortByCategoryAndUsage = (
      a: (typeof line1Transactions)[number] | (typeof line2Transactions)[number],
      b: (typeof line1Transactions)[number] | (typeof line2Transactions)[number]
    ) => {
      const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
      
      if (categoryDiff !== 0) return categoryDiff;
      
      // Tri par usage décroissant (plus utilisées en premier)
      return b.usage - a.usage;
    };

    line1Transactions.sort(sortByCategoryAndUsage);
    line2Transactions.sort((a, b) => b.usage - a.usage);

    return { line1Transactions, line2Transactions };
  }, [userTransactions, selectedTransactions, orphanTransactions, unusedTransactions, executionMap]);

  // Fonction pour obtenir la couleur selon la catégorie
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'selected':
        return theme.palette.success.main;
      case 'unselected':
        return theme.palette.text.disabled;
      case 'orphan':
        return theme.palette.error.main;
      case 'unused':
        return theme.palette.warning.main;
      default:
        return theme.palette.text.primary;
    }
  };

  // Fonction pour obtenir le style selon la catégorie
  const getCategoryStyle = (category: string) => {
    const baseStyle = {
      fontWeight: 600,
      fontSize: '0.75rem',
      px: 1.5,
      py: 0.5,
      borderRadius: 1,
      border: '1px solid',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.5,
      mb: 0.5,
    };

    switch (category) {
      case 'selected':
        return {
          ...baseStyle,
          color: theme.palette.success.main,
          bgcolor: alpha(theme.palette.success.main, 0.1),
          borderColor: alpha(theme.palette.success.main, 0.3),
        };
      case 'unselected':
        return {
          ...baseStyle,
          color: theme.palette.text.disabled,
          bgcolor: alpha(theme.palette.text.disabled, 0.05),
          borderColor: alpha(theme.palette.text.disabled, 0.2),
        };
      case 'orphan':
        return {
          ...baseStyle,
          color: theme.palette.error.main,
          bgcolor: alpha(theme.palette.error.main, 0.1),
          borderColor: alpha(theme.palette.error.main, 0.3),
        };
      case 'unused':
        return {
          ...baseStyle,
          color: theme.palette.warning.main,
          bgcolor: alpha(theme.palette.warning.main, 0.1),
          borderColor: alpha(theme.palette.warning.main, 0.3),
        };
      default:
        return baseStyle;
    }
  };

  const handleChipKeyDown = React.useCallback(
    (e: React.KeyboardEvent, transaction: string) => {
      if (!onTransactionChipClick) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onTransactionChipClick(transaction);
      }
    },
    [onTransactionChipClick]
  );

  const TransactionChip = ({
    transaction,
    category,
    usage,
  }: {
    transaction: string;
    category: string;
    usage: number;
  }) => {
    const isActive = activeTransactionFilter === transaction;
    const base = getCategoryStyle(category);
    const clickable = Boolean(onTransactionChipClick);

    return (
      <Box
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? () => onTransactionChipClick!(transaction) : undefined}
        onKeyDown={
          clickable
            ? (e: React.KeyboardEvent<HTMLDivElement>) =>
                handleChipKeyDown(e, transaction)
            : undefined
        }
        sx={{
          ...base,
          cursor: clickable ? 'pointer' : 'default',
          ...(isActive && {
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.35)}`,
          }),
          ...(clickable && {
            '&:hover': {
              opacity: 0.92,
              filter: 'brightness(1.03)',
            },
          }),
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {transaction}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            opacity: 0.8,
            ml: 0.5,
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            bgcolor: alpha(getCategoryColor(category), 0.1),
          }}
        >
          {usage}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Container avec scroll limité à 3 lignes */}
      <Box sx={{ 
        maxHeight: 'calc(3 * 40px + 2 * 8px)', // 3 lignes * hauteur + 2 gaps
        overflowY: 'auto',
        overflowX: 'hidden',
        mb: 0,
        pr: 1,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: alpha(theme.palette.neutral.main, 0.05),
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: alpha(theme.palette.text.secondary, 0.3),
          borderRadius: '4px',
          '&:hover': {
            bgcolor: alpha(theme.palette.text.secondary, 0.5),
          },
        },
      }}>
        {/* Ligne 1: Transactions sélectionnées, non sélectionnées et orphelines */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mb: 2,
          minHeight: 40,
          alignItems: 'flex-start'
        }}>
          {categorizedTransactions.line1Transactions.map((item, index) => (
            <TransactionChip
              key={`line1-${item.transaction}-${index}`}
              transaction={item.transaction}
              category={item.category}
              usage={item.usage}
            />
          ))}
          {categorizedTransactions.line1Transactions.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Aucune transaction
            </Typography>
          )}
        </Box>

        {/* Ligne 2: Transactions ajoutées mais jamais utilisées */}
        {categorizedTransactions.line2Transactions.length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1,
            minHeight: 40,
            alignItems: 'flex-start'
          }}>
            {categorizedTransactions.line2Transactions.map((item, index) => (
              <TransactionChip
                key={`line2-${item.transaction}-${index}`}
                transaction={item.transaction}
                category={item.category}
                usage={item.usage}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Légende */}
      {mode === 'detailed' && (
        <Box sx={{ 
          mt: 0, 
          mb: 0,
          p: 0, 
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          borderRadius: 1,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}>
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
            Légende des couleurs :
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.success.main, borderRadius: 0.5 }} />
              <Typography variant="caption">
                Sélectionnées ({categorizedTransactions.line1Transactions.filter(t => t.category === 'selected').length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.text.disabled, borderRadius: 0.5 }} />
              <Typography variant="caption">
                Non sélectionnées ({categorizedTransactions.line1Transactions.filter(t => t.category === 'unselected').length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.error.main, borderRadius: 0.5 }} />
              <Typography variant="caption">
                Orphelines ({categorizedTransactions.line1Transactions.filter(t => t.category === 'orphan').length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, bgcolor: theme.palette.warning.main, borderRadius: 0.5 }} />
              <Typography variant="caption">
                Ajoutées mais inutilisées ({categorizedTransactions.line2Transactions.length})
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
});
