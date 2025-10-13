/**
 * Composant pour afficher un risque SoD de rôle composite
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
import { SodCompositeRoleRiskItem } from 'lib/types/sodAnalysis';
import { SodRiskLevelBadge } from '../shared/SodRiskLevelBadge';
import { SodCompositeFunctionGrid } from './SodCompositeFunctionGrid';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';
import { useRemediationCache } from 'lib/utils/sodRemediationCache';

export interface SodCompositeRiskSectionProps {
  /** Risque */
  risk: SodCompositeRoleRiskItem;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle composite parent */
  compositeRoleName?: string;
  
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
 * Affiche un risque SoD composite avec badge, fonctions et rôles simples
 */
export const SodCompositeRiskSection: React.FC<SodCompositeRiskSectionProps> = ({
  risk,
  defaultExpanded = true,
  compositeRoleName,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onNextStep,
  showNextStepButton = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const actionsContext = useSodActionsContext();
  const remediationCache = useRemediationCache();
  
  const { riskId, riskLevel, riskDescription, functions } = risk;
  
  // ✅ OPTIMISATION : Calculer le statut de remédiation avec cache
  const remediationStatus = useMemo(() => {
    if (!compositeRoleName) return { isRemediated: false, remediatedFunctions: 0, totalFunctions: 0 };
    
    // Essayer d'obtenir depuis le cache
    const cached = remediationCache.get(compositeRoleName, riskId, 'composite', actionsContext.version);
    if (cached) {
      return cached;
    }
    
    // Calculer si pas en cache
    const result = actionsContext.calculateCompositeRiskRemediation(compositeRoleName, functions);
    remediationCache.set(compositeRoleName, riskId, 'composite', result, actionsContext.version);
    return result;
  }, [compositeRoleName, riskId, functions, actionsContext.version]); // ✅ OPTIMISATION : Dépendances stables
  
  return (
    <Paper
      data-risk-code={riskId}
      data-role-risk={`${compositeRoleName}-${riskId}`}
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        // ✅ Bordure verte si remedié, sinon bordure selon niveau de risque
        border: `1px solid ${remediationStatus.isRemediated 
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
          })()}`,
        // ✅ Fond vert clair si remedié
        backgroundColor: remediationStatus.isRemediated 
          ? alpha(theme.palette.success.main, 0.05)
          : 'transparent',
        mb: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          border: `1px solid ${remediationStatus.isRemediated
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
            })()}`,
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
          backgroundColor: (() => {
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
              fontWeight: 700,
              fontFamily: 'monospace',
              color: theme.palette.error.dark,
              fontSize: '1.1rem',
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
        
        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Badge de niveau */}
          <SodRiskLevelBadge level={riskLevel} size="medium" variant="filled" />
          
          {/* ✅ Badge de remédiation */}
          {remediationStatus.isRemediated && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Remedié"
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.success.main, 0.15),
                color: theme.palette.success.dark,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: theme.palette.success.main,
                },
              }}
            />
          )}
          
          {/* Badge pourcentage si partiellement remedié */}
          {!remediationStatus.isRemediated && remediationStatus.remediatedFunctions > 0 && (
            <Chip
              label={`${remediationStatus.remediationPercentage}% Remedié`}
              size="small"
              sx={{
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                color: theme.palette.warning.dark,
                fontWeight: 600,
              }}
            />
          )}
        </Box>
        
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
        <Box sx={{ p: 2 }}>
          
          {/* Grille des fonctions composites (2 colonnes face à face) */}
          <SodCompositeFunctionGrid
            functions={functions}
            defaultExpanded={true}
            compositeRoleName={compositeRoleName}
            riskId={riskId}
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
            {risk.totalSimpleRoleCount} rôle{risk.totalSimpleRoleCount > 1 ? 's' : ''} simple{risk.totalSimpleRoleCount > 1 ? 's' : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {risk.totalActionCount} action{risk.totalActionCount > 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

