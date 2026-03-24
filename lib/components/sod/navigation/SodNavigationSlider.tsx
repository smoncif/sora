/**
 * Slider de navigation pour l'analyse SoD
 * Panneau latéral avec tableau de remédiation et basculement de mode
 */

'use client';

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slide,
  Divider,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close as CloseIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';
import { SodSession } from 'lib/types/sodAnalysis';
import { NavigationMode } from 'lib/hooks/sod/useSodNavigation';
import { SodRemediationTable } from './SodRemediationTable';

export interface SodNavigationSliderProps {
  /** Si le slider est ouvert */
  isOpen: boolean;
  /** Session SoD actuelle */
  session: SodSession;
  /** Mode d'affichage actuel */
  mode: NavigationMode;
  /** Callback pour fermer le slider */
  onClose: () => void;
  /** Callback pour changer le mode */
  onModeChange: (mode: NavigationMode) => void;
  /** Callback pour naviguer vers un risque */
  onNavigateToRisk: (roleName: string, riskCode: string, targetStep: number) => void;
}

export const SodNavigationSlider: React.FC<SodNavigationSliderProps> = ({
  isOpen,
  session,
  mode,
  onClose,
  onModeChange,
  onNavigateToRisk,
}) => {
  const theme = useTheme();

  // Calculer les statistiques de criticité
  const stats = React.useMemo(() => {
    let totalRisks = 0;
    let criticalRisks = 0;
    let highRisks = 0;
    let mediumRisks = 0;
    let lowRisks = 0;

    if (mode === 'users') {
      // Mode utilisateurs : utiliser risksByRole
      const users = session.users || [];
      users.forEach((user: any) => {
        user.risksByRole?.forEach((risk: any) => {
          totalRisks++;
          
          switch (risk.riskLevel) {
            case 'CRITICAL':
              criticalRisks++;
              break;
            case 'HIGH':
              highRisks++;
              break;
            case 'MEDIUM':
              mediumRisks++;
              break;
            case 'LOW':
              lowRisks++;
              break;
            default:
              highRisks++;
          }
        });
      });
    } else {
      // Mode simple ou composite
      const roles = mode === 'simple' 
        ? session.simpleRoles?.roles || []
        : session.compositeRoles?.roles || [];

      roles.forEach(role => {
        role.risks?.forEach(risk => {
          totalRisks++;
          
          // Compter selon le niveau de criticité
          switch (risk.riskLevel) {
            case 'CRITICAL':
              criticalRisks++;
              break;
            case 'HIGH':
              highRisks++;
              break;
            case 'MEDIUM':
              mediumRisks++;
              break;
            case 'LOW':
              lowRisks++;
              break;
            default:
              highRisks++; // Par défaut, considérer comme élevé
          }
        });
      });
    }

    return {
      total: totalRisks,
      critical: criticalRisks,
      high: highRisks,
      medium: mediumRisks,
      low: lowRisks,
    };
  }, [session, mode]);

  return (
    <Slide direction="left" in={isOpen} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px', // Largeur fixe pour couvrir la partie vide
          zIndex: 1300,
          overflow: 'hidden',
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 3,
            borderRadius: '16px 0 0 16px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: 'none',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NavigationIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Navigation des Risques SoD
              </Typography>
            </Box>
            
            <IconButton 
              onClick={onClose}
              size="small"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Toggle de basculement - 3 étapes */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button
                variant={mode === 'simple' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => onModeChange('simple')}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                Simples
              </Button>
              <Button
                variant={mode === 'composite' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => onModeChange('composite')}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                Composites
              </Button>
              <Button
                variant={mode === 'users' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => onModeChange('users')}
                sx={{ minWidth: 'auto', px: 2 }}
              >
                Utilisateurs
              </Button>
            </Box>
          </Box>

          {/* Tableau de remédiation */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: 1,
            mb: 2,
          }}>
            <SodRemediationTable
              session={session}
              mode={mode}
              onNavigateToRisk={onNavigateToRisk}
            />
          </Box>

          {/* Footer avec statistiques */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            pt: 1,
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}>
            <Typography variant="caption" color="text.secondary">
              Total: {stats.total} risques • {stats.critical} critiques • {stats.high} élevés • {stats.medium} moyens • {stats.low} faibles
            </Typography>
            
            <Typography variant="caption" color="text.secondary">
              {mode === 'simple' ? 'Étape 1' : mode === 'composite' ? 'Étape 2' : 'Étape 3'}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Slide>
  );
};
