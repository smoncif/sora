/**
 * Hook pour lazy rendering progressif des fonctions SoD au scroll
 * 
 * Similaire à useLazyRoleRendering mais optimisé pour les fonctions
 * à l'intérieur d'un risque (plus granulaire)
 * 
 * Utilisation :
 * - Étape 1 : Actions dans fonctions (peut être lourd)
 * - Étape 2 : Rôles simples dans fonctions composites (peut être lourd)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseLazyFunctionRenderingParams<T> {
  /** Toutes les fonctions du risque */
  allFunctions: T[];
  
  /** Nombre de fonctions à charger immédiatement */
  initialBatchSize?: number;
  
  /** Nombre de fonctions à charger au scroll */
  scrollBatchSize?: number;
  
  /** Seuil pour activer le lazy loading */
  lazyThreshold?: number;
}

export interface UseLazyFunctionRenderingReturn<T> {
  /** Fonctions visibles à rendre */
  visibleFunctions: T[];
  
  /** Y a-t-il encore des fonctions à charger ? */
  hasMore: boolean;
  
  /** Ref pour l'Intersection Observer */
  observerRef: React.RefObject<HTMLDivElement>;
  
  /** Nombre de fonctions restantes */
  remainingCount: number;
  
  /** Lazy loading actif ? */
  isLazyActive: boolean;
}

/**
 * Hook pour lazy rendering des fonctions au scroll
 */
export function useLazyFunctionRendering<T>({
  allFunctions,
  initialBatchSize = 4,      // ⚡ 4 fonctions immédiates (2 colonnes)
  scrollBatchSize = 2,       // ⚡ +2 fonctions au scroll (1 ligne)
  lazyThreshold = 6,         // ⚡ Activer si > 6 fonctions
}: UseLazyFunctionRenderingParams<T>): UseLazyFunctionRenderingReturn<T> {
  
  // 🎯 SMART : Désactiver lazy loading si peu de fonctions
  const isLazyActive = allFunctions.length > lazyThreshold;
  
  const initialCount = isLazyActive ? initialBatchSize : allFunctions.length;
  
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerRef = useRef<HTMLDivElement>(null);

  // ⚡ Reset quand les fonctions changent
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [allFunctions, initialCount]);

  // 🔍 Intersection Observer pour charger au scroll
  useEffect(() => {
    if (!isLazyActive || visibleCount >= allFunctions.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < allFunctions.length) {
          const toLoad = Math.min(scrollBatchSize, allFunctions.length - visibleCount);
          
          console.log('📥 [LAZY FUNCTIONS] Chargement batch:', {
            currentVisible: visibleCount,
            toLoad,
            remaining: allFunctions.length - visibleCount,
          });
          
          setVisibleCount(prev => Math.min(prev + scrollBatchSize, allFunctions.length));
        }
      },
      { 
        threshold: 0,
        rootMargin: '300px'  // ⚡ Anticipation 300px
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [visibleCount, allFunctions.length, scrollBatchSize, isLazyActive]);

  return {
    visibleFunctions: allFunctions.slice(0, visibleCount),
    hasMore: visibleCount < allFunctions.length,
    observerRef,
    remainingCount: allFunctions.length - visibleCount,
    isLazyActive,
  };
}

