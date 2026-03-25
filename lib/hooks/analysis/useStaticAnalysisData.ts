'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef } from 'react';
import { SimplifiedAnalysisResult, CoverageAnalysis } from 'lib/types/roleAnalysis';

/**
 * Données statiques pré-calculées pour une analyse
 * (ne changent jamais après chargement du fichier)
 */
export interface StaticAnalysisData {
  /** Cache des scores statiques : clé = "businessRole:simpleRole" */
  staticScoresCache: Map<string, {
    sizeScore: number;
    usageFrequency: number;
    totalRoleTransactions: number;
    originalCoveredCount: number;
    simpleRoleExecutions: number;
    totalBusinessRoleExecutions: number;
  }>;

  /** Cache des données brutes par business role */
  businessRoleDataCache: Map<string, {
    businessRoleTxSet: Set<string>;
    txExecutionMap: Map<string, number>;
    currentBusinessRoleTransactions: any[];
    originalTransactions: string[];
    maxAchievableInfo: {
      orphanTransactions: string[];
      maxAchievableTransactions: number;
      totalTransactions: number;
    };
  }>;

  /** Cache global : simpleRole → liste de noms de transactions */
  transactionsByRoleCache: Map<string, string[]>;

  /** Cache des détails fixes par transaction */
  transactionDetailsCache: Map<string, {
    covered: string[];
    nonUtilisees: string[];
    nonCouvertes: string[];
    orphelines: string[];
    total: number;
  }>;

  /** true quand tous les business roles ont été calculés (y compris non-visibles) */
  isFullyComputed: boolean;
  /** Nombre de business roles déjà calculés */
  computedCount: number;
  /** Nombre total de business roles à calculer */
  totalCount: number;
}

/** Taille des lots pour le calcul différé en arrière-plan */
const BATCH_SIZE = 20;

// ---------------------------------------------------------------------------
// Fonctions pures (hors hook) pour éviter les recréations inutiles
// ---------------------------------------------------------------------------

/** Construit l'index : businessRole → ses transactions (O(n) sur businessRoleTransactions) */
function buildTxByBusinessRoleIndex(
  analysisResult: SimplifiedAnalysisResult
): Map<string, Array<{ transaction: string; executionCount: number; businessRole: string }>> {
  const map = new Map<
    string,
    Array<{ transaction: string; executionCount: number; businessRole: string }>
  >();
  (analysisResult.businessRoleTransactions || []).forEach(tx => {
    let arr = map.get(tx.businessRole);
    if (!arr) {
      arr = [];
      map.set(tx.businessRole, arr);
    }
    arr.push(tx);
  });
  return map;
}

/** Construit l'index : simpleRole → liste de noms de transactions (O(n) sur simpleRoleTransactions) */
function buildTxBySimpleRoleIndex(
  analysisResult: SimplifiedAnalysisResult
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  (analysisResult.simpleRoleTransactions || []).forEach(t => {
    let arr = map.get(t.simpleRole);
    if (!arr) {
      arr = [];
      map.set(t.simpleRole, arr);
    }
    arr.push(t.transaction);
  });
  return map;
}

/** Calcule et stocke dans les caches les données statiques pour UN business role */
function computeForBusinessRole(
  analysis: CoverageAnalysis,
  txByBR: Map<string, Array<{ transaction: string; executionCount: number; businessRole: string }>>,
  txBySimpleRole: Map<string, string[]>,
  staticScoresCache: Map<string, any>,
  businessRoleDataCache: Map<string, any>,
  transactionDetailsCache: Map<string, any>
): void {
  const businessRole = analysis.businessRole;
  const currentBRTxs = txByBR.get(businessRole) || [];

  // Construire les structures de lookup pour ce business role
  const businessRoleTxSet = new Set<string>();
  const txExecutionMap = new Map<string, number>();
  currentBRTxs.forEach(tx => {
    businessRoleTxSet.add(tx.transaction);
    txExecutionMap.set(tx.transaction, tx.executionCount || 0);
  });

  // Calculer les transactions maximum atteignables
  const allCoverableTransactions = new Set<string>();
  analysis.simpleRoles.forEach(role => {
    (role.coveredTransactions || []).forEach(tx => allCoverableTransactions.add(tx));
  });
  const orphanTransactions = analysis.uniqueTransactions.filter(
    tx => !allCoverableTransactions.has(tx)
  );
  const maxAchievableTransactions =
    analysis.uniqueTransactions.length - orphanTransactions.length;

  businessRoleDataCache.set(businessRole, {
    businessRoleTxSet,
    txExecutionMap,
    currentBusinessRoleTransactions: currentBRTxs,
    originalTransactions: currentBRTxs.map(tx => tx.transaction),
    maxAchievableInfo: {
      orphanTransactions,
      maxAchievableTransactions,
      totalTransactions: analysis.uniqueTransactions.length,
    },
  });

  const totalBusinessRoleExecutions = currentBRTxs.reduce(
    (sum, tx) => sum + (tx.executionCount || 0),
    0
  );

  analysis.simpleRoles.forEach(role => {
    const cacheKey = `${businessRole}:${role.roleName}`;
    const allSimpleRoleTx = txBySimpleRole.get(role.roleName) || [];
    const totalRoleTransactions = allSimpleRoleTx.length;
    const originalCoveredCount = role.coveredTransactions?.length || 0;

    // Optimisation : Map.get() au lieu de Array.find() répété (O(1) vs O(n))
    let simpleRoleExecutions = 0;
    allSimpleRoleTx.forEach(txName => {
      const execCount = txExecutionMap.get(txName);
      if (execCount !== undefined) simpleRoleExecutions += execCount;
    });

    const usageFrequency =
      totalBusinessRoleExecutions > 0
        ? (simpleRoleExecutions / totalBusinessRoleExecutions) * 100
        : 0;

    staticScoresCache.set(cacheKey, {
      usageFrequency,
      totalRoleTransactions,
      originalCoveredCount,
      simpleRoleExecutions,
      totalBusinessRoleExecutions,
    });

    const detailsCacheKey = `${businessRole}:${role.roleName}:static`;
    const nonUtilisees = allSimpleRoleTx.filter(tx => !businessRoleTxSet.has(tx));
    transactionDetailsCache.set(detailsCacheKey, {
      covered: role.coveredTransactions || [],
      nonUtilisees,
      nonCouvertes: [],
      orphelines: [],
      total: (role.coveredTransactions?.length || 0) + nonUtilisees.length,
    });
  });
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

/**
 * Hook de calcul des données statiques avec stratégie Lazy Visible :
 *
 * 1. Construire les index globaux en O(n) (rapide, ~2ms)
 * 2. Calculer synchronement les business roles VISIBLES uniquement (~3 items → instantané)
 * 3. Calculer le reste en arrière-plan par lots (non-bloquant)
 * 4. Exposer `isFullyComputed` pour bloquer l'auto-sélection
 *
 * Les Maps sont mutées en place : les consommateurs (cards) voient les données
 * s'enrichir progressivement sans re-render coûteux.
 */
export const useStaticAnalysisData = (
  analysisResult: SimplifiedAnalysisResult | null,
  visibleBusinessRoles: string[]
): StaticAnalysisData => {
  // Références stables aux Maps — mutation en place pour éviter les re-renders excessifs
  const staticScoresCacheRef = useRef<Map<string, any>>(new Map());
  const businessRoleDataCacheRef = useRef<Map<string, any>>(new Map());
  const transactionDetailsCacheRef = useRef<Map<string, any>>(new Map());
  const transactionsByRoleCacheRef = useRef<Map<string, string[]>>(new Map());

  const [isFullyComputed, setIsFullyComputed] = useState(false);
  const [computedCount, setComputedCount] = useState(0);

  // Identifiant stable de l'analyse (primitif → dep safe)
  const analysisId = analysisResult?.id ?? null;

  // Référence pour capturer visibleBusinessRoles au moment de l'effet
  // (l'effet ne dépend que de analysisId, pas de visibleBusinessRoles)
  const visibleBusinessRolesRef = useRef<string[]>(visibleBusinessRoles);
  visibleBusinessRolesRef.current = visibleBusinessRoles;

  useEffect(() => {
    // --- Nettoyage si pas d'analyse ---
    if (!analysisResult) {
      staticScoresCacheRef.current.clear();
      businessRoleDataCacheRef.current.clear();
      transactionDetailsCacheRef.current.clear();
      transactionsByRoleCacheRef.current.clear();
      setIsFullyComputed(false);
      setComputedCount(0);
      return;
    }

    // --- Réinitialiser les caches pour la nouvelle analyse ---
    staticScoresCacheRef.current.clear();
    businessRoleDataCacheRef.current.clear();
    transactionDetailsCacheRef.current.clear();
    transactionsByRoleCacheRef.current.clear();
    // Ne pas encore setIsFullyComputed/setComputedCount ici — React batch les mises à jour

    // ÉTAPE 1 : Construire les index globaux (O(n), ~2ms)
    const txByBR = buildTxByBusinessRoleIndex(analysisResult);
    const txBySimpleRole = buildTxBySimpleRoleIndex(analysisResult);

    // Stocker transactionsByRoleCache (consommé par scoreCalculationService)
    txBySimpleRole.forEach((txs, role) =>
      transactionsByRoleCacheRef.current.set(role, txs)
    );

    // ÉTAPE 2 : Calcul synchrone pour les business roles VISIBLES (~3 items, ~1ms)
    const allAnalyses = analysisResult.coverageAnalyses;
    const visibleSet = new Set(visibleBusinessRolesRef.current);
    const visibleAnalyses = allAnalyses.filter(a => visibleSet.has(a.businessRole));
    const deferredAnalyses = allAnalyses.filter(a => !visibleSet.has(a.businessRole));

    visibleAnalyses.forEach(a =>
      computeForBusinessRole(
        a,
        txByBR,
        txBySimpleRole,
        staticScoresCacheRef.current,
        businessRoleDataCacheRef.current,
        transactionDetailsCacheRef.current
      )
    );
    // Signaler que les items visibles sont prêts
    setComputedCount(visibleAnalyses.length);
    setIsFullyComputed(false);

    if (deferredAnalyses.length === 0) {
      setIsFullyComputed(true);
      return;
    }

    // ÉTAPE 3 : Calcul asynchrone différé par lots (non-bloquant)
    let batchIdx = 0;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const processBatch = () => {
      const batchEnd = Math.min(batchIdx + BATCH_SIZE, deferredAnalyses.length);
      for (let i = batchIdx; i < batchEnd; i++) {
        computeForBusinessRole(
          deferredAnalyses[i],
          txByBR,
          txBySimpleRole,
          staticScoresCacheRef.current,
          businessRoleDataCacheRef.current,
          transactionDetailsCacheRef.current
        );
      }
      batchIdx = batchEnd;

      if (batchIdx < deferredAnalyses.length) {
        // Encore des lots à traiter — rendre la main au thread principal
        timeoutIds.push(setTimeout(processBatch, 0));
      } else {
        // Tout est calculé
        setIsFullyComputed(true);
        setComputedCount(allAnalyses.length);
      }
    };

    // Premier lot : démarrer dès que le thread est libre
    timeoutIds.push(setTimeout(processBatch, 0));

    // Nettoyage si l'analyse change avant la fin du calcul différé
    return () => {
      timeoutIds.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  return {
    staticScoresCache: staticScoresCacheRef.current,
    businessRoleDataCache: businessRoleDataCacheRef.current,
    transactionsByRoleCache: transactionsByRoleCacheRef.current,
    transactionDetailsCache: transactionDetailsCacheRef.current,
    isFullyComputed,
    computedCount,
    totalCount: analysisResult?.coverageAnalyses?.length ?? 0,
  };
};
