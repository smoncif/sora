/**
 * Composant carte pour afficher un rôle composite avec tous ses risques
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
  Divider,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SodCompositeRole } from 'lib/types/sodAnalysis';
import { SodRiskLevelBadge } from '../shared/SodRiskLevelBadge';
import { SodCompositeRiskSection } from './SodCompositeRiskSection';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';

export interface SodCompositeRoleCardProps {
  /** Rôle composite */
  role: SodCompositeRole;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Callback pour supprimer un risque */
  onDeleteRisk?: (roleId: string, riskId: string) => void;
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
  
  /** Callback pour exclure un rôle simple dans un rôle composite */
  onExcludeRole?: (compositeRoleName: string, simpleRoleName: string) => void;
  
  /** Callback pour passer à l'étape suivante */
  onNextStep?: () => void;
  
  /** Afficher le bouton "Nouvelle Étape" sur les risques */
  showNextStepButton?: boolean;
}

/**
 * Carte pour afficher un rôle composite avec ses risques
 * 🚀 OPTIMISÉ : Mémoïsé pour éviter les re-rendus inutiles
 */
export const SodCompositeRoleCard: React.FC<SodCompositeRoleCardProps> = React.memo(({
  role,
  defaultExpanded = true,
  onDeleteRisk,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onExcludeRole,
  onNextStep,
  showNextStepButton = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const actionsContext = useSodActionsContext();
  
  const { 
    roleName, 
    roleDescription, 
    compositeRoleName,
    compositeRoleDescription,
    risks, 
    highestRiskLevel,
    involvedSimpleRoleCount 
  } = role;
  
  // ✅ OPTIMISATION : Calculer le statut de remédiation avec useMemo
  const remediationStatus = useMemo(
    () => actionsContext.calculateCompositeRoleRemediation(
      compositeRoleName,
      risks
    ),
    [compositeRoleName, risks, actionsContext.calculateCompositeRoleRemediation]
  );
  
  return (
    <Paper
      data-role-name={compositeRoleName}
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        mb: 4,
        backgroundColor: theme.palette.background.paper,
        // ✅ Bordure verte épaisse si 100% remedié
        border: remediationStatus.isRemediated
          ? `2px solid ${alpha(theme.palette.success.main, 0.4)}`
          : `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        boxShadow: `0 1px 3px ${alpha(theme.palette.common.black, 0.08)}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          border: remediationStatus.isRemediated
            ? `2px solid ${alpha(theme.palette.success.main, 0.6)}`
            : `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
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
          // ✅ Gradient progressif vert (remedié) → bleu (non remedié)
          background: remediationStatus.remediationPercentage > 0
            ? `linear-gradient(to right, 
                ${alpha(theme.palette.success.main, 0.12)} 0%, 
                ${alpha(theme.palette.success.main, 0.12)} ${remediationStatus.remediationPercentage}%, 
                ${alpha(theme.palette.primary.main, 0.04)} ${remediationStatus.remediationPercentage}%, 
                ${alpha(theme.palette.primary.main, 0.04)} 100%)`
            : alpha(theme.palette.primary.main, 0.04),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          cursor: 'pointer',
          transition: 'background 0.3s ease',
          '&:hover': {
            background: remediationStatus.remediationPercentage > 0
              ? `linear-gradient(to right, 
                  ${alpha(theme.palette.success.main, 0.18)} 0%, 
                  ${alpha(theme.palette.success.main, 0.18)} ${remediationStatus.remediationPercentage}%, 
                  ${alpha(theme.palette.primary.main, 0.08)} ${remediationStatus.remediationPercentage}%, 
                  ${alpha(theme.palette.primary.main, 0.08)} 100%)`
              : alpha(theme.palette.primary.main, 0.08),
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
        
        {/* ✅ Badge de remédiation */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {remediationStatus.isRemediated ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="100% Remedié"
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
          ) : remediationStatus.remediationPercentage > 0 ? (
            <Chip
              label={`${remediationStatus.remediationPercentage}% Remedié`}
              size="medium"
              sx={{
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                color: theme.palette.warning.dark,
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            />
          ) : (
            <Chip
              label="0% Remedié"
              size="medium"
              sx={{
                backgroundColor: alpha(theme.palette.grey[400], 0.15),
                color: theme.palette.text.secondary,
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            />
          )}
          
          {/* Info complémentaire */}
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 500,
            }}
          >
            {remediationStatus.remediatedRisks}/{remediationStatus.totalRisks} risques
          </Typography>
        </Box>
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
                    onExcludeRole={onExcludeRole}
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
}, (prevProps, nextProps) => {
  // 🚀 Comparaison personnalisée : ne re-rendre que si le rôle ou les callbacks changent vraiment
  return (
    prevProps.role.roleName === nextProps.role.roleName &&
    prevProps.role.compositeRoleName === nextProps.role.compositeRoleName &&
    prevProps.role.risks === nextProps.role.risks &&
    prevProps.defaultExpanded === nextProps.defaultExpanded &&
    prevProps.onDeleteAction === nextProps.onDeleteAction &&
    prevProps.onRestrictAction === nextProps.onRestrictAction &&
    prevProps.onRestrictResource === nextProps.onRestrictResource
  );
});

SodCompositeRoleCard.displayName = 'SodCompositeRoleCard';

