/**
 * Composant pour afficher les fonctions d'un risque en layout "face à face" (2 colonnes)
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
  Divider,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
// import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Supprimé
import { SodSimpleRoleFunction, SodSimpleRoleRiskItem } from 'lib/types/sodAnalysis';
import { SodActionItem } from './SodActionItem';
import { detectDuplicateActionsInRisk, extractActionSignature } from 'lib/utils/sodConflictDetection';
import { useLazyActionRendering } from 'lib/hooks/sod/useLazyActionRendering';
import { SodActionSkeleton } from '../skeleton/SodActionSkeleton';

export interface SodFunctionGridProps {
  /** Fonctions à afficher */
  functions: SodSimpleRoleFunction[];
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle parent */
  roleName?: string;
  
  /** ID du risque parent */
  riskId?: string;
  
  /** Risque complet (pour détection de conflits) */
  risk?: SodSimpleRoleRiskItem;
  
  /** Tous les risques du rôle (pour calculer le nombre de risques par fonction) */
  allRisks?: SodSimpleRoleRiskItem[];
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

/**
 * Affiche une fonction individuelle avec ses actions
 */
const SodFunctionCard: React.FC<{
  func: SodSimpleRoleFunction;
  defaultExpanded?: boolean;
  roleName?: string;
  riskId?: string;
  risk?: SodSimpleRoleRiskItem;
  allRisks?: SodSimpleRoleRiskItem[];
  functionIndex?: number;
  duplicateMap?: Map<string, { functionIndices: number[]; isDuplicate: boolean }>;
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}> = ({ func, defaultExpanded = true, roleName, riskId, risk, allRisks, functionIndex = 0, duplicateMap, onDeleteAction, onRestrictAction, onRestrictResource }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const { code, description, system, actions } = func;
  
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
  
  // 🚀 LAZY LOADING : Chargement progressif des actions dans la fonction
  const {
    visibleActions,
    hasMore: hasMoreActions,
    observerRef: actionObserverRef,
    remainingCount: remainingActions,
    isLazyActive: isActionLazyActive,
  } = useLazyActionRendering({
    allActions: actions,
    initialBatchSize: 5,   // ⚡ 5 actions immédiates
    scrollBatchSize: 3,    // ⚡ +3 actions au scroll
    lazyThreshold: 8,      // ⚡ Activer si > 8 actions
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
      
      {/* Actions (collapsible) */}
      <Collapse in={expanded} timeout="auto">
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {actions.length === 0 ? (
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
          ) : (
            <>
              {/* Actions visibles */}
              {visibleActions.map((action, index: number) => {
                // Utiliser le duplicateMap pré-calculé (plus de détection à chaque fois !)
                const actionKey = extractActionSignature(action);
                const entry = duplicateMap?.get(actionKey);
                const isDuplicate = entry ? entry.isDuplicate && entry.functionIndices.includes(functionIndex) : false;
                
                return (
                  <SodActionItem
                    key={index}
                    action={action}
                    roleName={roleName || ''} // ✅ OPTIMISÉ : Ajouter roleName pour SodActionsContext
                    level={0}
                    defaultExpanded={false}
                    isDuplicate={isDuplicate}
                    onDelete={(code, resources) => roleName && riskId && onDeleteAction?.(roleName, riskId, code, resources)}
                    onRestrict={(code, resources) => roleName && riskId && onRestrictAction?.(roleName, riskId, code, resources)}
                    onRestrictResource={(actionCode, resourceCode, externalResourceCode, values) => 
                      roleName && riskId && onRestrictResource?.(roleName, riskId, actionCode, resourceCode, externalResourceCode, values)
                    }
                  />
                );
              })}
              
              {/* Skeletons pour actions non encore chargées */}
              {hasMoreActions && (
                <>
                  {Array.from({ length: Math.min(remainingActions, 3) }).map((_, i) => (
                    <SodActionSkeleton key={`skeleton-action-${i}`} />
                  ))}
                  
                  {/* Sentinel pour Intersection Observer */}
                  <div 
                    ref={actionObserverRef} 
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
      
      {/* Footer avec compteur */}
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
            {actions.length} action{actions.length > 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

/**
 * Affiche les fonctions en layout grid (2 colonnes face à face)
 */
export const SodFunctionGrid: React.FC<SodFunctionGridProps> = ({
  functions,
  defaultExpanded = true,
  roleName,
  riskId,
  risk,
  allRisks,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  
  // 🚀 OPTIMISATION CRITIQUE : Calculer les doublons UNE SEULE FOIS pour ce rôle dans ce risque
  // Compare uniquement les actions du MÊME rôle simple (pas avec d'autres rôles)
  const duplicateMap = useMemo(() => {
    return risk && roleName ? detectDuplicateActionsInRisk(risk, roleName) : new Map();
  }, [risk, roleName]);
  
  
  
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
        {functions.map((func, index) => (
          <Grid key={index} size={{ xs: 12, md: 6 }}>
            <SodFunctionCard
              func={func}
              defaultExpanded={defaultExpanded}
              roleName={roleName}
              riskId={riskId}
              risk={risk}
              allRisks={allRisks}
              functionIndex={index}
              duplicateMap={duplicateMap}
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

