/**
 * Hook pour lazy rendering progressif des rôles simples SoD au scroll
 * 
 * Pour les rôles simples dans les fonctions composites (Étape 2)
 * 
 * Utilisation :
 * - Dans SodCompositeFunctionCard pour les simpleRoles
 * - Optimisé pour des listes de rôles longues
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseLazySimpleRoleRenderingParams<T> {
  /** Tous les rôles simples de la fonction */
  allSimpleRoles: T[];
  
  /** Nombre de rôles à charger immédiatement */
  initialBatchSize?: number;
  
  /** Nombre de rôles à charger au scroll */
  scrollBatchSize?: number;
  
  /** Seuil pour activer le lazy loading */
  lazyThreshold?: number;
}

export interface UseLazySimpleRoleRenderingReturn<T> {
  /** Rôles visibles à rendre */
  visibleSimpleRoles: T[];
  
  /** Y a-t-il encore des rôles à charger ? */
  hasMore: boolean;
  
  /** Ref pour l'Intersection Observer */
  observerRef: React.RefObject<HTMLDivElement>;
  
  /** Nombre de rôles restants */
  remainingCount: number;
  
  /** Lazy loading actif ? */
  isLazyActive: boolean;
}

/**
 * Hook pour lazy rendering des rôles simples au scroll
 */
export function useLazySimpleRoleRendering<T>({
  allSimpleRoles,
  initialBatchSize = 5,      // ⚡ 5 rôles immédiats
  scrollBatchSize = 3,       // ⚡ +3 rôles au scroll
  lazyThreshold = 8,         // ⚡ Activer si > 8 rôles
}: UseLazySimpleRoleRenderingParams<T>): UseLazySimpleRoleRenderingReturn<T> {
  
  // 🎯 SMART : Désactiver lazy loading si peu de rôles
  const isLazyActive = allSimpleRoles.length > lazyThreshold;
  
  const initialCount = isLazyActive ? initialBatchSize : allSimpleRoles.length;
  
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerRef = useRef<HTMLDivElement>(null);

  // ⚡ Reset quand les rôles changent
  useEffect(() => {
    setVisibleCount(initialCount);
  }, [allSimpleRoles, initialCount]);

  // 🔍 Intersection Observer pour charger au scroll
  useEffect(() => {
    if (!isLazyActive || visibleCount >= allSimpleRoles.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < allSimpleRoles.length) {
          const toLoad = Math.min(scrollBatchSize, allSimpleRoles.length - visibleCount);
          
          
          setVisibleCount(prev => Math.min(prev + scrollBatchSize, allSimpleRoles.length));
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
  }, [visibleCount, allSimpleRoles.length, scrollBatchSize, isLazyActive]);

  return {
    visibleSimpleRoles: allSimpleRoles.slice(0, visibleCount),
    hasMore: visibleCount < allSimpleRoles.length,
    observerRef,
    remainingCount: allSimpleRoles.length - visibleCount,
    isLazyActive,
  };
}
