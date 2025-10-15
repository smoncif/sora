/**
 * Composants Skeleton pour les cartes de rôles SoD
 * 
 * Utilisés comme placeholders gris animés pendant le chargement progressif (lazy loading)
 * Design cohérent avec Material-UI et les vraies cartes de rôles
 */

'use client';

import { Box, Skeleton, Paper, useTheme, alpha } from '@mui/material';

/**
 * Skeleton pour SodSimpleRoleCard
 * Mimique la structure visuelle de la vraie carte
 */
export const SodSimpleRoleCardSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, 
        borderRadius: 3,
        mb: 3,
        background: alpha(theme.palette.background.paper, 0.5),
      }}
    >
      {/* Header avec icône et titre */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton 
          variant="circular" 
          width={40} 
          height={40} 
          sx={{ mr: 2 }} 
          animation="wave"
        />
        <Box sx={{ flex: 1 }}>
          <Skeleton 
            variant="text" 
            width="60%" 
            height={28} 
            animation="wave"
          />
          <Skeleton 
            variant="text" 
            width="40%" 
            height={20} 
            animation="wave"
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Box>
      
      {/* Badges (niveau risque, nombre d'actions, etc.) */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Skeleton 
          variant="rounded" 
          width={80} 
          height={32} 
          animation="wave"
        />
        <Skeleton 
          variant="rounded" 
          width={100} 
          height={32} 
          animation="wave"
        />
        <Skeleton 
          variant="rounded" 
          width={90} 
          height={32} 
          animation="wave"
        />
      </Box>
      
      {/* Contenu principal (risques, actions, ressources) */}
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={120} 
        sx={{ borderRadius: 2, mb: 2 }} 
        animation="wave"
      />
      
      {/* Boutons d'actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Skeleton 
          variant="rounded" 
          width={120} 
          height={36} 
          animation="wave"
        />
        <Skeleton 
          variant="rounded" 
          width={100} 
          height={36} 
          animation="wave"
        />
      </Box>
    </Paper>
  );
};

/**
 * Skeleton pour SodCompositeRoleCard
 * Design légèrement différent pour refléter la complexité des rôles composites
 */
export const SodCompositeRoleCardSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`, 
        borderRadius: 3,
        mb: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`,
      }}
    >
      {/* Header avec badge composite */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton 
          variant="circular" 
          width={48} 
          height={48} 
          sx={{ mr: 2 }} 
          animation="wave"
        />
        <Box sx={{ flex: 1 }}>
          <Skeleton 
            variant="text" 
            width="70%" 
            height={32} 
            animation="wave"
          />
          <Skeleton 
            variant="text" 
            width="50%" 
            height={20} 
            animation="wave"
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Skeleton 
          variant="rounded" 
          width={100} 
          height={28} 
          animation="wave"
        />
      </Box>
      
      {/* Badges */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Skeleton 
          variant="rounded" 
          width={90} 
          height={32} 
          animation="wave"
        />
        <Skeleton 
          variant="rounded" 
          width={120} 
          height={32} 
          animation="wave"
        />
        <Skeleton 
          variant="rounded" 
          width={110} 
          height={32} 
          animation="wave"
        />
      </Box>
      
      {/* Sub-roles (rôles simples contenus) */}
      <Box sx={{ 
        ml: 4, 
        mb: 2, 
        p: 2, 
        border: `1px dashed ${alpha(theme.palette.divider, 0.2)}`,
        borderRadius: 2,
      }}>
        <Skeleton 
          variant="text" 
          width={150} 
          height={24} 
          animation="wave"
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={80} height={24} animation="wave" />
          <Skeleton variant="rounded" width={90} height={24} animation="wave" />
          <Skeleton variant="rounded" width={75} height={24} animation="wave" />
        </Box>
      </Box>
      
      {/* Contenu principal */}
      <Skeleton 
        variant="rectangular" 
        width="100%" 
        height={140} 
        sx={{ borderRadius: 2, mb: 2 }} 
        animation="wave"
      />
      
      {/* Boutons d'actions */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Skeleton 
          variant="rounded" 
          width={130} 
          height={36} 
          animation="wave"
        />
        <Skeleton 
          variant="rounded" 
          width={110} 
          height={36} 
          animation="wave"
        />
      </Box>
    </Paper>
  );
};

