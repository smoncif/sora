/**
 * Composant pour afficher les fonctions d'un rôle composite en layout "face à face" (2 colonnes)
 * 
 * Hiérarchie : Fonction → Rôle Simple → Action → Resource
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
  // Tooltip, // Supprimé
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Supprimé
import { SodCompositeRoleFunction, SodCompositeRoleRiskItem } from 'lib/types/sodAnalysis';
import { SodSimpleRoleInCompositeItem } from './SodSimpleRoleInCompositeItem';
import { detectActionsWithOnlyTCodeInFunction } from 'lib/utils/sodConflictDetection';
import { useLazySimpleRoleRendering } from 'lib/hooks/sod/useLazySimpleRoleRendering';
import { SodSimpleRoleSkeleton } from '../skeleton/SodSimpleRoleSkeleton';

export interface SodCompositeFunctionGridProps {
  /** Fonctions à afficher */
  functions: SodCompositeRoleFunction[];
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle composite parent */
  compositeRoleName?: string;
  
  /** ID du risque parent */
  riskId?: string;
  
  /** Tous les risques du rôle composite (pour calculer le nombre de risques par fonction) */
  allRisks?: SodCompositeRoleRiskItem[];
  
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
 * Affiche une fonction composite individuelle avec ses rôles simples
 */
const SodCompositeFunctionCard: React.FC<{
  func: SodCompositeRoleFunction;
  defaultExpanded?: boolean;
  compositeRoleName?: string;
  riskId?: string;
  allRisks?: SodCompositeRoleRiskItem[];
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
  onExcludeRole?: (compositeRoleName: string, simpleRoleName: string) => void;
}> = ({ func, defaultExpanded = true, compositeRoleName, riskId, allRisks, onDeleteAction, onRestrictAction, onRestrictResource, onExcludeRole }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { code, description, system, simpleRoles, simpleRoleCount, totalActionCount } = func;
  
  // 🎯 Calculer le nombre de risques où cette fonction apparaît et le total
  const riskStats = useMemo(() => {
    if (!allRisks || allRisks.length === 0) return { count: 0, total: 0 };
    
    const count = allRisks.filter(risk => 
      risk.functions.some(f => f.code === code)
    ).length;
    
    return {
      count,
      total: allRisks.length
    };
  }, [allRisks, code]);
  
  // 🎯 Calculer les actions avec seulement S_TCODE dans cette fonction
  // Pour les composites, agrège les ressources de tous les rôles simples
  const onlyTCodeMap = useMemo(() => {
    return detectActionsWithOnlyTCodeInFunction(func);
  }, [func]);
  
  // 🚀 LAZY LOADING : Chargement progressif des rôles simples dans la fonction composite
  const {
    visibleSimpleRoles,
    hasMore: hasMoreSimpleRoles,
    observerRef: simpleRoleObserverRef,
    remainingCount: remainingSimpleRoles,
    isLazyActive: isSimpleRoleLazyActive,
  } = useLazySimpleRoleRendering({
    allSimpleRoles: simpleRoles,
    initialBatchSize: 5,   // ⚡ 5 rôles immédiats
    scrollBatchSize: 3,    // ⚡ +3 rôles au scroll
    lazyThreshold: 8,      // ⚡ Activer si > 8 rôles
  });
  
  
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
            
            {/* Badge du nombre de risques (format 3/5) */}
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
        
        {/* Icône (i) supprimée */}
      </Box>
      
      {/* Description complète supprimée (doublon) */}
      
      {/* Statistiques rapides supprimées */}
      
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
            <>
              {/* Rôles simples visibles */}
              {visibleSimpleRoles.map((simpleRole, index: number) => (
                <SodSimpleRoleInCompositeItem
                  key={index}
                  simpleRole={simpleRole}
                  functionCode={code}
                  level={0}
                  defaultExpanded={false}
                  compositeRoleName={compositeRoleName}
                  riskId={riskId}
                  onlyTCodeMap={onlyTCodeMap}
                  onDeleteAction={onDeleteAction}
                  onRestrictAction={onRestrictAction}
                  onRestrictResource={onRestrictResource}
                  onExcludeRole={onExcludeRole}
                />
              ))}
              
              {/* Skeletons pour rôles simples non encore chargés */}
              {hasMoreSimpleRoles && (
                <>
                  {Array.from({ length: Math.min(remainingSimpleRoles, 3) }).map((_, i) => (
                    <SodSimpleRoleSkeleton key={`skeleton-simple-role-${i}`} />
                  ))}
                  
                  {/* Sentinel pour Intersection Observer */}
                  <div 
                    ref={simpleRoleObserverRef} 
                    style={{ 
                      height: '1px', 
                      width: '100%' 
                    }} 
                    aria-hidden="true"
                  />
                </>
              )}
            </>
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
  allRisks,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onExcludeRole,
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
              allRisks={allRisks}
              onDeleteAction={onDeleteAction}
              onRestrictAction={onRestrictAction}
              onRestrictResource={onRestrictResource}
              onExcludeRole={onExcludeRole}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

