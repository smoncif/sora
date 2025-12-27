/**
 * Composant pour afficher les résultats de l'analyse SOD
 * S'affiche sous les cartes après le chargement
 * Inspiré du pattern des autres analyses (user/role)
 * 
 * Supporte les 4 étapes :
 * - Step 1: Rôles Simples
 * - Step 2: Rôles Composites
 * - Step 3: Analyse Utilisateurs (avec 2 modes d'affichage)
 * - Step 4: Rapport SoD
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
import type { UserSodEntry } from 'lib/types/userSodAnalysis';

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
  /** Utilisateurs à afficher (Step 3) */
  users?: UserSodEntry[];
  /** Composants de rendu des rôles */
  renderSimpleRoles: () => React.ReactNode;
  renderCompositeRoles: () => React.ReactNode;
  /** Composant de rendu des utilisateurs (Step 3) */
  renderUsers?: () => React.ReactNode;
  /** État de chargement */
  loading?: boolean;
}

export const SodAnalysisResults: React.FC<SodAnalysisResultsProps> = ({
  session,
  currentStep,
  onStepChange,
  simpleRoles,
  compositeRoles,
  users,
  renderSimpleRoles,
  renderCompositeRoles,
  renderUsers,
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
              
              {/* Rendu des utilisateurs si disponible */}
              {renderUsers ? (
                renderUsers()
              ) : (
                <Paper 
                  sx={{ 
                    p: 4, 
                    textAlign: 'center',
                    backgroundColor: alpha(theme.palette.info.main, 0.05),
                    border: `1px dashed ${alpha(theme.palette.info.main, 0.3)}`,
                  }}
                >
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    Pour analyser les risques par utilisateur, importez un fichier Excel d'analyse utilisateur.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Le fichier doit contenir une colonne "User ID" / "ID util." 
                    et suivre le même format que l'analyse des rôles.
                </Typography>
              </Paper>
              )}
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
