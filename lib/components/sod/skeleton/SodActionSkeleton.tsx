/**
 * Skeleton sobre pour les actions SoD
 * Utilisé dans SodFunctionCard pour lazy loading des actions
 */

'use client';

import { Box, Skeleton, Paper, useTheme, alpha } from '@mui/material';

/**
 * Skeleton minimaliste pour une action SoD
 */
export const SodActionSkeleton = () => {
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
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="text" width="40%" height={14} sx={{ mt: 0.5 }} />
      </Box>
    </Paper>
  );
};
