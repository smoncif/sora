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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface UseLazyRoleRenderingParams<T> {
  /** Tous les rôles de la page (depuis TanStack Query cache) */
  allRoles: T[];
  
  /** Nombre de rôles à charger immédiatement au changement de page */
  initialBatchSize?: number;
  
  /** Nombre de rôles à charger à chaque scroll */
  scrollBatchSize?: number;
  
  /** Seuil pour activer le lazy loading (si allRoles.length > threshold) */
  lazyThreshold?: number;
  
  /** État de chargement TanStack Query - première charge */
  isLoading?: boolean;
  
  /** État de chargement TanStack Query - mise à jour en arrière-plan */
  isFetching?: boolean;
  
  /** 🎯 PRIORITY-BASED : Rôle à prioriser (pour navigation) */
  priorityRoleName?: string;
  
  /** 🎯 PRIORITY-BASED : État de navigation pour éviter les conflits */
  isNavigating?: boolean;
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
  isLoading = false,
  isFetching = false,
  priorityRoleName,
  isNavigating = false,
}: UseLazyRoleRenderingParams<T>): UseLazyRoleRenderingReturn<T> {
  
  // 🎯 PRIORITY-BASED LAZY LOADING : Réorganiser les rôles si un rôle est priorisé
  const reorganizedRoles = useMemo(() => {
    console.log('🎯 [REORGANIZATION] useMemo déclenché:', {
      priorityRoleName,
      allRolesLength: allRoles.length,
      timestamp: new Date().toISOString()
    });
    
    if (!priorityRoleName || allRoles.length === 0) {
      console.log('🎯 [REORGANIZATION] Pas de réorganisation:', {
        reason: !priorityRoleName ? 'Pas de rôle priorisé' : 'Pas de rôles disponibles',
        priorityRoleName,
        allRolesLength: allRoles.length
      });
      return allRoles;
    }
    
    // Trouver le rôle priorisé
    const priorityRoleIndex = allRoles.findIndex((role: any) => role.roleName === priorityRoleName);
    
    if (priorityRoleIndex === -1) {
      // Rôle priorisé non trouvé, retourner l'ordre original
      console.log('🎯 [REORGANIZATION] Rôle priorisé non trouvé:', {
        priorityRoleName,
        allRolesNames: allRoles.map((r: any) => r.roleName),
        reason: 'Rôle priorisé non trouvé dans la liste'
      });
      return allRoles;
    }
    
    // 🎯 STRATÉGIE : Réorganiser avec le rôle priorisé en premier
    const priorityRole = allRoles[priorityRoleIndex];
    const otherRoles = allRoles.filter((_, index) => index !== priorityRoleIndex);
    
    console.log('🎯 [PRIORITY-BASED] Réorganisation des rôles:', {
      priorityRoleName,
      priorityRoleIndex,
      totalRoles: allRoles.length,
      reorganizedOrder: [priorityRoleName, ...otherRoles.map((r: any) => r.roleName)],
      timestamp: new Date().toISOString()
    });
    
    return [priorityRole, ...otherRoles];
  }, [allRoles, priorityRoleName]);
  
  // 🎯 SOLUTION C : Gestion intelligente du timing avec TanStack Query
  // - isLoading: première charge → désactiver lazy loading (éviter états incohérents)
  // - isFetching: mise à jour en arrière-plan → garder lazy loading actif
  // - ready: données disponibles → lazy loading optimal
  const isLazyActive = !isLoading && reorganizedRoles.length > lazyThreshold;
  
  console.log('🎯 [SOLUTION C] État TanStack Query:', {
    isLoading,
    isFetching,
    allRolesLength: reorganizedRoles.length,
    lazyThreshold,
    isLazyActive,
    priorityRoleName,
    reason: isLoading ? 'première charge' : reorganizedRoles.length <= lazyThreshold ? 'peu de rôles' : 'données prêtes'
  });
  
  // Si lazy loading désactivé, afficher tous les rôles immédiatement
  const initialCount = isLazyActive ? initialBatchSize : reorganizedRoles.length;
  
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const observerRef = useRef<HTMLDivElement>(null);

  // ⚡ Reset visibleCount quand allRoles change (changement de page)
  useEffect(() => {
    console.log('🔄 [LAZY LOAD] Reset useEffect triggered:', {
      allRolesLength: reorganizedRoles.length,
      initialCount,
      isLazyActive,
      lazyThreshold,
      previousVisibleCount: visibleCount,
      priorityRoleName,
      isNavigating,
      timestamp: new Date().toISOString()
    });
    
    // 🎯 PRIORITY-BASED : Ne pas réinitialiser pendant la navigation
    if (isNavigating && priorityRoleName) {
      console.log('🎯 [PRIORITY-BASED] Reset ignoré - navigation en cours:', {
        isNavigating,
        priorityRoleName,
        reason: 'Navigation active avec rôle priorisé'
      });
      return;
    }
    
    // ✅ CORRECTION : Ne pas réinitialiser si on a déjà plus de rôles visibles que disponibles
    const newVisibleCount = Math.min(visibleCount, reorganizedRoles.length);
    const finalVisibleCount = newVisibleCount < initialCount ? initialCount : newVisibleCount;
    
    console.log('🔄 [LAZY LOAD] Calcul du nouveau visibleCount:', {
      previousVisibleCount: visibleCount,
      newVisibleCount,
      finalVisibleCount,
      initialCount,
      allRolesLength: reorganizedRoles.length,
      willReset: finalVisibleCount !== visibleCount
    });
    
    setVisibleCount(finalVisibleCount);
    
    console.log('✅ [LAZY LOAD] Reset completed:', {
      newVisibleCount: finalVisibleCount,
      allRolesLength: reorganizedRoles.length,
      wasReset: finalVisibleCount !== visibleCount,
      priorityRoleName,
      isNavigating,
      timestamp: new Date().toISOString()
    });
  }, [reorganizedRoles, initialCount, isLazyActive, lazyThreshold, visibleCount, priorityRoleName, isNavigating]);

  // 🔍 Intersection Observer pour charger au scroll
  useEffect(() => {
    console.log('🔍 [LAZY LOAD] useEffect triggered:', {
      isLazyActive,
      visibleCount,
      allRolesLength: reorganizedRoles.length,
      scrollBatchSize,
      shouldObserve: isLazyActive && visibleCount < reorganizedRoles.length
    });

    // Pas besoin d'observer si :
    // 1. Lazy loading désactivé
    // 2. Tous les rôles déjà visibles
    if (!isLazyActive || visibleCount >= reorganizedRoles.length) {
      console.log('❌ [LAZY LOAD] Observer désactivé:', {
        reason: !isLazyActive ? 'lazy loading désactivé' : 'tous les rôles visibles',
        isLazyActive,
        visibleCount,
        allRolesLength: reorganizedRoles.length
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
            newVisibleCount: Math.min(visibleCount + scrollBatchSize, reorganizedRoles.length)
          });
          
          setVisibleCount(prev => {
            const newCount = Math.min(prev + scrollBatchSize, reorganizedRoles.length);
            console.log('🔄 [LAZY LOAD] setVisibleCount:', {
              previous: prev,
              newCount,
              scrollBatchSize,
              allRolesLength: reorganizedRoles.length
            });
            return newCount;
          });
        } else {
          console.log('⏸️ [LAZY LOAD] Pas de chargement:', {
            reason: !entries[0]?.isIntersecting ? 'pas visible' : 'tous chargés',
            isIntersecting: entries[0]?.isIntersecting,
            visibleCount,
            allRolesLength: reorganizedRoles.length
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
  }, [visibleCount, reorganizedRoles.length, scrollBatchSize]);

  const visibleRoles = reorganizedRoles.slice(0, visibleCount);
  const hasMore = visibleCount < reorganizedRoles.length;
  const remainingCount = reorganizedRoles.length - visibleCount;

  console.log('📊 [LAZY LOAD] Valeurs retournées:', {
    visibleRolesCount: visibleRoles.length,
    hasMore,
    remainingCount,
    isLazyActive,
    allRolesLength: reorganizedRoles.length,
    visibleCount,
    priorityRoleName,
    isNavigating,
    timestamp: new Date().toISOString()
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

