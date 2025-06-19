import { useCallback, useMemo, useRef } from 'react';

// Types pour la gestion du cache d'analyse
export interface AnalysisCacheState {
  // Cache des scores calculés
  roleScores: Map<string, any>;
  
  // Cache des détails par business role
  businessRoleDetails: Map<string, any>;
  
  // Cache des calculs complexes
  calculations: Map<string, any>;
  
  // Métadonnées du cache
  lastUpdated: number;
  version: string;
}

export interface AnalysisCacheConfig {
  // Taille maximale du cache
  maxSize?: number;
  
  // Durée de vie du cache en millisecondes
  ttl?: number;
  
  // Activer la persistance locale
  enablePersistence?: boolean;
  
  // Clé pour le localStorage
  storageKey?: string;
}

export interface AnalysisCacheCallbacks {
  onCacheUpdated?: () => void;
  onCacheCleared?: () => void;
  onCacheError?: (error: string) => void;
}

export interface AnalysisCacheReturn {
  // État du cache
  cacheState: AnalysisCacheState;
  
  // Accès direct aux Maps pour la performance (nouveau)
  scoresCache: Map<string, any>;
  detailsCache: Map<string, any>;
  calculationsCache: Map<string, any>;
  
  // Statistiques du cache
  stats: {
    size: number;
    hitRate: number;
    lastAccess: number;
  };
  
  // Méthodes de gestion du cache
  get: (key: string, category?: keyof AnalysisCacheState) => any;
  set: (key: string, value: any, category?: keyof AnalysisCacheState) => void;
  has: (key: string, category?: keyof AnalysisCacheState) => boolean;
  delete: (key: string, category?: keyof AnalysisCacheState) => boolean;
  clear: (category?: keyof AnalysisCacheState) => void;
  
  // Méthodes utilitaires
  getCachedScore: (roleId: string) => any;
  setCachedScore: (roleId: string, score: any) => void;
  getCachedDetails: (businessRole: string) => any;
  setCachedDetails: (businessRole: string, details: any) => void;
  getCachedCalculation: (calculationKey: string) => any;
  setCachedCalculation: (calculationKey: string, result: any) => void;
  
  // Alias pour compatibilité
  clearCache: () => void;
  precomputeCache: () => void;
  precomputeCoverageAnalysis: (analysisResult: any) => void; // 🚀 Méthode d'optimisation
  
  // Gestion de la persistance
  saveToPersistence: () => void;
  loadFromPersistence: () => void;
  
  // Maintenance du cache
  cleanup: () => void;
  invalidate: (pattern?: string) => void;
}

const defaultConfig: Required<AnalysisCacheConfig> = {
  maxSize: 1000,
  ttl: 30 * 60 * 1000, // 30 minutes
  enablePersistence: true,
  storageKey: 'sora-analysis-cache',
};

export const useAnalysisCache = (
  callbacks?: AnalysisCacheCallbacks,
  config: AnalysisCacheConfig = {}
): AnalysisCacheReturn => {
  const mergedConfig = { ...defaultConfig, ...config };
  
  // Référence pour les statistiques du cache
  const statsRef = useRef({
    hits: 0,
    misses: 0,
    lastAccess: Date.now(),
  });
  
  // État du cache principal
  const cacheState = useMemo<AnalysisCacheState>(() => ({
    roleScores: new Map(),
    businessRoleDetails: new Map(),
    calculations: new Map(),
    lastUpdated: Date.now(),
    version: '1.0.0',
  }), []);

  // Fonction utilitaire pour obtenir le bon cache selon la catégorie
  const getCacheForCategory = useCallback((category: keyof AnalysisCacheState = 'calculations') => {
    switch (category) {
      case 'roleScores':
        return cacheState.roleScores;
      case 'businessRoleDetails':
        return cacheState.businessRoleDetails;
      case 'calculations':
        return cacheState.calculations;
      default:
        return cacheState.calculations;
    }
  }, [cacheState]);

  // Méthode générique GET
  const get = useCallback((key: string, category: keyof AnalysisCacheState = 'calculations') => {
    try {
      const cache = getCacheForCategory(category);
      const value = cache.get(key);
      
      if (value) {
        statsRef.current.hits++;
        statsRef.current.lastAccess = Date.now();
        return value;
      } else {
        statsRef.current.misses++;
        return null;
      }
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors de la lecture du cache: ${error}`);
      return null;
    }
  }, [getCacheForCategory, callbacks]);

  // Méthode générique SET
  const set = useCallback((key: string, value: any, category: keyof AnalysisCacheState = 'calculations') => {
    try {
      const cache = getCacheForCategory(category);
      
      // Vérifier la taille maximale
      if (cache.size >= mergedConfig.maxSize) {
        // Supprimer les entrées les plus anciennes
        const firstKey = cache.keys().next().value;
        if (firstKey) {
          cache.delete(firstKey);
        }
      }
      
      cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl: mergedConfig.ttl,
      });
      
      cacheState.lastUpdated = Date.now();
      callbacks?.onCacheUpdated?.();
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors de l'écriture dans le cache: ${error}`);
    }
  }, [getCacheForCategory, mergedConfig.maxSize, mergedConfig.ttl, cacheState, callbacks]);

  // Méthode générique HAS
  const has = useCallback((key: string, category: keyof AnalysisCacheState = 'calculations') => {
    try {
      const cache = getCacheForCategory(category);
      return cache.has(key);
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors de la vérification du cache: ${error}`);
      return false;
    }
  }, [getCacheForCategory, callbacks]);

  // Méthode générique DELETE
  const deleteEntry = useCallback((key: string, category: keyof AnalysisCacheState = 'calculations') => {
    try {
      const cache = getCacheForCategory(category);
      const deleted = cache.delete(key);
      if (deleted) {
        cacheState.lastUpdated = Date.now();
        callbacks?.onCacheUpdated?.();
      }
      return deleted;
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors de la suppression du cache: ${error}`);
      return false;
    }
  }, [getCacheForCategory, cacheState, callbacks]);

  // Méthode générique CLEAR
  const clear = useCallback((category?: keyof AnalysisCacheState) => {
    try {
      if (category) {
        const cache = getCacheForCategory(category);
        cache.clear();
      } else {
        // Vider tous les caches
        cacheState.roleScores.clear();
        cacheState.businessRoleDetails.clear();
        cacheState.calculations.clear();
      }
      
      cacheState.lastUpdated = Date.now();
      callbacks?.onCacheCleared?.();
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors du vidage du cache: ${error}`);
    }
  }, [getCacheForCategory, cacheState, callbacks]);

  // Méthodes spécialisées pour les scores
  const getCachedScore = useCallback((roleId: string) => {
    return get(roleId, 'roleScores')?.value;
  }, [get]);

  const setCachedScore = useCallback((roleId: string, score: any) => {
    set(roleId, score, 'roleScores');
  }, [set]);

  // Méthodes spécialisées pour les détails business role
  const getCachedDetails = useCallback((businessRole: string) => {
    return get(businessRole, 'businessRoleDetails')?.value;
  }, [get]);

  const setCachedDetails = useCallback((businessRole: string, details: any) => {
    set(businessRole, details, 'businessRoleDetails');
  }, [set]);

  // Méthodes spécialisées pour les calculs
  const getCachedCalculation = useCallback((calculationKey: string) => {
    return get(calculationKey, 'calculations')?.value;
  }, [get]);

  const setCachedCalculation = useCallback((calculationKey: string, result: any) => {
    set(calculationKey, result, 'calculations');
  }, [set]);

  // Sauvegarde vers la persistance
  const saveToPersistence = useCallback(() => {
    if (!mergedConfig.enablePersistence || typeof window === 'undefined') return;
    
    try {
      const serializedCache = {
        roleScores: Array.from(cacheState.roleScores.entries()),
        businessRoleDetails: Array.from(cacheState.businessRoleDetails.entries()),
        calculations: Array.from(cacheState.calculations.entries()),
        lastUpdated: cacheState.lastUpdated,
        version: cacheState.version,
      };
      
      localStorage.setItem(mergedConfig.storageKey, JSON.stringify(serializedCache));
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors de la sauvegarde: ${error}`);
    }
  }, [mergedConfig.enablePersistence, mergedConfig.storageKey, cacheState, callbacks]);

  // Chargement depuis la persistance
  const loadFromPersistence = useCallback(() => {
    if (!mergedConfig.enablePersistence || typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(mergedConfig.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Restaurer les Maps
        cacheState.roleScores = new Map(parsed.roleScores || []);
        cacheState.businessRoleDetails = new Map(parsed.businessRoleDetails || []);
        cacheState.calculations = new Map(parsed.calculations || []);
        cacheState.lastUpdated = parsed.lastUpdated || Date.now();
        cacheState.version = parsed.version || '1.0.0';
        
        callbacks?.onCacheUpdated?.();
      }
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors du chargement: ${error}`);
    }
  }, [mergedConfig.enablePersistence, mergedConfig.storageKey, cacheState, callbacks]);

  // Nettoyage des entrées expirées
  const cleanup = useCallback(() => {
    try {
      const now = Date.now();
      
      [cacheState.roleScores, cacheState.businessRoleDetails, cacheState.calculations].forEach(cache => {
        const entriesToDelete: string[] = [];
        cache.forEach((entry, key) => {
          if (typeof entry === 'object' && entry.timestamp && entry.ttl) {
            if (now - entry.timestamp > entry.ttl) {
              entriesToDelete.push(key);
            }
          }
        });
        
        entriesToDelete.forEach(key => cache.delete(key));
      });
      
      cacheState.lastUpdated = now;
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors du nettoyage: ${error}`);
    }
  }, [cacheState, callbacks]);

  // Invalidation avec pattern
  const invalidate = useCallback((pattern?: string) => {
    try {
      if (!pattern) {
        clear();
        return;
      }
      
      const regex = new RegExp(pattern);
      
      [cacheState.roleScores, cacheState.businessRoleDetails, cacheState.calculations].forEach(cache => {
        const keysToDelete: string[] = [];
        cache.forEach((_, key) => {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        });
        
        keysToDelete.forEach(key => cache.delete(key));
      });
      
      cacheState.lastUpdated = Date.now();
      callbacks?.onCacheUpdated?.();
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors de l'invalidation: ${error}`);
    }
  }, [clear, cacheState, callbacks]);

  // 🚀 OPTIMISATION 2 : Pré-calcul des métriques de couverture pour tous les rôles métiers
  const precomputeCoverageAnalysis = useCallback((analysisResult: any) => {
    if (!analysisResult?.businessRoles) return;

    try {
      // Pré-calculer les métriques statiques pour chaque rôle métier
      analysisResult.businessRoles.forEach((businessRole: any) => {
        const businessRoleName = businessRole.businessRole;
        
        // Calculer et cacher les métriques de base qui ne changent jamais
        const staticMetrics = {
          totalTransactions: businessRole.roles?.reduce((sum: number, role: any) => 
            sum + (role.transactions?.length || 0), 0) || 0,
          totalRoles: businessRole.roles?.length || 0,
          roleExecutionFrequencies: businessRole.roles?.map((role: any) => ({
            roleId: role.roleId,
            totalExecutions: role.transactions?.length || 0,
            averageFrequency: role.transactions?.reduce((sum: number, t: any) => 
              sum + (t.executionFrequency || 0), 0) / (role.transactions?.length || 1)
          })) || []
        };
        
        // Mettre en cache les métriques statiques
        setCachedCalculation(`static_metrics_${businessRoleName}`, staticMetrics);
        
        // Pré-calculer les maps de lookup pour éviter les recherches répétées
        const transactionsByRole = new Map();
        businessRole.roles?.forEach((role: any) => {
          transactionsByRole.set(role.roleId, role.transactions || []);
        });
        
        setCachedCalculation(`transactions_lookup_${businessRoleName}`, transactionsByRole);
      });
      
      callbacks?.onCacheUpdated?.();
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors du pré-calcul de l'analyse de couverture: ${error}`);
    }
  }, [setCachedCalculation, callbacks]);

  // Pré-calcul du cache général
  const precomputeCache = useCallback(() => {
    try {
      // Cette méthode peut être utilisée pour pré-calculer des valeurs fréquemment utilisées
      // Pour l'instant, on s'assure que le cache est prêt et on charge depuis la persistance si nécessaire
      loadFromPersistence();
      callbacks?.onCacheUpdated?.();
    } catch (error) {
      callbacks?.onCacheError?.(`Erreur lors du pré-calcul du cache: ${error}`);
    }
  }, [loadFromPersistence, callbacks]);

  // Calcul des statistiques
  const stats = useMemo(() => {
    const totalOperations = statsRef.current.hits + statsRef.current.misses;
    const hitRate = totalOperations > 0 ? (statsRef.current.hits / totalOperations) * 100 : 0;
    
    const totalSize = cacheState.roleScores.size + 
                     cacheState.businessRoleDetails.size + 
                     cacheState.calculations.size;
    
    return {
      size: totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      lastAccess: statsRef.current.lastAccess,
    };
  }, [cacheState]);

  return {
    cacheState,
    
    // Accès direct aux Maps pour la performance
    scoresCache: cacheState.roleScores,
    detailsCache: cacheState.businessRoleDetails,
    calculationsCache: cacheState.calculations,
    
    stats,
    get,
    set,
    has,
    delete: deleteEntry,
    clear,
    getCachedScore,
    setCachedScore,
    getCachedDetails,
    setCachedDetails,
    getCachedCalculation,
    setCachedCalculation,
    clearCache: clear, // Alias pour compatibilité
    precomputeCache,
    precomputeCoverageAnalysis, // 🚀 Nouvelle méthode d'optimisation
    saveToPersistence,
    loadFromPersistence,
    cleanup,
    invalidate,
  };
}; 