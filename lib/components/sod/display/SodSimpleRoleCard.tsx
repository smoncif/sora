/**
 * Composant carte pour afficher un rôle simple avec tous ses risques
 */

'use client';

import React, { useState, useRef, useMemo } from 'react';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { SodSimpleRole } from 'lib/types/sodAnalysis';
import { SodRiskLevelBadge } from '../shared/SodRiskLevelBadge';
import { SodRiskSection } from './SodRiskSection';
import { calculateRiskRemediation } from 'lib/utils/sodRulesApplication';

export interface SodSimpleRoleCardProps {
  /** Rôle simple */
  role: SodSimpleRole;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Callback pour supprimer un risque */
  onDeleteRisk?: (roleId: string, riskId: string) => void;
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
  
  /** Callback pour passer à l'étape suivante */
  onNextStep?: () => void;
  
  /** Afficher le bouton "Nouvelle Étape" sur les risques */
  showNextStepButton?: boolean;
}

/**
 * Carte pour afficher un rôle simple avec ses risques
 * 🚀 OPTIMISÉ : Mémoïsé pour éviter les re-rendus inutiles
 */
export const SodSimpleRoleCard: React.FC<SodSimpleRoleCardProps> = React.memo(({
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
  
  const { roleName, roleDescription, risks, highestRiskLevel } = role;
  
  // ✅ NOUVELLE LOGIQUE : Calculer le statut de remédiation avec les nouvelles fonctions
  const remediationStatus = useMemo(() => {
    let totalRisks = risks.length;
    let remediatedRisks = 0;
    
    risks.forEach(risk => {
      const remediation = calculateRiskRemediation(roleName, risk.functions);
      if (remediation.isRemediated) {
        remediatedRisks++;
      }
    });
    
    return {
      totalRisks,
      remediatedRisks,
      percentage: totalRisks > 0 ? Math.round((remediatedRisks / totalRisks) * 100) : 0,
      isRemediated: remediatedRisks === totalRisks && totalRisks > 0
    };
  }, [risks, roleName]);
  
  
  return (
    <Paper
      data-role-name={roleName}
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        mb: 4,
        backgroundColor: theme.palette.background.paper,
        // ✅ Bordure verte épaisse si 100% remedié (harmonisé avec composite)
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
      {/* En-tête du rôle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          p: 3,
          // ✅ GRADIENT PROGRESSIF harmonisé avec le style composite
          background: remediationStatus.percentage > 0
            ? `linear-gradient(to right, 
                ${alpha(theme.palette.success.main, 0.12)} 0%, 
                ${alpha(theme.palette.success.main, 0.12)} ${remediationStatus.percentage}%, 
                ${alpha(theme.palette.primary.main, 0.04)} ${remediationStatus.percentage}%, 
                ${alpha(theme.palette.primary.main, 0.04)} 100%
              )`
            : alpha(theme.palette.primary.main, 0.04),
          // ✅ Bordure gauche épaisse verte si 100%
          borderLeft: remediationStatus.isRemediated
            ? `6px solid ${theme.palette.success.main}`
            : 'none',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: remediationStatus.percentage > 0
              ? `linear-gradient(to right, 
                  ${alpha(theme.palette.success.main, 0.18)} 0%, 
                  ${alpha(theme.palette.success.main, 0.18)} ${remediationStatus.percentage}%, 
                  ${alpha(theme.palette.primary.main, 0.08)} ${remediationStatus.percentage}%, 
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
            backgroundColor: theme.palette.background.paper,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
            },
          }}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="large" />
          ) : (
            <ExpandMoreIcon fontSize="large" />
          )}
        </IconButton>
        
        
        {/* Nom du rôle */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
          sx={{
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: theme.palette.text.primary,
            fontSize: '1.125rem',
          }}
          >
            {roleName}
          </Typography>
          
          {roleDescription && (
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
              {roleDescription}
            </Typography>
          )}
        </Box>
        
        {/* ✅ Badge de remédiation harmonisé avec le style composite */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {remediationStatus.isRemediated ? (
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
          ) : remediationStatus.percentage > 0 ? (
            <Chip
              label={`${remediationStatus.percentage}% Remedié`}
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
        
        {/* Supprimé : Badge du niveau de risque (affiché uniquement au niveau du risque) */}
      </Box>
      
      {/* Risques (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 3 }}>
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
                <SodRiskSection
                  key={index}
                  risk={risk}
                  defaultExpanded={true} // Tous les risques dépliés par défaut
                  roleName={roleName}
                  allRisks={risks}
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
}, (prevProps, nextProps) => {
  // 🚀 Comparaison personnalisée : ne re-rendre que si le rôle ou les callbacks changent vraiment
  const roleNameSame = prevProps.role.roleName === nextProps.role.roleName;
  const risksSame = prevProps.role.risks === nextProps.role.risks;
  const expandedSame = prevProps.defaultExpanded === nextProps.defaultExpanded;
  const deleteActionSame = prevProps.onDeleteAction === nextProps.onDeleteAction;
  const restrictActionSame = prevProps.onRestrictAction === nextProps.onRestrictAction;
  const restrictResourceSame = prevProps.onRestrictResource === nextProps.onRestrictResource;
  
  const shouldNotRerender = (
    roleNameSame &&
    risksSame &&
    expandedSame &&
    deleteActionSame &&
    restrictActionSame &&
    restrictResourceSame
  );
  
  // 🔍 DEBUG 6 : Log de la comparaison React.memo
  if (!shouldNotRerender) {
    const changedProps = [];
    if (!roleNameSame) changedProps.push('roleName');
    if (!risksSame) changedProps.push('risks (référence)');
    if (!expandedSame) changedProps.push('defaultExpanded');
    if (!deleteActionSame) changedProps.push('onDeleteAction (callback)');
    if (!restrictActionSame) changedProps.push('onRestrictAction (callback)');
    if (!restrictResourceSame) changedProps.push('onRestrictResource (callback)');
    
  }
  
  return shouldNotRerender;
});

SodSimpleRoleCard.displayName = 'SodSimpleRoleCard';

