'use client';

import React from 'react';
import { 
  Box,
  Paper,
  Typography,
  Chip,
  useTheme,
  alpha,
  Slider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
} from '@mui/icons-material';

// Composant WeightSlider optimisé avec React.memo
const WeightSlider = React.memo(function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  // État local pour le suivi en temps réel du slider
  const [localValue, setLocalValue] = React.useState(value);
  const [isDragging, setIsDragging] = React.useState(false);

  // Synchroniser l'état local avec la valeur externe quand elle change (et qu'on ne fait pas de drag)
  React.useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  // Handler pour le changement en temps réel (pendant le drag)
  const handleChange = React.useCallback((event: Event, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    setLocalValue(val);
    setIsDragging(true);
  }, []);

  // Handler pour la fin du changement (relâchement)
  const handleChangeCommitted = React.useCallback((event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    setIsDragging(false);
    onChange(val); // Déclencher le recalcul seulement maintenant
  }, [onChange]);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 0.25,
      }}>
        <Typography variant="body2" sx={{ 
          fontSize: '0.8rem', 
          fontWeight: 500,
          color: 'text.primary',
        }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ 
          fontSize: '0.8rem', 
          fontWeight: 600,
          color: 'primary.main',
          minWidth: '40px',
          textAlign: 'right',
        }}>
          {localValue}%
        </Typography>
      </Box>
      <Slider
        value={localValue}
        onChange={handleChange}
        onChangeCommitted={handleChangeCommitted}
        aria-labelledby={`${label}-slider`}
        valueLabelDisplay="auto"
        step={5}
        marks
        min={0}
        max={100}
        size="small"
        sx={{
          width: '100%',
          mt: 0.25,
          '& .MuiSlider-thumb': {
            width: 16,
            height: 16,
          },
          '& .MuiSlider-track': {
            height: 4,
          },
          '& .MuiSlider-rail': {
            height: 4,
          },
        }}
      />
    </Box>
  );
});

export interface ConfigurationSectionProps {
  // États de pondération
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  isComputing?: boolean;

  // Handlers
  onCoverageWeightChange: (value: number) => void;
  onSizeWeightChange: (value: number) => void;
  onUsageWeightChange: (value: number) => void;
}

export function ConfigurationSection({
  coverageWeight,
  sizeWeight,
  usageWeight,
  isComputing = false,
  onCoverageWeightChange,
  onSizeWeightChange,
  onUsageWeightChange,
}: ConfigurationSectionProps) {
  const theme = useTheme();

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4, 
        mb: 4,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        mb: 4 
      }}>
        <Box>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: theme.palette.text.primary,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                color: theme.palette.primary.main,
                '@keyframes rotateSettings': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
                animation: 'rotateSettings 8s linear infinite',
                '&:hover': {
                  animation: 'rotateSettings 2s linear infinite',
                },
              }}
            >
              <SettingsIcon fontSize="small" />
            </Box>
            Configuration
            {/* Indicateur de calcul en cours */}
            {isComputing && (
              <Chip
                label="Calcul..."
                size="small"
                color="primary"
                variant="filled"
                sx={{
                  ml: 1.5,
                  fontSize: '0.65rem',
                  height: 20,
                  animation: 'pulse 1.5s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 0.6 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.6 },
                  },
                }}
              />
            )}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '0.9rem',
            }}
          >
            Ajustez l'importance relative des critères d'analyse
          </Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 400 }}>
        <Typography variant="subtitle2" sx={{ 
          mb: 3,
          color: theme.palette.text.primary,
          fontWeight: 500,
          fontSize: '0.9rem',
        }}>
          Pondération du score global
        </Typography>
        
        {/* Première ligne : Couverture vs Taille */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ mb: 2 }}>
            <WeightSlider 
              label="% Couverture" 
              value={coverageWeight} 
              onChange={onCoverageWeightChange} 
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <WeightSlider 
              label="Score taille" 
              value={sizeWeight} 
              onChange={onSizeWeightChange} 
            />
          </Box>
        </Box>
        
        {/* Deuxième ligne : Usage */}
        <Box sx={{ mb: 2 }}>
          <WeightSlider 
            label="Usage fréquence" 
            value={usageWeight} 
            onChange={onUsageWeightChange} 
          />
        </Box>
        
        <Typography variant="caption" sx={{ 
          color: alpha(theme.palette.text.secondary, 0.8),
          fontSize: '0.75rem',
          lineHeight: 1.3,
          display: 'block',
        }}>
          Ajustez l'importance relative des trois composants : couverture des transactions restantes, pertinence du rôle simple, et fréquence d'usage.
        </Typography>
      </Box>
    </Paper>
  );
} 