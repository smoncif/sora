'use client';

import React from 'react';
import {
  Box,
  Button,
  Typography,
  Slider,
  LinearProgress,
  Chip,
  Divider,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  AutoMode as AutoIcon,
  TrendingUp as ScoreIcon,
} from '@mui/icons-material';
import { UseAutoSelectionReturn } from 'lib/hooks/analysis/useAutoSelection';
import { AnalysisMode, getLabels } from 'lib/types/analysis';

/**
 * Props pour le composant AutoSelectionControl
 */
export interface AutoSelectionControlProps {
  /** Résultat du hook useAutoSelection */
  autoSelection: UseAutoSelectionReturn;
  /** Désactiver le contrôle (par exemple si aucune analyse n'est disponible) */
  disabled?: boolean;
  /** Mode d'analyse */
  mode?: AnalysisMode;
}

/**
 * Composant pour contrôler la sélection automatique des rôles simples
 * 
 * Fournit une interface utilisateur pour :
 * - Configurer le score minimum requis
 * - Démarrer/arrêter la sélection automatique  
 * - Suivre la progression en temps réel
 */
export const AutoSelectionControl: React.FC<AutoSelectionControlProps> = ({
  autoSelection,
  disabled = false,
  mode = 'roles',
}) => {
  const theme = useTheme();
  const labels = getLabels(mode);

  const {
    isRunning,
    progress,
    minScoreThreshold,
    setMinScoreThreshold,
    startAutoSelection,
    stopAutoSelection,
    error,
  } = autoSelection;

  // Handler pour le slider de score minimum
  const handleScoreThresholdChange = React.useCallback((
    event: Event,
    newValue: number | number[]
  ) => {
    const value = Array.isArray(newValue) ? newValue[0] : newValue;
    setMinScoreThreshold(value);
  }, [setMinScoreThreshold]);

  // Calculer le pourcentage de progression
  const progressPercentage = progress.totalItems > 0 
    ? (progress.itemsProcessed / progress.totalItems) * 100 
    : 0;

  // Déterminer l'état visuel
  const isCompleted = !isRunning && progress.itemsProcessed > 0;
  const hasError = !!error;
  const hasRealActivity = progress.rolesSelected > 0 || progress.rolesSkipped > 0 || progress.itemsProcessed > 0;

  return (
    <Box sx={{ mt: 4 }}>
      {/* Titre de la section */}
      

      {/* Configuration du score minimum */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 1,
        }}>
          <Typography variant="body2" sx={{ 
            fontSize: '0.8rem', 
            fontWeight: 500,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
          }}>
            <ScoreIcon sx={{ fontSize: '1rem' }} />
            Score minimum requis
          </Typography>
          <Typography variant="body2" sx={{ 
            fontSize: '0.8rem', 
            fontWeight: 600,
            color: 'primary.main',
            minWidth: '40px',
            textAlign: 'right',
          }}>
            {minScoreThreshold}%
          </Typography>
        </Box>
        
        <Slider
          value={minScoreThreshold}
          onChange={handleScoreThresholdChange}
          disabled={isRunning}
          min={0}
          max={100}
          step={5}
          marks
          size="small"
          sx={{
            width: '100%',
            mt: 1,
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
        
        <Typography variant="caption" sx={{ 
          color: alpha(theme.palette.text.secondary, 0.8),
          fontSize: '0.75rem',
          lineHeight: 1.3,
          display: 'block',
          mt: 1,
        }}>
          {mode === 'users' 
            ? `Seul le ${labels?.targetRole?.toLowerCase()} avec le meilleur score global ≥ ${minScoreThreshold}% sera sélectionné automatiquement.`
            : `Seuls les ${labels?.targetRolePlural?.toLowerCase()} avec un score global ≥ ${minScoreThreshold}% seront sélectionnés automatiquement.`
          }
        </Typography>
      </Box>

      {/* Divider */}
      <Divider sx={{ mb: 3, opacity: 0.3 }} />

      {/* Bouton de contrôle */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant={isRunning ? "outlined" : "contained"}
          color={isRunning ? "error" : "primary"}
          onClick={isRunning ? stopAutoSelection : startAutoSelection}
          disabled={disabled}
          startIcon={isRunning ? <StopIcon /> : <PlayIcon />}
          fullWidth
          sx={{
            py: 1.5,
            fontWeight: 600,
            textTransform: 'none',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
            ...(isRunning && {
              borderColor: theme.palette.error.main,
              color: theme.palette.error.main,
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.04),
                borderColor: theme.palette.error.dark,
              },
            }),
          }}
        >
          {isRunning ? 'Arrêter' : 'Démarrer'}
        </Button>
      </Box>

      {/* Zone de progression */}
      {(isRunning || (isCompleted && hasRealActivity) || hasError) && (
        <Box sx={{
          p: 2,
          bgcolor: hasError 
            ? alpha(theme.palette.error.main, 0.05)
            : isCompleted 
              ? alpha(theme.palette.success.main, 0.05)
              : alpha(theme.palette.info.main, 0.05),
          borderRadius: 2,
          border: `1px solid ${alpha(
            hasError 
              ? theme.palette.error.main
              : isCompleted 
                ? theme.palette.success.main
                : theme.palette.info.main,
            0.2
          )}`,
        }}>
          {/* Erreur */}
          {hasError && (
            <Alert 
              severity="error" 
              sx={{ 
                bgcolor: 'transparent',
                border: 'none',
                px: 0,
                '& .MuiAlert-message': {
                  fontSize: '0.8rem',
                },
              }}
            >
              {error}
            </Alert>
          )}

          {/* Progression en cours */}
          {isRunning && !hasError && (
            <>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>
                    Progression globale
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {progress.itemsProcessed}/{progress.totalItems} {labels?.itemPlural?.toLowerCase()}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={progressPercentage}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>

              {/* Statut actuel */}
              {progress.currentItem && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ 
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    color: theme.palette.info.main,
                    mb: 0.5,
                  }}>
                    🔄 En cours : {progress.currentItem}
                  </Typography>
                  {progress.currentTargetRole && (
                    <Typography variant="caption" sx={{ 
                      fontSize: '0.75rem',
                      color: theme.palette.text.secondary,
                    }}>
                      Analyse du {labels?.targetRole?.toLowerCase()} : {progress.currentTargetRole}
                    </Typography>
                  )}
                </Box>
              )}

              {/* Statistiques en temps réel */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${progress.rolesSelected} sélectionnés`}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    fontSize: '0.7rem',
                    borderColor: alpha(theme.palette.info.main, 0.5),
                    color: theme.palette.info.main,
                  }}
                />
                <Chip
                  label={`${progress.rolesSkipped} ignorés`}
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            </>
          )}

          {/* Résultats finaux */}
          {isCompleted && !hasError && (
            <>
              <Typography variant="body2" sx={{ 
                fontWeight: 600,
                fontSize: '0.8rem',
                color: theme.palette.info.main,
                mb: 1,
              }}>
                ✅ Sélection automatique terminée
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${progress.rolesSelected} rôles sélectionnés`}
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem',
                    bgcolor: alpha(theme.palette.info.main, 0.12),
                    color: theme.palette.info.main,
                    fontWeight: 600,
                  }}
                />
                <Chip
                  label={`${progress.rolesSkipped} rôles ignorés`}
                  size="small"
                  color="default"
                  sx={{ fontSize: '0.7rem' }}
                />
                <Chip
                  label={`${progress.totalItems} ${labels?.itemPlural?.toLowerCase()} traités`}
                  size="small"
                  sx={{ 
                    fontSize: '0.7rem',
                    bgcolor: alpha(theme.palette.secondary.main, 0.12),
                    color: theme.palette.secondary.main,
                    fontWeight: 600,
                  }}
                />
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AutoSelectionControl;

