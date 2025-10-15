/**
 * Composant pour affichage infini des rôles composites SoD avec scroll to load
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { Box, CircularProgress, Typography, Fade, LinearProgress } from '@mui/material';
import { SodCompositeRoleCardSuspense } from '../suspense/SodAnalysisResultsSuspense';
import type { SodCompositeRole } from 'lib/types/sodAnalysis';

export interface SodInfiniteCompositeRoleListProps {
  /** Tous les rôles composites chargés */
  roles: SodCompositeRole[];
  
  /** Fonction pour charger plus de rôles */
  loadMore: () => void;
  
  /** Y a-t-il encore des rôles à charger ? */
  hasMore: boolean;
  
  /** Chargement en cours */
  isLoadingMore: boolean;
  
  /** Nombre total de rôles disponibles */
  totalCount: number;
  
  /** Callbacks pour actions */
  onDeleteAction?: (roleName: string, actionCode: string) => void;
  onRestrictAction?: (roleName: string, actionCode: string) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
}

/**
 * Liste infinie de rôles composites avec scroll to load
 */
export const SodInfiniteCompositeRoleList: React.FC<SodInfiniteCompositeRoleListProps> = ({
  roles,
  loadMore,
  hasMore,
  isLoadingMore,
  totalCount,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          console.log('📥 [INFINITE SCROLL COMPOSITE] Déclenchement chargement', {
            rolesLoaded: roles.length,
            totalAvailable: totalCount,
          });
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore, roles.length, totalCount]);

  return (
    <Box>
      {/* Indicateur de progression */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {roles.length} / {totalCount} rôles composites chargés
          </Typography>
          <Typography variant="body2" color="primary" fontWeight="bold">
            {Math.round((roles.length / totalCount) * 100)}% chargé
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={(roles.length / totalCount) * 100}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {/* Liste des rôles */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {roles.map((role) => (
          <Fade key={role.roleName} in timeout={300}>
            <div>
              <SodCompositeRoleCardSuspense
                role={role}
                onDeleteAction={onDeleteAction}
                onRestrictAction={onRestrictAction}
                onRestrictResource={onRestrictResource}
                onDeleteRisk={undefined}
                onNextStep={undefined}
                showNextStepButton={false}
              />
            </div>
          </Fade>
        ))}
      </Box>

      {/* Sentinel */}
      <div ref={sentinelRef} style={{ height: '20px', margin: '20px 0' }} />

      {/* Chargement */}
      {isLoadingMore && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Chargement de plus de rôles composites...
          </Typography>
        </Box>
      )}

      {/* Fin */}
      {!hasMore && roles.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 4, borderTop: '1px solid', borderColor: 'divider', mt: 3 }}>
          <Typography variant="body1" color="text.secondary" fontWeight="bold">
            ✅ Tous les {totalCount} rôles composites ont été chargés
          </Typography>
        </Box>
      )}
    </Box>
  );
};

