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
    console.log('🔄 [LAZY LOAD] Reset useEffect triggered:', {
      allRolesLength: allRoles.length,
      initialCount,
      isLazyActive,
      lazyThreshold,
      previousVisibleCount: visibleCount
    });
    
    // ✅ CORRECTION : Ne pas réinitialiser si on a déjà plus de rôles visibles que disponibles
    const newVisibleCount = Math.min(visibleCount, allRoles.length);
    const finalVisibleCount = newVisibleCount < initialCount ? initialCount : newVisibleCount;
    
    setVisibleCount(finalVisibleCount);
    
    console.log('✅ [LAZY LOAD] Reset completed:', {
      newVisibleCount: finalVisibleCount,
      allRolesLength: allRoles.length,
      wasReset: finalVisibleCount !== visibleCount
    });
  }, [allRoles, initialCount, isLazyActive, lazyThreshold, visibleCount]);

  // 🔍 Intersection Observer pour charger au scroll
  useEffect(() => {
    console.log('🔍 [LAZY LOAD] useEffect triggered:', {
      isLazyActive,
      visibleCount,
      allRolesLength: allRoles.length,
      scrollBatchSize,
      shouldObserve: isLazyActive && visibleCount < allRoles.length
    });

    // Pas besoin d'observer si :
    // 1. Lazy loading désactivé
    // 2. Tous les rôles déjà visibles
    if (!isLazyActive || visibleCount >= allRoles.length) {
      console.log('❌ [LAZY LOAD] Observer désactivé:', {
        reason: !isLazyActive ? 'lazy loading désactivé' : 'tous les rôles visibles',
        isLazyActive,
        visibleCount,
        allRolesLength: allRoles.length
      });
      return;
    }

    console.log('✅ [LAZY LOAD] Création de l\'Observer:', {
      observerRefExists: !!observerRef.current,
      threshold: 0,
      rootMargin: '400px'
    });

    const observer = new IntersectionObserver(
      (entries) => {
        console.log('🎯 [LAZY LOAD] Observer callback triggered:', {
          entriesCount: entries.length,
          isIntersecting: entries[0]?.isIntersecting,
          visibleCount,
          allRolesLength: allRoles.length,
          hasMore: visibleCount < allRoles.length,
          shouldLoad: entries[0]?.isIntersecting && visibleCount < allRoles.length
        });

        if (entries[0].isIntersecting && visibleCount < allRoles.length) {
          const toLoad = Math.min(scrollBatchSize, allRoles.length - visibleCount);
          
          console.log('📥 [LAZY LOAD] Chargement batch suivant:', {
            currentVisible: visibleCount,
            toLoad,
            scrollBatchSize,
            remaining: allRoles.length - visibleCount,
            newVisibleCount: Math.min(visibleCount + scrollBatchSize, allRoles.length)
          });
          
          setVisibleCount(prev => {
            const newCount = Math.min(prev + scrollBatchSize, allRoles.length);
            console.log('🔄 [LAZY LOAD] setVisibleCount:', {
              previous: prev,
              newCount,
              scrollBatchSize,
              allRolesLength: allRoles.length
            });
            return newCount;
          });
        } else {
          console.log('⏸️ [LAZY LOAD] Pas de chargement:', {
            reason: !entries[0]?.isIntersecting ? 'pas visible' : 'tous chargés',
            isIntersecting: entries[0]?.isIntersecting,
            visibleCount,
            allRolesLength: allRoles.length
          });
        }
      },
      { 
        threshold: 0,          // ⚡ Trigger dès que visible (plus réactif)
        rootMargin: '400px'    // ⚡ Charger 400px AVANT (encore plus anticipé)
      }
    );

    if (observerRef.current) {
      console.log('👁️ [LAZY LOAD] Observer attaché à l\'élément:', {
        elementTag: observerRef.current.tagName,
        elementId: observerRef.current.id,
        elementClass: observerRef.current.className
      });
      observer.observe(observerRef.current);
    } else {
      console.log('❌ [LAZY LOAD] observerRef.current est null! Attente du DOM...');
      
      // ✅ SOLUTION : Attendre que l'élément DOM soit disponible
      const attachObserver = () => {
        if (observerRef.current) {
          console.log('✅ [LAZY LOAD] Observer attaché après attente:', {
            elementTag: observerRef.current.tagName,
            elementId: observerRef.current.id,
            elementClass: observerRef.current.className
          });
          observer.observe(observerRef.current);
        } else {
          console.log('❌ [LAZY LOAD] observerRef.current toujours null après attente');
        }
      };
      
      // Essayer immédiatement
      attachObserver();
      
      // Si toujours null, essayer après le prochain cycle de rendu
      if (!observerRef.current) {
        setTimeout(attachObserver, 0);
      }
    }

    return () => {
      console.log('🧹 [LAZY LOAD] Nettoyage de l\'Observer');
      observer.disconnect();
    };
  }, [visibleCount, allRoles.length, scrollBatchSize, isLazyActive]);

  // ⚡ Fonction pour forcer le chargement du prochain batch
  const loadNext = useCallback(() => {
    console.log('⚡ [LAZY LOAD] loadNext appelé:', {
      visibleCount,
      allRolesLength: allRoles.length,
      canLoad: visibleCount < allRoles.length
    });

    if (visibleCount < allRoles.length) {
      const toLoad = Math.min(scrollBatchSize, allRoles.length - visibleCount);
      console.log('⚡ [LAZY LOAD] Chargement manuel:', {
        currentVisible: visibleCount,
        toLoad,
        scrollBatchSize,
        remaining: allRoles.length - visibleCount
      });
      
      setVisibleCount(prev => {
        const newCount = Math.min(prev + scrollBatchSize, allRoles.length);
        console.log('🔄 [LAZY LOAD] loadNext setVisibleCount:', {
          previous: prev,
          newCount,
          scrollBatchSize
        });
        return newCount;
      });
    } else {
      console.log('⏸️ [LAZY LOAD] loadNext ignoré - tous les rôles déjà visibles');
    }
  }, [visibleCount, allRoles.length, scrollBatchSize]);

  const visibleRoles = allRoles.slice(0, visibleCount);
  const hasMore = visibleCount < allRoles.length;
  const remainingCount = allRoles.length - visibleCount;

  console.log('📊 [LAZY LOAD] Valeurs retournées:', {
    visibleRolesCount: visibleRoles.length,
    hasMore,
    remainingCount,
    isLazyActive,
    allRolesLength: allRoles.length,
    visibleCount
  });

  return {
    visibleRoles,
    hasMore,
    observerRef,
    remainingCount,
    loadNext,
    isLazyActive,
  };
}

