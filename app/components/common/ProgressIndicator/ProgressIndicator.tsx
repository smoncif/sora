'use client';

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  Tooltip
} from '@mui/material';
import {
  FileUpload as FileUploadIcon,
  CloudUpload as CloudUploadIcon,
  DataArray as DataArrayIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

export enum ImportStep {
  UPLOAD = 0,
  PARSE = 1,
  VALIDATE = 2,
  TRANSFORM = 3,
  STORE = 4,
  COMPLETE = 5
}

interface ProgressIndicatorProps {
  activeStep: ImportStep;
  progress?: number; // 0-100 pour le step actif
  error?: string;
  totalFiles?: number;
  processedFiles?: number;
  className?: string;
  isComplete?: boolean;
}

/**
 * Composant pour indiquer la progression de l'importation
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  activeStep,
  progress = 0,
  error,
  totalFiles = 1,
  processedFiles = 0,
  className,
  isComplete = false
}) => {
  // Étapes du processus d'importation
  const steps = [
    {
      label: 'Téléchargement',
      description: 'Téléchargement du fichier sur le serveur',
      icon: <FileUploadIcon />
    },
    {
      label: 'Analyse',
      description: 'Extraction des données du fichier Excel',
      icon: <DataArrayIcon />
    },
    {
      label: 'Validation',
      description: 'Vérification de la structure et du contenu des données',
      icon: <DataArrayIcon />
    },
    {
      label: 'Transformation',
      description: 'Préparation des données pour l\'importation',
      icon: <DataArrayIcon />
    },
    {
      label: 'Stockage',
      description: 'Enregistrement des données dans la base de données',
      icon: <CloudUploadIcon />
    },
    {
      label: 'Terminé',
      description: 'Le processus d\'importation est terminé',
      icon: <CheckCircleIcon />
    }
  ];

  // Statut actuel de l'importation
  const getStepStatus = (stepIndex: number) => {
    if (error && stepIndex === activeStep) {
      return 'error';
    }
    if (isComplete || stepIndex < activeStep) {
      return 'completed';
    }
    if (stepIndex === activeStep) {
      return 'active';
    }
    return 'pending';
  };

  // Progression globale estimée (en pourcentage)
  const calculateGlobalProgress = () => {
    const completedStepsValue = activeStep * 100 / steps.length;
    const currentStepValue = (progress / 100) * (100 / steps.length);
    return Math.min(Math.round(completedStepsValue + currentStepValue), 100);
  };

  // Texte descriptif de l'état actuel
  const getStatusText = () => {
    if (error) {
      return `Erreur: ${error}`;
    }
    
    if (isComplete) {
      return 'Importation terminée avec succès';
    }
    
    const step = steps[activeStep];
    
    if (totalFiles > 1) {
      return `${step.description} (${processedFiles}/${totalFiles} fichiers)`;
    }
    
    return step.description;
  };

  return (
    <Paper className={className} elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Progression de l'importation
      </Typography>
      
      {/* Indicateur de progression global */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">
            Progression globale
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {calculateGlobalProgress()}%
          </Typography>
        </Box>
        
        <Box sx={{ width: '100%', position: 'relative' }}>
          <LinearProgress 
            variant="determinate" 
            value={calculateGlobalProgress()} 
            color={error ? 'error' : 'primary'} 
            sx={{ height: 8, borderRadius: 1 }}
          />
          
          {isComplete && (
            <Chip 
              label="Terminé" 
              color="success" 
              size="small"
              sx={{ 
                position: 'absolute', 
                top: -10, 
                right: -10
              }}
            />
          )}
          
          {error && (
            <Tooltip title={error}>
              <ErrorIcon 
                color="error" 
                sx={{ 
                  position: 'absolute', 
                  top: -10, 
                  right: -10,
                  fontSize: 20
                }}
              />
            </Tooltip>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {getStatusText()}
        </Typography>
      </Box>
      
      {/* Stepper pour montrer les étapes */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label} completed={isComplete || index < activeStep}>
            <StepLabel 
              error={Boolean(error && index === activeStep)}
              icon={step.icon}
            >
              {step.label}
            </StepLabel>
            
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                {step.description}
              </Typography>
              
              {index === activeStep && !isComplete && !error && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <LinearProgress 
                    variant={progress > 0 ? "determinate" : "indeterminate"} 
                    value={progress}
                  />
                  {progress > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {Math.round(progress)}%
                    </Typography>
                  )}
                </Box>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};

export default ProgressIndicator; 
