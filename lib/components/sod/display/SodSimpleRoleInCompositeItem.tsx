/**
 * Composant pour afficher un rôle simple au sein d'un rôle composite
 * 
 * Hiérarchie : Fonction → **Rôle Simple** → Action → Resource
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CodeIcon from '@mui/icons-material/Code';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { SodSimpleRoleInComposite } from 'lib/types/sodAnalysis';
import { SodActionItem } from './SodActionItem';
import { useSodActionsContext } from 'lib/contexts/SodActionsContext';

export interface SodSimpleRoleInCompositeItemProps {
  /** Rôle simple */
  simpleRole: SodSimpleRoleInComposite;
  
  /** Code de la fonction parente (pour clé contextuelle de remédiation) */
  functionCode: string;
  
  /** Niveau d'indentation */
  level?: number;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle composite parent */
  compositeRoleName?: string;
  
  /** ID du risque parent */
  riskId?: string;
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
}

/**
 * Affiche un rôle simple au sein d'un rôle composite avec ses actions
 */
export const SodSimpleRoleInCompositeItem: React.FC<SodSimpleRoleInCompositeItemProps> = ({
  simpleRole,
  functionCode,
  level = 0,
  defaultExpanded = false,
  compositeRoleName,
  riskId,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const actionsContext = useSodActionsContext();
  
  const { roleName, roleDescription, actions, actionCount: totalActionCount } = simpleRole;
  
  // ✅ Vérifier si le rôle simple est exclu de l'analyse
  // L'exclusion est au niveau du composite (toutes fonctions confondues)
  // ✅ OPTIMISÉ : Mémoïsé pour éviter les recalculs inutiles
  const isRoleExcluded = useMemo(() => {
    return compositeRoleName 
      ? actionsContext.isSimpleRoleExcluded(compositeRoleName, roleName)
      : false;
  }, [compositeRoleName, roleName, actionsContext.isSimpleRoleExcluded, actionsContext.version]);
  
  // ✅ Calculer si le rôle contient des actions (T-Code) et/ou des permissions
  // ✅ OPTIMISÉ : Mémoïsé pour éviter de parcourir les actions à chaque rendu
  const hasTCode = useMemo(() => 
    actions?.some(action => 
      action.resources?.some(resource => resource.code === 'S_TCODE')
    ) || false,
    [actions]
  );
  
  const hasPermissions = useMemo(() => 
    actions?.some(action => 
      action.resources?.some(resource => resource.code !== 'S_TCODE')
    ) || false,
    [actions]
  );
  
  // ✅ Calculer si toutes les actions T-Code sont supprimées
  const allTCodeActionsDeleted = useMemo(() => {
    const tCodeActions = actions?.filter(action => 
      action.resources?.some(r => r.code === 'S_TCODE')
    ) || [];
    return tCodeActions.length > 0 && tCodeActions.every(action => action.isDeleted);
  }, [actions]);
  
  // ✅ Calculer si toutes les permissions sont restreintes
  const allPermissionsRestricted = useMemo(() => {
    const permissionActions = actions?.filter(action => 
      action.resources?.some(r => r.code !== 'S_TCODE')
    ) || [];
    return permissionActions.length > 0 && permissionActions.every(action => action.isRestricted);
  }, [actions]);
  
  // ✅ Générer les badges (T-Code et/ou Permissions)
  // ✅ OPTIMISÉ : Mémoïsé pour éviter de recréer les badges à chaque rendu
  const roleBadges = useMemo(() => {
    const badges = [];
    
    if (hasTCode) {
      // Badge T-Code devient gris si rôle exclu OU toutes les actions supprimées
      const isTCodeGrayed = isRoleExcluded || allTCodeActionsDeleted;
      badges.push(
        <Box
          key="tcode"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: isTCodeGrayed 
              ? theme.palette.grey[400] 
              : theme.palette.primary.main,
            color: theme.palette.common.white,
            boxShadow: isTCodeGrayed 
              ? 'none'
              : `0 1px 2px ${alpha(theme.palette.primary.main, 0.3)}`,
            opacity: isTCodeGrayed ? 0.5 : 1,
          }}
        >
          <CodeIcon sx={{ fontSize: 11 }} />
        </Box>
      );
    }
    
    if (hasPermissions) {
      // Badge Permission devient gris si rôle exclu OU toutes les permissions restreintes
      const isPermissionGrayed = isRoleExcluded || allPermissionsRestricted;
      badges.push(
        <Box
          key="permission"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: isPermissionGrayed 
              ? theme.palette.grey[400] 
              : theme.palette.warning.main,
            color: theme.palette.common.white,
            boxShadow: isPermissionGrayed 
              ? 'none'
              : `0 1px 2px ${alpha(theme.palette.warning.main, 0.3)}`,
            opacity: isPermissionGrayed ? 0.5 : 1,
          }}
        >
          <SecurityIcon sx={{ fontSize: 11 }} />
        </Box>
      );
    }
    
    return badges.length > 0 ? (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {badges}
      </Box>
    ) : null;
  }, [hasTCode, hasPermissions, isRoleExcluded, allTCodeActionsDeleted, allPermissionsRestricted, theme]);
  
  // ✅ Handlers pour les boutons du rôle
  // ✅ OPTIMISÉ : useCallback pour éviter de recréer les fonctions à chaque rendu
  const handleDeleteRole = useCallback(() => {
    if (!compositeRoleName) return;
    // Exclure/restaurer le rôle de l'analyse (dans toutes les fonctions du composite)
    actionsContext.toggleExcludeSimpleRole(compositeRoleName, roleName);
  }, [compositeRoleName, roleName, actionsContext.toggleExcludeSimpleRole]);
  
  const handleDeleteAllActions = useCallback(() => {
    if (!riskId || !actions) return;
    // Supprimer toutes les actions qui ont S_TCODE
    actions.forEach(action => {
      const hasTCode = action.resources?.some(r => r.code === 'S_TCODE');
      if (hasTCode) {
        onDeleteAction?.(roleName, riskId, action.code, action.resources);
      }
    });
  }, [roleName, riskId, actions, onDeleteAction]);
  
  // ✅ GESTIONNAIRE POUR LE BOUTON "RESTREINDRE/DÉRESTREINDRE TOUT"
  const handleRestrictAllActions = useCallback(() => {
    if (!actions) return;
    
    // ✅ Filtrer les actions restrainable (non-S_TCODE)
    const restrainableActions = actions.filter(action => 
      action.resources?.some(r => r.code !== 'S_TCODE')
    );
    
    if (restrainableActions.length === 0) return;
    
    // ✅ ÉTAPE 1: DÉTECTER LE MODE GLOBAL
    const hasAnyRestricted = restrainableActions.some(action => 
      actionsContext.isActionRestricted(roleName, action.code, action.resources).isRestricted
    );
    
    const mode = hasAnyRestricted ? "DÉRESTREINDRE" : "RESTREINDRE";
    
    // ✅ SIMULER LES CLIQUES SUR LES BOUTONS INDIVIDUELS
    restrainableActions.forEach((action) => {
      const { isRestricted } = actionsContext.isActionRestricted(roleName, action.code, action.resources);
      
      if (mode === "RESTREINDRE" && !isRestricted) {
        // Mode RESTREINDRE : Utiliser restrictAction (force la restriction sans toggle)
        actionsContext.restrictAction(roleName, action.code, action.resources);
      } else if (mode === "DÉRESTREINDRE" && isRestricted) {
        // Mode DÉRESTREINDRE : Utiliser toggleRestrictAction (toggle pour dérestreindre)
        actionsContext.toggleRestrictAction(roleName, action.code, action.resources);
      }
      // Sinon ignorer l'action (déjà dans le bon état)
    });
  }, [roleName, riskId, actions, actionsContext, onRestrictAction]);
  
  // ✅ CALCULER LE MODE GLOBAL POUR L'INTERFACE DYNAMIQUE
  const buttonMode = useMemo(() => {
    if (!actions) return { mode: "RESTREINDRE", hasAnyRestricted: false };
    
    const restrainableActions = actions.filter(action => 
      action.resources?.some(r => r.code !== 'S_TCODE')
    );
    
    const hasAnyRestricted = restrainableActions.some(action => 
      actionsContext.isActionRestricted(roleName, action.code, action.resources).isRestricted
    );
    
    return {
      mode: hasAnyRestricted ? "DÉRESTREINDRE" : "RESTREINDRE",
      hasAnyRestricted
    };
  }, [actions, actionsContext, roleName]);

  // ✅ CALCULER LE COMPTAGE DES ACTIONS RESTREINTES/SUPPRIMÉES
  const actionCount = useMemo(() => {
    if (!actions || actions.length === 0) return { restricted: 0, total: 0 };
    
    let restrictedCount = 0;
    
    actions.forEach(action => {
      // Vérifier si l'action est supprimée (T-Code)
      if (action.isDeleted) {
        restrictedCount++;
        return;
      }
      
      // Vérifier si l'action est restreinte (Permissions)
      const { isRestricted } = actionsContext.isActionRestricted(roleName, action.code, action.resources);
      if (isRestricted) {
        restrictedCount++;
      }
    });
    
    return {
      restricted: restrictedCount,
      total: actions.length
    };
  }, [actions, roleName, actionsContext.isActionRestricted, actionsContext.version]);

  // ✅ DÉTERMINER L'ÉTAT VISUEL DU RÔLE
  const roleVisualState = useMemo(() => {
    // État 1: Rôle exclu (rouge) - priorité la plus haute
    if (isRoleExcluded) {
      return {
        type: 'excluded',
        backgroundColor: alpha(theme.palette.error.main, 0.08),
        borderColor: alpha(theme.palette.error.main, 0.3),
        hoverBackgroundColor: alpha(theme.palette.error.main, 0.12),
        hoverBorderColor: alpha(theme.palette.error.main, 0.4),
        icon: 'excluded'
      };
    }

    // État 2: Toutes les actions supprimables supprimées (rouge)
    if (allTCodeActionsDeleted && hasTCode) {
      return {
        type: 'all-deleted',
        backgroundColor: alpha(theme.palette.error.main, 0.08),
        borderColor: alpha(theme.palette.error.main, 0.3),
        hoverBackgroundColor: alpha(theme.palette.error.main, 0.12),
        hoverBorderColor: alpha(theme.palette.error.main, 0.4),
        icon: 'deleted'
      };
    }

    // État 3: Toutes les actions restreignables restreintes (orange/warning)
    if (allPermissionsRestricted && hasPermissions) {
      return {
        type: 'all-restricted',
        backgroundColor: alpha(theme.palette.warning.main, 0.08),
        borderColor: alpha(theme.palette.warning.main, 0.3),
        hoverBackgroundColor: alpha(theme.palette.warning.main, 0.12),
        hoverBorderColor: alpha(theme.palette.warning.main, 0.4),
        icon: 'restricted'
      };
    }

    // État 4: Normal (gris)
    return {
      type: 'normal',
      backgroundColor: alpha(theme.palette.grey[400], 0.06),
      borderColor: alpha(theme.palette.grey[400], 0.2),
      hoverBackgroundColor: alpha(theme.palette.grey[400], 0.1),
      hoverBorderColor: alpha(theme.palette.grey[400], 0.3),
      icon: 'normal'
    };
  }, [isRoleExcluded, allTCodeActionsDeleted, hasTCode, allPermissionsRestricted, hasPermissions, theme]);
  
  return (
    <Box sx={{ ml: level * 2 }}>
      {/* En-tête du rôle simple */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 1,
          px: 1.5,
          borderRadius: 1.5,
          backgroundColor: roleVisualState.backgroundColor,
          border: `1px solid ${roleVisualState.borderColor}`,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: roleVisualState.hoverBackgroundColor,
            border: `1px solid ${roleVisualState.hoverBorderColor}`,
          },
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
              backgroundColor: alpha(theme.palette.grey[500], 0.15),
            },
          }}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
        
        {/* Icône de personne supprimée */}
        
        {/* Nom du rôle simple avec badges */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontFamily: 'monospace',
              color: theme.palette.grey[700],
              fontSize: '0.9rem',
            }}
          >
            {roleName}
          </Typography>
          
          
          {/* Badges T-Code et/ou Permissions */}
          {roleBadges}
          
          {/* Compteur d'actions restreintes/supprimées */}
          {actionCount.total > 0 && (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                fontFamily: 'monospace',
                color: actionCount.restricted > 0 
                  ? theme.palette.warning.dark 
                  : theme.palette.grey[500],
                fontSize: '0.75rem',
                backgroundColor: actionCount.restricted > 0 
                  ? alpha(theme.palette.warning.main, 0.1)
                  : alpha(theme.palette.grey[400], 0.08),
                px: 1,
                py: 0.25,
                borderRadius: 1,
                border: `1px solid ${
                  actionCount.restricted > 0 
                    ? alpha(theme.palette.warning.main, 0.2)
                    : alpha(theme.palette.grey[400], 0.15)
                }`,
              }}
            >
              {actionCount.restricted}/{actionCount.total}
            </Typography>
          )}
        </Box>
        
        {/* Boutons d'action pour le rôle */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* Bouton Supprimer Rôle */}
          <Tooltip 
            title={
              allTCodeActionsDeleted 
                ? "Toutes les actions sont déjà supprimées"
                : allPermissionsRestricted
                  ? "Toutes les permissions sont déjà restreintes"
                  : isRoleExcluded 
                    ? "Annuler l'exclusion du rôle" 
                    : "Exclure le rôle de l'analyse"
            } 
            arrow
          >
            <span>
              <IconButton
                size="small"
                onClick={handleDeleteRole}
                disabled={allTCodeActionsDeleted || allPermissionsRestricted}
                sx={{
                  p: 0.5,
                  color: theme.palette.error.main,
                  backgroundColor: isRoleExcluded 
                    ? alpha(theme.palette.error.main, 0.15) 
                    : 'transparent',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                  },
                  '&:disabled': {
                    color: theme.palette.grey[400],
                  },
                }}
              >
                <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Bouton Supprimer Actions */}
          <Tooltip 
            title={
              isRoleExcluded
                ? "Rôle exclu de l'analyse"
                : allPermissionsRestricted
                  ? "Toutes les permissions sont déjà restreintes"
                  : !hasTCode 
                    ? "Aucune action à supprimer" 
                    : "Supprimer toutes les actions (T-Code)"
            } 
            arrow
          >
            <span>
              <IconButton
                size="small"
                onClick={handleDeleteAllActions}
                disabled={!hasTCode || isRoleExcluded || allPermissionsRestricted}
                sx={{
                  p: 0.5,
                  color: theme.palette.error.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                  },
                  '&:disabled': {
                    color: theme.palette.grey[400],
                  },
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          
          {/* Bouton Restreindre/Dérestreindre Actions */}
          <Tooltip
            title={
              isRoleExcluded
                ? "Rôle exclu de l'analyse"
                : allTCodeActionsDeleted
                  ? "Toutes les actions sont déjà supprimées"
                  : !hasPermissions 
                    ? "Aucune permission à restreindre" 
                    : buttonMode.hasAnyRestricted
                      ? "Dérestreindre toutes les actions (Permissions)"
                      : "Restreindre toutes les actions (Permissions)"
            } 
            arrow
          >
            <span>
              <IconButton
                size="small"
                onClick={handleRestrictAllActions}
                disabled={!hasPermissions || isRoleExcluded || allTCodeActionsDeleted}
                sx={{
                  p: 0.5,
                  color: theme.palette.warning.dark,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                  },
                  '&:disabled': {
                    color: theme.palette.grey[400],
                  },
                }}
              >
                {buttonMode.hasAnyRestricted ? (
                  <LockOpenIcon sx={{ fontSize: 18 }} />
                ) : (
                  <BlockIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Description complète supprimée */}
      
      {/* Actions (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ mt: 1, ml: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {actions.length === 0 ? (
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
                textAlign: 'center',
                py: 1,
              }}
            >
              Aucune action
            </Typography>
          ) : (
            actions.map((action, index: number) => (
              <SodActionItem
                key={index}
                action={action}
                level={0}
                defaultExpanded={false}
                disableButtons={isRoleExcluded}
                onDelete={(code, resources) => roleName && riskId && onDeleteAction?.(roleName, riskId, code, resources)}
                onRestrict={(code, resources) => roleName && riskId && onRestrictAction?.(roleName, riskId, code, resources)}
                onRestrictResource={(actionCode, resourceCode, externalResourceCode, values) => 
                  roleName && riskId && onRestrictResource?.(roleName, riskId, actionCode, resourceCode, externalResourceCode, values)
                }
              />
            ))
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

