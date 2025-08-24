'use client';

import { CoverageAnalysis, SimpleRoleTransaction } from 'lib/types/roleAnalysis';

/**
 * Configuration pour le calcul des scores
 */
export interface ScoreCalculationConfig {
  coverageWeight: number;
  sizeWeight: number;
  usageWeight: number;
  includeFrequency: boolean;
  businessRoleTransactions: any[];
  simpleRoleTransactions: SimpleRoleTransaction[];
  staticScoresCache: Map<string, {
    usageFrequency: number;
    totalRoleTransactions: number;
    originalCoveredCount: number;
    simpleRoleExecutions: number;
    totalBusinessRoleExecutions: number;
  }>;
  transactionDetailsCache: Map<string, {
    covered: string[];
    nonUtilisees: string[];
    nonCouvertes: string[];
    orphelines: string[];
    total: number;
  }>;
  simpleRoleFilter?: string;
  shouldShowZeroCoverage?: boolean;
}

/**
 * Rôle simple enrichi avec tous les scores calculés
 */
export interface EnrichedRole {
  roleName: string;
  coveragePercentage: number;
  coveredTransactions: string[];
  uncoveredTransactions: string[];
  isSelected: boolean;
  details: {
    covered: string[];
    nonUtilisees: string[];
    nonCouvertes: string[];
    orphelines: string[];
    total: number;
    coveredButAlreadySelected: string[];
  };
  sizeScore: number;
  usageFrequency: number;
  globalScore: number;
  remainingUsageScore: number;
  remainingCoveredCount: number;
  alreadySelectedCount: number;
  totalRoleTransactions: number;
  cachedTotalExecutions?: number;
  cachedSimpleRoleExecutions?: number;
}

/**
 * Données dynamiques calculées pour un business rôle
 */
export interface DynamicData {
  totalRemainingTransactions: number;
  totalRemainingExecutions: number;
  remainingExecutionMap: Map<string, number>;
  remainingTransactionsList: string[];
}

// Cache global pour les détails des rôles - RÉUTILISÉ depuis BusinessRoleAnalysisCard
const detailsGlobalCache = new Map<string, any>();

// Cache pour les scores d'usage - RÉUTILISÉ depuis BusinessRoleAnalysisCard  
const usageScoreCache = new Map<string, number>();

// Cache pour les scores de taille - RÉUTILISÉ depuis BusinessRoleAnalysisCard
const sizeScoreCache = new Map<string, number>();

/**
 * Nettoyage automatique des caches pour éviter les fuites mémoire
 * RÉUTILISÉ depuis BusinessRoleAnalysisCard
 */
const cleanupCaches = () => {
  const maxCacheSize = 1000;
  
  if (detailsGlobalCache.size > maxCacheSize) {
    const entries = Array.from(detailsGlobalCache.entries());
    detailsGlobalCache.clear();
    entries.slice(-maxCacheSize / 2).forEach(([key, value]) => {
      detailsGlobalCache.set(key, value);
    });
  }
  
  if (usageScoreCache.size > maxCacheSize) {
    const entries = Array.from(usageScoreCache.entries());
    usageScoreCache.clear();
    entries.slice(-maxCacheSize / 2).forEach(([key, value]) => {
      usageScoreCache.set(key, value);
    });
  }
  
  if (sizeScoreCache.size > maxCacheSize) {
    const entries = Array.from(sizeScoreCache.entries());
    sizeScoreCache.clear();
    entries.slice(-maxCacheSize / 2).forEach(([key, value]) => {
      sizeScoreCache.set(key, value);
    });
  }
};

/**
 * Calculer les données dynamiques pour un business rôle
 * RÉUTILISÉ et extrait depuis BusinessRoleAnalysisCard
 */
export function calculateDynamicData(
  businessRole: string,
  selectedRoles: Set<string>,
  config: ScoreCalculationConfig
): DynamicData {
  // Récupérer les transactions du business rôle
  const businessRoleTransactionsList = config.businessRoleTransactions.filter(
    (transaction: any) => transaction.businessRole === businessRole
  );

  // Créer une map des transactions déjà couvertes par les rôles sélectionnés
  const alreadyCoveredTransactions = new Set<string>();
  for (const selectedRoleName of selectedRoles) {
    const roleTransactions = config.simpleRoleTransactions.filter(
      (transaction: any) => transaction.simpleRole === selectedRoleName
    );
    roleTransactions.forEach((transaction: any) => {
      alreadyCoveredTransactions.add(transaction.transaction);
    });
  }

  // Calculer les transactions restantes
  const remainingTransactions = businessRoleTransactionsList.filter(
    (transaction: any) => !alreadyCoveredTransactions.has(transaction.transaction)
  );

  // Créer une map des exécutions restantes
  const remainingExecutionMap = new Map<string, number>();
  let totalRemainingExecutions = 0;

  remainingTransactions.forEach((transaction: any) => {
    const execCount = transaction.executionCount || 0;
    remainingExecutionMap.set(transaction.transaction, execCount);
    totalRemainingExecutions += execCount;
  });

  return {
    totalRemainingTransactions: remainingTransactions.length,
    totalRemainingExecutions,
    remainingExecutionMap,
    remainingTransactionsList: remainingTransactions.map((t: any) => t.transaction),
  };
}

/**
 * Fonction getDetails extraite et adaptée depuis BusinessRoleAnalysisCard
 */
function createGetDetailsFunction(
  businessRole: string,
  selectedRoles: Set<string>,
  dynamicData: DynamicData,
  config: ScoreCalculationConfig
) {
  return (roleName: string) => {
    // Calculer les transactions du rôle simple
    const roleTransactions = config.simpleRoleTransactions
      .filter((transaction: any) => transaction.simpleRole === roleName)
      .map((transaction: any) => transaction.transaction);

    // Transactions couvertes par ce rôle parmi les restantes
    const covered = roleTransactions.filter((transaction: string) => 
      dynamicData.remainingTransactionsList.includes(transaction)
    );

    // Transactions de ce rôle déjà couvertes par d'autres rôles sélectionnés
    const alreadyCoveredBySelected = new Set<string>();
    for (const selectedRoleName of selectedRoles) {
      if (selectedRoleName !== roleName) {
        const selectedRoleTransactions = config.simpleRoleTransactions
          .filter((transaction: any) => transaction.simpleRole === selectedRoleName)
          .map((transaction: any) => transaction.transaction);
        selectedRoleTransactions.forEach((tx: string) => {
          if (roleTransactions.includes(tx)) {
            alreadyCoveredBySelected.add(tx);
          }
        });
      }
    }

    const coveredButAlreadySelected = Array.from(alreadyCoveredBySelected);

    // Transactions non utilisées par le business rôle
    const businessRoleTransactionsList = config.businessRoleTransactions
      .filter((transaction: any) => transaction.businessRole === businessRole)
      .map((transaction: any) => transaction.transaction);
    
    const nonUtilisees = roleTransactions.filter((transaction: string) => 
      !businessRoleTransactionsList.includes(transaction)
    );

    // Transactions du business rôle non couvertes par ce rôle
    const nonCouvertes = businessRoleTransactionsList.filter((transaction: string) => 
      !roleTransactions.includes(transaction)
    );

    // Transactions orphelines (du rôle mais pas dans les restantes ni déjà sélectionnées)
    const orphelines = roleTransactions.filter((transaction: string) => 
      !dynamicData.remainingTransactionsList.includes(transaction) && 
      !alreadyCoveredBySelected.has(transaction)
    );

    return {
      covered,
      nonUtilisees,
      nonCouvertes,
      orphelines,
      total: roleTransactions.length,
      coveredButAlreadySelected,
    };
  };
}

/**
 * Générer un hash unique pour les sélections (optimisation cache)
 */
function generateSelectionHash(selectedRoles: Set<string>): string {
  return Array.from(selectedRoles).sort().join('|');
}

/**
 * Calculer les rôles enrichis avec tous les scores
 * LOGIQUE EXTRAITE EXACTEMENT depuis BusinessRoleAnalysisCard (lignes 635-788)
 */
export function calculateEnrichedRoles(
  analysis: CoverageAnalysis,
  selectedRoles: Set<string>,
  config: ScoreCalculationConfig
): EnrichedRole[] {
  // Nettoyer les caches périodiquement
  cleanupCaches();

  // Calculer les données dynamiques
  const dynamicData = calculateDynamicData(analysis.businessRole, selectedRoles, config);
  
  // Créer la fonction getDetails
  const getDetails = createGetDetailsFunction(analysis.businessRole, selectedRoles, dynamicData, config);
  
  // Générer le hash de sélection pour le cache
  const selectionHash = generateSelectionHash(selectedRoles);

  // Processing en chunks pour éviter les blocages UI (comme dans l'original)
  const CHUNK_SIZE = 50;
  const processChunk = (startIdx: number, endIdx: number) => {
    return analysis.simpleRoles.slice(startIdx, endIdx).map(role => {
      // 🚀 CACHE GLOBAL : Vérifier le cache des détails (EXACT depuis BusinessRoleAnalysisCard)
      const globalCacheKey = `${analysis.businessRole}:${role.roleName}:${selectionHash}`;
      let details = detailsGlobalCache.get(globalCacheKey);
      
      if (!details) {
        details = getDetails(role.roleName);
        detailsGlobalCache.set(globalCacheKey, details);
      }

      // 🚀 CALCUL OPTIMISÉ : Couverture dynamique avec cache (EXACT depuis BusinessRoleAnalysisCard)
      const dynamicCoveragePercentage = dynamicData.totalRemainingTransactions > 0 
        ? (details.covered.length / dynamicData.totalRemainingTransactions) * 100 
        : 0;

      // 🚀 CACHE STATIQUE : Récupération rapide des scores pré-calculés (EXACT depuis BusinessRoleAnalysisCard)
      const staticCacheKey = `${analysis.businessRole}:${role.roleName}`;
      const cachedScores = config.staticScoresCache.get(staticCacheKey) || {
        usageFrequency: 0,
        totalRoleTransactions: 0,
        originalCoveredCount: 0,
        simpleRoleExecutions: 0,
        totalBusinessRoleExecutions: 0
      };

      // 🚀 CALCUL DYNAMIQUE : Score Taille avec cache optimisé (EXACT depuis BusinessRoleAnalysisCard)
      const sizeCacheKey = `${globalCacheKey}:size`;
      let dynamicSizeScore = sizeScoreCache.get(sizeCacheKey);
      
      if (dynamicSizeScore === undefined) {
        // Score de taille dynamique = transactions restantes couvertes / total transactions du rôle
        dynamicSizeScore = cachedScores.totalRoleTransactions > 0 
          ? (details.covered.length / cachedScores.totalRoleTransactions) * 100
          : 0;
        sizeScoreCache.set(sizeCacheKey, dynamicSizeScore);
      }

      // 🚀 OPTIMISATION MAJEURE : Cache des remainingUsageScore (EXACT depuis BusinessRoleAnalysisCard)
      const usageCacheKey = `${globalCacheKey}:usage`;
      let remainingUsageScore = usageScoreCache.get(usageCacheKey);
      
      if (remainingUsageScore === undefined) {
        // 🚀 OPTIMISÉ : Calcul direct avec Map.get au lieu de reduce
        remainingUsageScore = 0;
        
        for (const tx of details.covered) {
          const execCount = dynamicData.remainingExecutionMap.get(tx);
          if (execCount !== undefined) {
            remainingUsageScore += execCount;
          }
        }
        
        usageScoreCache.set(usageCacheKey, remainingUsageScore);
      }

      const dynamicUsagePercentage = dynamicData.totalRemainingExecutions > 0
        ? (remainingUsageScore / dynamicData.totalRemainingExecutions) * 100
        : 0;

      // 🚀 SCORE PONDÉRÉ OPTIMISÉ : Calcul rapide avec coefficients stables (EXACT depuis BusinessRoleAnalysisCard)
      // Score Global = (wCR × CR) + (wST × ST) + (wUR × UR) / (wCR + wST + wUR)
      const numerator = config.includeFrequency
        ? (dynamicCoveragePercentage * config.coverageWeight) +
          (dynamicSizeScore * config.sizeWeight) +
          (dynamicUsagePercentage * config.usageWeight)
        : (dynamicCoveragePercentage * config.coverageWeight) +
          (dynamicSizeScore * config.sizeWeight);
      
      const denominator = config.includeFrequency
        ? config.coverageWeight + config.sizeWeight + config.usageWeight
        : config.coverageWeight + config.sizeWeight;
      
      const globalScore = denominator > 0 ? numerator / denominator : 0;

      return {
        ...role,
        details,
        coveragePercentage: dynamicCoveragePercentage,
        sizeScore: dynamicSizeScore,
        usageFrequency: dynamicUsagePercentage,
        globalScore,
        remainingUsageScore,
        remainingCoveredCount: details.covered.length,
        alreadySelectedCount: details.coveredButAlreadySelected.length,
        totalRoleTransactions: cachedScores.totalRoleTransactions,
        ...(config.includeFrequency && { 
          cachedTotalExecutions: cachedScores.totalBusinessRoleExecutions,
          cachedSimpleRoleExecutions: cachedScores.simpleRoleExecutions
        })
      };
    });
  };

  // Traitement par chunks (EXACT depuis BusinessRoleAnalysisCard)
  let allProcessedRoles: EnrichedRole[] = [];
  for (let i = 0; i < analysis.simpleRoles.length; i += CHUNK_SIZE) {
    const endIdx = Math.min(i + CHUNK_SIZE, analysis.simpleRoles.length);
    allProcessedRoles = allProcessedRoles.concat(processChunk(i, endIdx));
  }

  // 🚀 FILTRAGE OPTIMISÉ : Filtrer selon les paramètres (adapté depuis BusinessRoleAnalysisCard)
  const filteredRoles = config.simpleRoleFilter 
    ? allProcessedRoles.filter(role => 
        role.roleName.toLowerCase().includes(config.simpleRoleFilter!.toLowerCase()) &&
        (config.shouldShowZeroCoverage || role.coveragePercentage > 0)
      )
    : allProcessedRoles.filter(role => 
        config.shouldShowZeroCoverage || role.coveragePercentage > 0
      );

  return filteredRoles;
}

/**
 * Exporter les caches pour debug et nettoyage externe
 */
export const scoreCaches = {
  detailsGlobalCache,
  usageScoreCache,
  sizeScoreCache,
  cleanupCaches,
};

