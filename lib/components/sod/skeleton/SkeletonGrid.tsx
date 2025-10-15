/**
 * Composant générique pour afficher des grilles de skeletons pendant le chargement
 * Utilisé pour la pagination instantanée avec placeholders intelligents
 */

'use client';

import React from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import { SodSimpleRoleCardSkeleton, SodCompositeRoleCardSkeleton } from './SodRoleCardSkeleton';

export interface SkeletonGridProps {
  /** Nombre de skeletons à afficher */
  count: number;
  /** Type de skeleton (simple ou composite) */
  type?: 'simple' | 'composite';
  /** Espacement entre les skeletons */
  spacing?: number;
  /** Animation de chargement */
  animated?: boolean;
  /** Variant de skeleton */
  variant?: 'default' | 'minimal' | 'detailed';
}

/**
 * Composant de grille de skeletons pour la pagination instantanée
 */
export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ 
  count, 
  type = 'simple',
  spacing = 3,
  animated = true,
  variant = 'default'
}) => {
  const theme = useTheme();

  const SkeletonComponent = type === 'simple' 
    ? SodSimpleRoleCardSkeleton 
    : SodCompositeRoleCardSkeleton;
    
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: spacing,
        // Animation subtile pour les skeletons
        ...(animated && {
          '& > *': {
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          },
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.7,
            },
          },
        }),
        // Fond subtil pour indiquer le chargement
        ...(variant === 'detailed' && {
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.05)}, transparent)`,
            animation: 'shimmer 2s infinite',
            zIndex: 0,
          },
          '@keyframes shimmer': {
            '0%': {
              transform: 'translateX(-100%)',
            },
            '100%': {
              transform: 'translateX(100%)',
            },
          },
        }),
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box 
          key={`skeleton-${type}-${i}`}
          sx={{ 
            position: 'relative',
            zIndex: 1,
            // Délai progressif pour l'animation
            ...(animated && {
              animationDelay: `${i * 100}ms`,
            }),
          }}
        >
          <SkeletonComponent />
        </Box>
      ))}
    </Box>
  );
};

/**
 * Hook pour obtenir les props de skeleton basées sur l'état de chargement
 */
export const useSkeletonProps = (
  isLoading: boolean,
  pageSize: number,
  type: 'simple' | 'composite' = 'simple'
): SkeletonGridProps | null => {
  if (!isLoading) return null;
  
  return {
    count: pageSize,
    type,
    spacing: 3,
    animated: true,
    variant: 'default',
  };
};

/**
 * Composant de skeleton avec message de chargement
 */
export const SkeletonGridWithMessage: React.FC<SkeletonGridProps & {
  message?: string;
}> = ({ message, ...skeletonProps }) => {
  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <SkeletonGrid {...skeletonProps} />
      {message && (
        <Box sx={{ mt: 2, opacity: 0.7 }}>
          <Box sx={{ 
            display: 'inline-block',
            px: 2,
            py: 1,
            borderRadius: 1,
            backgroundColor: 'action.hover',
            fontSize: '0.875rem',
            color: 'text.secondary'
          }}>
            {message}
          </Box>
        </Box>
      )}
    </Box>
  );
};
