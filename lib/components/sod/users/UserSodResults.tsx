/**
 * Composant conteneur pour afficher les résultats d'analyse utilisateur SoD (Step 3)
 * 
 * Fonctionnalités :
 * - Switch entre mode "Par Rôle" et "Par Transaction"
 * - Pagination des utilisateurs (TanStack Query)
 * - Affichage des statistiques globales
 * - Synchronisation avec les steps 1 et 2
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  alpha,
  useTheme,
  Pagination,
  Skeleton,
  Chip,
  Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SecurityIcon from '@mui/icons-material/Security';

import { UserSodCard } from './UserSodCard';
import { 
  UserSodDisplayModeSwitch, 
  UserSodDisplayModeLegend,
  type UserDisplayMode,
} from './UserSodDisplayModeSwitch';
import type { UserSodEntry, UserSodMetrics } from 'lib/types/userSodAnalysis';

export interface UserSodResultsProps {
  /** Liste des utilisateurs */
  users: UserSodEntry[];
  
  /** Métriques globales */
  metrics?: UserSodMetrics;
  
  /** Page courante (0-based) */
  page: number;
  
  /** Nombre d'utilisateurs par page */
  pageSize: number;
  
  /** Nombre total d'utilisateurs */
  totalCount: number;
  
  /** Nombre total de pages */
  totalPages: number;
  
  /** Callback changement de page */
  onPageChange: (page: number) => void;
  
  /** État de chargement */
  isLoading?: boolean;
  
  /** Callbacks pour actions de remédiation */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

/**
 * Conteneur des résultats d'analyse utilisateur SoD
 */
export const UserSodResults: React.FC<UserSodResultsProps> = ({
  users,
  metrics,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  isLoading = false,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const theme = useTheme();
  
  // État local pour le mode d'affichage
  const [displayMode, setDisplayMode] = useState<UserDisplayMode>('BY_ROLE');
  
  // Gestion du changement de page
  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, newPage: number) => {
    onPageChange(newPage - 1); // Material-UI Pagination est 1-based
  }, [onPageChange]);
  
  return (
    <Box>
      {/* En-tête avec statistiques et switch de mode */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.primary.main, 0.03),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        {/* Statistiques globales */}
        {metrics && (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
              mb: 3,
            }}
          >
            {/* Nombre d'utilisateurs */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ color: theme.palette.primary.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {metrics.totalUsers.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                utilisateur{metrics.totalUsers > 1 ? 's' : ''}
              </Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            {/* Nombre de risques */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningAmberIcon sx={{ color: theme.palette.warning.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {metrics.totalRisks.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                risque{metrics.totalRisks > 1 ? 's' : ''}
              </Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            {/* Nombre d'exécutions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayArrowIcon sx={{ color: theme.palette.info.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {metrics.totalExecutions.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                exécution{metrics.totalExecutions > 1 ? 's' : ''}
              </Typography>
            </Box>
            
            <Divider orientation="vertical" flexItem />
            
            {/* Rôles risqués identifiés */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon sx={{ color: theme.palette.error.main }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {(metrics.riskySimpleRolesCount + metrics.riskyCompositeRolesCount).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                rôle{(metrics.riskySimpleRolesCount + metrics.riskyCompositeRolesCount) > 1 ? 's' : ''} risqué{(metrics.riskySimpleRolesCount + metrics.riskyCompositeRolesCount) > 1 ? 's' : ''}
              </Typography>
            </Box>
            
            {/* Distribution par niveau */}
            <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
              {metrics.risksByLevel.CRITICAL > 0 && (
                <Chip
                  label={`${metrics.risksByLevel.CRITICAL} Critique${metrics.risksByLevel.CRITICAL > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.error.dark, 0.15),
                    color: theme.palette.error.dark,
                    fontWeight: 600,
                  }}
                />
              )}
              {metrics.risksByLevel.HIGH > 0 && (
                <Chip
                  label={`${metrics.risksByLevel.HIGH} Élevé${metrics.risksByLevel.HIGH > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.error.main, 0.15),
                    color: theme.palette.error.main,
                    fontWeight: 600,
                  }}
                />
              )}
              {metrics.risksByLevel.MEDIUM > 0 && (
                <Chip
                  label={`${metrics.risksByLevel.MEDIUM} Moyen${metrics.risksByLevel.MEDIUM > 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.dark,
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </Box>
        )}
        
        {/* Switch mode d'affichage */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <UserSodDisplayModeSwitch
            value={displayMode}
            onChange={setDisplayMode}
            disabled={isLoading}
          />
          
          <UserSodDisplayModeLegend mode={displayMode} />
        </Box>
      </Paper>
      
      {/* Liste des utilisateurs */}
      <Box>
        {isLoading ? (
          // Skeletons de chargement
          Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton
              key={`skeleton-${index}`}
              variant="rounded"
              height={120}
              sx={{ mb: 2, borderRadius: 3 }}
            />
          ))
        ) : users.length === 0 ? (
          // État vide
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.grey[500], 0.05),
            }}
          >
            <PersonIcon sx={{ fontSize: 64, color: theme.palette.grey[400], mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Aucun utilisateur à afficher
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Importez un fichier d'analyse utilisateur pour commencer.
            </Typography>
          </Paper>
        ) : (
          // Liste des cartes utilisateurs
          users.map((user, index) => (
            <UserSodCard
              key={`${user.userId}-${index}`}
              user={user}
              displayMode={displayMode}
              defaultExpanded={index === 0}
              onDeleteAction={onDeleteAction}
              onRestrictAction={onRestrictAction}
              onRestrictResource={onRestrictResource}
            />
          ))
        )}
      </Box>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            mt: 4,
            pt: 3,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {((page * pageSize) + 1).toLocaleString()} - {Math.min((page + 1) * pageSize, totalCount).toLocaleString()} sur {totalCount.toLocaleString()}
          </Typography>
          
          <Pagination
            count={totalPages}
            page={page + 1} // Material-UI Pagination est 1-based
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
            disabled={isLoading}
            sx={{
              '& .MuiPaginationItem-root': {
                fontWeight: 500,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

