/**
 * Hook pour lazy rendering progressif des rôles au scroll
 * 
 * Concept :
 * - Charger un petit batch initial immédiatement (ex: 2 rôles)
 * - Charger le reste progressivement au scroll (ex: +1 rôle)
 * - Auto-détection : désactiver si la page a peu de rôles
 * - Compatible avec pagination et cache TanStack Query
 * 
 * Avantages :
 * - ✅ UX rapide : batch initial visible < 50ms
 * - ✅ Pages lourdes : chargement progressif transparent
 * - ✅ Pages légères : chargement complet immédiat
 * - ✅ Placeholders visuels (Skeletons)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseLazyRoleRenderingParams<T> {
  /** Tous les rôles de la page (depuis TanStack Query cache) */
  allRoles: T[];
  
  /** Nombre de rôles à charger immédiatement au changement de page */
  initialBatchSize?: number;
  
  /** Nombre de rôles à charger à chaque scroll */
  scrollBatchSize?: number;
  
  /** Seuil pour activer le lazy loading (si allRoles.length > threshold) */
  lazyThreshold?: number;
}

export interface UseLazyRoleRenderingReturn<T> {
  /** Rôles visibles à rendre actuellement */
  visibleRoles: T[];
  
  /** Y a-t-il encore des rôles à charger ? */
  hasMore: boolean;
  
  /** Ref pour l'Intersection Observer (sentinel) */
  observerRef: React.RefObject<HTMLDivElement>;
  
  /** Nombre de rôles restants (pour afficher les skeletons) */
  remainingCount: number;
  
  /** Forcer le chargement du prochain batch (optionnel) */
  loadNext: () => void;
  
  /** Lazy loading est-il actif pour cette page ? */
  isLazyActive: boolean;
}

/**
 * Hook pour lazy rendering progressif au scroll
 */
export function useLazyRoleRendering<T>({
  allRoles,
  initialBatchSize = 2,
  scrollBatchSize = 1,
  lazyThreshold = 3,
}: UseLazyRoleRenderingParams<T>): UseLazyRoleRenderingReturn<T> {
  
  // 🎯 SMART : Désactiver lazy loading si la page a peu de rôles
  const isLazyActive = allRoles.length > lazyThreshold;
  
  // Si lazy loading désactivé, afficher tous les rôles immédiatement
  const initialCount = isLazyActive ? initialBatchSize : allRoles.length;
  
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerRef = useRef<HTMLDivElement>(null);

  // ⚡ Reset visibleCount quand allRoles change (changement de page)
  useEffect(() => {
    console.log('🔄 [LAZY LOAD] Reset visibleCount:', {
      totalRoles: allRoles.length,
      initialCount,
      isLazyActive,
      threshold: lazyThreshold,
    });
    
    setVisibleCount(initialCount);
  }, [allRoles, initialCount, isLazyActive, lazyThreshold]);

  // 🔍 Intersection Observer pour charger au scroll
  useEffect(() => {
    // Pas besoin d'observer si :
    // 1. Lazy loading désactivé
    // 2. Tous les rôles déjà visibles
    if (!isLazyActive || visibleCount >= allRoles.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < allRoles.length) {
          const toLoad = Math.min(scrollBatchSize, allRoles.length - visibleCount);
          
          console.log('📥 [LAZY LOAD] Chargement batch suivant:', {
            currentVisible: visibleCount,
            toLoad,
            remaining: allRoles.length - visibleCount,
          });
          
          setVisibleCount(prev => Math.min(prev + scrollBatchSize, allRoles.length));
        }
      },
      { 
        threshold: 0.1,        // Trigger quand 10% du sentinel est visible
        rootMargin: '200px'    // Charger 200px AVANT d'atteindre le sentinel
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, allRoles.length, scrollBatchSize, isLazyActive]);

  // ⚡ Fonction pour forcer le chargement du prochain batch
  const loadNext = useCallback(() => {
    if (visibleCount < allRoles.length) {
      const toLoad = Math.min(scrollBatchSize, allRoles.length - visibleCount);
      console.log('⚡ [LAZY LOAD] Chargement manuel:', {
        currentVisible: visibleCount,
        toLoad,
      });
      
      setVisibleCount(prev => Math.min(prev + scrollBatchSize, allRoles.length));
    }
  }, [visibleCount, allRoles.length, scrollBatchSize]);

  const visibleRoles = allRoles.slice(0, visibleCount);
  const hasMore = visibleCount < allRoles.length;
  const remainingCount = allRoles.length - visibleCount;

  return {
    visibleRoles,
    hasMore,
    observerRef,
    remainingCount,
    loadNext,
    isLazyActive,
  };
}

