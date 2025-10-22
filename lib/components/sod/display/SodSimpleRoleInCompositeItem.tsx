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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { SodSimpleRoleInComposite } from 'lib/types/sodAnalysis';
import { SodActionItem } from './SodActionItem';
import { useActionState, useRoleState } from 'lib/hooks/sod/useSodSelectors';
import { extractExternalResourceValues } from 'lib/utils/sodResourceUtils';

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
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
  
  /** Callback pour exclure un rôle simple dans un rôle composite */
  onExcludeRole?: (compositeRoleName: string, simpleRoleName: string) => void;
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
  onExcludeRole,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { roleName, roleDescription, actions, actionCount: totalActionCount } = simpleRole;
  
  // ✅ Lire l'état d'exclusion depuis simpleRole (provenant de la session)
  const isRoleExcluded = simpleRole.isExcluded || false;
  
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
    return tCodeActions.length > 0 && tCodeActions.every(action => 
      action.isDeleted // ✅ NOUVELLE LOGIQUE : Utiliser directement la propriété de l'action
    );
  }, [actions]);
  
  // ✅ Calculer si AU MOINS UNE action T-Code est supprimée (pour le tooltip du bouton "Supprimer Tout")
  // Cette variable reflète la logique réelle du bouton
  const anyTCodeActionDeleted = useMemo(() => {
    const tCodeActions = actions?.filter(action => 
      action.resources?.some(r => r.code === 'S_TCODE')
    ) || [];
    return tCodeActions.some(action => 
      action.isDeleted // ✅ NOUVELLE LOGIQUE : Utiliser directement la propriété de l'action
    );
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
      // Badge Action (T-Code) devient gris si rôle exclu OU toutes les actions supprimées
      const isActionGrayed = isRoleExcluded || allTCodeActionsDeleted;
      badges.push(
        <Box
          key="action"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: isActionGrayed 
              ? theme.palette.grey[400] 
              : theme.palette.info.main, // Bleu pour les actions
            color: theme.palette.common.white,
            boxShadow: isActionGrayed 
              ? 'none'
              : `0 1px 2px ${alpha(theme.palette.info.main, 0.3)}`,
            opacity: isActionGrayed ? 0.5 : 1,
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        >
          A
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
              : theme.palette.warning.main, // Orange pour les permissions
            color: theme.palette.common.white,
            boxShadow: isPermissionGrayed 
              ? 'none'
              : `0 1px 2px ${alpha(theme.palette.warning.main, 0.3)}`,
            opacity: isPermissionGrayed ? 0.5 : 1,
            fontWeight: 700,
            fontSize: '0.75rem',
          }}
        >
          P
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
    onExcludeRole?.(compositeRoleName, roleName);
  }, [compositeRoleName, roleName, onExcludeRole]);
  
  const handleDeleteAllActions = useCallback(() => {
    if (!riskId || !actions) return;
    
    // ✅ Filtrer les actions avec S_TCODE
    const tCodeActions = actions.filter(action => 
      action.resources?.some(r => r.code === 'S_TCODE')
    );
    
    if (tCodeActions.length === 0) return;
    
    // ✅ Déterminer le mode global
    const deletedActions = tCodeActions.filter(action => 
      action.isDeleted // ✅ NOUVELLE LOGIQUE : Utiliser directement la propriété de l'action
    );
    
    const mode = deletedActions.length > 0 ? "DÉSUPPRIMER" : "SUPPRIMER";
    
    // ✅ Appliquer l'action globale
    tCodeActions.forEach(action => {
      const isCurrentlyDeleted = action.isDeleted; // ✅ NOUVELLE LOGIQUE : Utiliser directement la propriété de l'action
      
      // Appliquer l'action seulement si nécessaire
      if ((mode === "SUPPRIMER" && !isCurrentlyDeleted) || 
          (mode === "DÉSUPPRIMER" && isCurrentlyDeleted)) {
        onDeleteAction?.(roleName, riskId, action.code, action.resources);
      }
    });
  }, [roleName, riskId, actions, onDeleteAction]);
  
  // ✅ OPTIMISÉ : Utiliser SodActionsContext directement - pas d'état local
  // Les restrictions d'actions sont gérées par SodActionsContext synchronisé avec TanStack Query
  
  // ✅ GESTIONNAIRE POUR LE BOUTON "RESTREINDRE/DÉRESTREINDRE TOUT"
  const handleRestrictAllActions = useCallback(() => {
    if (!actions || !riskId) return;
    
    const allResourceValues = new Map<string, { resourceCode: string; externalResourceCode: string; values: string[] }>();
    
    actions.forEach(action => {
      action.resources?.forEach((resource: any) => {
        if (resource.code === 'S_TCODE') return;
        
        resource.externalResources?.forEach((extRes: any) => {
          const key = `${resource.code}|${extRes.code}`;
          const values = extractExternalResourceValues(extRes);
          
          if (!allResourceValues.has(key)) {
            allResourceValues.set(key, {
              resourceCode: resource.code,
              externalResourceCode: extRes.code,
              values: []
            });
          }
          
          const existingValues = allResourceValues.get(key)!.values;
          values.forEach((v: string) => {
            if (!existingValues.includes(v)) {
              existingValues.push(v);
            }
          });
        });
      });
    });

    if (allResourceValues.size === 0) {
      return;
    }

    const isCurrentlyRestricted = Array.from(allResourceValues.entries()).some(([key, data]) => {
      return actions.some(action => 
        action.resources.some(resource => 
          resource.code === data.resourceCode && 
          resource.externalResources?.some(extRes => 
            extRes.code === data.externalResourceCode && 
            extractExternalResourceValues(extRes).every(val => data.values.includes(val)) &&
            resource.isRestricted
          )
        )
      );
    });

    const shouldRestrict = !isCurrentlyRestricted;

    allResourceValues.forEach((data, key) => {
      onRestrictResource?.(
        roleName, 
        riskId, 
        '', 
        data.resourceCode, 
        data.externalResourceCode, 
        data.values,
        shouldRestrict
      );
    });
  }, [roleName, riskId, actions, onRestrictResource]);
  
  // ✅ CALCULER LE MODE GLOBAL POUR L'INTERFACE DYNAMIQUE
  const buttonMode = useMemo(() => {
    if (!actions) return { mode: "RESTREINDRE", hasAnyRestricted: false };
    
    const restrainableActions = actions.filter(action => 
      action.resources?.some(r => r.code !== 'S_TCODE')
    );
    
    // ✅ HARMONISÉ : Utiliser la MÊME logique que handleRestrictAllActions
    // Extraire toutes les valeurs de toutes les ressources (comme dans handleRestrictAllActions)
    const allResourceValues = new Map<string, { resourceCode: string; externalResourceCode: string; values: string[] }>();
    
    actions.forEach(action => {
      action.resources?.forEach((resource: any) => {
        if (resource.code === 'S_TCODE') return; // Ignorer S_TCODE
        
        resource.externalResources?.forEach((extRes: any) => {
          const key = `${resource.code}|${extRes.code}`;
          const values = extractExternalResourceValues(extRes);
          
          if (!allResourceValues.has(key)) {
            allResourceValues.set(key, {
              resourceCode: resource.code,
              externalResourceCode: extRes.code,
              values: []
            });
          }
          
          // Ajouter les valeurs (déduplication automatique via Set)
          const existingValues = allResourceValues.get(key)!.values;
          values.forEach((v: string) => {
            if (!existingValues.includes(v)) {
              existingValues.push(v);
            }
          });
        });
      });
    });
    
    // ✅ MÊME LOGIQUE que handleRestrictAllActions pour la cohérence
    const hasAnyRestricted = Array.from(allResourceValues.entries()).some(([key, data]) => {
      return actions.some(action => 
        action.resources.some(resource => 
          resource.code === data.resourceCode && 
          resource.externalResources?.some(extRes => 
            extRes.code === data.externalResourceCode && 
            extractExternalResourceValues(extRes).every(val => data.values.includes(val)) &&
            resource.isRestricted
          )
        )
      );
    });
    
    return {
      mode: hasAnyRestricted ? "DÉRESTREINDRE" : "RESTREINDRE",
      hasAnyRestricted
    };
  }, [actions, roleName]);

  // ✅ CALCULER LE COMPTAGE DES ACTIONS RESTREINTES/SUPPRIMÉES
  const actionCount = useMemo(() => {
    if (!actions || actions.length === 0) return { restricted: 0, total: 0 };
    
    let restrictedCount = 0;
    const actionDetails: any[] = [];
    
    actions.forEach(action => {
      // Vérifier si l'action est supprimée (T-Code)
      if (action.isDeleted) {
        restrictedCount++;
        actionDetails.push({
          code: action.code,
          status: 'DELETED',
          sessionRestricted: false,
          contextRestricted: false
        });
        return;
      }
      
      // ✅ OPTIMISÉ : Utiliser les données de session directement
      const hasRestrictedResource = action.resources.some(resource => 
        resource.code !== 'S_TCODE' && resource.isRestricted
      );
      
      // ✅ NOUVELLE LOGIQUE : Utiliser directement les propriétés de l'action
      const isActionRestricted = action.isRestricted;
      
      if (hasRestrictedResource || isActionRestricted) {
        restrictedCount++;
      }
      
      actionDetails.push({
        code: action.code,
        status: (hasRestrictedResource || isActionRestricted) ? 'RESTRICTED' : 'NORMAL',
        sessionRestricted: hasRestrictedResource,
        actionRestricted: isActionRestricted,
        restrictedByAction: action.restrictedByAction || false
      });
    });
    
    return {
      restricted: restrictedCount,
      total: actions.length
    };
  }, [actions, roleName]);

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
                    : anyTCodeActionDeleted
                      ? "Désupprimer toutes les actions (T-Code)"
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
                roleName={roleName} // ✅ CORRIGÉ : Ajouter roleName pour SodActionsContext
                level={0}
                defaultExpanded={false}
                disableButtons={isRoleExcluded}
        onDelete={(code: string, resources: any[]) => roleName && riskId && onDeleteAction?.(roleName, riskId, code, resources)}
        onRestrict={(code: string, resources: any[]) => roleName && riskId && onRestrictAction?.(roleName, riskId, code, resources)}
        onRestrictResource={(actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) =>
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

