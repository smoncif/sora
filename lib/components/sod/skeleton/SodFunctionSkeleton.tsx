/**
 * Skeleton sobre pour les fonctions SoD
 * Utilisé dans SodFunctionGrid pour lazy loading des fonctions
 */

'use client';

import { Box, Skeleton, Paper, useTheme, alpha } from '@mui/material';

/**
 * Skeleton minimaliste pour une fonction SoD
 */
export const SodFunctionSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={1}
      sx={{
        height: '100%',
        minHeight: 180,
        borderRadius: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: alpha(theme.palette.action.hover, 0.02),
        overflow: 'hidden',
      }}
    >
      {/* Header fonction */}
      <Box
        sx={{
          p: 2,
          backgroundColor: alpha(theme.palette.grey[500], 0.05),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="50%" height={16} sx={{ mt: 0.5 }} />
      </Box>
      
      {/* Contenu (actions) */}
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 1 }} />
      </Box>
    </Paper>
  );
};

