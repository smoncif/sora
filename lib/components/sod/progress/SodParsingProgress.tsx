/**
 * Composant de progression pour le parsing Excel SOD
 * Intégré avec le nouveau workflow
 */

'use client';

import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';

export interface SodParsingProgressProps {
  /** État du parsing */
  parsing: boolean;
  /** Progression (0-100) */
  progress?: number;
  /** Message de progression */
  message?: string;
  /** Erreur de parsing */
  error?: string | null;
  /** Callback pour annuler */
  onCancel?: () => void;
}

export const SodParsingProgress: React.FC<SodParsingProgressProps> = ({
  parsing,
  progress = 0,
  message = 'Traitement en cours...',
  error,
  onCancel,
}) => {
  const theme = useTheme();

  if (!parsing && !error) {
    return null;
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      {error ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Erreur lors du parsing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Analyse du fichier Excel
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.toFixed(0)}%
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ 
              mb: 2,
              height: 8,
              borderRadius: 4,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }} 
          />
          
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};
