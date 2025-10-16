/**
 * Composant pour afficher une action avec ses ressources
 */

'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  alpha,
  useTheme,
  Tooltip,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BlockIcon from '@mui/icons-material/Block';
import WarningIcon from '@mui/icons-material/Warning';
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Supprimé
import { SodAction } from 'lib/types/sodAnalysis';
import { SodResourceItem } from './SodResourceItem';

export interface SodActionItemProps {
  /** Action */
  action: SodAction;
  
  /** Niveau d'indentation */
  level?: number;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Variante visuelle */
  variant?: 'default' | 'compact';
  
  /** Action dupliquée dans le risque */
  isDuplicate?: boolean;
  
  /** Désactiver tous les boutons (si le rôle parent est exclu) */
  disableButtons?: boolean;
  
  /** Callback pour supprimer l'action */
  onDelete?: (actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre l'action */
  onRestrict?: (actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
}

/**
 * Affiche une action avec ses ressources
 * 🚀 OPTIMISÉ : Mémoïsé pour éviter les re-rendus inutiles
 */
export const SodActionItem: React.FC<SodActionItemProps> = React.memo(({
  action,
  level = 0,
  defaultExpanded = false,
  variant = 'default',
  isDuplicate = false,
  disableButtons = false,
  onDelete,
  onRestrict,
  onRestrictResource,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { code, description, resources, isDeleted, isRestricted, restrictedByAction } = action as SodAction & { restrictedByAction?: boolean };

  const hasResources = resources.length > 0;
  
  // Détecter le type de ressource pour choisir l'icône
  const hasTCode = resources.some(resource => resource.code === 'S_TCODE');
  const hasOtherResources = resources.some(resource => resource.code !== 'S_TCODE');

  // Une action restreinte = toutes les ressources non-S_TCODE sont restreintes
  const allNonTCodeResourcesRestricted = isRestricted && hasOtherResources;
  
  // Déterminer les badges colorés à afficher (plus petits et adaptés aux états)
  const getActionBadges = () => {
    const badges = [];
    
    if (hasTCode) {
      // ✅ Désactiver si rôle exclu OU action supprimée
      const isActionGrayed = disableButtons || isDeleted;
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
            backgroundColor: isActionGrayed ? theme.palette.grey[400] : theme.palette.info.main, // Bleu pour les actions
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
    
    if (hasOtherResources) {
      // ✅ Désactiver si rôle exclu OU toutes les permissions restreintes
      const isPermissionGrayed = disableButtons || allNonTCodeResourcesRestricted;
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
            backgroundColor: isPermissionGrayed ? theme.palette.grey[400] : theme.palette.warning.main, // Orange pour les permissions
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
  };
  
  // Pour le mode compact, une seule icône (priorité T-Code)
  const getCompactIcon = () => {
    if (hasTCode) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: theme.palette.info.main,
            color: theme.palette.common.white,
            fontWeight: 700,
            fontSize: '0.7rem',
          }}
        >
          A
        </Box>
      );
    } else if (hasOtherResources) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: theme.palette.warning.main,
            color: theme.palette.common.white,
            fontWeight: 700,
            fontSize: '0.7rem',
          }}
        >
          P
        </Box>
      );
    }
    return null;
  };

  if (variant === 'compact') {
    return (
      <Chip
        icon={getCompactIcon()}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ fontWeight: 600 }}>{code}</span>
            {description && (
              <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                {description}
              </span>
            )}
          </Box>
        }
        size="small"
        variant="outlined"
        sx={{
          borderRadius: 1,
          borderColor: alpha(theme.palette.grey[400], 0.4),
          backgroundColor: alpha(theme.palette.grey[400], 0.08),
        }}
      />
    );
  }
  
  return (
    <Box sx={{ ml: level * 2 }}>
      {/* En-tête de l'action - 2 lignes */}
      <Box
        sx={{
          borderRadius: 1.5,
          backgroundColor: isDeleted 
            ? alpha(theme.palette.error.main, 0.08)
            : isRestricted
            ? alpha(theme.palette.warning.main, 0.08)
            : alpha(theme.palette.grey[400], 0.06),
          border: `1px solid ${
            isDeleted 
              ? alpha(theme.palette.error.main, 0.3)
              : isRestricted
              ? alpha(theme.palette.warning.main, 0.3)
              : alpha(theme.palette.grey[400], 0.2)
          }`,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isDeleted
              ? alpha(theme.palette.error.main, 0.12)
              : isRestricted
              ? alpha(theme.palette.warning.main, 0.12)
              : alpha(theme.palette.grey[400], 0.1),
            border: `1px solid ${
              isDeleted
                ? alpha(theme.palette.error.main, 0.4)
                : isRestricted
                ? alpha(theme.palette.warning.main, 0.4)
                : alpha(theme.palette.grey[400], 0.3)
            }`,
          },
        }}
      >
        {/* Ligne 1 : Code + Badges (gauche) et Boutons (droite) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1,
            px: 2,
          }}
        >
          {/* Partie gauche : Expand + Code + Badges */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Icône expandable */}
            {hasResources && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                sx={{ p: 0.5 }}
              >
                {expanded ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </IconButton>
            )}
            
            {/* Spacer si pas de ressources */}
            {!hasResources && (
              <Box sx={{ width: 28 }} />
            )}
            
            {/* Code de l'action */}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontFamily: 'monospace',
                color: theme.palette.grey[700],
              }}
            >
              {code}
            </Typography>

            {/* Badges juste après le code */}
            {getActionBadges()}

            {/* Icône d'alerte si action dupliquée - après les badges */}
            {isDuplicate && (
              <Tooltip title="Action dupliquée détectée dans ce risque" arrow>
                <WarningIcon 
                  sx={{ 
                    fontSize: 18, 
                    color: theme.palette.error.main, // Rouge vif pour se différencier
                    ml: 0.5,
                  }} 
                />
              </Tooltip>
            )}
          </Box>
          
          {/* Partie droite : Boutons d'action */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => onDelete?.(code, resources)}
              disabled={disableButtons || isRestricted || !hasTCode} // Désactivé si rôle exclu, restreinte, ou pas de S_TCODE
              sx={{
                p: 0.5,
                color: theme.palette.error.main,
                backgroundColor: isDeleted ? alpha(theme.palette.error.main, 0.15) : 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                },
                '&:disabled': {
                  color: theme.palette.grey[400],
                },
              }}
              title={
                disableButtons
                  ? "Rôle exclu de l'analyse"
                  : !hasTCode
                  ? "Impossible de supprimer (action sans S_TCODE)"
                  : isDeleted 
                  ? "Annuler suppression" 
                  : "Supprimer l'action"
              }
            >
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onRestrict?.(code, resources)}
              disabled={disableButtons || isDeleted || !hasOtherResources} // Désactivé si rôle exclu, supprimée, ou pas de ressources non-S_TCODE
              sx={{
                p: 0.5,
                color: theme.palette.warning.dark,
                backgroundColor: isRestricted ? alpha(theme.palette.warning.main, 0.15) : 'transparent',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.warning.main, 0.1),
                },
                '&:disabled': {
                  color: theme.palette.grey[400],
                },
              }}
              title={
                disableButtons
                  ? "Rôle exclu de l'analyse"
                  : !hasOtherResources 
                  ? "Aucune ressource à restreindre (seulement S_TCODE)"
                  : isRestricted 
                  ? "Annuler restriction" 
                  : "Restreindre l'action"
              }
            >
              <BlockIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Box>
        
        {/* Ligne 2 : Description */}
        {description && (
          <Box
            sx={{
              px: 2,
              pb: 1,
              pt: 0.25,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
                fontSize: '0.85rem',
                ml: hasResources ? 4.5 : 3.5, // Aligner avec le code
              }}
            >
              {description}
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Ressources (collapsible) */}
      {hasResources && (
          <Collapse in={expanded} timeout="auto">
            <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {resources.map((resource, index: number) => {
                // ✅ RÈGLE VISUELLE : 
                // - Si action supprimée : SEUL S_TCODE est marqué comme supprimé (fond rose)
                // - Les autres ressources sont restreintes automatiquement (fond beige/orange)
                const enhancedResource = {
                  ...resource,
                  // ✅ Seul S_TCODE hérite de isDeleted, les autres sont restreintes
                  isDeleted: isDeleted && resource.code === 'S_TCODE',
                  // ✅ Utiliser l'état calculé de la ressource (déjà correct via applyStateToResource)
                  isRestricted: resource.isRestricted,
                };

                return (
                  <SodResourceItem
                    key={index}
                    resource={enhancedResource}
                    level={1}
                    defaultExpanded={true}
                    disableButtons={disableButtons}
                    onRestrict={(resourceCode, externalResourceCode, values) => 
                      onRestrictResource?.(code, resourceCode, externalResourceCode, values)
                    }
                  />
                );
              })}
            </Box>
          </Collapse>
      )}
    </Box>
  );
}, (prevProps, nextProps) => {
  // 🚀 Comparaison personnalisée : ne re-rendre que si l'action change vraiment
  const prevAction = prevProps.action as SodAction & { restrictedByAction?: boolean };
  const nextAction = nextProps.action as SodAction & { restrictedByAction?: boolean };
  
  return (
    prevAction.code === nextAction.code &&
    prevAction.isDeleted === nextAction.isDeleted &&
    prevAction.isRestricted === nextAction.isRestricted &&
    prevAction.restrictedByAction === nextAction.restrictedByAction &&
    prevAction.resources === nextAction.resources &&
    prevProps.isDuplicate === nextProps.isDuplicate &&
    prevProps.disableButtons === nextProps.disableButtons &&
    prevProps.defaultExpanded === nextProps.defaultExpanded
  );
});

SodActionItem.displayName = 'SodActionItem';
