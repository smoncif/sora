/**
 * Composant UNIFIÉ pour afficher un risque SoD
 * 
 * Remplace et unifie :
 * - SodRiskSection (rôles simples)
 * - SodCompositeRiskSection (rôles composites)
 * - UserSodRiskSection (utilisateurs)
 * 
 * Avantages :
 * - ✅ Un seul point de maintenance
 * - ✅ Cohérence visuelle garantie
 * - ✅ Futures mises à jour du thème appliquées partout
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
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { UnifiedRisk, UnifiedRiskSectionProps, UnifiedRiskContext } from 'lib/types/unifiedSodTypes';
import { SodRiskLevelBadge } from '../shared/SodRiskLevelBadge';
import { UnifiedFunctionGrid } from './UnifiedFunctionGrid';
import { 
  calculateRiskRemediation, 
  calculateCompositeRiskRemediation,
  calculateUserRiskRemediation,
} from 'lib/utils/sodRulesApplication';

/**
 * Composant unifié pour afficher un risque SoD
 * S'adapte automatiquement au contexte (ROLE, COMPOSITE, USER)
 */
export const UnifiedRiskSection: React.FC<UnifiedRiskSectionProps> = ({
  risk,
  context,
  displayMode = 'BY_ROLE',
  parentName,
  defaultExpanded = true,
  allRisks,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onExcludeRole,
  showNextStepButton = false,
  onNextStep,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { riskId, riskLevel, riskDescription, functions, totalExecutionCount } = risk;
  
  // ✅ Calculer la remédiation selon le contexte
  const remediationStatus = useMemo(() => {
    if (!parentName) {
      return { 
        isRemediated: risk.isRemediated || false, 
        remediatedFunctions: 0, 
        totalFunctions: functions.length, 
        percentage: risk.remediationPercentage || 0 
      };
    }
    
    switch (context) {
      case 'ROLE':
        // Convertir les fonctions unifiées en format attendu par calculateRiskRemediation
        const roleFunctions = functions
          .filter(f => f.actions && f.actions.length > 0) // Filtrer les fonctions avec actions
          .map(f => ({
            code: f.code,
            description: f.description,
            system: f.system || '',
            actions: f.actions || [],
          }));
        
        if (roleFunctions.length === 0) {
          return { isRemediated: false, remediatedFunctions: 0, totalFunctions: 0, percentage: 0 };
        }
        
        const roleRemediation = calculateRiskRemediation(parentName, roleFunctions);
        return {
          isRemediated: roleRemediation.isRemediated,
          remediatedFunctions: roleRemediation.remediatedFunctions,
          totalFunctions: roleRemediation.totalFunctions,
          percentage: roleRemediation.totalFunctions > 0 
            ? Math.round((roleRemediation.remediatedFunctions / roleRemediation.totalFunctions) * 100) 
            : 0,
        };
        
      case 'COMPOSITE':
        // Convertir les fonctions unifiées en format attendu par calculateCompositeRiskRemediation
        const compositeFunctions = functions
          .filter(f => f.simpleRoles && f.simpleRoles.length > 0) // Filtrer les fonctions avec rôles simples
          .map(f => ({
            code: f.code,
            description: f.description,
            system: f.system || '',
            simpleRoles: f.simpleRoles || [],
          }));
        
        if (compositeFunctions.length === 0) {
          return { isRemediated: false, remediatedFunctions: 0, totalFunctions: 0, percentage: 0 };
        }
        
        const compositeRemediation = calculateCompositeRiskRemediation(parentName, compositeFunctions);
        return {
          isRemediated: compositeRemediation.isRemediated,
          remediatedFunctions: compositeRemediation.remediatedFunctions,
          totalFunctions: compositeRemediation.totalFunctions,
          percentage: compositeRemediation.totalFunctions > 0 
            ? Math.round((compositeRemediation.remediatedFunctions / compositeRemediation.totalFunctions) * 100) 
            : 0,
        };
        
      case 'USER':
        // Pour utilisateurs, utiliser le statut déjà calculé
        return {
          isRemediated: risk.isRemediated || false,
          remediatedFunctions: 0,
          totalFunctions: functions.length,
          percentage: risk.remediationPercentage || 0,
        };
        
      default:
        return { isRemediated: false, remediatedFunctions: 0, totalFunctions: 0, percentage: 0 };
    }
  }, [context, parentName, riskId, functions, risk.isRemediated, risk.remediationPercentage]);
  
  // Couleur de bordure selon le niveau de risque
  const getBorderColor = () => {
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
  };
  
  // Couleur de fond selon le niveau de risque
  const getBackgroundColor = () => {
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
  };
  
  return (
    <Paper
      data-risk-code={riskId}
      data-context={context}
      data-parent={parentName}
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${getBorderColor()}`,
        backgroundColor: 'transparent',
        mb: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          border: `1px solid ${alpha(getBorderColor(), 1.5)}`,
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
          backgroundColor: getBackgroundColor(),
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
        
        {/* ID et description du risque */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: context === 'COMPOSITE' ? 700 : 500,
              fontFamily: context === 'COMPOSITE' ? 'monospace' : 'inherit',
              letterSpacing: context === 'COMPOSITE' ? '0.02em' : '-0.01em',
              color: context === 'COMPOSITE' ? theme.palette.error.dark : theme.palette.error.main,
              fontSize: context === 'COMPOSITE' ? '1.1rem' : '0.9375rem',
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
        
        {/* Compteur d'exécutions (uniquement pour utilisateurs) */}
        {context === 'USER' && totalExecutionCount !== undefined && (
          <Chip
            icon={<PlayArrowIcon />}
            label={`${totalExecutionCount.toLocaleString()} exéc.`}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.dark,
              fontWeight: 500,
              fontSize: '0.75rem',
              '& .MuiChip-icon': {
                color: theme.palette.info.main,
              },
            }}
          />
        )}
        
        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Badge de niveau */}
          <SodRiskLevelBadge level={riskLevel} size="medium" variant="filled" />
          
          {/* Badge de remédiation */}
          {remediationStatus.isRemediated && (
            <Chip
              icon={<CheckCircleIcon />}
              label="Remedié"
              size="medium"
              sx={{
                backgroundColor: alpha(theme.palette.success.main, 0.15),
                color: theme.palette.success.dark,
                fontWeight: 600,
                fontSize: '0.875rem',
                '& .MuiChip-icon': {
                  color: theme.palette.success.main,
                },
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
        </Box>
      </Box>
      
      {/* Contenu du risque (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 3 }}>
          {functions.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              Aucune fonction
            </Typography>
          ) : (
            <UnifiedFunctionGrid
              functions={functions}
              context={context}
              displayMode={displayMode}
              defaultExpanded={true}
              parentName={parentName}
              riskId={riskId}
              allRisks={allRisks}
              onDeleteAction={onDeleteAction}
              onRestrictAction={onRestrictAction}
              onRestrictResource={onRestrictResource}
              onExcludeRole={onExcludeRole}
            />
          )}
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
          {risk.totalActionCount !== undefined && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {risk.totalActionCount} action{risk.totalActionCount > 1 ? 's' : ''}
            </Typography>
          )}
          {context === 'COMPOSITE' && risk.totalRoleCount !== undefined && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {risk.totalRoleCount} rôle{risk.totalRoleCount > 1 ? 's' : ''} simple{risk.totalRoleCount > 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
};

