/**
 * Composant pour afficher un risque SoD avec son badge et ses fonctions
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  alpha,
  useTheme,
  Paper,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
// import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'; // Supprimé
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { SodSimpleRoleRiskItem } from 'lib/types/sodAnalysis';
import { SodRiskLevelBadge } from '../shared/SodRiskLevelBadge';
import { SodFunctionGrid } from './SodFunctionGrid';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';

export interface SodRiskSectionProps {
  /** Risque */
  risk: SodSimpleRoleRiskItem;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle parent */
  roleName?: string;
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
  
  /** Callback pour passer à l'étape suivante */
  onNextStep?: () => void;
  
  /** Afficher le bouton "Nouvelle Étape" */
  showNextStepButton?: boolean;
}

/**
 * Affiche un risque SoD avec badge, fonctions et actions
 */
export const SodRiskSection: React.FC<SodRiskSectionProps> = ({
  risk,
  defaultExpanded = true,
  roleName,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onNextStep,
  showNextStepButton = false,
}) => {
  const theme = useTheme();
  const actionsContext = useSodActionsContext();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { riskId, riskLevel, riskDescription, functions } = risk;
  
  // ✅ Calculer le statut de remédiation du risque
  const remediationStatus = useMemo(
    () => actionsContext.calculateRiskRemediation(roleName || '', functions),
    [roleName, functions, actionsContext.version, actionsContext.calculateRiskRemediation]
  );
  
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        // ✅ Bordure verte si le risque est remedié, sinon couleur selon le niveau
        border: `1px solid ${
          remediationStatus.isRemediated 
            ? alpha(theme.palette.success.main, 0.3)
            : (() => {
                switch (riskLevel) {
                  case 'CRITICAL':
                    return alpha(theme.palette.error.dark, 0.2);
                  case 'HIGH':
                    return alpha(theme.palette.error.main, 0.15);
                  case 'MEDIUM':
                    return alpha(theme.palette.warning.main, 0.15);
                  case 'LOW':
                    return alpha(theme.palette.success.main, 0.15);
                  default:
                    return alpha(theme.palette.error.main, 0.15);
                }
              })()
        }`,
        // ✅ Fond vert léger si le risque est remedié
        backgroundColor: remediationStatus.isRemediated 
          ? alpha(theme.palette.success.main, 0.05)
          : 'transparent',
        mb: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          border: `1px solid ${
            remediationStatus.isRemediated
              ? alpha(theme.palette.success.main, 0.4)
              : (() => {
                  switch (riskLevel) {
                    case 'CRITICAL':
                      return alpha(theme.palette.error.dark, 0.3);
                    case 'HIGH':
                      return alpha(theme.palette.error.main, 0.25);
                    case 'MEDIUM':
                      return alpha(theme.palette.warning.main, 0.25);
                    case 'LOW':
                      return alpha(theme.palette.success.main, 0.25);
                    default:
                      return alpha(theme.palette.error.main, 0.25);
                  }
                })()
          }`,
        },
      }}
    >
      {/* En-tête du risque */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          p: 2.5,
          // ✅ Fond vert plus prononcé si remedié
          backgroundColor: remediationStatus.isRemediated
            ? alpha(theme.palette.success.main, 0.12)
            : (() => {
                switch (riskLevel) {
                  case 'CRITICAL':
                    return alpha(theme.palette.error.dark, 0.12);
                  case 'HIGH':
                    return alpha(theme.palette.error.main, 0.08);
                  case 'MEDIUM':
                    return alpha(theme.palette.warning.main, 0.08);
                  case 'LOW':
                    return alpha(theme.palette.success.main, 0.08);
                  default:
                    return alpha(theme.palette.error.main, 0.08);
                }
              })(),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
        }}
      >
        {/* Icône expandable */}
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{
            p: 0.5,
            backgroundColor: theme.palette.background.paper,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            },
          }}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="medium" />
          ) : (
            <ExpandMoreIcon fontSize="medium" />
          )}
        </IconButton>
        
        {/* Icône de warning */}
        <WarningAmberIcon
          sx={{
            fontSize: 28,
            color: theme.palette.error.main,
          }}
        />
        
        {/* ID du risque */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: theme.palette.error.main,
              fontSize: '0.9375rem',
            }}
          >
            {riskId}
          </Typography>
          
          {riskDescription && (
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                mt: 0.5,
                fontSize: '0.875rem',
              }}
            >
              {riskDescription}
            </Typography>
          )}
        </Box>
        
        {/* ✅ Badge "Remedié" si le risque est remedié */}
        {remediationStatus.isRemediated && (
          <Chip
            label="Remedié"
            size="small"
            icon={<CheckCircleIcon />}
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.2),
              color: theme.palette.success.dark,
              fontWeight: 600,
            }}
          />
        )}
        
        {/* Badge de niveau (à l'extrême droite) */}
        <SodRiskLevelBadge level={riskLevel} size="medium" variant="filled" />
        
        {/* Boutons d'action */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {showNextStepButton && onNextStep && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={onNextStep}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
              }}
            >
              Nouvelle Étape
            </Button>
          )}
          
          {/* Bouton Supprimer SUPPRIMÉ */}
          {/* {onDelete && (
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => onDelete(riskId)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
              }}
            >
              Supprimer
            </Button>
          )} */}
        </Box>
      </Box>
      
      {/* Contenu du risque (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 3 }}>
          
          {/* Grille des fonctions (2 colonnes face à face) */}
          <SodFunctionGrid
            functions={functions}
            defaultExpanded={true}
            roleName={roleName}
            riskId={riskId}
            risk={risk}
            onDeleteAction={onDeleteAction}
            onRestrictAction={onRestrictAction}
            onRestrictResource={onRestrictResource}
          />
        </Box>
      </Collapse>
      
      {/* Footer avec statistiques (quand collapsed) */}
      {!expanded && (
        <Box
          sx={{
            p: 1.5,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {functions.length} fonction{functions.length > 1 ? 's' : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {risk.totalActionCount} action{risk.totalActionCount > 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

