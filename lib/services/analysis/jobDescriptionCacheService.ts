/**
 * Service de cache pour les fiches de poste générées
 * Pattern similaire à savedAnalysisService.ts
 */

import { JobDescriptionWebhookResponse } from './generateJobDescriptionService';

/**
 * Interface pour une fiche de poste en cache
 */
export interface CachedJobDescription {
  response: JobDescriptionWebhookResponse;
  businessRole: string;
  selectedRoles: string[];
  cachedAt: number;      // Unix timestamp
  expiresAt: number;     // Unix timestamp
  version: string;       // Pour gérer les changements de format
}

/**
 * Configuration du cache
 */
const CACHE_CONFIG = {
  STORAGE_KEY: 'sora-job-description-cache',
  TTL: 7 * 24 * 60 * 60 * 1000,  // 7 jours
  MAX_ENTRIES: 50,                // Max 50 fiches
  VERSION: '1.0.0'
} as const;

/**
 * Classe de gestion du cache des fiches de poste
 * Similaire à AnalysisCache dans savedAnalysisService.ts
 */
class JobDescriptionCache {
  private cache = new Map<string, CachedJobDescription>();
  private readonly CACHE_DURATION = CACHE_CONFIG.TTL;
  private readonly STORAGE_KEY = CACHE_CONFIG.STORAGE_KEY;
  private readonly MAX_ENTRIES = CACHE_CONFIG.MAX_ENTRIES;

  constructor() {
    // Charger le cache depuis localStorage au démarrage
    this.loadFromStorage();
    // Nettoyer les entrées expirées
    this.cleanup();
  }

  /**
   * Génère une clé de cache unique basée sur le rôle métier et les rôles sélectionnés
   */
  generateKey(businessRole: string, selectedRoles: Set<string>): string {
    const sortedRoles = Array.from(selectedRoles).sort();
    return `${businessRole}_${sortedRoles.join('|')}`;
  }

  /**
   * Récupère une fiche de poste depuis le cache
   */
  get(key: string): CachedJobDescription | null {
    const entry = this.cache.get(key);
    if (!entry) {
      console.log('📋 Cache MISS:', key);
      return null;
    }
    
    // Vérifier si l'entrée a expiré
    if (Date.now() > entry.expiresAt) {
      console.log('⏰ Cache expiré:', key);
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    // Vérifier la version
    if (entry.version !== CACHE_CONFIG.VERSION) {
      console.log('🔄 Version incompatible:', key);
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    console.log('✅ Cache HIT:', key);
    return entry;
  }

  /**
   * Stocke une fiche de poste dans le cache
   */
  set(
    businessRole: string,
    selectedRoles: Set<string>,
    response: JobDescriptionWebhookResponse
  ): void {
    const key = this.generateKey(businessRole, selectedRoles);
    const now = Date.now();
    
    const entry: CachedJobDescription = {
      response,
      businessRole,
      selectedRoles: Array.from(selectedRoles),
      cachedAt: now,
      expiresAt: now + this.CACHE_DURATION,
      version: CACHE_CONFIG.VERSION
    };
    
    this.cache.set(key, entry);
    console.log('💾 Mise en cache:', key);
    
    // Limiter la taille du cache
    this.enforceMaxSize();
    
    // Sauvegarder dans localStorage
    this.saveToStorage();
  }

  /**
   * Invalide une entrée spécifique du cache
   */
  invalidate(businessRole: string, selectedRoles: Set<string>): void {
    const key = this.generateKey(businessRole, selectedRoles);
    this.cache.delete(key);
    this.saveToStorage();
    console.log('🗑️ Cache invalidé:', key);
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    console.log('🗑️ Cache vidé complètement');
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt || entry.version !== CACHE_CONFIG.VERSION) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.saveToStorage();
      console.log(`🧹 Nettoyage: ${cleanedCount} entrée(s) expirée(s) supprimée(s)`);
    }
  }

  /**
   * Limite la taille du cache en supprimant les entrées les plus anciennes
   */
  private enforceMaxSize(): void {
    if (this.cache.size <= this.MAX_ENTRIES) return;
    
    // Trier par date de cache (les plus anciennes en premier)
    const sorted = Array.from(this.cache.entries())
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    
    // Supprimer les entrées en excès
    const toRemove = sorted.slice(0, this.cache.size - this.MAX_ENTRIES);
    toRemove.forEach(([key]) => this.cache.delete(key));
    
    console.log(`📏 Limitation: ${toRemove.length} entrée(s) supprimée(s)`);
  }

  /**
   * Sauvegarde le cache dans localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = {
        entries: Array.from(this.cache.entries()),
        version: CACHE_CONFIG.VERSION,
        lastUpdated: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
      console.error('❌ Erreur sauvegarde cache:', error);
      // Si localStorage est plein, vider le cache
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.clear();
      }
    }
  }

  /**
   * Charge le cache depuis localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const parsed = JSON.parse(stored);
      
      // Vérifier la version
      if (parsed.version !== CACHE_CONFIG.VERSION) {
        console.log('🔄 Version incompatible, cache réinitialisé');
        localStorage.removeItem(this.STORAGE_KEY);
        return;
      }
      
      // Restaurer les entrées
      this.cache = new Map(parsed.entries || []);
      console.log(`📂 Cache chargé: ${this.cache.size} entrée(s)`);
    } catch (error) {
      console.error('❌ Erreur chargement cache:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Statistiques du cache
   */
  getStats(): { size: number; keys: string[]; oldestEntry: number | null } {
    const entries = Array.from(this.cache.values());
    const oldestEntry = entries.length > 0 
      ? Math.min(...entries.map(e => e.cachedAt))
      : null;
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      oldestEntry
    };
  }
}

// Instance singleton du cache
const jobDescriptionCache = new JobDescriptionCache();

/**
 * Récupère une fiche de poste depuis le cache
 */
export function getCachedJobDescription(
  businessRole: string,
  selectedRoles: Set<string>
): CachedJobDescription | null {
  const key = jobDescriptionCache.generateKey(businessRole, selectedRoles);
  return jobDescriptionCache.get(key);
}

/**
 * Stocke une fiche de poste dans le cache
 */
export function setCachedJobDescription(
  businessRole: string,
  selectedRoles: Set<string>,
  response: JobDescriptionWebhookResponse
): void {
  jobDescriptionCache.set(businessRole, selectedRoles, response);
}

/**
 * Invalide une fiche de poste du cache
 */
export function invalidateJobDescriptionCache(
  businessRole: string,
  selectedRoles: Set<string>
): void {
  jobDescriptionCache.invalidate(businessRole, selectedRoles);
}

/**
 * Vide tout le cache des fiches de poste
 */
export function clearJobDescriptionCache(): void {
  jobDescriptionCache.clear();
}

/**
 * Statistiques du cache
 */
export function getJobDescriptionCacheStats() {
  return jobDescriptionCache.getStats();
}

export default jobDescriptionCache;

