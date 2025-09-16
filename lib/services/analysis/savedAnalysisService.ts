import { createClient } from 'lib/utils/supabase/client';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

// Client Supabase unifié
const getSupabaseClient = () => createClient();

// 🚀 NOUVEAU : Cache en mémoire pour les analyses récemment chargées
class AnalysisCache {
  private cache = new Map<string, { data: SimplifiedAnalysisResult; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  get(key: string): SimplifiedAnalysisResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: SimplifiedAnalysisResult): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const analysisCache = new AnalysisCache();

/**
 * Interface pour une analyse sauvegardée
 */
export interface SavedAnalysis {
  id: string;
  title: string;
  description?: string;
  user_id: string;
  is_public: boolean;
  data: SimplifiedAnalysisResult;
  created_at: string;
  updated_at: string;
}

/**
 * Interface pour créer une nouvelle analyse
 */
export interface CreateSavedAnalysisParams {
  title: string;
  description?: string;
  data: SimplifiedAnalysisResult;
  isPublic?: boolean;
}

/**
 * Interface pour les métadonnées d'une analyse pour la liste
 */
export interface SavedAnalysisMetadata {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  metadata: {
    totalBusinessRoles: number;
    totalSimpleRoles: number;
    totalTransactions: number;
    fileName?: string;
    uploadDate?: string;
  };
  selectedRolesCount: number;
  progress: number;
}

/**
 * 🚀 OPTIMISÉ : Validation des données d'analyse
 */
function validateAnalysisData(data: any): boolean {
  try {
    return (
      data &&
      typeof data === 'object' &&
      data.metadata &&
      Array.isArray(data.coverageAnalyses) &&
      typeof data.userSelections === 'object'
    );
  } catch {
    return false;
  }
}

/**
 * 🚀 OPTIMISÉ : Compression intelligente des données
 */
function compressAnalysisData(analysisResult: SimplifiedAnalysisResult): any {
  // 🚀 COMPRESSION INTELLIGENTE : Garder les données de base, supprimer ce qui peut être recalculé
  
  // 1️⃣ Filtrer les rôles simples qui couvrent au moins une transaction
  const usedSimpleRoles = new Set<string>();
  analysisResult.coverageAnalyses.forEach(analysis => {
    analysis.simpleRoles.forEach(role => {
      if (role.coveredTransactions && role.coveredTransactions.length > 0) {
        usedSimpleRoles.add(role.roleName);
      }
    });
  });
  
  // 2️⃣ Filtrer les transactions pour ne garder que celles des rôles utiles
  const filteredSimpleRoleTransactions = analysisResult.simpleRoleTransactions.filter(tx => 
    usedSimpleRoles.has(tx.simpleRole)
  );
  
  // 3️⃣ CONSERVER TOUS les rôles métier (même ceux sans couverture)
  const allBusinessRoles = new Set<string>();
  analysisResult.coverageAnalyses.forEach(analysis => {
    allBusinessRoles.add(analysis.businessRole);
  });
  
  // 4️⃣ CONSERVER TOUTES les transactions métier (ne pas filtrer par rôles utiles)
  const allBusinessRoleTransactions = analysisResult.businessRoleTransactions;
  
  const essentialData = {
    // Métadonnées essentielles - GARDER LE NOMBRE ORIGINAL
    metadata: {
      totalBusinessRoles: analysisResult.coverageAnalyses.length, // Nombre original, pas filtré
      totalSimpleRoles: usedSimpleRoles.size, // On peut optimiser les rôles simples vides
      totalTransactions: analysisResult.metadata?.totalTransactions || 0,
      fileName: analysisResult.metadata?.fileName,
      importDate: analysisResult.metadata?.importDate
    },
    
    // Paramètres d'analyse avec coefficients (ESSENTIEL pour restaurer)
    analysisParams: analysisResult.analysisParams,
    
    // Métadonnées de base
    name: analysisResult.name,
    description: analysisResult.description,
    
    // 🎯 SÉLECTIONS UTILISATEUR (ce qui compte vraiment)
    userSelections: analysisResult.userSelections || {},
    
    // 🎯 DONNÉES DE BASE - GARDER TOUTES LES TRANSACTIONS MÉTIER
    businessRoleTransactions: allBusinessRoleTransactions,
    simpleRoleTransactions: filteredSimpleRoleTransactions,
    
    // Métadonnées de compression
    _compressed: true,
    _version: '3.1', // Version avec données de base filtrées
    _compressedAt: new Date().toISOString(),
    _compressionType: 'smart' // Compression intelligente
  };
  
  // 📏 VÉRIFICATION DE TAILLE avant retour
  const originalSize = JSON.stringify(analysisResult).length;
  const compressedSize = JSON.stringify(essentialData).length;
  const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
  
  return essentialData;
}

/**
 * 🚀 OPTIMISÉ : Décompression avec reconstruction intelligente
 */
function decompressAnalysisData(compressedData: any): SimplifiedAnalysisResult {
  // Données non compressées = retour direct
  if (!compressedData._compressed) {
    return compressedData as SimplifiedAnalysisResult;
  }

  // 🚀 NOUVELLE VERSION AVEC DONNÉES DE BASE (3.1)
  if (compressedData._version === '3.1' && compressedData._compressionType === 'smart') {
    // 🎯 RECONSTRUCTION DE TOUS LES RÔLES MÉTIER à partir des businessRoleTransactions
    const allBusinessRoles = Array.from(new Set((compressedData.businessRoleTransactions || []).map((tx: any) => tx.businessRole as string)));
    const allSimpleRoles = Array.from(new Set((compressedData.simpleRoleTransactions || []).map((tx: any) => tx.simpleRole as string)));
    
    // 🎯 RECONSTRUCTION DES ANALYSES DE COUVERTURE avec simpleRoles
    const coverageAnalyses = allBusinessRoles.map(businessRole => {
      // Transactions de ce rôle métier
      const businessTransactions = (compressedData.businessRoleTransactions || [])
        .filter((tx: any) => tx.businessRole === businessRole)
        .map((tx: any) => tx.transaction);
      
      const uniqueBusinessTransactions = Array.from(new Set(businessTransactions));
      
      // Pour chaque rôle simple, calculer sa couverture de ce rôle métier
      const simpleRoles = allSimpleRoles.map(simpleRole => {
        // Transactions couvertes par ce rôle simple
        const simpleTransactions = (compressedData.simpleRoleTransactions || [])
          .filter((tx: any) => tx.simpleRole === simpleRole)
          .map((tx: any) => tx.transaction);
        
        // Intersection : transactions du rôle métier couvertes par ce rôle simple
        const coveredTransactions = uniqueBusinessTransactions.filter(tx => 
          simpleTransactions.includes(tx)
        );
        
        // Transactions non couvertes
        const uncoveredTransactions = uniqueBusinessTransactions.filter(tx => 
          !simpleTransactions.includes(tx)
        );
        
        // Pourcentage de couverture
        const coveragePercentage = uniqueBusinessTransactions.length > 0 
          ? (coveredTransactions.length / uniqueBusinessTransactions.length) * 100 
          : 0;
        
        return {
          roleName: simpleRole,
          coveragePercentage,
          coveredTransactions,
          uncoveredTransactions,
          isSelected: false, // Sera restauré plus tard via userSelections
          executionFrequency: 0 // Peut être recalculé si nécessaire
        };
      }).filter(role => role.coveredTransactions.length > 0); // Ne garder que les rôles avec couverture
      
      return {
        businessRole: businessRole as string,
        totalTransactions: uniqueBusinessTransactions.length,
        uniqueTransactions: uniqueBusinessTransactions,
        simpleRoles: simpleRoles
      };
    }) as any[];
    
    // Reconstruction avec données de base + recalcul des analyses de couverture
    return {
      id: compressedData.id || '',
      name: compressedData.name || '',
      description: compressedData.description || '',
      timestamp: compressedData.timestamp || new Date(compressedData._compressedAt),
      
      metadata: {
        fileName: compressedData.metadata?.fileName || 'Analyse sauvegardée',
        fileSize: 0,
        importDate: compressedData.metadata?.importDate || new Date(compressedData._compressedAt),
        totalBusinessRoles: compressedData.metadata?.totalBusinessRoles || allBusinessRoles.length,
        totalSimpleRoles: compressedData.metadata?.totalSimpleRoles || allSimpleRoles.length,
        totalTransactions: compressedData.metadata?.totalTransactions || 0,
        processingTimeMs: 0
      },
      
      // 🎯 DONNÉES DE BASE RESTAURÉES (liens rôles-transactions)
      businessRoleTransactions: compressedData.businessRoleTransactions || [],
      simpleRoleTransactions: compressedData.simpleRoleTransactions || [],
      
      // 🎯 ANALYSES DE COUVERTURE RECONSTRUITES (avec simpleRoles calculés)
      coverageAnalyses: coverageAnalyses,
      
      // 🎯 SÉLECTIONS UTILISATEUR (l'essentiel !)
      userSelections: compressedData.userSelections || {},
      
      // 🎯 PARAMÈTRES D'ANALYSE (coefficients)
      analysisParams: {
        minCoverageThreshold: compressedData.analysisParams?.minCoverageThreshold ?? 0,
        includeFrequency: compressedData.analysisParams?.includeFrequency ?? true,
        coverageWeight: compressedData.analysisParams?.coverageWeight ?? 50,
        sizeWeight: compressedData.analysisParams?.sizeWeight ?? 50,
        usageWeight: compressedData.analysisParams?.usageWeight ?? 0
      }
    };
  }

  // 🚀 ANCIENNE VERSION ULTRA-COMPRESSÉE (3.0)
  if (compressedData._version === '3.0' && compressedData._compressionType === 'ultra') {
    
    // Reconstruction minimale pour afficher les métadonnées et restaurer les sélections
    return {
      id: compressedData.id || '',
      name: compressedData.name || '',
      description: compressedData.description || '',
      timestamp: compressedData.timestamp || new Date(),
      
      metadata: {
        fileName: compressedData.metadata?.fileName || 'Analyse sauvegardée',
        fileSize: 0,
        importDate: new Date(compressedData._compressedAt || new Date()),
        totalBusinessRoles: compressedData.metadata?.totalBusinessRoles || 0,
        totalSimpleRoles: compressedData.metadata?.totalSimpleRoles || 0,
        totalTransactions: compressedData.metadata?.totalTransactions || 0,
        processingTimeMs: 0
      },
      
      // 🎯 DONNÉES MINIMALES - Juste pour que l'interface fonctionne
      businessRoleTransactions: [],
      simpleRoleTransactions: [],
      
      // 🎯 STRUCTURE MINIMALE DES ANALYSES DE COUVERTURE
      coverageAnalyses: (compressedData.businessRoles || []).map((businessRole: string) => ({
        businessRole,
        totalTransactions: 0,
        uniqueTransactions: [],
        simpleRoles: Object.entries(compressedData.roleMapping || {})
          .filter(([_, mappedBusinessRole]) => mappedBusinessRole === businessRole)
          .map(([roleName, _]) => ({
            roleName,
            coveragePercentage: 0,
            coveredTransactions: [],
            uncoveredTransactions: [],
            isSelected: false,
            executionFrequency: 0
          }))
      })),
      
      // 🎯 SÉLECTIONS UTILISATEUR (l'essentiel !)
      userSelections: compressedData.userSelections || {},
      
      // 🎯 PARAMÈTRES D'ANALYSE (coefficients)
      analysisParams: {
        minCoverageThreshold: compressedData.analysisParams?.minCoverageThreshold ?? 0,
        includeFrequency: compressedData.analysisParams?.includeFrequency ?? true,
        coverageWeight: compressedData.analysisParams?.coverageWeight ?? 50,
        sizeWeight: compressedData.analysisParams?.sizeWeight ?? 50,
        usageWeight: compressedData.analysisParams?.usageWeight ?? 0
      }
    };
  }

  // 🔄 ANCIENNE VERSION (2.0 et moins) - Reconstruction complète
  return {
    id: compressedData.id || '',
    name: compressedData.name || '',
    description: compressedData.description || '',
    timestamp: compressedData.timestamp || new Date(),
    
    metadata: {
      fileName: compressedData.metadata?.fileName || '',
      fileSize: compressedData.metadata?.fileSize || 0,
      importDate: compressedData.metadata?.importDate || new Date(),
      totalBusinessRoles: compressedData.metadata?.totalBusinessRoles || 0,
      totalSimpleRoles: compressedData.metadata?.totalSimpleRoles || 0,
      totalTransactions: compressedData.metadata?.totalTransactions || 0,
      processingTimeMs: 0
    },
    
    businessRoleTransactions: compressedData.businessRoleTransactions || [],
    simpleRoleTransactions: compressedData.simpleRoleTransactions || [],
    
    coverageAnalyses: (compressedData.coverageAnalyses || []).map((analysis: any) => ({
      businessRole: analysis.businessRole,
      totalTransactions: analysis.totalTransactions,
      uniqueTransactions: analysis.uniqueTransactions,
      simpleRoles: (analysis.simpleRoles || []).map((role: any) => ({
        roleName: role.roleName,
        coveragePercentage: role.coveragePercentage,
        coveredTransactions: role.coveredTransactions || [],
        uncoveredTransactions: [],
        isSelected: false,
        executionFrequency: 0
      }))
    })),
    
    userSelections: compressedData.userSelections || {},
    
    analysisParams: {
      minCoverageThreshold: compressedData.analysisParams?.minCoverageThreshold ?? 0,
      includeFrequency: compressedData.analysisParams?.includeFrequency ?? true,
      coverageWeight: compressedData.analysisParams?.coverageWeight ?? 50,
      sizeWeight: compressedData.analysisParams?.sizeWeight ?? 50,
      usageWeight: compressedData.analysisParams?.usageWeight ?? 0
    }
  };
}

/**
 * 🚀 OPTIMISÉ : Récupère les analyses filtrées par mode avec gestion d'erreur robuste
 */
export async function getSavedAnalyses(userId: string, mode?: 'roles' | 'users'): Promise<SavedAnalysisMetadata[]> {
  if (!userId?.trim()) {
      return [];
    }

  try {
    let query = getSupabaseClient()
      .from('saved_analyses')
      .select('id, title, description, created_at, updated_at, data, analysis_mode')
      .eq('user_id', userId);
    
    // Filtrer par mode si spécifié
    if (mode) {
      query = query.eq('analysis_mode', mode);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération analyses:', error.message);
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    if (!data?.length) {
      return [];
    }

    // Transformation avec gestion d'erreur par analyse
    return data.map(analysis => {
      try {
        if (!validateAnalysisData(analysis.data)) {
          throw new Error('Données invalides');
        }

        const analysisData = analysis.data as SimplifiedAnalysisResult;
        const selectedRolesCount = Object.keys(analysisData.userSelections || {}).length;
        const totalBusinessRoles = analysisData.metadata?.totalBusinessRoles || 0;
        const progress = totalBusinessRoles > 0 ? Math.round((selectedRolesCount / totalBusinessRoles) * 100) : 0;

        return {
          id: analysis.id,
          title: analysis.title,
          description: analysis.description,
          created_at: analysis.created_at,
          updated_at: analysis.updated_at,
          metadata: {
            totalBusinessRoles,
            totalSimpleRoles: analysisData.metadata?.totalSimpleRoles || 0,
            totalTransactions: analysisData.metadata?.totalTransactions || 0,
            fileName: analysisData.metadata?.fileName,
            uploadDate: analysisData.metadata?.importDate?.toString(),
          },
          selectedRolesCount,
          progress,
        };
      } catch {
        // Analyse corrompue = métadonnées minimales
        return {
          id: analysis.id,
          title: analysis.title || 'Analyse corrompue',
          description: analysis.description,
          created_at: analysis.created_at,
          updated_at: analysis.updated_at,
          metadata: {
            totalBusinessRoles: 0,
            totalSimpleRoles: 0,
            totalTransactions: 0,
            fileName: undefined,
            uploadDate: undefined,
          },
          selectedRolesCount: 0,
          progress: 0,
        };
      }
    });
  } catch (error: any) {
    console.error('Erreur complète getSavedAnalyses:', error);
    throw error;
  }
}

/**
 * 🚀 OPTIMISÉ : Récupère une analyse avec cache
 */
export async function getSavedAnalysisById(id: string, userId: string): Promise<SimplifiedAnalysisResult> {
  const cacheKey = `${userId}_${id}`;
  
  // Vérifier le cache d'abord
  const cached = analysisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('saved_analyses')
      .select('id, title, description, data')  // 🚀 CORRIGER : Récupérer aussi title et description
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Erreur récupération analyse: ${error.message}`);
    }

    if (!data?.data) {
      throw new Error('Analyse non trouvée');
    }

    // Décompression et validation
    const analysisData = decompressAnalysisData(data.data);
    
    if (!validateAnalysisData(analysisData)) {
      throw new Error('Données d\'analyse invalides');
    }

    // 🚀 CORRIGER : Utiliser les vraies métadonnées de l'analyse sauvegardée
    const correctedAnalysisData: SimplifiedAnalysisResult = {
      ...analysisData,
      name: data.title || analysisData.name,  // ✅ Utiliser le vrai titre
      description: data.description || analysisData.description,  // ✅ Utiliser la vraie description
    };

    // Mise en cache
    analysisCache.set(cacheKey, correctedAnalysisData);

    return correctedAnalysisData;
  } catch (error: any) {
    console.error('Erreur getSavedAnalysisById:', error);
    throw error;
  }
}

/**
 * 🚀 OPTIMISÉ : Sauvegarde avec validation et compression
 */
export async function saveAnalysisWithSelections(
  analysisResult: SimplifiedAnalysisResult,
  userSelections: Map<string, Set<string>>,
  analysisName: string,
  analysisDescription: string,
  userId: string,
  currentWeights: {
    coverageWeight: number;
    sizeWeight: number;
    usageWeight: number;
  }
): Promise<SavedAnalysis> {
  try {
    // Validation de session
    const supabase = getSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || session.user.id !== userId) {
      throw new Error('Authentification invalide');
    }

    // Conversion des sélections
    const userSelectionsObj: Record<string, string[]> = {};
    userSelections.forEach((simpleRoles, businessRole) => {
      userSelectionsObj[businessRole] = Array.from(simpleRoles);
    });

    // Enrichissement des données
    const enrichedAnalysisResult = {
      ...analysisResult,
      userSelections: userSelectionsObj,
      analysisParams: {
        ...analysisResult.analysisParams,
        coverageWeight: currentWeights.coverageWeight,
        sizeWeight: currentWeights.sizeWeight,
        usageWeight: currentWeights.usageWeight,
      }
    };

    // Compression et validation
    const compressedData = compressAnalysisData(enrichedAnalysisResult);
    
    // Vérification de la taille avec limite adaptée au type de compression
    const dataSize = JSON.stringify(compressedData).length;
    
    let maxSize;
    switch (compressedData._compressionType) {
      case 'smart':
        maxSize = 3 * 1024 * 1024; // 3MB pour compression smart (données de base + filtrage)
        break;
      case 'ultra':
        maxSize = 5 * 1024 * 1024; // 5MB pour ultra (métadonnées seulement)
        break;
      default:
        maxSize = 1024 * 1024; // 1MB pour anciennes versions
    }
    
    if (dataSize > maxSize) {
      throw new Error(`Données trop volumineuses pour la sauvegarde: ${(dataSize / 1024).toFixed(1)}KB > ${(maxSize / 1024).toFixed(0)}KB`);
    }

    // Sauvegarde en base
    const { data, error } = await supabase
      .from('saved_analyses')
      .insert([{
        title: analysisName,
        description: analysisDescription,
        user_id: userId,
        is_public: false,
        data: compressedData,
        analysis_mode: analysisResult.analysisMode || analysisResult.mode || 'roles' // Mode d'analyse
      }])
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erreur sauvegarde: ${error.message}`);
    }

    if (!data) {
      throw new Error('Échec de la sauvegarde');
    }

    // Invalider le cache pour forcer le rechargement
    analysisCache.clear();

    return data as SavedAnalysis;
  } catch (error: any) {
    console.error('Erreur saveAnalysisWithSelections:', error);
    throw error;
  }
}

/**
 * 🚀 NOUVEAU : Reconstruction des sélections optimisée
 */
export function reconstructSelectedRoles(savedData: SimplifiedAnalysisResult): Map<string, Set<string>> {
  const selectedRolesMap = new Map<string, Set<string>>();
  
  if (savedData.userSelections && typeof savedData.userSelections === 'object') {
    Object.entries(savedData.userSelections).forEach(([businessRole, simpleRoles]) => {
      if (Array.isArray(simpleRoles)) {
        selectedRolesMap.set(businessRole, new Set(simpleRoles as string[]));
      }
    });
  }
  
  return selectedRolesMap;
}

/**
 * 🚀 NOUVEAU : Mise à jour d'une analyse existante
 */
export async function updateAnalysisWithSelections(
  analysisId: string,
  analysisResult: SimplifiedAnalysisResult,
  userSelections: Map<string, Set<string>>,
  analysisName: string,
  analysisDescription: string,
  userId: string,
  currentWeights: {
    coverageWeight: number;
    sizeWeight: number;
    usageWeight: number;
  }
): Promise<SavedAnalysis> {
  try {
    // Validation de session
    const supabase = getSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || session.user.id !== userId) {
      throw new Error('Authentification invalide');
    }

    // Vérifier que l'analyse existe et appartient à l'utilisateur
    const { data: existingAnalysis, error: fetchError } = await supabase
      .from('saved_analyses')
      .select('id, title')
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAnalysis) {
      throw new Error('Analyse non trouvée ou accès non autorisé');
    }

    // Conversion des sélections
    const userSelectionsObj: Record<string, string[]> = {};
    userSelections.forEach((simpleRoles, businessRole) => {
      userSelectionsObj[businessRole] = Array.from(simpleRoles);
    });

    // Enrichissement des données
    const enrichedAnalysisResult = {
      ...analysisResult,
      userSelections: userSelectionsObj,
      analysisParams: {
        ...analysisResult.analysisParams,
        coverageWeight: currentWeights.coverageWeight,
        sizeWeight: currentWeights.sizeWeight,
        usageWeight: currentWeights.usageWeight,
      }
    };

    // Compression et validation
    const compressedData = compressAnalysisData(enrichedAnalysisResult);
    
    // Vérification de la taille avec limite adaptée au type de compression
    const dataSize = JSON.stringify(compressedData).length;
    
    let maxSize;
    switch (compressedData._compressionType) {
      case 'smart':
        maxSize = 3 * 1024 * 1024; // 3MB pour compression smart (données de base + filtrage)
        break;
      case 'ultra':
        maxSize = 5 * 1024 * 1024; // 5MB pour ultra (métadonnées seulement)
        break;
      default:
        maxSize = 1024 * 1024; // 1MB pour anciennes versions
    }
    
    if (dataSize > maxSize) {
      throw new Error(`Données trop volumineuses pour la mise à jour: ${(dataSize / 1024).toFixed(1)}KB > ${(maxSize / 1024).toFixed(0)}KB`);
    }

    // Mise à jour en base
    const { data, error } = await supabase
      .from('saved_analyses')
      .update({
        title: analysisName,
        description: analysisDescription,
        data: compressedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erreur mise à jour: ${error.message}`);
    }

    if (!data) {
      throw new Error('Échec de la mise à jour');
    }

    // Invalider le cache pour forcer le rechargement
    analysisCache.clear();

    return data as SavedAnalysis;
  } catch (error: any) {
    console.error('Erreur updateAnalysisWithSelections:', error);
    throw error;
  }
}

/**
 * 🚀 NOUVEAU : Suppression d'analyse avec cache
 */
export async function deleteSavedAnalysis(id: string, userId: string): Promise<void> {
  try {
    const { error } = await getSupabaseClient()
      .from('saved_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erreur suppression: ${error.message}`);
    }

    // Invalider le cache
    analysisCache.clear();
  } catch (error: any) {
    console.error('Erreur deleteSavedAnalysis:', error);
    throw error;
  }
}

/**
 * 🚀 NOUVEAU : Utilitaires de cache
 */
export const cacheUtils = {
  getStats: () => analysisCache.getStats(),
  clearCache: () => analysisCache.clear(),
  isInCache: (userId: string, analysisId: string) => 
    analysisCache.get(`${userId}_${analysisId}`) !== null
};

/**
 * 🔧 DIAGNOSTIC : Vérifier l'état du système de sauvegarde
 */
export const diagnostics = {
  getCacheInfo: () => cacheUtils.getStats(),
  
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await getSupabaseClient()
        .from('saved_analyses')
        .select('count')
        .limit(1);
      
      if (error) {
        return { success: false, message: `Erreur connexion: ${error.message}` };
      }
      
      return { success: true, message: 'Connexion Supabase OK' };
    } catch (error: any) {
      return { success: false, message: `Erreur test: ${error.message}` };
    }
  },
  
  async getUserAnalysesCount(userId: string): Promise<number> {
    try {
      const analyses = await getSavedAnalyses(userId);
      return analyses.length;
    } catch {
      return -1;
    }
  },
  
  getMemoryUsage(): { cacheEntries: number; estimatedSizeKB: number } {
    const stats = cacheUtils.getStats();
    return {
      cacheEntries: stats.size,
      estimatedSizeKB: Math.round(stats.size * 100) // Estimation approximative
    };
  }
};

/**
 * Met à jour le titre et la description d'une analyse sauvegardée
 */
export async function updateSavedAnalysis(
  analysisId: string,
  userId: string,
  updates: { title?: string; description?: string }
): Promise<void> {
  try {
    // Validation de session
    const supabase = getSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || session.user.id !== userId) {
      throw new Error('Authentification invalide');
    }

    // Validation des données
    if (!analysisId?.trim()) {
      throw new Error('ID d\'analyse requis');
    }

    if (!updates.title?.trim() && !updates.description?.trim()) {
      throw new Error('Au moins un champ doit être modifié');
    }

    // Préparer les données à mettre à jour
    const updateData: any = {};
    if (updates.title?.trim()) {
      updateData.title = updates.title.trim();
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description.trim();
    }

    // Mettre à jour en base
    const { error } = await supabase
      .from('saved_analyses')
      .update(updateData)
      .eq('id', analysisId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }

    // Invalider le cache pour forcer le rechargement
    analysisCache.clear();

  } catch (error: any) {
    console.error('Erreur updateSavedAnalysis:', error);
    throw error;
  }
}

// Interfaces et fonctions exportées automatiquement par les déclarations export ci-dessus 