'use client';

import { useMemo } from 'react';
import { 
  calculateEnrichedRoles, 
  calculateDynamicData,
  type ScoreCalculationConfig,
  type EnrichedRole,
  type DynamicData
} from 'lib/services/analysis/scoreCalculationService';
import { CoverageAnalysis } from 'lib/types/roleAnalysis';

/**
 * Configuration pour le hook useScoreCalculation
 */
export interface UseScoreCalculationConfig extends ScoreCalculationConfig {
  // Hérite de toute la configuration du service
}

/**
 * Résultat du hook useScoreCalculation
 */
export interface UseScoreCalculationReturn {
  /** Rôles enrichis avec tous les scores calculés */
  enrichedRoles: EnrichedRole[];
  /** Données dynamiques pour le business rôle */
  dynamicData: DynamicData;
  /** Fonction pour recalculer avec de nouvelles sélections */
  recalculateWithSelections: (newSelectedRoles: Set<string>) => EnrichedRole[];
  /** Trouver le meilleur rôle disponible (score le plus élevé) */
  findBestAvailableRole: (excludeSelected?: boolean) => EnrichedRole | null;
  /** Filtrer les rôles par score minimum */
  filterByMinScore: (minScore: number, excludeSelected?: boolean) => EnrichedRole[];
}

/**
 * Hook pour calculer les scores enrichis des rôles simples
 * 
 * Wrapper React autour du service scoreCalculationService qui :
 * - Mémorise les calculs pour éviter les recalculs inutiles
 * - Fournit des utilitaires pour la sélection automatique
 * - Réutilise exactement la même logique que AnalysisCard
 * 
 * @param analysis - Analyse de couverture du business rôle
 * @param selectedRoles - Rôles actuellement sélectionnés
 * @param config - Configuration de calcul des scores
 */
export const useScoreCalculation = (
  analysis: CoverageAnalysis,
  selectedRoles: Set<string>,
  config: UseScoreCalculationConfig
): UseScoreCalculationReturn => {

  // Calcul mémorisé des données dynamiques
  const dynamicData = useMemo(() => {
    return calculateDynamicData(analysis.businessRole, selectedRoles, config);
  }, [analysis.businessRole, selectedRoles, config.businessRoleTransactions, config.simpleRoleTransactions]);

  // Calcul mémorisé des rôles enrichis
  const enrichedRoles = useMemo(() => {
    return calculateEnrichedRoles(analysis, selectedRoles, config);
  }, [
    analysis,
    selectedRoles,
    config.coverageWeight,
    config.sizeWeight,
    config.usageWeight,
    config.includeFrequency,
    config.businessRoleTransactions,
    config.simpleRoleTransactions,
    config.staticScoresCache,
    config.transactionDetailsCache,
    config.targetRoleFilter,
    config.shouldShowZeroCoverage
  ]);

  // Fonction pour recalculer avec de nouvelles sélections
  const recalculateWithSelections = useMemo(() => {
    return (newSelectedRoles: Set<string>): EnrichedRole[] => {
      return calculateEnrichedRoles(analysis, newSelectedRoles, config);
    };
  }, [analysis, config]);

  // Fonction pour trouver le meilleur rôle disponible
  const findBestAvailableRole = useMemo(() => {
    return (excludeSelected: boolean = true): EnrichedRole | null => {
      const availableRoles = excludeSelected 
        ? enrichedRoles.filter(role => !selectedRoles.has(role.roleName))
        : enrichedRoles;

      if (availableRoles.length === 0) {
        return null;
      }

      // Trier par score global décroissant et prendre le premier
      const sortedRoles = availableRoles.sort((a, b) => b.globalScore - a.globalScore);
      return sortedRoles[0];
    };
  }, [enrichedRoles, selectedRoles]);

  // Fonction pour filtrer par score minimum
  const filterByMinScore = useMemo(() => {
    return (minScore: number, excludeSelected: boolean = true): EnrichedRole[] => {
      const rolesToFilter = excludeSelected 
        ? enrichedRoles.filter(role => !selectedRoles.has(role.roleName))
        : enrichedRoles;

      return rolesToFilter
        .filter(role => role.globalScore >= minScore)
        .sort((a, b) => b.globalScore - a.globalScore); // Tri décroissant par score
    };
  }, [enrichedRoles, selectedRoles]);

  return {
    enrichedRoles,
    dynamicData,
    recalculateWithSelections,
    findBestAvailableRole,
    filterByMinScore,
  };
};

export default useScoreCalculation;

