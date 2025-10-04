/**
 * Composant carte pour afficher un rôle composite avec tous ses risques
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  alpha,
  useTheme,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { SodCompositeRole } from 'lib/types/sodAnalysis';
import { SodRiskLevelBadge } from '../shared/SodRiskLevelBadge';
import { SodCompositeRiskSection } from './SodCompositeRiskSection';

export interface SodCompositeRoleCardProps {
  /** Rôle composite */
  role: SodCompositeRole;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Callback pour supprimer un risque */
  onDeleteRisk?: (roleId: string, riskId: string) => void;
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
  
  /** Callback pour passer à l'étape suivante */
  onNextStep?: () => void;
  
  /** Afficher le bouton "Nouvelle Étape" sur les risques */
  showNextStepButton?: boolean;
}

/**
 * Carte pour afficher un rôle composite avec ses risques
 */
export const SodCompositeRoleCard: React.FC<SodCompositeRoleCardProps> = ({
  role,
  defaultExpanded = true,
  onDeleteRisk,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onNextStep,
  showNextStepButton = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { 
    roleName, 
    roleDescription, 
    compositeRoleName,
    compositeRoleDescription,
    risks, 
    highestRiskLevel,
    involvedSimpleRoleCount 
  } = role;
  
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        mb: 4,
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.12)}`,
        },
      }}
    >
      {/* En-tête du rôle composite */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          p: 3,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icône expandable */}
        <IconButton
          size="small"
          sx={{
            p: 0.5,
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="large" />
          ) : (
            <ExpandMoreIcon fontSize="large" />
          )}
        </IconButton>
        
        {/* Icône de rôle composite */}
        <AccountTreeIcon
          sx={{
            fontSize: 32,
            color: theme.palette.primary.main,
          }}
        />
        
        {/* Nom du rôle composite */}
        <Box sx={{ flex: 1 }}>
          {/* Nom du rôle composite */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: theme.palette.text.primary,
              fontSize: '1.125rem',
            }}
          >
            {compositeRoleName}
          </Typography>
          
          {compositeRoleDescription && (
            <Typography
              variant="body2"
              sx={{
                color: alpha(theme.palette.text.secondary, 0.7),
                mt: 0.75,
                fontSize: '0.875rem',
                fontWeight: 400,
                lineHeight: 1.6,
              }}
            >
              {compositeRoleDescription}
            </Typography>
          )}
        </Box>
        
        {/* Supprimé : Badge du niveau de risque (affiché uniquement au niveau du risque) */}
      </Box>
      
      {/* Section bleue supprimée - doublon avec l'en-tête orange */}
      
      {/* Risques (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 2 }}>
          {risks.length === 0 ? (
            <Box
              sx={{
                p: 4,
                textAlign: 'center',
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
              }}
            >
              <Typography variant="body2">Aucun risque détecté</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {risks.map((risk, index: number) => (
                  <SodCompositeRiskSection
                    key={index}
                    risk={risk}
                    defaultExpanded={true} // Tous les risques dépliés par défaut
                    compositeRoleName={roleName}
                    onDeleteAction={onDeleteAction}
                    onRestrictAction={onRestrictAction}
                    onRestrictResource={onRestrictResource}
                    onNextStep={onNextStep}
                    showNextStepButton={showNextStepButton}
                  />
              ))}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

