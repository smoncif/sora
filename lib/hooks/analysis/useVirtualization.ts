import { useMemo } from 'react';

interface UseVirtualizationOptions {
  itemCount: number;
  threshold?: number;
  forceVirtualization?: boolean;
  disableVirtualization?: boolean;
}

interface UseVirtualizationResult {
  shouldVirtualize: boolean;
  recommendedHeight: number;
  itemHeight: number;
  overscan: number;
}

/**
 * Hook pour déterminer si la virtualisation doit être utilisée
 * et calculer les paramètres optimaux
 */
export function useVirtualization({
  itemCount,
  threshold = 50, // Seuil par défaut : virtualiser si plus de 50 éléments
  forceVirtualization = false,
  disableVirtualization = false,
}: UseVirtualizationOptions): UseVirtualizationResult {
  
  return useMemo(() => {
    // 🚫 Désactivation forcée
    if (disableVirtualization) {
      return {
        shouldVirtualize: false,
        recommendedHeight: Math.min(itemCount * 48, 600),
        itemHeight: 48,
        overscan: 0,
      };
    }

    // ✅ Activation forcée
    if (forceVirtualization) {
      return {
        shouldVirtualize: true,
        recommendedHeight: 600,
        itemHeight: 48,
        overscan: 5,
      };
    }

    // 🎯 Logique automatique basée sur le nombre d'éléments
    const shouldVirtualize = itemCount >= threshold;
    
    // Calcul de la hauteur recommandée
    let recommendedHeight: number;
    if (shouldVirtualize) {
      // Pour les listes virtualisées, hauteur fixe optimale
      if (itemCount <= 100) recommendedHeight = 400;
      else if (itemCount <= 500) recommendedHeight = 500;
      else recommendedHeight = 600;
    } else {
      // Pour les listes normales, hauteur basée sur le contenu (avec max)
      recommendedHeight = Math.min(itemCount * 48, 400);
    }

    // Calcul de l'overscan selon la taille de la liste
    let overscan: number;
    if (itemCount <= 100) overscan = 3;
    else if (itemCount <= 500) overscan = 5;
    else overscan = 8;

    return {
      shouldVirtualize,
      recommendedHeight,
      itemHeight: 48, // Hauteur fixe pour tous les éléments
      overscan,
    };
  }, [itemCount, threshold, forceVirtualization, disableVirtualization]);
}

/**
 * Hook spécialisé pour les tables de rôles métier
 */
export function useBusinessRoleVirtualization(
  businessRoleCount: number,
  forceVirtualization?: boolean
) {
  return useVirtualization({
    itemCount: businessRoleCount,
    threshold: 10, // Seuil plus bas pour les rôles métier (composants plus lourds)
    forceVirtualization,
  });
}

/**
 * Hook spécialisé pour les tables de rôles simples
 */
export function useSimpleRoleVirtualization(
  simpleRoleCount: number,
  forceVirtualization?: boolean
) {
  return useVirtualization({
    itemCount: simpleRoleCount,
    threshold: 50, // Seuil plus élevé pour les rôles simples
    forceVirtualization,
  });
}

export default useVirtualization; 