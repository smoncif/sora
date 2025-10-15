/**
 * Composant pour affichage infini des rôles SoD avec scroll to load
 * 
 * Utilise Intersection Observer pour détecter quand l'utilisateur
 * scrolle vers le bas et charge automatiquement plus de rôles.
 * 
 * Optimal pour les pages avec beaucoup de données (> 20 rôles)
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { Box, CircularProgress, Typography, Fade, LinearProgress } from '@mui/material';
import { SodSimpleRoleCardSuspense } from '../suspense/SodAnalysisResultsSuspense';
import type { SodSimpleRole } from 'lib/types/sodAnalysis';

export interface SodInfiniteRoleListProps {
  /** Tous les rôles chargés jusqu'à maintenant */
  roles: SodSimpleRole[];
  
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
  onRestrictResource?: (roleName: string, resourceCode: string, externalResourceCode: string, values: string[]) => Promise<void>;
}

/**
 * Liste infinie de rôles avec scroll to load
 */
export const SodInfiniteRoleList: React.FC<SodInfiniteRoleListProps> = ({
  roles,
  loadMore,
  hasMore,
  isLoadingMore,
  totalCount,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  // 📍 Sentinel pour Intersection Observer
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 🔍 Intersection Observer pour détecter le scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        
        // Si le sentinel est visible ET qu'il reste des données à charger
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          console.log('📥 [INFINITE SCROLL] Déclenchement chargement automatique', {
            rolesLoaded: roles.length,
            totalAvailable: totalCount,
            hasMore,
          });
          loadMore();
        }
      },
      {
        root: null, // viewport
        rootMargin: '200px', // Charger 200px avant d'atteindre le bas
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, loadMore, roles.length, totalCount]);

  return (
    <Box>
      {/* 📊 Indicateur de progression */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {roles.length} / {totalCount} rôles chargés
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

      {/* 📋 Liste des rôles */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {roles.map((role) => (
          <Fade key={role.roleName} in timeout={300}>
            <div>
              <SodSimpleRoleCardSuspense
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

      {/* 📍 Sentinel pour Intersection Observer */}
      <div
        ref={sentinelRef}
        style={{
          height: '20px',
          margin: '20px 0',
        }}
      />

      {/* 🔄 Indicateur de chargement */}
      {isLoadingMore && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          gap: 2,
          py: 4 
        }}>
          <CircularProgress size={40} />
          <Typography variant="body2" color="text.secondary">
            Chargement de plus de rôles...
          </Typography>
        </Box>
      )}

      {/* ✅ Message de fin */}
      {!hasMore && roles.length > 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 4,
          borderTop: '1px solid',
          borderColor: 'divider',
          mt: 3
        }}>
          <Typography variant="body1" color="text.secondary" fontWeight="bold">
            ✅ Tous les {totalCount} rôles ont été chargés
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Vous avez atteint la fin de la liste
          </Typography>
        </Box>
      )}
    </Box>
  );
};

