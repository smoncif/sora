'use client';

import React from 'react';
import { 
  Box,
  Paper,
  Typography,
  useTheme,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  AutoMode as AutoIcon,
  HourglassEmpty as HourglassIcon,
} from '@mui/icons-material';
import { AutoSelectionControl } from '../AutoSelectionControl';
import { UseAutoSelectionReturn } from 'lib/hooks/analysis/useAutoSelection';
import { AnalysisMode, getLabels } from 'lib/types/analysis';

/**
 * Props pour AutoSelectionSection
 */
export interface AutoSelectionSectionProps {
  /** Résultat du hook useAutoSelection */
  autoSelection: UseAutoSelectionReturn;
  /** Désactiver la section (par exemple si aucune analyse n'est disponible) */
  disabled?: boolean;
  /** Afficher la section de sélection automatique */
  show?: boolean;
  /** Mode d'analyse */
  mode?: AnalysisMode;
  /** true si les données de scoring sont encore en cours de préparation */
  isPreparingData?: boolean;
  /** Progression du calcul en arrière-plan */
  computingProgress?: { computed: number; total: number };
}

/**
 * Section dédiée à la sélection automatique des rôles simples
 * 
 * Wrapper autour d'AutoSelectionControl avec le même style que les autres sections
 * de la page d'analyse (FileUploadSection, ConfigurationSection)
 */
export function AutoSelectionSection({
  autoSelection,
  disabled = false,
  show = true,
  mode = 'roles',
  isPreparingData = false,
  computingProgress,
}: AutoSelectionSectionProps) {
  const theme = useTheme();
  const labels = getLabels(mode);

  const isDisabled = disabled || isPreparingData;
  const progressPercent =
    computingProgress && computingProgress.total > 0
      ? Math.round((computingProgress.computed / computingProgress.total) * 100)
      : 0;

  // Ne pas afficher si show est false
  if (!show) {
    return null;
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4, 
        mb: 4,
        bgcolor: 'background.paper',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        height: 'fit-content', // S'adapter au contenu
      }}
    >
      {/* En-tête de la section */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        mb: 4 
      }}>
        <Box sx={{ flex: 1 }}>
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
                '@keyframes rotateAuto': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
                animation: 'rotateAuto 8s linear infinite',
                '&:hover': {
                  animation: 'rotateAuto 2s linear infinite',
                },
              }}
            >
              <AutoIcon fontSize="small" />
            </Box>
            Sélection Automatique
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: theme.palette.text.secondary,
              fontSize: '0.9rem',
            }}
          >
            {mode === 'users' 
              ? `Optimisez la sélection du ${labels?.targetRole?.toLowerCase()} pour chaque ${labels?.item?.toLowerCase()}`
              : `Optimisez la sélection des ${labels?.targetRolePlural?.toLowerCase()} basée sur les scores`
            }
          </Typography>
        </Box>

        {/* Indicateur de préparation des données */}
        {isPreparingData && computingProgress && (
          <Tooltip title={`Calcul des scores : ${computingProgress.computed} / ${computingProgress.total} rôles`}>
            <Chip
              icon={<HourglassIcon fontSize="small" />}
              label={`${progressPercent}%`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          </Tooltip>
        )}
      </Box>

      {/* Barre de progression pendant le calcul différé */}
      {isPreparingData && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant={computingProgress && computingProgress.total > 0 ? 'determinate' : 'indeterminate'}
            value={progressPercent}
            sx={{ borderRadius: 1, height: 4 }}
          />
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mt: 0.5, display: 'block' }}>
            Préparation des scores en arrière-plan…
          </Typography>
        </Box>
      )}

      {/* Contenu : AutoSelectionControl */}
      <Box sx={{ mt: -2 }}> {/* Réduire l'espacement puisqu'on a déjà un titre */}
        <AutoSelectionControl
          autoSelection={autoSelection}
          disabled={isDisabled}
          mode={mode}
        />
      </Box>
    </Paper>
  );
}

export default AutoSelectionSection;
