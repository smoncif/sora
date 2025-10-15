/**
 * Composant Skeleton générique pour les cartes de rôles
 * 
 * Format uniforme pour tous les types :
 * - SoD (rôles simples, composites)
 * - Rôles utilisateurs
 * - Groupes
 * 
 * Structure : Header (expand + icône + nom + badge) + contenu
 */

'use client';

import { Box, Skeleton, Paper, useTheme, alpha } from '@mui/material';

/**
 * Skeleton générique qui reproduit le format des vraies cartes
 * Utilisable pour tous les types de cartes (SoD, utilisateurs, groupes)
 */
export const SodSimpleRoleCardSkeleton = () => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        mb: 4,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* En-tête du rôle - FORMAT UNIFORME */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          p: 3,
          background: alpha(theme.palette.grey[100], 0.3),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          cursor: 'pointer',
        }}
      >
        {/* Placeholder pour icône expandable */}
        <Skeleton 
          variant="circular" 
          width={24} 
          height={24} 
        />
        
        {/* Placeholder pour icône de rôle */}
        <Skeleton 
          variant="circular" 
          width={32} 
          height={32} 
        />
        
        {/* Nom du rôle */}
        <Box sx={{ flex: 1 }}>
          <Skeleton 
            variant="text" 
            width="60%" 
            height={28}
            sx={{ fontSize: '1.125rem' }}
          />
          <Skeleton 
            variant="text" 
            width="40%" 
            height={20}
            sx={{ mt: 1, fontSize: '0.875rem' }}
          />
        </Box>
        
        {/* Badge de progression */}
        <Skeleton
          variant="rounded"
          width={120}
          height={24}
          sx={{ borderRadius: 12 }}
        />
      </Box>
      
      {/* Contenu principal - DEUX COLONNES comme l'interface réelle */}
      <Box sx={{ p: 3 }}>
        {/* Section des fonctions en deux colonnes */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 3,
          mb: 2 
        }}>
          {/* Colonne gauche - Fonction 1 */}
          <Box sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.grey[50], 0.5),
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
          }}>
            <Skeleton variant="text" width="80%" height={16} sx={{ mb: 1.5 }} />
            <Skeleton variant="text" width="60%" height={14} sx={{ mb: 2 }} />
            
            {/* Actions de la fonction - seulement les lignes */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Skeleton variant="text" width="70%" height={14} />
              <Skeleton variant="text" width="60%" height={14} />
            </Box>
          </Box>

          {/* Colonne droite - Fonction 2 */}
          <Box sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.grey[50], 0.5),
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`
          }}>
            <Skeleton variant="text" width="85%" height={16} sx={{ mb: 1.5 }} />
            <Skeleton variant="text" width="65%" height={14} sx={{ mb: 2 }} />
            
            {/* Actions de la fonction - seulement les lignes */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Skeleton variant="text" width="75%" height={14} />
              <Skeleton variant="text" width="65%" height={14} />
              <Skeleton variant="text" width="55%" height={14} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

/**
 * Alias pour la compatibilité - même skeleton pour tous
 */
export const SodCompositeRoleCardSkeleton = SodSimpleRoleCardSkeleton;
export const UserCardSkeleton = SodSimpleRoleCardSkeleton;
export const GroupCardSkeleton = SodSimpleRoleCardSkeleton;