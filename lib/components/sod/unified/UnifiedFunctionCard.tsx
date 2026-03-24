/**
 * Composant UNIFIÉ pour afficher une fonction avec ses actions/rôles
 * 
 * Gère automatiquement :
 * - Mode RÔLE : actions directes
 * - Mode COMPOSITE : simpleRoles → actions
 * - Mode USER BY_ROLE : compositeRoles + simpleRoles → actions
 * - Mode USER BY_TRANSACTION : transactionActions → roles
 * 
 * Réutilise SodActionItem pour garantir la cohérence visuelle
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import FunctionsIcon from '@mui/icons-material/Functions';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import type { UnifiedFunction, UnifiedRiskContext, UnifiedDisplayMode, UnifiedRisk } from 'lib/types/unifiedSodTypes';
import { SodActionItem } from '../display/SodActionItem';
import { SodSimpleRoleInCompositeItem } from '../display/SodSimpleRoleInCompositeItem';
import { detectActionsWithOnlyTCodeInFunction, extractActionSignature, detectDuplicateActionsInRisk } from 'lib/utils/sodConflictDetection';
import { extractExternalResourceValues } from 'lib/utils/sodResourceUtils';
import { useLazyActionRendering } from 'lib/hooks/sod/useLazyActionRendering';
import { SodActionSkeleton } from '../skeleton/SodActionSkeleton';
import type { SodAction } from 'lib/types/sodAnalysis';

export interface UnifiedFunctionCardProps {
  /** Fonction unifiée */
  func: UnifiedFunction;
  
  /** Contexte d'affichage */
  context: UnifiedRiskContext;
  
  /** Mode d'affichage (pour utilisateurs) */
  displayMode?: UnifiedDisplayMode;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du parent */
  parentName?: string;
  
  /** ID du risque parent */
  riskId?: string;
  
  /** Index de la fonction (pour détection de doublons) */
  functionIndex?: number;
  
  /** Tous les risques (pour statistiques) */
  allRisks?: UnifiedRisk[];
  
  /** Callbacks */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (
    roleName: string, 
    riskId: string, 
    actionCode: string, 
    resourceCode: string, 
    externalResourceCode: string, 
    values: string[], 
    shouldRestrict?: boolean
  ) => void;
  onExcludeRole?: (compositeRoleName: string, simpleRoleName: string) => void;
}

/**
 * Composant unifié pour afficher une fonction
 */
export const UnifiedFunctionCard: React.FC<UnifiedFunctionCardProps> = ({
  func,
  context,
  displayMode = 'BY_ROLE',
  defaultExpanded = true,
  parentName,
  riskId,
  functionIndex = 0,
  allRisks,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onExcludeRole,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // État pour le mode BY_TRANSACTION : expansion des actions, ressources et rôles simples
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({});
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});
  const [expandedSimpleRoles, setExpandedSimpleRoles] = useState<Record<string, boolean>>({});
  
  const { code, description, system, totalExecutionCount } = func;
  
  // 🎯 Initialiser les états de collapse avec les valeurs par défaut
  // Pour USER : risques et fonctions dépliés, rôles composites et simples pliés
  const initialExpandedComposites = useMemo(() => {
    if (context === 'USER' && displayMode === 'BY_ROLE' && func.compositeRoles) {
      const initial: Record<string, boolean> = {};
      func.compositeRoles.forEach(cr => {
        initial[cr.roleName] = false; // Plié par défaut pour USER
      });
      return initial;
    }
    return {};
  }, [context, displayMode, func.compositeRoles]);
  
  const initialExpandedSimples = useMemo(() => {
    if (context === 'USER' && displayMode === 'BY_ROLE') {
      const initial: Record<string, boolean> = {};
      // Rôles simples dans les composites
      if (func.compositeRoles) {
        func.compositeRoles.forEach(cr => {
          cr.simpleRoles.forEach(sr => {
            initial[`${cr.roleName}-${sr.roleName}`] = false; // Plié par défaut pour USER
          });
        });
      }
      // Rôles simples directs
      if (func.userSimpleRoles) {
        func.userSimpleRoles.forEach(sr => {
          initial[`direct-${sr.roleName}`] = false; // Plié par défaut pour USER
        });
      }
      return initial;
    }
    return {};
  }, [context, displayMode, func.compositeRoles, func.userSimpleRoles]);
  
  // États pour gérer le collapse/expand des rôles dans le mode USER BY_ROLE
  const [expandedComposites, setExpandedComposites] = useState<Record<string, boolean>>(initialExpandedComposites);
  const [expandedSimples, setExpandedSimples] = useState<Record<string, boolean>>(initialExpandedSimples);
  
  // 🎯 Synchroniser les états avec les valeurs initiales calculées
  // Cela garantit que toutes les clés sont présentes dès le premier rendu
  useEffect(() => {
    setExpandedComposites(prev => {
      const updated = { ...prev };
      // S'assurer que toutes les clés de initialExpandedComposites sont présentes
      Object.keys(initialExpandedComposites).forEach(key => {
        if (!(key in updated)) {
          updated[key] = initialExpandedComposites[key];
        }
      });
      return updated;
    });
  }, [initialExpandedComposites]);
  
  useEffect(() => {
    setExpandedSimples(prev => {
      const updated = { ...prev };
      // S'assurer que toutes les clés de initialExpandedSimples sont présentes
      Object.keys(initialExpandedSimples).forEach(key => {
        if (!(key in updated)) {
          updated[key] = initialExpandedSimples[key];
        }
      });
      return updated;
    });
  }, [initialExpandedSimples]);
  
  // 🎯 Calculer les statistiques de risques (pour badge X/Y)
  const riskStats = useMemo(() => {
    if (!allRisks || allRisks.length === 0) return { count: 0, total: 0 };
    
    const count = allRisks.filter((risk: UnifiedRisk) => 
      risk.functions?.some((f: UnifiedFunction) => f.code === code)
    ).length;
    
    return {
      count,
      total: allRisks.length
    };
  }, [allRisks, code]);
  
  // 🎯 Détecter le mode d'affichage et préparer les données
  const renderMode = useMemo(() => {
    if (context === 'ROLE' && func.actions) {
      return 'ROLE_ACTIONS';
    }
    if (context === 'COMPOSITE' && func.simpleRoles) {
      return 'COMPOSITE_ROLES';
    }
    if (context === 'USER' && displayMode === 'BY_ROLE') {
      if (func.compositeRoles && func.compositeRoles.length > 0) {
        return 'USER_BY_ROLE_COMPOSITE';
      }
      if (func.userSimpleRoles && func.userSimpleRoles.length > 0) {
        return 'USER_BY_ROLE_SIMPLE';
      }
      // Cas où les deux sont vides : afficher un message
      return 'USER_BY_ROLE_EMPTY';
    }
    if (context === 'USER' && displayMode === 'BY_TRANSACTION' && func.transactionActions) {
      return 'USER_BY_TRANSACTION';
    }
    return 'UNKNOWN';
  }, [context, displayMode, func]);
  
  // 🎯 Calculer les doublons pour mode RÔLE et COMPOSITE
  const duplicateMap = useMemo(() => {
    if (context === 'ROLE' && parentName && allRisks) {
      // Pour ROLE : détecter les doublons dans le même rôle
      const currentRisk = allRisks.find((r: UnifiedRisk) => 
        r.functions?.some((f: UnifiedFunction) => f.code === code)
      );
      if (currentRisk) {
        return detectDuplicateActionsInRisk(currentRisk as any, parentName);
      }
    } else if (context === 'COMPOSITE' && parentName && allRisks && func.simpleRoles) {
      // Pour COMPOSITE : détecter les doublons entre tous les rôles simples dans cette fonction
      // On collecte toutes les actions de tous les rôles simples
      const allActions: Array<{ action: any; roleName: string }> = [];
      func.simpleRoles.forEach(simpleRole => {
        simpleRole.actions.forEach(action => {
          allActions.push({ action, roleName: simpleRole.roleName });
        });
      });
      
      // Créer une map pour détecter les doublons
      const actionMap = new Map<string, { functionIndices: number[]; isDuplicate: boolean; roleNames: string[] }>();
      
      allActions.forEach(({ action, roleName }, index) => {
        const actionKey = extractActionSignature(action);
        const existing = actionMap.get(actionKey);
        
        if (existing) {
          existing.functionIndices.push(functionIndex);
          if (!existing.roleNames.includes(roleName)) {
            existing.roleNames.push(roleName);
          }
          existing.isDuplicate = existing.roleNames.length > 1; // Dupliqué si présent dans plusieurs rôles
        } else {
          actionMap.set(actionKey, {
            functionIndices: [functionIndex],
            isDuplicate: false,
            roleNames: [roleName],
          });
        }
      });
      
      // Convertir en format attendu
      const result = new Map<string, { functionIndices: number[]; isDuplicate: boolean }>();
      actionMap.forEach((value, key) => {
        result.set(key, {
          functionIndices: value.functionIndices,
          isDuplicate: value.isDuplicate,
        });
      });
      
      return result;
    }
    return new Map();
  }, [context, parentName, allRisks, code, func, functionIndex]);
  
  // 🎯 Calculer les actions avec seulement S_TCODE (mode RÔLE et COMPOSITE)
  const onlyTCodeMap = useMemo(() => {
    if (context === 'ROLE' && func.actions) {
      return detectActionsWithOnlyTCodeInFunction({
        code: func.code,
        description: func.description,
        system: func.system || '',
        actions: func.actions,
        actionCount: func.actions.length,
      });
    } else if (context === 'COMPOSITE' && func.simpleRoles) {
      // Pour COMPOSITE : collecter toutes les actions de tous les rôles simples
      const allActions = func.simpleRoles.flatMap(sr => sr.actions);
      if (allActions.length > 0) {
        return detectActionsWithOnlyTCodeInFunction({
          code: func.code,
          description: func.description,
          system: func.system || '',
          actions: allActions,
          actionCount: allActions.length,
        });
      }
    }
    return new Map<string, boolean>();
  }, [context, func]);
  
  // 🚀 LAZY LOADING pour actions (mode RÔLE uniquement)
  const {
    visibleActions,
    hasMore: hasMoreActions,
    observerRef: actionObserverRef,
    remainingCount: remainingActions,
  } = useLazyActionRendering({
    allActions: func.actions || [],
    initialBatchSize: 5,
    scrollBatchSize: 3,
    lazyThreshold: 8,
  });
  
  // 🎯 Rendu du contenu selon le mode
  const renderContent = () => {
    switch (renderMode) {
      case 'ROLE_ACTIONS':
        return renderRoleActions();
      case 'COMPOSITE_ROLES':
        return renderCompositeRoles();
      case 'USER_BY_ROLE_COMPOSITE':
      case 'USER_BY_ROLE_SIMPLE':
        return renderUserByRole();
      case 'USER_BY_ROLE_EMPTY':
        return (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontStyle: 'italic',
              textAlign: 'center',
              py: 2,
            }}
          >
            Aucun rôle associé à cette fonction
          </Typography>
        );
      case 'USER_BY_TRANSACTION':
        return renderUserByTransaction();
      default:
        return (
          <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            Mode d'affichage non supporté
          </Typography>
        );
    }
  };
  
  // Mode RÔLE : Actions directes
  const renderRoleActions = () => {
    const actions = func.actions || [];
    
    if (actions.length === 0) {
      return (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontStyle: 'italic',
            textAlign: 'center',
            py: 2,
          }}
        >
          Aucune action
        </Typography>
      );
    }
    
    return (
      <>
        {visibleActions.map((action, index: number) => {
          const actionKey = extractActionSignature(action);
          const entry = duplicateMap?.get(actionKey);
          const isDuplicate = entry ? entry.isDuplicate && entry.functionIndices.includes(functionIndex) : false;
          
          return (
            <SodActionItem
              key={index}
              action={action}
              roleName={parentName || ''}
              level={0}
              defaultExpanded={false}
              isDuplicate={isDuplicate}
              hasOnlyTCodeInFunction={onlyTCodeMap.get(action.code) || false}
              onDelete={(code, resources) => parentName && riskId && onDeleteAction?.(parentName, riskId, code, resources)}
              onRestrict={(code, resources) => parentName && riskId && onRestrictAction?.(parentName, riskId, code, resources)}
              onRestrictResource={(actionCode, resourceCode, externalResourceCode, values) => 
                parentName && riskId && onRestrictResource?.(parentName, riskId, actionCode, resourceCode, externalResourceCode, values)
              }
            />
          );
        })}
        
        {/* Skeletons pour lazy loading */}
        {hasMoreActions && (
          <>
            {Array.from({ length: Math.min(remainingActions, 3) }).map((_, i) => (
              <SodActionSkeleton key={`skeleton-action-${i}`} />
            ))}
            <div 
              ref={actionObserverRef} 
              style={{ height: '1px', width: '100%' }} 
              aria-hidden="true"
            />
          </>
        )}
      </>
    );
  };
  
  // Mode COMPOSITE : Rôles simples avec actions
  const renderCompositeRoles = () => {
    const simpleRoles = func.simpleRoles || [];
    
    if (simpleRoles.length === 0) {
      return (
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontStyle: 'italic',
            textAlign: 'center',
            py: 2,
          }}
        >
          Aucun rôle simple
        </Typography>
      );
    }
    
    return (
      <>
        {simpleRoles.map((simpleRole, index) => (
          <SodSimpleRoleInCompositeItem
            key={`${simpleRole.roleName}-${index}`}
            simpleRole={simpleRole}
            functionCode={code}
            compositeRoleName={parentName}
            riskId={riskId}
            defaultExpanded={false}
            onDeleteAction={onDeleteAction}
            onRestrictAction={onRestrictAction}
            onRestrictResource={onRestrictResource}
            onExcludeRole={onExcludeRole}
            onlyTCodeMap={onlyTCodeMap}
          />
        ))}
      </>
    );
  };
  
  // Mode USER BY_ROLE : Composites + Simples avec actions
  // ⚠️ ORDRE GARANTI : Toujours afficher les rôles composites en premier, puis les rôles simples directs
  const renderUserByRole = () => {
    const compositeRoles = func.compositeRoles || [];
    const simpleRoles = func.userSimpleRoles || [];
    
    const toggleComposite = (roleName: string) => {
      setExpandedComposites(prev => {
        // Utiliser ?? pour gérer undefined, puis inverser
        const currentValue = prev[roleName] ?? (context === 'USER' ? false : true);
        return {
          ...prev,
          [roleName]: !currentValue,
        };
      });
    };
    
    const toggleSimple = (roleName: string) => {
      setExpandedSimples(prev => {
        // Utiliser ?? pour gérer undefined, puis inverser
        const currentValue = prev[roleName] ?? (context === 'USER' ? false : true);
        return {
          ...prev,
          [roleName]: !currentValue,
        };
      });
    };
    
    // Handler pour exclure/dé-exclure tout le rôle composite (tous ses rôles simples)
    const handleExcludeCompositeRole = React.useCallback((compositeRole: typeof compositeRoles[0]) => {
      if (!compositeRole.roleName) return;
      
      // Vérifier si tous les rôles simples sont déjà exclus
      const allExcluded = compositeRole.simpleRoles.every(sr => (sr as any).isExcluded || false);
      
      // Mode toggle : si tous sont exclus, les dé-exclure tous, sinon les exclure tous
      compositeRole.simpleRoles.forEach(simpleRole => {
        const isCurrentlyExcluded = (simpleRole as any).isExcluded || false;
        
        // Appliquer l'action seulement si nécessaire (toggle)
        if ((!allExcluded && !isCurrentlyExcluded) || (allExcluded && isCurrentlyExcluded)) {
          onExcludeRole?.(compositeRole.roleName, simpleRole.roleName);
        }
      });
    }, [onExcludeRole]);
    
    // Handlers pour les rôles simples (dans les composites et directs)
    const handleExcludeSimpleRole = React.useCallback((compositeRoleName: string, simpleRoleName: string) => {
      onExcludeRole?.(compositeRoleName, simpleRoleName);
    }, [onExcludeRole]);
    
    const handleDeleteAllActionsInSimpleRole = React.useCallback((simpleRole: typeof compositeRoles[0]['simpleRoles'][0]) => {
      if (!riskId) return;
      
      // Filtrer les actions avec S_TCODE
      const tCodeActions = (simpleRole.actions || []).filter(action => 
        action.resources?.some(r => r.code === 'S_TCODE')
      );
      
      if (tCodeActions.length === 0) return;
      
      // Déterminer le mode global
      const deletedActions = tCodeActions.filter(action => action.isDeleted);
      const mode = deletedActions.length > 0 ? "DÉSUPPRIMER" : "SUPPRIMER";
      
      // Appliquer l'action globale
      tCodeActions.forEach(action => {
        const isCurrentlyDeleted = action.isDeleted;
        
        // Appliquer l'action seulement si nécessaire
        if ((mode === "SUPPRIMER" && !isCurrentlyDeleted) || 
            (mode === "DÉSUPPRIMER" && isCurrentlyDeleted)) {
          onDeleteAction?.(simpleRole.roleName, riskId, action.code, action.resources || []);
        }
      });
    }, [riskId, onDeleteAction]);
    
    const handleRestrictAllActionsInSimpleRole = React.useCallback((simpleRole: typeof compositeRoles[0]['simpleRoles'][0]) => {
      if (!riskId || !simpleRole.actions) return;
      
      const allResourceValues = new Map<string, { resourceCode: string; externalResourceCode: string; values: string[] }>();
      
      simpleRole.actions.forEach(action => {
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
        return simpleRole.actions.some(action => 
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

      allResourceValues.forEach((data) => {
        onRestrictResource?.(
          simpleRole.roleName, 
          riskId, 
          '', 
          data.resourceCode, 
          data.externalResourceCode, 
          data.values,
          shouldRestrict
        );
      });
    }, [riskId, onRestrictResource]);
    
    return (
      <>
        {/* ⚠️ ORDRE GARANTI : Rôles Composites en premier */}
        {compositeRoles.map((cr, idx) => {
          // Pour USER, les rôles composites sont pliés par défaut
          const isCompositeExpanded = context === 'USER' 
            ? (expandedComposites[cr.roleName] ?? false) === true 
            : (expandedComposites[cr.roleName] ?? true) !== false;
          
          // 🎯 Calculer les badges T-Code et Permissions pour le rôle composite
          // (basé sur toutes les actions de tous les rôles simples)
          const allActions = cr.simpleRoles.flatMap(sr => sr.actions || []);
          const hasTCode = allActions.some(action => 
            action.resources?.some(resource => resource.code === 'S_TCODE')
          ) || false;
          const hasPermissions = allActions.some(action => 
            action.resources?.some(resource => resource.code !== 'S_TCODE')
          ) || false;
          
          const allTCodeActionsDeleted = (() => {
            const tCodeActions = allActions.filter(action => 
              action.resources?.some(r => r.code === 'S_TCODE')
            );
            return tCodeActions.length > 0 && tCodeActions.every(action => action.isDeleted);
          })();
          
          const allPermissionsRestricted = (() => {
            const permissionActions = allActions.filter(action => 
              action.resources?.some(r => r.code !== 'S_TCODE')
            );
            return permissionActions.length > 0 && permissionActions.every(action => action.isRestricted);
          })();
          
          // Calculer si tous les rôles simples sont exclus
          const allSimpleRolesExcluded = cr.simpleRoles.length > 0 && 
            cr.simpleRoles.every(sr => (sr as any).isExcluded || false);
          
          // Générer les badges
          const compositeBadges = [];
          if (hasTCode) {
            const isActionGrayed = allTCodeActionsDeleted;
            compositeBadges.push(
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
                    : theme.palette.info.main,
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
            const isPermissionGrayed = allPermissionsRestricted;
            compositeBadges.push(
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
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                P
              </Box>
            );
          }
          
          return (
            <Box 
              key={`composite-${cr.roleName}-${idx}`} 
              sx={{ 
                mb: 1.5,
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {/* En-tête Rôle Composite (cliquable) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
                onClick={() => toggleComposite(cr.roleName)}
              >
                <IconButton size="small" sx={{ p: 0.25 }}>
                  {isCompositeExpanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
                {/* Nom du rôle avec badges directement à droite */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {cr.roleName}
                  </Typography>
                  {/* Badges T-Code et Permissions - directement à droite du texte */}
                  {compositeBadges.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {compositeBadges}
                    </Box>
                  )}
                </Box>
                <Chip
                  label={`${cr.simpleRoles.length} rôle${cr.simpleRoles.length > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    backgroundColor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.dark,
                  }}
                />
                
                {/* Bouton Exclure pour le rôle composite */}
                <Tooltip
                  title={
                    allSimpleRolesExcluded
                      ? "Annuler l'exclusion du rôle composite"
                      : cr.simpleRoles.length === 0
                        ? "Aucun rôle simple à exclure"
                        : "Exclure le rôle composite"
                  }
                  arrow
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleExcludeCompositeRole(cr);
                      }}
                      disabled={cr.simpleRoles.length === 0}
                      sx={{
                        p: 0.5,
                        color: theme.palette.error.main,
                        backgroundColor: allSimpleRolesExcluded 
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
              </Box>
              
              {/* Contenu Rôle Composite (collapsible) */}
              <Collapse in={isCompositeExpanded} timeout="auto">
                <Box sx={{ p: 1 }}>
                  {cr.simpleRoles.map((sr, srIdx) => {
                    // Pour USER, les rôles simples sont pliés par défaut
                    const simpleKey = `${cr.roleName}-${sr.roleName}`;
                    const isSimpleExpanded = context === 'USER'
                      ? (expandedSimples[simpleKey] ?? false) === true
                      : (expandedSimples[simpleKey] ?? true) !== false;
                    
                    // 🎯 Calculer les badges T-Code et Permissions pour le rôle simple
                    const simpleHasTCode = (sr.actions || []).some(action => 
                      action.resources?.some(resource => resource.code === 'S_TCODE')
                    ) || false;
                    const simpleHasPermissions = (sr.actions || []).some(action => 
                      action.resources?.some(resource => resource.code !== 'S_TCODE')
                    ) || false;
                    
                    const simpleAllTCodeActionsDeleted = (() => {
                      const tCodeActions = (sr.actions || []).filter(action => 
                        action.resources?.some(r => r.code === 'S_TCODE')
                      );
                      return tCodeActions.length > 0 && tCodeActions.every(action => action.isDeleted);
                    })();
                    
                    const simpleAllPermissionsRestricted = (() => {
                      const permissionActions = (sr.actions || []).filter(action => 
                        action.resources?.some(r => r.code !== 'S_TCODE')
                      );
                      return permissionActions.length > 0 && permissionActions.every(action => action.isRestricted);
                    })();
                    
                    // Calculer si AU MOINS UNE action T-Code est supprimée (pour le mode toggle)
                    const anyTCodeActionDeleted = (() => {
                      const tCodeActions = (sr.actions || []).filter(action => 
                        action.resources?.some(r => r.code === 'S_TCODE')
                      );
                      return tCodeActions.some(action => action.isDeleted);
                    })();
                    
                    // Lire l'état d'exclusion depuis simpleRole
                    // Note: UserSodSimpleRole n'a pas isExcluded directement, on utilise le composite parent
                    const isRoleExcluded = (sr as any).isExcluded || false;
                    
                    // Calculer le mode du bouton "Restreindre Tous"
                    const buttonMode = (() => {
                      if (!sr.actions) return { mode: "RESTREINDRE", hasAnyRestricted: false };
                      
                      const allResourceValues = new Map<string, { resourceCode: string; externalResourceCode: string; values: string[] }>();
                      
                      sr.actions.forEach(action => {
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
                      
                      const hasAnyRestricted = Array.from(allResourceValues.entries()).some(([key, data]) => {
                        return sr.actions.some(action => 
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
                    })();
                    
                    // Générer les badges pour le rôle simple
                    const simpleBadges = [];
                    if (simpleHasTCode) {
                      const isActionGrayed = simpleAllTCodeActionsDeleted;
                      simpleBadges.push(
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
                              : theme.palette.info.main,
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
                    if (simpleHasPermissions) {
                      const isPermissionGrayed = simpleAllPermissionsRestricted;
                      simpleBadges.push(
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
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          P
                        </Box>
                      );
                    }
                    
                    return (
                      <Box 
                        key={`simple-${sr.roleName}-${srIdx}`} 
                        sx={{ 
                          mb: 1,
                          border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                          borderRadius: 0.75,
                          overflow: 'hidden',
                        }}
                      >
                        {/* En-tête Rôle Simple (cliquable) */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            p: 0.75,
                            backgroundColor: alpha(theme.palette.background.default, 0.5),
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.background.default, 0.7),
                            },
                          }}
                          onClick={() => toggleSimple(`${cr.roleName}-${sr.roleName}`)}
                        >
                          <IconButton size="small" sx={{ p: 0.25 }}>
                            {isSimpleExpanded ? (
                              <ExpandLessIcon fontSize="small" />
                            ) : (
                              <ExpandMoreIcon fontSize="small" />
                            )}
                          </IconButton>
                          {/* Nom du rôle avec badges directement à droite */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                              {sr.roleName}
                            </Typography>
                            {/* Badges T-Code et Permissions - directement à droite du texte */}
                            {simpleBadges.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {simpleBadges}
                              </Box>
                            )}
                          </Box>
                          <Chip
                            label={`${sr.actions.length} action${sr.actions.length > 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              backgroundColor: alpha(theme.palette.grey[500], 0.1),
                            }}
                          />
                          
                          {/* Boutons d'action pour le rôle simple */}
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {/* Bouton Exclure */}
                            <Tooltip 
                              title={
                                simpleAllTCodeActionsDeleted 
                                  ? "Toutes les actions sont déjà supprimées"
                                  : simpleAllPermissionsRestricted
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
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleExcludeSimpleRole(cr.roleName, sr.roleName);
                                  }}
                                  disabled={simpleAllTCodeActionsDeleted || simpleAllPermissionsRestricted}
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
                            
                            {/* Bouton Supprimer Tout */}
                            <Tooltip 
                              title={
                                isRoleExcluded
                                  ? "Rôle exclu de l'analyse"
                                  : simpleAllPermissionsRestricted
                                    ? "Toutes les permissions sont déjà restreintes"
                                    : !simpleHasTCode 
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
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleDeleteAllActionsInSimpleRole(sr);
                                  }}
                                  disabled={!simpleHasTCode || isRoleExcluded || simpleAllPermissionsRestricted}
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
                            
                            {/* Bouton Restreindre Tous */}
                            <Tooltip
                              title={
                                isRoleExcluded
                                  ? "Rôle exclu de l'analyse"
                                  : simpleAllTCodeActionsDeleted
                                    ? "Toutes les actions sont déjà supprimées"
                                    : !simpleHasPermissions 
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
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    handleRestrictAllActionsInSimpleRole(sr);
                                  }}
                                  disabled={!simpleHasPermissions || isRoleExcluded || simpleAllTCodeActionsDeleted}
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
                        
                        {/* Actions (collapsible) */}
                        <Collapse in={isSimpleExpanded} timeout="auto">
                          <Box sx={{ ml: 1.5, p: 0.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {sr.actions.map((action, actionIdx) => {
                              // Convertir UserSodAction en SodAction
                              const sodAction: SodAction = {
                                code: action.code,
                                description: action.description,
                                resources: action.resources,
                                isDeleted: action.isDeleted,
                                isRestricted: action.isRestricted,
                                restrictedByAction: false,
                              };
                              
                              return (
                                <SodActionItem
                                  key={`action-${action.code}-${actionIdx}`}
                                  action={sodAction}
                                  roleName={sr.roleName}
                                  level={1}
                                  defaultExpanded={false}
                                  onDelete={(code, resources) => onDeleteAction?.(sr.roleName, riskId || '', code, resources)}
                                  onRestrict={(code, resources) => onRestrictAction?.(sr.roleName, riskId || '', code, resources)}
                                  onRestrictResource={(actionCode, resourceCode, externalResourceCode, values) => 
                                    onRestrictResource?.(sr.roleName, riskId || '', actionCode, resourceCode, externalResourceCode, values)
                                  }
                                />
                              );
                            })}
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          );
        })}
        
        {/* ⚠️ ORDRE GARANTI : Rôles Simples directs après les composites */}
        {simpleRoles.map((sr, idx) => {
          // Pour USER, les rôles simples sont pliés par défaut
          const simpleKey = `direct-${sr.roleName}`;
          const isSimpleExpanded = context === 'USER'
            ? (expandedSimples[simpleKey] ?? false) === true
            : (expandedSimples[simpleKey] ?? true) !== false;
          
          // 🎯 Calculer les badges T-Code et Permissions pour le rôle simple
          const simpleHasTCode = (sr.actions || []).some(action => 
            action.resources?.some(resource => resource.code === 'S_TCODE')
          ) || false;
          const simpleHasPermissions = (sr.actions || []).some(action => 
            action.resources?.some(resource => resource.code !== 'S_TCODE')
          ) || false;
          
          const simpleAllTCodeActionsDeleted = (() => {
            const tCodeActions = (sr.actions || []).filter(action => 
              action.resources?.some(r => r.code === 'S_TCODE')
            );
            return tCodeActions.length > 0 && tCodeActions.every(action => action.isDeleted);
          })();
          
          const simpleAllPermissionsRestricted = (() => {
            const permissionActions = (sr.actions || []).filter(action => 
              action.resources?.some(r => r.code !== 'S_TCODE')
            );
            return permissionActions.length > 0 && permissionActions.every(action => action.isRestricted);
          })();
          
          // Calculer si AU MOINS UNE action T-Code est supprimée (pour le mode toggle)
          const anyTCodeActionDeleted = (() => {
            const tCodeActions = (sr.actions || []).filter(action => 
              action.resources?.some(r => r.code === 'S_TCODE')
            );
            return tCodeActions.some(action => action.isDeleted);
          })();
          
          // Lire l'état d'exclusion depuis simpleRole
          const isRoleExcluded = (sr as any).isExcluded || false;
          
          // Calculer le mode du bouton "Restreindre Tous"
          const buttonMode = (() => {
            if (!sr.actions) return { mode: "RESTREINDRE", hasAnyRestricted: false };
            
            const allResourceValues = new Map<string, { resourceCode: string; externalResourceCode: string; values: string[] }>();
            
            sr.actions.forEach(action => {
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
            
            const hasAnyRestricted = Array.from(allResourceValues.entries()).some(([key, data]) => {
              return sr.actions.some(action => 
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
          })();
          
          // Générer les badges pour le rôle simple
          const simpleBadges = [];
          if (simpleHasTCode) {
            const isActionGrayed = simpleAllTCodeActionsDeleted;
            simpleBadges.push(
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
                    : theme.palette.info.main,
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
          if (simpleHasPermissions) {
            const isPermissionGrayed = simpleAllPermissionsRestricted;
            simpleBadges.push(
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
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                P
              </Box>
            );
          }
          
          return (
            <Box 
              key={`simple-direct-${sr.roleName}-${idx}`} 
              sx={{ 
                mb: 1.5,
                border: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                borderRadius: 0.75,
                overflow: 'hidden',
              }}
            >
              {/* En-tête Rôle Simple (cliquable) */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 0.75,
                  backgroundColor: alpha(theme.palette.background.default, 0.5),
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.background.default, 0.7),
                  },
                }}
                onClick={() => toggleSimple(`direct-${sr.roleName}`)}
              >
                <IconButton size="small" sx={{ p: 0.25 }}>
                  {isSimpleExpanded ? (
                    <ExpandLessIcon fontSize="small" />
                  ) : (
                    <ExpandMoreIcon fontSize="small" />
                  )}
                </IconButton>
                {/* Nom du rôle avec badges directement à droite */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {sr.roleName}
                  </Typography>
                  {/* Badges T-Code et Permissions - directement à droite du texte */}
                  {simpleBadges.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {simpleBadges}
                    </Box>
                  )}
                </Box>
                <Chip
                  label={`${sr.actions.length} action${sr.actions.length > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    backgroundColor: alpha(theme.palette.grey[500], 0.1),
                  }}
                />
                
                {/* Boutons d'action pour le rôle simple direct */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {/* Bouton Exclure */}
                  <Tooltip 
                    title={
                      simpleAllTCodeActionsDeleted 
                        ? "Toutes les actions sont déjà supprimées"
                        : simpleAllPermissionsRestricted
                          ? "Toutes les permissions sont déjà restreintes"
                          : (sr as any).isExcluded 
                            ? "Annuler l'exclusion du rôle" 
                            : "Exclure le rôle de l'analyse"
                    } 
                    arrow
                  >
                    <span>
                      <IconButton
                        size="small"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          // Pour les rôles simples directs, utiliser '' comme compositeRoleName
                          handleExcludeSimpleRole('', sr.roleName);
                        }}
                        disabled={simpleAllTCodeActionsDeleted || simpleAllPermissionsRestricted}
                        sx={{
                          p: 0.5,
                          color: theme.palette.error.main,
                          backgroundColor: (sr as any).isExcluded 
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
                  
                  {/* Bouton Supprimer Tout */}
                  <Tooltip 
                    title={
                      isRoleExcluded
                        ? "Rôle exclu de l'analyse"
                        : simpleAllPermissionsRestricted
                          ? "Toutes les permissions sont déjà restreintes"
                          : !simpleHasTCode 
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
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDeleteAllActionsInSimpleRole(sr);
                        }}
                        disabled={!simpleHasTCode || isRoleExcluded || simpleAllPermissionsRestricted}
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
                  
                  {/* Bouton Restreindre Tous */}
                  <Tooltip
                    title={
                      isRoleExcluded
                        ? "Rôle exclu de l'analyse"
                        : simpleAllTCodeActionsDeleted
                          ? "Toutes les actions sont déjà supprimées"
                          : !simpleHasPermissions 
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
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleRestrictAllActionsInSimpleRole(sr);
                        }}
                        disabled={!simpleHasPermissions || isRoleExcluded || simpleAllTCodeActionsDeleted}
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
              
              {/* Actions (collapsible) */}
              <Collapse in={isSimpleExpanded} timeout="auto">
                <Box sx={{ ml: 1.5, p: 0.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {sr.actions.map((action, actionIdx) => {
                    const sodAction: SodAction = {
                      code: action.code,
                      description: action.description,
                      resources: action.resources,
                      isDeleted: action.isDeleted,
                      isRestricted: action.isRestricted,
                      restrictedByAction: false,
                    };
                    
                    return (
                      <SodActionItem
                        key={`action-${action.code}-${actionIdx}`}
                        action={sodAction}
                        roleName={sr.roleName}
                        level={1}
                        defaultExpanded={false}
                        onDelete={(code, resources) => onDeleteAction?.(sr.roleName, riskId || '', code, resources)}
                        onRestrict={(code, resources) => onRestrictAction?.(sr.roleName, riskId || '', code, resources)}
                        onRestrictResource={(actionCode, resourceCode, externalResourceCode, values) => 
                          onRestrictResource?.(sr.roleName, riskId || '', actionCode, resourceCode, externalResourceCode, values)
                        }
                      />
                    );
                  })}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </>
    );
  };
  
  // Mode USER BY_TRANSACTION : Actions avec rôles (valeurs dédupliquées)
  const renderUserByTransaction = () => {
    const transactionActions = func.transactionActions || [];
    
    return (
      <>
        {transactionActions.map((action, idx) => {
          // 🎯 Dédupliquer les ressources et organiser les rôles simples/composites en cascade
          type SimpleRoleWithComposites = {
            roleName: string;
            parentCompositeRoles: string[]; // Liste des composites qui contiennent ce rôle simple
          };
          
          type ResourceValueWithRoles = {
            valueFrom: string;
            valueTo?: string;
            displayValue: string;
            simpleRoles: SimpleRoleWithComposites[]; // Rôles simples organisés
          };
          
          type ResourceWithRoles = {
            code: string;
            description: string;
            externalResources: Array<{
              code: string;
              description: string;
              values: ResourceValueWithRoles[];
            }>;
            isDeleted: boolean;
            isRestricted: boolean;
          };
          
          const resourceMap = new Map<string, ResourceWithRoles>();
          
          action.roles?.forEach(role => {
            role.resources?.forEach(resource => {
              resource.externalResources?.forEach((extRes: any) => {
                extRes.values?.forEach((val: any) => {
                  const hasRange = val.valueTo && val.valueTo !== val.valueFrom;
                  const displayValue = hasRange ? `${val.valueFrom} → ${val.valueTo}` : val.valueFrom;
                  
                  // Vérifier si la ressource existe déjà
                  let existingResource = resourceMap.get(resource.code);
                  
                  if (!existingResource) {
                    existingResource = {
                      code: resource.code,
                      description: resource.description || '',
                      externalResources: [],
                      isDeleted: resource.isDeleted || false,
                      isRestricted: resource.isRestricted || false,
                    };
                    resourceMap.set(resource.code, existingResource);
                  }
                  
                  // Trouver ou créer l'external resource
                  let existingExtRes = existingResource!.externalResources.find(er => er.code === extRes.code);
                  
                  if (!existingExtRes) {
                    existingExtRes = {
                      code: extRes.code,
                      description: extRes.description || '',
                      values: [],
                    };
                    existingResource!.externalResources.push(existingExtRes);
                  }
                  
                  // Trouver ou créer la valeur
                  let existingValue = existingExtRes.values.find(v => v.displayValue === displayValue);
                  
                  if (!existingValue) {
                    existingValue = {
                      valueFrom: val.valueFrom,
                      valueTo: val.valueTo,
                      displayValue,
                      simpleRoles: [],
                    };
                    existingExtRes.values.push(existingValue);
                  }
                  
                  // Ajouter le rôle simple à cette valeur
                  const existingRole = existingValue.simpleRoles.find(sr => sr.roleName === role.roleName);
                  
                  if (!existingRole) {
                    existingValue.simpleRoles.push({
                      roleName: role.roleName,
                      parentCompositeRoles: role.parentCompositeRole ? [role.parentCompositeRole] : [],
                    });
                  } else if (role.parentCompositeRole && !existingRole.parentCompositeRoles.includes(role.parentCompositeRole)) {
                    // Ajouter le composite parent s'il n'existe pas déjà
                    existingRole.parentCompositeRoles.push(role.parentCompositeRole);
                  }
                });
              });
            });
          });
          
          const allResources = Array.from(resourceMap.values());
          
          const actionKey = `${action.code}-${idx}`;
          const isActionExpanded = expandedActions[actionKey] !== false; // true par défaut
          
          return (
            <Box key={actionKey} sx={{ mb: 1.5 }}>
              {/* Action avec affichage compact des ressources sur une ligne */}
              <Box
                sx={{
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                {/* En-tête Action (cliquable pour expand/collapse) */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    borderBottom: allResources.length > 0 && isActionExpanded ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
                    cursor: allResources.length > 0 ? 'pointer' : 'default',
                    '&:hover': allResources.length > 0 ? {
                      backgroundColor: alpha(theme.palette.primary.main, 0.06),
                    } : {},
                  }}
                  onClick={() => {
                    if (allResources.length > 0) {
                      setExpandedActions(prev => ({
                        ...prev,
                        [actionKey]: !isActionExpanded,
                      }));
                    }
                  }}
                >
                  {/* Icône expand/collapse */}
                  {allResources.length > 0 && (
                    <IconButton
                      size="small"
                      sx={{ p: 0.25 }}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setExpandedActions(prev => ({
                          ...prev,
                          [actionKey]: !isActionExpanded,
                        }));
                      }}
                    >
                      {isActionExpanded ? (
                        <ExpandLessIcon fontSize="small" />
                      ) : (
                        <ExpandMoreIcon fontSize="small" />
                      )}
                    </IconButton>
                  )}
                  
                  {!allResources.length && <Box sx={{ width: 28 }} />}
                  
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      color: theme.palette.grey[700],
                      flex: 1,
                    }}
                  >
                    {action.code}
                  </Typography>
                  
                  {/* Badges A et P */}
                  {(() => {
                    const hasTCode = allResources.some(r => r.code === 'S_TCODE');
                    const hasOtherResources = allResources.some(r => r.code !== 'S_TCODE');
                    const badges = [];
                    
                    if (hasTCode) {
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
                            backgroundColor: action.isDeleted ? theme.palette.grey[400] : theme.palette.info.main,
                            color: theme.palette.common.white,
                            opacity: action.isDeleted ? 0.5 : 1,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          A
                        </Box>
                      );
                    }
                    
                    if (hasOtherResources) {
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
                            backgroundColor: action.isRestricted ? theme.palette.grey[400] : theme.palette.warning.main,
                            color: theme.palette.common.white,
                            opacity: action.isRestricted ? 0.5 : 1,
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
                  })()}
                  
                  {/* Boutons d'action */}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (action.roles && riskId) {
                          action.roles.forEach(role => {
                            const roleResources = role.resources || [];
                            if (roleResources.length > 0) {
                              onDeleteAction?.(role.roleName, riskId, action.code, roleResources);
                            }
                          });
                        }
                      }}
                      disabled={action.isRestricted && !action.isDeleted}
                      sx={{ p: 0.5, color: theme.palette.error.main }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (action.roles && riskId) {
                          action.roles.forEach(role => {
                            const roleResources = role.resources || [];
                            if (roleResources.length > 0) {
                              onRestrictAction?.(role.roleName, riskId, action.code, roleResources);
                            }
                          });
                        }
                      }}
                      disabled={action.isDeleted}
                      sx={{ p: 0.5, color: theme.palette.warning.dark }}
                    >
                      <BlockIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>
                
                {/* Ressources sur une ligne (collapsible) */}
                {allResources.length > 0 && (
                  <Collapse in={isActionExpanded} timeout="auto">
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {allResources.map((resource: ResourceWithRoles, resIdx) => (
                        <Box key={`resource-${resource.code}-${resIdx}`}>
                          {resource.externalResources?.map((extRes, extIdx: number) => (
                            extRes.values.map((val, valIdx: number) => {
                              const resourceValueKey = `${actionKey}-${resource.code}-${extRes.code}-${val.displayValue}`;
                              const isResourceExpanded = expandedResources[resourceValueKey] || false;
                              
                              // Compter les rôles simples pour cette valeur
                              const simpleRolesCount = val.simpleRoles.length;
                              
                              return (
                                <Box key={`value-${valIdx}`} sx={{ mb: 0.75 }}>
                                  {/* En-tête Ressource (cliquable) */}
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      p: 0.75,
                                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                      borderRadius: 0.75,
                                      cursor: simpleRolesCount > 0 ? 'pointer' : 'default',
                                      border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                      '&:hover': simpleRolesCount > 0 ? {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.08),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                                      } : {},
                                    }}
                                    onClick={() => {
                                      if (simpleRolesCount > 0) {
                                        setExpandedResources(prev => ({
                                          ...prev,
                                          [resourceValueKey]: !prev[resourceValueKey],
                                        }));
                                      }
                                    }}
                                  >
                                    {/* Icône expand/collapse */}
                                    {simpleRolesCount > 0 && (
                                      <IconButton
                                        size="small"
                                        sx={{ p: 0.25 }}
                                        onClick={(e: React.MouseEvent) => {
                                          e.stopPropagation();
                                          setExpandedResources(prev => ({
                                            ...prev,
                                            [resourceValueKey]: !prev[resourceValueKey],
                                          }));
                                        }}
                                      >
                                        {isResourceExpanded ? (
                                          <ExpandLessIcon fontSize="small" />
                                        ) : (
                                          <ExpandMoreIcon fontSize="small" />
                                        )}
                                      </IconButton>
                                    )}
                                    
                                    {simpleRolesCount === 0 && <Box sx={{ width: 28 }} />}
                                    
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontFamily: 'monospace',
                                        color: 'text.secondary',
                                        fontWeight: 500,
                                        flex: 1,
                                      }}
                                    >
                                      {resource.code} : {extRes.code} ({val.displayValue})
                                    </Typography>
                                    
                                    {simpleRolesCount > 0 && (
                                      <Chip
                                        label={`${simpleRolesCount} rôle${simpleRolesCount > 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{
                                          height: 18,
                                          fontSize: '0.65rem',
                                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                                          color: theme.palette.info.dark,
                                        }}
                                      />
                                    )}
                                  </Box>
                                  
                                  {/* Rôles simples en cascade (collapsible) */}
                                  {simpleRolesCount > 0 && (
                                    <Collapse in={isResourceExpanded} timeout="auto">
                                      <Box sx={{ ml: 1.5, mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                        {val.simpleRoles.map((simpleRole, srIdx) => {
                                          const simpleRoleKey = `${resourceValueKey}-simple-${simpleRole.roleName}-${srIdx}`;
                                          const isSimpleRoleExpanded = expandedSimpleRoles[simpleRoleKey] || false;
                                          const hasCompositeRoles = simpleRole.parentCompositeRoles.length > 0;
                                          
                                          return (
                                            <Box 
                                              key={`simple-role-${srIdx}`} 
                                              sx={{ 
                                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                                borderRadius: 0.75,
                                                overflow: 'hidden',
                                                backgroundColor: alpha(theme.palette.background.paper, 0.5),
                                              }}
                                            >
                                              {/* En-tête Rôle Simple (cliquable) */}
                                              <Box
                                                sx={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 1,
                                                  p: 0.75,
                                                  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                                                  cursor: hasCompositeRoles ? 'pointer' : 'default',
                                                  '&:hover': hasCompositeRoles ? {
                                                    backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                                                  } : {},
                                                }}
                                                onClick={() => {
                                                  if (hasCompositeRoles) {
                                                    setExpandedSimpleRoles(prev => ({
                                                      ...prev,
                                                      [simpleRoleKey]: !prev[simpleRoleKey],
                                                    }));
                                                  }
                                                }}
                                              >
                                                {/* Icône expand/collapse pour les composites */}
                                                {hasCompositeRoles && (
                                                  <IconButton
                                                    size="small"
                                                    sx={{ p: 0.25 }}
                                                    onClick={(e: React.MouseEvent) => {
                                                      e.stopPropagation();
                                                      setExpandedSimpleRoles(prev => ({
                                                        ...prev,
                                                        [simpleRoleKey]: !prev[simpleRoleKey],
                                                      }));
                                                    }}
                                                  >
                                                    {isSimpleRoleExpanded ? (
                                                      <ExpandLessIcon fontSize="small" />
                                                    ) : (
                                                      <ExpandMoreIcon fontSize="small" />
                                                    )}
                                                  </IconButton>
                                                )}
                                                
                                                {!hasCompositeRoles && <Box sx={{ width: 28 }} />}
                                                
                                                <Typography
                                                  variant="caption"
                                                  sx={{
                                                    color: 'text.secondary',
                                                    fontWeight: 600,
                                                    flex: 1,
                                                  }}
                                                >
                                                  {simpleRole.roleName}
                                                </Typography>
                                                
                                                {hasCompositeRoles && (
                                                  <Chip
                                                    label={`${simpleRole.parentCompositeRoles.length} composite${simpleRole.parentCompositeRoles.length > 1 ? 's' : ''}`}
                                                    size="small"
                                                    sx={{
                                                      height: 18,
                                                      fontSize: '0.65rem',
                                                      backgroundColor: alpha(theme.palette.secondary.main, 0.15),
                                                      color: theme.palette.secondary.dark,
                                                    }}
                                                  />
                                                )}
                                              </Box>
                                              
                                              {/* Rôles Composites (collapsible) */}
                                              {hasCompositeRoles && (
                                                <Collapse in={isSimpleRoleExpanded} timeout="auto">
                                                  <Box sx={{ ml: 1, p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    {simpleRole.parentCompositeRoles.map((compositeName, compIdx) => (
                                                      <Box 
                                                        key={`composite-${compIdx}`}
                                                        sx={{
                                                          pl: 1.5,
                                                          borderLeft: `2px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                                                        }}
                                                      >
                                                        <Typography
                                                          variant="caption"
                                                          sx={{
                                                            color: 'text.secondary',
                                                            fontStyle: 'italic',
                                                            fontWeight: 500,
                                                          }}
                                                        >
                                                          {compositeName}
                                                        </Typography>
                                                      </Box>
                                                    ))}
                                                  </Box>
                                                </Collapse>
                                              )}
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Collapse>
                                  )}
                                </Box>
                              );
                            })
                          ))}
                        </Box>
                      ))}
                    </Box>
                  </Collapse>
                )}
              </Box>
            </Box>
          );
        })}
      </>
    );
  };
  
  return (
    <Paper
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.grey[300], 0.4)}`,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: theme.palette.background.paper,
        '&:hover': {
          border: `1px solid ${alpha(theme.palette.grey[500], 0.5)}`,
          transform: 'translateY(-1px)',
          boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
        },
      }}
    >
      {/* En-tête de la fonction */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          borderBottom: `1px solid ${alpha(theme.palette.grey[300], 0.3)}`,
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: alpha(theme.palette.grey[500], 0.12),
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Icône expandable */}
        <IconButton size="small" sx={{ p: 0.5 }}>
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
        
        {/* Icône fonction */}
        <FunctionsIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
        
        {/* Code + Description */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: theme.palette.grey[700],
                fontSize: '0.9375rem',
              }}
            >
              {code}
            </Typography>
            
            {/* Badge du nombre de risques (format X/Y) */}
            {riskStats.count > 0 && (
              <Chip
                label={`${riskStats.count}/${riskStats.total}`}
                size="small"
                variant="outlined"
                sx={{ 
                  fontWeight: 500, 
                  fontSize: '0.65rem',
                  height: '18px',
                  color: theme.palette.text.secondary,
                  borderColor: alpha(theme.palette.grey[400], 0.5),
                  backgroundColor: alpha(theme.palette.grey[100], 0.3),
                  '& .MuiChip-label': {
                    px: 0.8
                  }
                }}
              />
            )}
          </Box>
          
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              display: 'block',
              fontStyle: 'italic',
            }}
          >
            {description || system}
          </Typography>
        </Box>
        
        {/* Compteur d'exécutions (uniquement pour utilisateurs) */}
        {context === 'USER' && totalExecutionCount !== undefined && (
          <Chip
            icon={<PlayArrowIcon />}
            label={`${totalExecutionCount.toLocaleString()} exéc.`}
            size="small"
            sx={{
              height: 20,
              fontSize: '0.7rem',
              backgroundColor: alpha(theme.palette.grey[500], 0.1),
              '& .MuiChip-icon': {
                fontSize: '0.7rem',
              },
            }}
          />
        )}
      </Box>
      
      {/* Contenu (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {renderContent()}
        </Box>
      </Collapse>
      
      {/* Footer avec compteur (quand collapsed) */}
      {!expanded && (
        <Box
          sx={{
            mt: 'auto',
            p: 1,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontStyle: 'italic',
              display: 'block',
              textAlign: 'center',
            }}
          >
            {(() => {
              if (context === 'ROLE' && func.actions) {
                return `${func.actions.length} action${func.actions.length > 1 ? 's' : ''}`;
              }
              if (context === 'COMPOSITE' && func.simpleRoles) {
                return `${func.simpleRoles.length} rôle${func.simpleRoles.length > 1 ? 's' : ''} simple${func.simpleRoles.length > 1 ? 's' : ''}`;
              }
              if (context === 'USER') {
                if (displayMode === 'BY_TRANSACTION' && func.transactionActions) {
                  return `${func.transactionActions.length} action${func.transactionActions.length > 1 ? 's' : ''}`;
                }
                const totalRoles = (func.compositeRoles?.length || 0) + (func.userSimpleRoles?.length || 0);
                return `${totalRoles} rôle${totalRoles > 1 ? 's' : ''}`;
              }
              return 'N/A';
            })()}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

