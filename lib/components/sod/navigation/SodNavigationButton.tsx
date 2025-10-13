/**
 * Bouton de navigation flottant pour l'analyse SoD
 * Affiche un badge avec le nombre de risques non remédiés
 */

'use client';

import React from 'react';
import {
  Fab,
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
    <Tooltip title="Navigation des risques SoD" placement="left">
      <Fab
        color="primary"
        onClick={onOpenSlider}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1200,
          backgroundColor: theme.palette.success.main,
          '&:hover': {
            backgroundColor: theme.palette.success.dark,
          },
          boxShadow: theme.shadows[8],
          border: `2px solid ${alpha(theme.palette.success.light, 0.3)}`,
        }}
      >
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
            },
          }}
        >
          <KeyboardArrowUpIcon sx={{ color: 'white' }} />
        </Badge>
      </Fab>
    </Tooltip>
  );
};
