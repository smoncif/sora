/**
 * Composants Skeleton pour les cartes de rôles SoD
 * 
 * Utilisés comme placeholders gris animés pendant le chargement progressif (lazy loading)
 * Design cohérent avec Material-UI et les vraies cartes de rôles
 */

'use client';

import { Box, Skeleton, Paper, useTheme, alpha } from '@mui/material';

/**
 * Skeleton sobre pour SodSimpleRoleCard
 * Version minimaliste et rapide
 */
export const SodSimpleRoleCardSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        border: `1px solid ${alpha(theme.palette.divider, 0.08)}`, 
        borderRadius: 3,
        mb: 3,
        background: alpha(theme.palette.action.hover, 0.02),
      }}
    >
      {/* Header simplifié */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton 
          variant="circular" 
          width={32} 
          height={32} 
          sx={{ mr: 2 }} 
        />
        <Skeleton 
          variant="text" 
          width="50%" 
          height={24} 
        />
      </Box>
      
      {/* Badges minimaux */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={70} height={24} />
        <Skeleton variant="rounded" width={80} height={24} />
      </Box>
      
      {/* Contenu principal sobre */}
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={80} 
        sx={{ borderRadius: 1.5 }} 
      />
    </Paper>
  );
};

/**
 * Skeleton sobre pour SodCompositeRoleCard
 * Version minimaliste avec badge composite
 */
export const SodCompositeRoleCardSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`, 
        borderRadius: 3,
        mb: 3,
        background: alpha(theme.palette.primary.main, 0.02),
      }}
    >
      {/* Header simplifié */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton 
          variant="circular" 
          width={36} 
          height={36} 
          sx={{ mr: 2 }} 
        />
        <Skeleton 
          variant="text" 
          width="55%" 
          height={26} 
        />
        <Skeleton 
          variant="rounded" 
          width={85} 
          height={24} 
          sx={{ ml: 'auto' }}
        />
      </Box>
      
      {/* Badges minimaux */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={75} height={24} />
        <Skeleton variant="rounded" width={90} height={24} />
      </Box>
      
      {/* Contenu principal sobre */}
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={100} 
        sx={{ borderRadius: 1.5 }} 
      />
    </Paper>
  );
};

