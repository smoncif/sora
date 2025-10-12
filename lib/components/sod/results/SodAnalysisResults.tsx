/**
 * Composant pour afficher les résultats de l'analyse SOD
 * S'affiche sous les cartes après le chargement
 * Inspiré du pattern des autres analyses (user/role)
 */

'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  useTheme,
  Fade,
} from '@mui/material';
import { SodStepperNavigation } from '../navigation/SodStepperNavigation';
import type { SodSimpleRole, SodCompositeRole } from 'lib/types/sodAnalysis';

export interface SodAnalysisResultsProps {
  /** Session SOD chargée */
  session: any;
  /** Étape courante */
  currentStep: number;
  /** Callback pour changer d'étape */
  onStepChange: (step: number) => void;
  /** Rôles simples à afficher */
  simpleRoles: SodSimpleRole[];
  /** Rôles composites à afficher */
  compositeRoles: SodCompositeRole[];
  /** Composants de rendu des rôles */
  renderSimpleRoles: () => React.ReactNode;
  renderCompositeRoles: () => React.ReactNode;
  /** État de chargement */
  loading?: boolean;
}

export const SodAnalysisResults: React.FC<SodAnalysisResultsProps> = ({
  session,
  currentStep,
  onStepChange,
  simpleRoles,
  compositeRoles,
  renderSimpleRoles,
  renderCompositeRoles,
  loading = false,
}) => {
  const theme = useTheme();

  if (!session) {
    return null;
  }

  return (
    <Fade in timeout={800}>
      <Box>
        {/* Navigation par étapes */}
        <Box sx={{ mb: 4 }}>
          <SodStepperNavigation 
            currentStep={currentStep as 1 | 2 | 3 | 4} 
            onStepChange={onStepChange} 
          />
        </Box>


        {/* Contenu des étapes */}
        <Box>
          {/* Étape 1 : Rôles Simples */}
          {currentStep === 1 && session.simpleRoles && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Étape 1: Rôles Simples
              </Typography>
              {renderSimpleRoles()}
            </Box>
          )}

          {/* Étape 2 : Rôles Composites */}
          {currentStep === 2 && session.compositeRoles && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Étape 2: Rôles Composites
              </Typography>
              {renderCompositeRoles()}
            </Box>
          )}

          {/* Étape 3 : Analyse par Utilisateur */}
          {currentStep === 3 && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Étape 3: Analyse par Utilisateur
              </Typography>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Cette fonctionnalité sera disponible prochainement.
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Étape 4 : Rapport SoD */}
          {currentStep === 4 && (
            <Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Étape 4: Rapport SoD
              </Typography>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Cette fonctionnalité sera disponible prochainement.
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>
      </Box>
    </Fade>
  );
};
