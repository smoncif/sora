/**
 * Composant de progression détaillé pour le parsing Excel SOD
 * Affiche les étapes décomposées du processus de parsing
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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

export interface SodParsingProgressDetailedProps {
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

/**
 * Définit les étapes du processus de parsing
 */
const PARSING_STEPS = [
  {
    id: 'init',
    label: 'Initialisation',
    description: 'Chargement du parser ExcelJS',
    startProgress: 0,
    endProgress: 5,
    icon: '🚀'
  },
  {
    id: 'read',
    label: 'Lecture streaming',
    description: 'Lecture du fichier Excel en streaming',
    startProgress: 5,
    endProgress: 20,
    icon: '📂'
  },
  {
    id: 'map',
    label: 'Mapping des colonnes',
    description: 'Identification et mapping des colonnes FR/EN',
    startProgress: 20,
    endProgress: 25,
    icon: '🔧'
  },
  {
    id: 'process',
    label: 'Traitement streaming',
    description: 'Traitement ligne par ligne avec filtrage',
    startProgress: 25,
    endProgress: 85,
    icon: '⚡'
  },
  {
    id: 'dedup',
    label: 'Suppression des doublons',
    description: 'Dédoublonnage et optimisation finale',
    startProgress: 85,
    endProgress: 95,
    icon: '🔍'
  },
  {
    id: 'complete',
    label: 'Finalisation',
    description: 'Génération des résultats finaux',
    startProgress: 95,
    endProgress: 100,
    icon: '🎉'
  }
];

/**
 * Détermine l'étape actuelle basée sur la progression
 */
function getCurrentStep(progress: number) {
  return PARSING_STEPS.find(step => 
    progress >= step.startProgress && progress < step.endProgress
  ) || PARSING_STEPS[PARSING_STEPS.length - 1];
}

/**
 * Détermine si une étape est terminée
 */
function isStepCompleted(step: any, progress: number) {
  return progress >= step.endProgress;
}

/**
 * Détermine si une étape est en cours
 */
function isStepActive(step: any, progress: number) {
  return progress >= step.startProgress && progress < step.endProgress;
}

export const SodParsingProgressDetailed: React.FC<SodParsingProgressDetailedProps> = ({
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

  const currentStep = getCurrentStep(progress);

  if (error) {
    return (
      <Paper 
        elevation={2} 
        sx={{ 
          p: 3, 
          mb: 3,
          border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          backgroundColor: alpha(theme.palette.error.main, 0.05),
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            ❌ Erreur lors du parsing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </Box>
      </Paper>
    );
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
      {/* En-tête avec progression globale */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Analyse du fichier Excel
        </Typography>
        <Chip 
          label={`${progress.toFixed(0)}%`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>
      
      {/* Barre de progression globale */}
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          mb: 3,
          height: 8,
          borderRadius: 4,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
          },
        }} 
      />
      
      {/* Message de l'étape actuelle */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </Box>

      {/* Étapes détaillées */}
      <Box sx={{ mt: 2 }}>
        {PARSING_STEPS.map((step, index) => {
          const isCompleted = isStepCompleted(step, progress);
          const isActive = isStepActive(step, progress);
          
          return (
            <Box 
              key={step.id}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 1.5,
                opacity: isCompleted ? 1 : (isActive ? 1 : 0.5),
                transition: 'opacity 0.3s ease',
              }}
            >
              {/* Icône de l'étape */}
              <Box sx={{ mr: 2, minWidth: 32 }}>
                {isCompleted ? (
                  <CheckCircleIcon 
                    sx={{ 
                      color: theme.palette.success.main,
                      fontSize: 20 
                    }} 
                  />
                ) : isActive ? (
                  <Typography sx={{ fontSize: 16 }}>
                    {step.icon}
                  </Typography>
                ) : (
                  <RadioButtonUncheckedIcon 
                    sx={{ 
                      color: theme.palette.text.disabled,
                      fontSize: 20 
                    }} 
                  />
                )}
              </Box>
              
              {/* Contenu de l'étape */}
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: isActive ? 600 : 400,
                    color: isCompleted ? theme.palette.success.main : 
                           isActive ? theme.palette.primary.main : 
                           theme.palette.text.secondary,
                  }}
                >
                  {step.label}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '0.75rem' }}
                >
                  {step.description}
                </Typography>
              </Box>
              
              {/* Progression de l'étape */}
              {isActive && (
                <Box sx={{ minWidth: 60, textAlign: 'right' }}>
                  <Typography variant="caption" color="primary">
                    {Math.max(0, Math.min(100, 
                      ((progress - step.startProgress) / (step.endProgress - step.startProgress)) * 100
                    )).toFixed(0)}%
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};
