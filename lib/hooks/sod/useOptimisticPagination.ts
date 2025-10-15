/**
 * Hook pour pagination optimiste avec affichage immédiat des skeletons
 * Force l'affichage des placeholders pendant le chargement des données
 */

'use client';

import { useState, useCallback, useRef } from 'react';

export interface UseOptimisticPaginationProps {
  /** Nombre d'éléments par page */
  pageSize: number;
  /** Type de données (pour les logs) */
  type?: string;
}

export interface UseOptimisticPaginationReturn {
  /** Page actuelle */
  currentPage: number;
  /** Fonction de changement de page optimiste */
  handlePageChange: (event: unknown, newPage: number) => void;
  /** Fonction de changement de taille de page */
  handlePageSizeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Taille de page actuelle */
  pageSize: number;
  /** Indique si on doit afficher les skeletons */
  showSkeletons: boolean;
  /** Force l'affichage des skeletons (pour le chargement initial) */
  forceSkeletons: () => void;
  /** Arrête l'affichage forcé des skeletons */
  stopForceSkeletons: () => void;
}

/**
 * Hook pour pagination optimiste avec affichage immédiat
 */
export function useOptimisticPagination({
  pageSize: initialPageSize,
  type = 'data'
}: UseOptimisticPaginationProps): UseOptimisticPaginationReturn {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [isForcingSkeletons, setIsForcingSkeletons] = useState(false);
  const lastPageChangeTime = useRef<number>(0);

  const handlePageChange = useCallback((_event: unknown, newPage: number) => {
    const startTime = performance.now();
    
    // ⚡ ÉTAPE 1 : Changement immédiat de l'état
    setCurrentPage(newPage);
    
    // ⚡ ÉTAPE 2 : Forcer l'affichage des skeletons pendant 100ms minimum
    setIsForcingSkeletons(true);
    lastPageChangeTime.current = startTime;
    
    const endTime = performance.now();
    console.log(`⚡ ${type} page change UI: ${endTime - startTime}ms`);
    
    // ⚡ ÉTAPE 3 : Arrêter le forçage après un délai minimum
    setTimeout(() => {
      const elapsed = performance.now() - lastPageChangeTime.current;
      if (elapsed >= 100) { // Minimum 100ms d'affichage des skeletons
        setIsForcingSkeletons(false);
      }
    }, 100);
  }, [type]);

  const handlePageSizeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPageSize(newPageSize);
    setCurrentPage(0);
    setIsForcingSkeletons(true);
    
    // Arrêter le forçage après un délai
    setTimeout(() => {
      setIsForcingSkeletons(false);
    }, 100);
  }, []);

  const forceSkeletons = useCallback(() => {
    setIsForcingSkeletons(true);
  }, []);

  const stopForceSkeletons = useCallback(() => {
    setIsForcingSkeletons(false);
  }, []);

  return {
    currentPage,
    handlePageChange,
    handlePageSizeChange,
    pageSize,
    showSkeletons: isForcingSkeletons,
    forceSkeletons,
    stopForceSkeletons,
  };
}
