/**
 * Hook pour lazy rendering progressif des actions SoD au scroll
 * 
 * Pour les actions dans les fonctions (Étape 1)
 * 
 * Utilisation :
 * - Dans SodFunctionCard pour les actions
 * - Optimisé pour des listes d'actions longues
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseLazyActionRenderingParams<T> {
  /** Toutes les actions de la fonction */
  allActions: T[];
  
  /** Nombre d'actions à charger immédiatement */
  initialBatchSize?: number;
  
  /** Nombre d'actions à charger au scroll */
  scrollBatchSize?: number;
  
  /** Seuil pour activer le lazy loading */
  lazyThreshold?: number;
}

export interface UseLazyActionRenderingReturn<T> {
  /** Actions visibles à rendre */
  visibleActions: T[];
  
  /** Y a-t-il encore des actions à charger ? */
  hasMore: boolean;
  
  /** Ref pour l'Intersection Observer */
  observerRef: React.RefObject<HTMLDivElement>;
  
  /** Nombre d'actions restantes */
  remainingCount: number;
  
  /** Lazy loading actif ? */
  isLazyActive: boolean;
}

/**
 * Hook pour lazy rendering des actions au scroll
 */
export function useLazyActionRendering<T>({
  allActions,
  initialBatchSize = 5,      // ⚡ 5 actions immédiates
  scrollBatchSize = 3,       // ⚡ +3 actions au scroll
  lazyThreshold = 8,         // ⚡ Activer si > 8 actions
}: UseLazyActionRenderingParams<T>): UseLazyActionRenderingReturn<T> {
  
  // 🎯 SMART : Désactiver lazy loading si peu d'actions
  const isLazyActive = allActions.length > lazyThreshold;
  
  const initialCount = isLazyActive ? initialBatchSize : allActions.length;
  
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerRef = useRef<HTMLDivElement>(null);

  // ⚡ Reset quand les actions changent
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [allActions, initialCount]);

  // 🔍 Intersection Observer pour charger au scroll
  useEffect(() => {
    if (!isLazyActive || visibleCount >= allActions.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < allActions.length) {
          const toLoad = Math.min(scrollBatchSize, allActions.length - visibleCount);
          
          
          setVisibleCount(prev => Math.min(prev + scrollBatchSize, allActions.length));
        }
      },
      { 
        threshold: 0,
        rootMargin: '200px'  // ⚡ Anticipation 200px
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, allActions.length, scrollBatchSize, isLazyActive]);

  return {
    visibleActions: allActions.slice(0, visibleCount),
    hasMore: visibleCount < allActions.length,
    observerRef,
    remainingCount: allActions.length - visibleCount,
    isLazyActive,
  };
}
