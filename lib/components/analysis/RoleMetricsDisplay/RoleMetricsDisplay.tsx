'use client';

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { UserTransactionDisplay } from '../UserTransactionDisplay/UserTransactionDisplay';

export interface RoleMetricsDisplayProps {
  // Données des métriques du rôle métier
  uniqueTransactions: string[];
  coveredTransactionsCount: number;
  maxAchievableTransactions: number;
  totalTransactions: number;
  orphanTransactions: string[];
  unusedTransactions: string[];
  executionMap: Map<string, number>;
  // Mode d'affichage
  mode?: 'compact' | 'detailed';
}

/**
 * Composant qui adapte les métriques du mode rôles pour utiliser UserTransactionDisplay
 * Transforme les 4 métriques (Transactions Métier, Couverture, Orphelines, Non Utilisées)
 * en format compatible avec le composant UserTransactionDisplay existant
 */
export const RoleMetricsDisplay = React.memo(function RoleMetricsDisplay({
  uniqueTransactions,
  coveredTransactionsCount,
  maxAchievableTransactions,
  totalTransactions,
  orphanTransactions,
  unusedTransactions,
  executionMap,
  mode = 'detailed'
}: RoleMetricsDisplayProps) {
  const theme = useTheme();

  // Transformer les métriques en format compatible avec UserTransactionDisplay
  const adaptedData = useMemo(() => {
    // Pour le mode rôles, nous voulons afficher les transactions réelles
    // mais les catégoriser selon leur statut dans le rôle métier
    
    // 1. Toutes les transactions du rôle métier
    const allTransactions = uniqueTransactions;
    
    // 2. Transactions couvertes (sélectionnées par les rôles simples)
    const coveredTransactions = Array.from(new Set(
      uniqueTransactions.filter(tx => 
        // Logique pour déterminer si une transaction est couverte
        // Pour l'instant, on prend les premières transactions couvertes
        uniqueTransactions.indexOf(tx) < coveredTransactionsCount
      )
    ));
    
    // 3. Transactions orphelines (ne peuvent pas être couvertes)
    const orphanTxs = orphanTransactions;
    
    // 4. Transactions non utilisées (ajoutées mais jamais utilisées)
    const unusedTxs = unusedTransactions;
    
    return {
      // Toutes les transactions à afficher
      userTransactions: allTransactions,
      // Transactions "sélectionnées" = transactions couvertes
      selectedTransactions: coveredTransactions,
      // Transactions orphelines
      orphanTransactions: orphanTxs,
      // Transactions non utilisées
      unusedTransactions: unusedTxs,
      // Map d'exécution (usage)
      executionMap: executionMap
    };
  }, [
    uniqueTransactions,
    coveredTransactionsCount,
    orphanTransactions,
    unusedTransactions,
    executionMap
  ]);

  return (
    <Box sx={{ 
      width: '100%',
      p: 2,
      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 0.7),
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
    }}>
      {/* Utiliser UserTransactionDisplay avec les données adaptées */}
      <UserTransactionDisplay
        userTransactions={adaptedData.userTransactions}
        selectedTransactions={adaptedData.selectedTransactions}
        orphanTransactions={adaptedData.orphanTransactions}
        unusedTransactions={adaptedData.unusedTransactions}
        executionMap={adaptedData.executionMap}
        mode={mode}
      />
    </Box>
  );
});
