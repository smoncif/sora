/**
 * Composant UNIFIÉ pour afficher les fonctions d'un risque en layout grid (2 colonnes)
 * 
 * Remplace et unifie :
 * - SodFunctionGrid (rôles simples)
 * - SodCompositeFunctionGrid (rôles composites)
 * - FunctionByRoleSection / FunctionByTransactionSection (utilisateurs)
 * 
 * Gère automatiquement les différents contextes et modes d'affichage
 */

'use client';

import React from 'react';
import { Box, Grid } from '@mui/material';
import type { UnifiedFunction, UnifiedRiskContext, UnifiedDisplayMode, UnifiedRisk } from 'lib/types/unifiedSodTypes';
import { UnifiedFunctionCard } from './UnifiedFunctionCard';

export interface UnifiedFunctionGridProps {
  /** Fonctions à afficher */
  functions: UnifiedFunction[];
  
  /** Contexte d'affichage */
  context: UnifiedRiskContext;
  
  /** Mode d'affichage (pour utilisateurs uniquement) */
  displayMode?: UnifiedDisplayMode;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du parent (rôle ou utilisateur) */
  parentName?: string;
  
  /** ID du risque parent */
  riskId?: string;
  
  /** Tous les risques (pour calculs de statistiques) */
  allRisks?: UnifiedRisk[];
  
  /** Callbacks pour actions de remédiation */
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
 * Grille unifiée pour afficher les fonctions
 * Layout 2 colonnes pour tous les contextes
 */
export const UnifiedFunctionGrid: React.FC<UnifiedFunctionGridProps> = ({
  functions,
  context,
  displayMode = 'BY_ROLE',
  defaultExpanded = true,
  parentName,
  riskId,
  allRisks,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onExcludeRole,
}) => {
  if (functions.length === 0) {
    return (
      <Box
        sx={{
          p: 3,
          textAlign: 'center',
          color: 'text.secondary',
          fontStyle: 'italic',
        }}
      >
        Aucune fonction détectée
      </Box>
    );
  }
  
  return (
    <Box sx={{ mt: 2 }}>
      {/* Grid 2 colonnes (identique pour tous les contextes) */}
      <Grid container spacing={2}>
        {functions.map((func, index) => (
          <Grid key={`${func.code}-${index}`} size={{ xs: 12, md: 6 }}>
            <UnifiedFunctionCard
              func={func}
              context={context}
              displayMode={displayMode}
              defaultExpanded={defaultExpanded}
              parentName={parentName}
              riskId={riskId}
              allRisks={allRisks}
              functionIndex={index}
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

