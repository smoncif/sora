/**
 * Composant de sélection automatique pour l'analyse SOD
 * Inspiré du pattern des autres analyses (user/role)
 */

'use client';

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Switch,
  FormControlLabel,
  alpha,
  useTheme,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';

export interface SodAutoSelectionSectionProps {
  /** Activer l'analyse d'usage */
  enableUsageAnalysis: boolean;
  /** Callback pour changer l'état du switch */
  onUsageAnalysisChange: (enabled: boolean) => void;
  /** État de chargement */
  disabled: boolean;
  /** Callback pour démarrer la remédiation automatique */
  onStartRemediation: () => void;
}

export const SodAutoSelectionSection: React.FC<SodAutoSelectionSectionProps> = ({
  enableUsageAnalysis,
  onUsageAnalysisChange,
  disabled,
  onStartRemediation,
}) => {
  const theme = useTheme();

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 4, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <RefreshIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Sélection Automatique
        </Typography>
      </Box>

      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ mb: 3, lineHeight: 1.6 }}
      >
        Remédier automatiquement les risques en minimisant l'impact sur les rôles.
      </Typography>

      {/* Switch pour l'analyse d'usage */}
      <Box sx={{ mb: 4 }}>
        <FormControlLabel
          control={
            <Switch
              checked={enableUsageAnalysis}
              onChange={(e) => onUsageAnalysisChange(e.target.checked)}
              disabled={disabled}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Activer l'analyse d'usage
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Privilégier les actions moins utilisées pour suppression/restriction
              </Typography>
            </Box>
          }
          sx={{ 
            alignItems: 'flex-start',
            '& .MuiFormControlLabel-label': {
              ml: 1,
            },
          }}
        />
      </Box>

      {/* Bouton de démarrage */}
      <Box sx={{ mt: 'auto' }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<PlayArrowIcon />}
          onClick={onStartRemediation}
          disabled={disabled}
          fullWidth
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          Démarrer
        </Button>
      </Box>
    </Paper>
  );
};
