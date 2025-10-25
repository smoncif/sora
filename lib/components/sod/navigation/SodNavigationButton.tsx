/**
 * Bouton de navigation flottant pour l'analyse SoD
 * Affiche un badge avec le nombre de risques non remédiés
 * Style harmonisé avec le bouton de comparaison des analyses
 */

'use client';

import React from 'react';
import {
  Box,
  IconButton,
  Badge,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';

export interface SodNavigationButtonProps {
  /** Nombre de risques non remédiés pour le badge */
  nonRemediatedCount: number;
  /** Callback pour ouvrir le slider */
  onOpenSlider: () => void;
  /** Si le bouton doit être visible */
  visible?: boolean;
}

export const SodNavigationButton: React.FC<SodNavigationButtonProps> = ({
  nonRemediatedCount,
  onOpenSlider,
  visible = true,
}) => {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <Tooltip title="Navigation des risques SoD" placement="left">
        <Badge 
          badgeContent={nonRemediatedCount} 
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: theme.palette.error.main,
              color: theme.palette.error.contrastText,
              fontWeight: 600,
              fontSize: '0.75rem',
              minWidth: 20,
              height: 20,
              border: `2px solid ${theme.palette.background.paper}`,
              // Positionner le badge plus proche du bouton
              top: 8,
              right: 8,
            },
          }}
        >
          <IconButton
            onClick={onOpenSlider}
            sx={{
              bgcolor: 'success.main',
              color: 'white',
              width: 56,
              height: 56,
              '&:hover': {
                bgcolor: 'success.dark',
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
              boxShadow: 2,
              transition: 'all 0.2s ease-in-out',
              // Animation de pulsation pour attirer l'attention
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)',
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)',
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
                },
              },
            }}
          >
            <KeyboardArrowUpIcon 
              sx={{ 
                fontSize: 28,
                // Animation de rebond sur hover
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  animation: 'bounce 0.6s ease-in-out',
                },
                '@keyframes bounce': {
                  '0%, 20%, 50%, 80%, 100%': {
                    transform: 'translateY(0)',
                  },
                  '40%': {
                    transform: 'translateY(-4px)',
                  },
                  '60%': {
                    transform: 'translateY(-2px)',
                  },
                },
              }} 
            />
          </IconButton>
        </Badge>
      </Tooltip>
    </Box>
  );
};
