/**
 * Composant pour afficher un risque SoD utilisateur avec ses fonctions
 * 
 * Supporte 2 modes d'affichage :
 * - Mode "Par Rôle" : Risque → Fonction → Rôle → Action
 * - Mode "Par Transaction" : Risque → Fonction → Action → Rôle
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
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FunctionsIcon from '@mui/icons-material/Functions';
import type { 
  UserSodRiskByRole, 
  UserSodRiskByTransaction,
  UserSodFunctionByRole,
  UserSodFunctionByTransaction,
} from 'lib/types/userSodAnalysis';
import { SodRiskLevelBadge } from '../shared/SodRiskLevelBadge';
import { calculateUserRiskRemediation } from 'lib/utils/sodRulesApplication';

// Type union pour les risques
type UserSodRisk = UserSodRiskByRole | UserSodRiskByTransaction;

export interface UserSodRiskSectionProps {
  /** Risque (mode Par Rôle ou Par Transaction) */
  risk: UserSodRisk;
  
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
 * Section risque utilisateur avec fonctions
 */
export const UserSodRiskSection: React.FC<UserSodRiskSectionProps> = ({
  risk,
  displayMode,
  defaultExpanded = true,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { riskId, riskLevel, riskDescription, functions } = risk;
  
  // ✅ Calculer la remédiation du risque
  const remediationStatus = useMemo(() => {
    if (displayMode === 'BY_ROLE') {
      const riskByRole = risk as UserSodRiskByRole;
      const funcsWithActions = riskByRole.functions.map(func => ({
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
      }));
      return calculateUserRiskRemediation(funcsWithActions);
    } else {
      const riskByTrans = risk as UserSodRiskByTransaction;
      const funcsWithActions = riskByTrans.functions.map(func => ({
        actions: func.actions.flatMap(action => 
          action.roles.map(role => ({
            code: action.code,
            roleName: role.roleName,
            resources: role.resources,
          }))
        ),
      }));
      return calculateUserRiskRemediation(funcsWithActions);
    }
  }, [risk, displayMode]);
  
  return (
    <Paper
      data-risk-code={riskId}
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        // Bordure selon le niveau de risque
        border: `1px solid ${(() => {
          switch (riskLevel) {
            case 'CRITICAL': return alpha(theme.palette.error.dark, 0.2);
            case 'HIGH': return alpha(theme.palette.error.main, 0.15);
            case 'MEDIUM': return alpha(theme.palette.warning.main, 0.15);
            case 'LOW': return alpha(theme.palette.success.main, 0.15);
            default: return alpha(theme.palette.error.main, 0.15);
          }
        })()}`,
        backgroundColor: 'transparent',
        mb: 2,
        transition: 'all 0.2s ease',
      }}
    >
      {/* En-tête du risque */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          // Fond selon le niveau de risque
          backgroundColor: (() => {
            switch (riskLevel) {
              case 'CRITICAL': return alpha(theme.palette.error.dark, 0.1);
              case 'HIGH': return alpha(theme.palette.error.main, 0.08);
              case 'MEDIUM': return alpha(theme.palette.warning.main, 0.08);
              case 'LOW': return alpha(theme.palette.success.main, 0.08);
              default: return alpha(theme.palette.error.main, 0.08);
            }
          })(),
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icône expandable */}
        <IconButton
          size="small"
          sx={{
            p: 0.5,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        
        {/* Icône de warning */}
        <WarningAmberIcon
          sx={{
            fontSize: 24,
            color: (() => {
              switch (riskLevel) {
                case 'CRITICAL': return theme.palette.error.dark;
                case 'HIGH': return theme.palette.error.main;
                case 'MEDIUM': return theme.palette.warning.main;
                case 'LOW': return theme.palette.success.main;
                default: return theme.palette.error.main;
              }
            })(),
          }}
        />
        
        {/* ID du risque */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              color: (() => {
                switch (riskLevel) {
                  case 'CRITICAL': return theme.palette.error.dark;
                  case 'HIGH': return theme.palette.error.main;
                  case 'MEDIUM': return theme.palette.warning.dark;
                  case 'LOW': return theme.palette.success.dark;
                  default: return theme.palette.error.main;
                }
              })(),
            }}
          >
            {riskId}
          </Typography>
          
          {riskDescription && (
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                mt: 0.25,
                fontSize: '0.8125rem',
              }}
            >
              {riskDescription}
            </Typography>
          )}
        </Box>
        
        {/* Compteur d'exécutions */}
        <Chip
          label={`${(risk as any).totalExecutionCount?.toLocaleString() || 0} exéc.`}
          size="small"
          sx={{
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            color: theme.palette.info.dark,
            fontWeight: 500,
            fontSize: '0.75rem',
          }}
        />
        
        {/* Badges */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <SodRiskLevelBadge level={riskLevel} size="small" variant="filled" />
          
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
        </Box>
      </Box>
      
      {/* Contenu (fonctions) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 2 }}>
          {functions.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              Aucune fonction
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {displayMode === 'BY_ROLE' ? (
                // Mode Par Rôle
                (functions as UserSodFunctionByRole[]).map((func, index) => (
                  <FunctionByRoleSection
                    key={`${func.code}-${index}`}
                    func={func}
                    riskId={riskId}
                    onDeleteAction={onDeleteAction}
                    onRestrictAction={onRestrictAction}
                    onRestrictResource={onRestrictResource}
                  />
                ))
              ) : (
                // Mode Par Transaction
                (functions as UserSodFunctionByTransaction[]).map((func, index) => (
                  <FunctionByTransactionSection
                    key={`${func.code}-${index}`}
                    func={func}
                    riskId={riskId}
                    onDeleteAction={onDeleteAction}
                    onRestrictAction={onRestrictAction}
                    onRestrictResource={onRestrictResource}
                  />
                ))
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

// ============================================
// SECTION FONCTION MODE "PAR RÔLE"
// ============================================

interface FunctionByRoleSectionProps {
  func: UserSodFunctionByRole;
  riskId: string;
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

const FunctionByRoleSection: React.FC<FunctionByRoleSectionProps> = ({
  func,
  riskId,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  
  return (
    <Box
      sx={{
        border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      {/* En-tête fonction */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <IconButton size="small" sx={{ p: 0.25 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        
        <FunctionsIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
        
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          {func.code}
        </Typography>
        
        {func.description && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {func.description}
          </Typography>
        )}
        
        <Chip
          label={`${func.totalExecutionCount.toLocaleString()} exéc.`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            backgroundColor: alpha(theme.palette.grey[500], 0.1),
          }}
        />
      </Box>
      
      {/* Contenu (rôles) */}
      <Collapse in={expanded}>
        <Box sx={{ p: 1.5 }}>
          {/* Rôles Composites */}
          {func.compositeRoles.map((cr, idx) => (
            <Box key={`composite-${cr.roleName}-${idx}`} sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Rôle Composite: {cr.roleName}
              </Typography>
              
              {cr.simpleRoles.map((sr, srIdx) => (
                <RoleActionsDisplay
                  key={`simple-${sr.roleName}-${srIdx}`}
                  roleName={sr.roleName}
                  roleDescription={sr.roleDescription}
                  actions={sr.actions}
                  riskId={riskId}
                  isSimple
                  parentComposite={cr.roleName}
                  onDeleteAction={onDeleteAction}
                  onRestrictAction={onRestrictAction}
                  onRestrictResource={onRestrictResource}
                />
              ))}
            </Box>
          ))}
          
          {/* Rôles Simples (sans composite) */}
          {func.simpleRoles.map((sr, idx) => (
            <RoleActionsDisplay
              key={`simple-direct-${sr.roleName}-${idx}`}
              roleName={sr.roleName}
              roleDescription={sr.roleDescription}
              actions={sr.actions}
              riskId={riskId}
              isSimple
              onDeleteAction={onDeleteAction}
              onRestrictAction={onRestrictAction}
              onRestrictResource={onRestrictResource}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

// ============================================
// SECTION FONCTION MODE "PAR TRANSACTION"
// ============================================

interface FunctionByTransactionSectionProps {
  func: UserSodFunctionByTransaction;
  riskId: string;
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

const FunctionByTransactionSection: React.FC<FunctionByTransactionSectionProps> = ({
  func,
  riskId,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  
  return (
    <Box
      sx={{
        border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
        borderRadius: 1.5,
        overflow: 'hidden',
      }}
    >
      {/* En-tête fonction */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <IconButton size="small" sx={{ p: 0.25 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
        
        <FunctionsIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
        
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          {func.code}
        </Typography>
        
        <Chip
          label={`${func.actionCount} action${func.actionCount > 1 ? 's' : ''}`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            color: theme.palette.info.dark,
          }}
        />
        
        <Chip
          label={`${func.totalExecutionCount.toLocaleString()} exéc.`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            backgroundColor: alpha(theme.palette.grey[500], 0.1),
          }}
        />
      </Box>
      
      {/* Contenu (actions → rôles) */}
      <Collapse in={expanded}>
        <Box sx={{ p: 1.5 }}>
          {func.actions.map((action, idx) => (
            <ActionRolesDisplay
              key={`action-${action.code}-${idx}`}
              action={action}
              riskId={riskId}
              onDeleteAction={onDeleteAction}
              onRestrictAction={onRestrictAction}
              onRestrictResource={onRestrictResource}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

// ============================================
// COMPOSANTS D'AFFICHAGE ACTIONS/RÔLES
// ============================================

interface RoleActionsDisplayProps {
  roleName: string;
  roleDescription?: string;
  actions: any[];
  riskId: string;
  isSimple: boolean;
  parentComposite?: string;
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

const RoleActionsDisplay: React.FC<RoleActionsDisplayProps> = ({
  roleName,
  roleDescription,
  actions,
  riskId,
  isSimple,
  parentComposite,
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        ml: parentComposite ? 2 : 0,
        mb: 1,
        p: 1,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
          {isSimple ? '→' : '◆'} {roleName}
        </Typography>
        {roleDescription && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ({roleDescription})
          </Typography>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1.5 }}>
        {actions.map((action, idx) => (
          <Chip
            key={`action-${action.code}-${idx}`}
            label={action.code}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              backgroundColor: action.isDeleted
                ? alpha(theme.palette.error.main, 0.15)
                : action.isRestricted
                  ? alpha(theme.palette.warning.main, 0.15)
                  : alpha(theme.palette.grey[500], 0.1),
              color: action.isDeleted
                ? theme.palette.error.dark
                : action.isRestricted
                  ? theme.palette.warning.dark
                  : theme.palette.text.primary,
              textDecoration: action.isDeleted ? 'line-through' : 'none',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

interface ActionRolesDisplayProps {
  action: any;
  riskId: string;
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

const ActionRolesDisplay: React.FC<ActionRolesDisplayProps> = ({
  action,
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        mb: 1,
        p: 1,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
      }}
    >
      {/* En-tête action */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Chip
          label={action.code}
          size="small"
          sx={{
            height: 24,
            fontWeight: 600,
            backgroundColor: action.isDeleted
              ? alpha(theme.palette.error.main, 0.15)
              : action.isRestricted
                ? alpha(theme.palette.warning.main, 0.15)
                : alpha(theme.palette.primary.main, 0.1),
            color: action.isDeleted
              ? theme.palette.error.dark
              : action.isRestricted
                ? theme.palette.warning.dark
                : theme.palette.primary.dark,
          }}
        />
        
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {action.executionCount.toLocaleString()} exéc.
        </Typography>
        
        {action.description && (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            {action.description}
          </Typography>
        )}
      </Box>
      
      {/* Rôles */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 1.5 }}>
        {action.roles.map((role: any, idx: number) => (
          <Chip
            key={`role-${role.roleName}-${idx}`}
            label={role.parentCompositeRole 
              ? `${role.parentCompositeRole} → ${role.roleName}`
              : role.roleName
            }
            size="small"
            sx={{
              height: 22,
              fontSize: '0.7rem',
              backgroundColor: role.isExcluded
                ? alpha(theme.palette.grey[500], 0.15)
                : role.isDeleted
                  ? alpha(theme.palette.error.main, 0.1)
                  : alpha(theme.palette.success.main, 0.1),
              color: role.isExcluded
                ? theme.palette.grey[600]
                : role.isDeleted
                  ? theme.palette.error.dark
                  : theme.palette.success.dark,
              textDecoration: role.isExcluded || role.isDeleted ? 'line-through' : 'none',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

