/**
 * Skeleton sobre pour les rôles simples SoD
 * Utilisé dans SodCompositeFunctionCard pour lazy loading des rôles simples
 */

'use client';

import { Box, Skeleton, Paper, useTheme, alpha } from '@mui/material';

/**
 * Skeleton minimaliste pour un rôle simple SoD
 */
export const SodSimpleRoleSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        background: alpha(theme.palette.action.hover, 0.02),
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: 1.5 }}>
        <Skeleton variant="text" width="70%" height={16} />
        <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.5 }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="circular" width={24} height={24} />
        </Box>
      </Box>
    </Paper>
  );
};
