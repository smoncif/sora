/**
 * Composant carte pour afficher un utilisateur avec ses risques SoD
 * 
 * Supporte 2 modes d'affichage :
 * - Mode "Par Rôle" : User → Risque → Fonction → Rôle → Action
 * - Mode "Par Transaction" : User → Risque → Fonction → Action → Rôle
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
  Chip,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import type { UserSodEntry } from 'lib/types/userSodAnalysis';
import { calculateUserGlobalRemediation } from 'lib/utils/sodRulesApplication';
import { UserSodRiskSection } from './UserSodRiskSection';

export interface UserSodCardProps {
  /** Utilisateur avec ses risques */
  user: UserSodEntry;
  
  /** Mode d'affichage */
  displayMode: 'BY_ROLE' | 'BY_TRANSACTION';
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Callbacks pour actions de remédiation */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

/**
 * Carte utilisateur avec ses risques SoD
 * 🚀 OPTIMISÉ : Mémoïsé pour éviter les re-rendus inutiles
 */
export const UserSodCard: React.FC<UserSodCardProps> = React.memo(({
  user,
  displayMode,
  defaultExpanded = false,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { userId, userGroup, riskCount, highestRiskLevel, totalExecutionCount } = user;
  
  // Choisir les risques selon le mode d'affichage
  const risks = displayMode === 'BY_ROLE' ? user.risksByRole : user.risksByTransaction;
  
  // ✅ Calculer le statut de remédiation (lecture depuis Maps globales)
  const remediationStatus = useMemo(() => {
    // Construire la structure attendue par calculateUserGlobalRemediation
    const risksWithActions = user.risksByRole.map(risk => ({
      functions: risk.functions.map(func => ({
        actions: [
          ...func.compositeRoles.flatMap(cr => 
            cr.simpleRoles.flatMap(sr => 
              sr.actions.map(action => ({
                code: action.code,
                roleName: sr.roleName,
                resources: action.resources,
              }))
            )
          ),
          ...func.simpleRoles.flatMap(sr => 
            sr.actions.map(action => ({
              code: action.code,
              roleName: sr.roleName,
              resources: action.resources,
            }))
          ),
        ],
      })),
    }));
    
    return calculateUserGlobalRemediation(risksWithActions);
  }, [user.risksByRole]);
  
  // Couleur selon le niveau de risque le plus élevé
  const riskColor = useMemo(() => {
    switch (highestRiskLevel) {
      case 'CRITICAL': return theme.palette.error.dark;
      case 'HIGH': return theme.palette.error.main;
      case 'MEDIUM': return theme.palette.warning.main;
      case 'LOW': return theme.palette.success.main;
      default: return theme.palette.grey[500];
    }
  }, [highestRiskLevel, theme]);
  
  return (
    <Paper
      data-user-id={userId}
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        mb: 3,
        backgroundColor: theme.palette.background.paper,
        // Bordure verte épaisse si 100% remedié
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
      {/* En-tête de l'utilisateur */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          p: 2.5,
          // Gradient progressif selon la remédiation
          background: remediationStatus.remediationPercentage > 0
            ? `linear-gradient(to right, 
                ${alpha(theme.palette.success.main, 0.12)} 0%, 
                ${alpha(theme.palette.success.main, 0.12)} ${remediationStatus.remediationPercentage}%, 
                ${alpha(theme.palette.primary.main, 0.04)} ${remediationStatus.remediationPercentage}%, 
                ${alpha(theme.palette.primary.main, 0.04)} 100%
              )`
            : alpha(theme.palette.primary.main, 0.04),
          // Bordure gauche épaisse verte si 100%
          borderLeft: remediationStatus.isRemediated
            ? `6px solid ${theme.palette.success.main}`
            : `4px solid ${riskColor}`,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
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
            backgroundColor: theme.palette.background.paper,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
            },
          }}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="medium" />
          ) : (
            <ExpandMoreIcon fontSize="medium" />
          )}
        </IconButton>
        
        {/* Icône utilisateur */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: alpha(riskColor, 0.15),
          }}
        >
          <PersonIcon sx={{ color: riskColor, fontSize: 24 }} />
        </Box>
        
        {/* Identifiant utilisateur */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: theme.palette.text.primary,
              fontSize: '1.125rem',
            }}
          >
            {userId}
          </Typography>
          
          {userGroup && (
            <Typography
              variant="body2"
              sx={{
                color: alpha(theme.palette.text.secondary, 0.7),
                mt: 0.5,
                fontSize: '0.875rem',
              }}
            >
              Groupe: {userGroup}
            </Typography>
          )}
        </Box>
        
        {/* Compteur d'exécutions */}
        <Tooltip title="Nombre total d'exécutions">
          <Chip
            icon={<PlayArrowIcon />}
            label={`${totalExecutionCount.toLocaleString()} exéc.`}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.dark,
              fontWeight: 500,
              '& .MuiChip-icon': {
                color: theme.palette.info.main,
              },
            }}
          />
        </Tooltip>
        
        {/* Badge de remédiation */}
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
      
      {/* Risques (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 2.5 }}>
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
              {risks.map((risk, index) => (
                <UserSodRiskSection
                  key={`${risk.riskId}-${index}`}
                  risk={risk}
                  displayMode={displayMode}
                  defaultExpanded={index === 0}
                  onDeleteAction={onDeleteAction}
                  onRestrictAction={onRestrictAction}
                  onRestrictResource={onRestrictResource}
                />
              ))}
            </Box>
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
            {riskCount} risque{riskCount > 1 ? 's' : ''}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {totalExecutionCount.toLocaleString()} exécution{totalExecutionCount > 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}, (prevProps, nextProps) => {
  // 🚀 Comparaison personnalisée pour éviter les re-rendus inutiles
  const userSame = prevProps.user.userId === nextProps.user.userId;
  const modeSame = prevProps.displayMode === nextProps.displayMode;
  const expandedSame = prevProps.defaultExpanded === nextProps.defaultExpanded;
  const deleteActionSame = prevProps.onDeleteAction === nextProps.onDeleteAction;
  const restrictActionSame = prevProps.onRestrictAction === nextProps.onRestrictAction;
  const restrictResourceSame = prevProps.onRestrictResource === nextProps.onRestrictResource;
  
  // Comparer les risques (référence)
  const risksSame = prevProps.user.risksByRole === nextProps.user.risksByRole &&
                    prevProps.user.risksByTransaction === nextProps.user.risksByTransaction;
  
  return (
    userSame &&
    modeSame &&
    risksSame &&
    expandedSame &&
    deleteActionSame &&
    restrictActionSame &&
    restrictResourceSame
  );
});

UserSodCard.displayName = 'UserSodCard';

