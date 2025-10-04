/**
 * Composant pour afficher un rôle simple au sein d'un rôle composite
 * 
 * Hiérarchie : Fonction → **Rôle Simple** → Action → Resource
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { SodSimpleRoleInComposite } from 'lib/types/sodAnalysis';
import { SodActionItem } from './SodActionItem';

export interface SodSimpleRoleInCompositeItemProps {
  /** Rôle simple */
  simpleRole: SodSimpleRoleInComposite;
  
  /** Niveau d'indentation */
  level?: number;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle composite parent */
  compositeRoleName?: string;
  
  /** ID du risque parent */
  riskId?: string;
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
}

/**
 * Affiche un rôle simple au sein d'un rôle composite avec ses actions
 */
export const SodSimpleRoleInCompositeItem: React.FC<SodSimpleRoleInCompositeItemProps> = ({
  simpleRole,
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
  
  const { roleName, roleDescription, actions, actionCount } = simpleRole;
  
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
          borderRadius: 1,
          backgroundColor: alpha(theme.palette.primary.main, 0.04),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
          transition: 'all 0.2s ease',
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
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
        
        {/* Icône de personne supprimée */}
        
        {/* Nom du rôle simple */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontFamily: 'monospace',
            color: theme.palette.primary.dark,
            flex: 1,
            fontSize: '0.9rem',
          }}
        >
          {roleName}
        </Typography>
        
        {/* Badge de risque élevé supprimé - le risque est au niveau du risque, pas du rôle */}
        
        {/* Description (tooltip) supprimée */}
        
        {/* Icône de settings supprimée */}
        
        {/* Compteur d'actions supprimé */}
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
                onDelete={(code) => compositeRoleName && riskId && onDeleteAction?.(compositeRoleName, riskId, code)}
                onRestrict={(code) => compositeRoleName && riskId && onRestrictAction?.(compositeRoleName, riskId, code)}
                onRestrictResource={(actionCode, resourceCode, externalResourceCode, values) => 
                  compositeRoleName && riskId && onRestrictResource?.(compositeRoleName, riskId, actionCode, resourceCode, externalResourceCode, values)
                }
              />
            ))
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

