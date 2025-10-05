/**
 * Stepper de navigation minimaliste pour l'analyse SoD
 * 
 * Design épuré avec typographie moderne et espaces généreux
 */

'use client';

import React, { useCallback, memo } from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  ButtonBase,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import GroupsIcon from '@mui/icons-material/Groups';
import AssessmentIcon from '@mui/icons-material/Assessment';

/**
 * Configuration des steps avec design minimaliste
 */
const STEPS_CONFIG = [
  {
    id: 1,
    label: 'Rôles Simples',
    shortLabel: 'Simples',
    icon: AccountCircleIcon,
    description: 'Analyse des rôles individuels',
  },
  {
    id: 2,
    label: 'Rôles Composites',
    shortLabel: 'Composites',
    icon: AccountTreeIcon,
    description: 'Analyse des rôles groupés',
  },
  {
    id: 3,
    label: 'Utilisateurs',
    shortLabel: 'Users',
    icon: GroupsIcon,
    description: 'Analyse des utilisateurs',
  },
  {
    id: 4,
    label: 'Rapport SoD',
    shortLabel: 'Rapport',
    icon: AssessmentIcon,
    description: 'Synthèse finale',
  },
];

export interface SodStepperNavigationProps {
  /** Step actuel (1-4) */
  currentStep: 1 | 2 | 3 | 4;
  
  /** Callback lors du changement de step */
  onStepChange?: (step: 1 | 2 | 3 | 4) => void;
  
  /** Steps complétés */
  completedSteps?: number[];
  
  /** Steps désactivés */
  disabledSteps?: number[];
}

/**
 * Stepper minimaliste pour l'analyse SoD
 * ✅ OPTIMISÉ : Utilise React.memo et useCallback pour éviter les re-renders inutiles
 */
export const SodStepperNavigation: React.FC<SodStepperNavigationProps> = memo(({
  currentStep,
  onStepChange,
  completedSteps = [],
  disabledSteps = [],
}) => {
  const theme = useTheme();
  
  // ✅ Mémoriser le callback pour éviter de recréer la fonction
  const handleStepClick = useCallback((stepId: number) => {
    if (!disabledSteps.includes(stepId) && onStepChange) {
      onStepChange(stepId as 1 | 2 | 3 | 4);
    }
  }, [disabledSteps, onStepChange]);
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        mb: 5,
        p: 1,
        backgroundColor: alpha(theme.palette.background.paper, 0.6),
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.05)}`,
      }}
    >
      {STEPS_CONFIG.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const isDisabled = disabledSteps.includes(step.id);
        const IconComponent = step.icon;
        
        return (
          <React.Fragment key={step.id}>
            {/* Step Button */}
            <ButtonBase
              onClick={() => handleStepClick(step.id)}
              disabled={isDisabled}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 3,
                py: 2,
                borderRadius: 2.5,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                backgroundColor: isActive 
                  ? alpha(theme.palette.primary.main, 0.08)
                  : 'transparent',
                border: isActive 
                  ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  : '1px solid transparent',
                '&:hover': !isDisabled ? {
                  backgroundColor: isActive 
                    ? alpha(theme.palette.primary.main, 0.12)
                    : alpha(theme.palette.action.hover, 0.04),
                  transform: 'translateY(-1px)',
                } : {},
                '&:disabled': {
                  opacity: 0.5,
                  cursor: 'not-allowed',
                },
              }}
            >
              {/* Step Icon */}
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCompleted
                    ? theme.palette.success.main
                    : isActive
                    ? theme.palette.primary.main
                    : alpha(theme.palette.action.selected, 0.08),
                  transition: 'all 0.2s ease',
                }}
              >
                {isCompleted ? (
                  <CheckIcon
                    sx={{
                      fontSize: 18,
                      color: theme.palette.common.white,
                    }}
                  />
                ) : (
                  <IconComponent
                    sx={{
                      fontSize: 16,
                      color: isActive
                        ? theme.palette.common.white
                        : isDisabled
                        ? theme.palette.action.disabled
                        : theme.palette.text.secondary,
                    }}
                  />
                )}
              </Box>
              
              {/* Step Label */}
              <Box sx={{ textAlign: 'left' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    letterSpacing: '-0.01em',
                    color: isActive
                      ? theme.palette.primary.main
                      : isCompleted
                      ? theme.palette.success.main
                      : isDisabled
                      ? theme.palette.action.disabled
                      : theme.palette.text.primary,
                    lineHeight: 1.2,
                  }}
                >
                  {step.shortLabel}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.75rem',
                    color: alpha(theme.palette.text.secondary, 0.7),
                    fontWeight: 400,
                    display: 'block',
                    mt: 0.25,
                  }}
                >
                  {step.description}
                </Typography>
              </Box>
            </ButtonBase>
            
            {/* Connector Line */}
            {index < STEPS_CONFIG.length - 1 && (
              <Box
                sx={{
                  width: 24,
                  height: 1,
                  backgroundColor: isCompleted || currentStep > step.id
                    ? theme.palette.success.main
                    : alpha(theme.palette.divider, 0.3),
                  transition: 'background-color 0.3s ease',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}, (prevProps, nextProps) => {
  // ✅ Comparaison personnalisée pour React.memo
  // Ne re-render que si ces props changent vraiment
  return (
    prevProps.currentStep === nextProps.currentStep &&
    prevProps.onStepChange === nextProps.onStepChange &&
    JSON.stringify(prevProps.completedSteps) === JSON.stringify(nextProps.completedSteps) &&
    JSON.stringify(prevProps.disabledSteps) === JSON.stringify(nextProps.disabledSteps)
  );
});

