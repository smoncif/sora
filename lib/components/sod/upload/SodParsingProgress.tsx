/**
 * Composant pour afficher la progression du parsing Excel
 */

'use client';

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  Button,
  alpha,
  useTheme,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export interface SodParsingProgressProps {
  /** Progression (0-100) */
  progress: number;
  
  /** Message de progression */
  message: string;
  
  /** En cours de parsing */
  parsing: boolean;
  
  /** Erreur éventuelle */
  error?: string | null;
  
  /** Callback pour annuler */
  onCancel?: () => void;
}

/**
 * Affiche la progression du parsing Excel avec possibilité d'annulation
 */
export const SodParsingProgress: React.FC<SodParsingProgressProps> = ({
  progress,
  message,
  parsing,
  error,
  onCancel,
}) => {
  const theme = useTheme();

  // Déterminer l'état
  const isComplete = progress >= 100 && !parsing && !error;
  const hasError = !!error;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        border: `1px solid ${alpha(
          hasError ? theme.palette.error.main : 
          isComplete ? theme.palette.success.main :
          theme.palette.primary.main,
          0.2
        )}`,
        backgroundColor: alpha(
          hasError ? theme.palette.error.main : 
          isComplete ? theme.palette.success.main :
          theme.palette.primary.main,
          0.04
        ),
      }}
    >
      {/* Icône et titre */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        {hasError && (
          <ErrorIcon sx={{ fontSize: 28, color: theme.palette.error.main }} />
        )}
        {isComplete && (
          <CheckCircleIcon sx={{ fontSize: 28, color: theme.palette.success.main }} />
        )}
        {!hasError && !isComplete && parsing && (
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: `3px solid ${theme.palette.primary.main}`,
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
          />
        )}

        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {hasError ? 'Erreur' :
             isComplete ? 'Parsing terminé' :
             'Parsing en cours...'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              mt: 0.5,
            }}
          >
            {hasError ? error : message}
          </Typography>
        </Box>

        {/* Bouton annuler (seulement si en cours) */}
        {parsing && onCancel && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<CancelIcon />}
            onClick={onCancel}
            sx={{
              borderRadius: 1.5,
              textTransform: 'none',
            }}
          >
            Annuler
          </Button>
        )}
      </Box>

      {/* Barre de progression */}
      {!hasError && (
        <Box sx={{ width: '100%' }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: isComplete ? theme.palette.success.main : theme.palette.primary.main,
              },
            }}
          />
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'right',
              mt: 0.5,
              color: theme.palette.text.secondary,
              fontWeight: 600,
            }}
          >
            {Math.round(progress)}%
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

