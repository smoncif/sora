/**
 * Composant pour afficher les fonctions d'un rôle composite en layout "face à face" (2 colonnes)
 * 
 * Hiérarchie : Fonction → Rôle Simple → Action → Resource
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
  // Tooltip, // Supprimé
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Supprimé
import { SodCompositeRoleFunction } from 'lib/types/sodAnalysis';
import { SodSimpleRoleInCompositeItem } from './SodSimpleRoleInCompositeItem';

export interface SodCompositeFunctionGridProps {
  /** Fonctions à afficher */
  functions: SodCompositeRoleFunction[];
  
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
 * Affiche une fonction composite individuelle avec ses rôles simples
 */
const SodCompositeFunctionCard: React.FC<{
  func: SodCompositeRoleFunction;
  defaultExpanded?: boolean;
  compositeRoleName?: string;
  riskId?: string;
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
}> = ({ func, defaultExpanded = true, compositeRoleName, riskId, onDeleteAction, onRestrictAction, onRestrictResource }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { code, description, system, simpleRoles, simpleRoleCount, totalActionCount } = func;
  
  return (
    <Paper
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: theme.shadows[3],
          borderColor: theme.palette.grey[500],
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
        <IconButton
          size="small"
          sx={{ p: 0.5 }}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
        
        {/* Icône de fonction supprimée */}
        
        {/* Code + Système */}
        <Box sx={{ flex: 1 }}>
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
        
        {/* Icône (i) supprimée */}
      </Box>
      
      {/* Description complète supprimée (doublon) */}
      
      {/* Statistiques rapides */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          px: 1.5,
          py: 1,
          backgroundColor: alpha(theme.palette.background.default, 0.3),
          borderBottom: `1px solid ${theme.palette.divider}`,
          justifyContent: 'center',
        }}
      >
        <Chip
          label={`${simpleRoleCount} rôle${simpleRoleCount > 1 ? 's' : ''} simple${simpleRoleCount > 1 ? 's' : ''}`}
          size="small"
          color="warning"
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: '0.7rem' }}
        />
        
        {/* Compteur d'actions supprimé */}
      </Box>
      
      {/* Rôles simples (collapsible) */}
      <Collapse in={expanded} timeout="auto">
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {simpleRoles.length === 0 ? (
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
          ) : (
            simpleRoles.map((simpleRole, index: number) => (
              <SodSimpleRoleInCompositeItem
                key={index}
                simpleRole={simpleRole}
                level={0}
                defaultExpanded={false}
                compositeRoleName={compositeRoleName}
                riskId={riskId}
                onDeleteAction={onDeleteAction}
                onRestrictAction={onRestrictAction}
                onRestrictResource={onRestrictResource}
              />
            ))
          )}
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
            {simpleRoleCount} rôle{simpleRoleCount > 1 ? 's' : ''} simple{simpleRoleCount > 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

/**
 * Affiche les fonctions composites en layout grid (2 colonnes face à face)
 */
export const SodCompositeFunctionGrid: React.FC<SodCompositeFunctionGridProps> = ({
  functions,
  defaultExpanded = true,
  compositeRoleName,
  riskId,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  
  if (functions.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          color: theme.palette.text.secondary,
          fontStyle: 'italic',
        }}
      >
        <Typography variant="body2">Aucune fonction détectée</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ mt: 2 }}>
      
      {/* Grid 2 colonnes */}
      <Grid container spacing={2}>
        {functions.map((func, index: number) => (
          <Grid key={index} size={{ xs: 12, md: 6 }}>
            <SodCompositeFunctionCard
              func={func}
              defaultExpanded={defaultExpanded}
              compositeRoleName={compositeRoleName}
              riskId={riskId}
              onDeleteAction={onDeleteAction}
              onRestrictAction={onRestrictAction}
              onRestrictResource={onRestrictResource}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

