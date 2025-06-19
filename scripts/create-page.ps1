$content = @'
'use client';

import React from 'react';
import { 
  Box,
  Container,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { useAuth } from 'lib/hooks/useAuth';
import { ThemeToggle } from 'lib/components/common/ThemeToggle';
import { useAnalysisWorkflow } from 'lib/hooks/analysis/useAnalysisWorkflow';

/**
 * Page d'analyse des rôles métier optimisée
 * Interface unique avec workflow refactorisé et hooks spécialisés
 */
export default function RoleAnalysisPage() {
  const { user } = useAuth();
  const theme = useTheme();
  
  // 🚀 WORKFLOW UNIFIÉ : Hook principal avec tous les sous-hooks intégrés
  const workflow = useAnalysisWorkflow();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: 6,
        pb: 3,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Box>
          <Typography 
            variant="h3" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              color: theme.palette.text.primary,
              mb: 1,
              letterSpacing: '-0.02em',
            }}
          >
              Analyse des Rôles Métier
            </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '1.1rem',
              fontWeight: 400,
            }}
          >
            Architecture optimisée avec hooks spécialisés
        </Typography>
        </Box>
        <ThemeToggle />
      </Box>
      <Typography>Workflow chargé: {workflow ? 'OK' : 'Erreur'}</Typography>
    </Container>
  );
}
'@

$content | Out-File -FilePath "app/dashboard/analysis/roles/analysis/page.tsx" -Encoding UTF8
Write-Host "✅ Page créée avec succès" 