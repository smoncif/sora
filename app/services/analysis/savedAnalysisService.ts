import { createClient } from '@/utils/supabase/client';
import { SimplifiedAnalysisResult } from 'lib/types/roleAnalysis';

// Utiliser le même client que le reste de l'application
const getSupabaseClient = () => createClient();

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
  progress: number; // Pourcentage d'avancement (0-100)
}

/**
 * Récupère toutes les analyses sauvegardées de l'utilisateur
 */
export async function getSavedAnalyses(userId: string): Promise<SavedAnalysisMetadata[]> {
  try {
    // Vérifier que userId est valide
    if (!userId || userId.trim() === '') {

      return [];
    }


    const { data, error } = await getSupabaseClient()
      .from('saved_analyses')
      .select('id, title, description, created_at, updated_at, data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {

      throw new Error(`Erreur lors de la récupération des analyses: ${error.message}`);
    }


    if (!data || data.length === 0) {
      return [];
    }

    // Transformer les données pour l'affichage en liste avec protection contre les erreurs
    return data.map(analysis => {
      try {
        const analysisData = analysis.data as SimplifiedAnalysisResult;
        const selectedRolesCount = Object.keys(analysisData.userSelections || {}).length;
        const totalBusinessRoles = analysisData.metadata?.totalBusinessRoles || 0;
        const progress = totalBusinessRoles > 0 ? Math.round((selectedRolesCount / totalBusinessRoles) * 100) : 0;

        // Gérer uploadDate avec protection
        let uploadDate: string | undefined;
        try {
          const importDate = analysisData.metadata?.importDate;
          if (importDate) {
            if (typeof importDate === 'string') {
              uploadDate = importDate;
            } else if (importDate instanceof Date) {
              uploadDate = importDate.toISOString();
            }
          }
        } catch (dateError) {

        }

        return {
          id: analysis.id,
          title: analysis.title,
          description: analysis.description,
          created_at: analysis.created_at,
          updated_at: analysis.updated_at,
          metadata: {
            totalBusinessRoles: analysisData.metadata?.totalBusinessRoles || 0,
            totalSimpleRoles: analysisData.metadata?.totalSimpleRoles || 0,
            totalTransactions: analysisData.metadata?.totalTransactions || 0,
            fileName: analysisData.metadata?.fileName,
            uploadDate,
          },
          selectedRolesCount,
          progress,
        };
      } catch (mappingError) {

        // Retourner une version minimale en cas d'erreur
        return {
          id: analysis.id,
          title: analysis.title || 'Analyse sans titre',
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
  } catch (error) {

    throw error;
  }
}

/**
 * Décompresse les données d'analyse chargées depuis la base de données
 */
function decompressAnalysisData(compressedData: any): SimplifiedAnalysisResult {
  // Si les données ne sont pas marquées comme compressées, les retourner telles quelles
  if (!compressedData._compressed) {
    return compressedData as SimplifiedAnalysisResult;
  }

  // Reconstituer la structure complète à partir des données compressées
  const decompressed: SimplifiedAnalysisResult = {
    id: compressedData.id || '',
    name: compressedData.name || '',
    description: compressedData.description || '',
    timestamp: compressedData.timestamp || new Date(),
    
    // Métadonnées
    metadata: {
      fileName: compressedData.metadata?.fileName || '',
      fileSize: compressedData.metadata?.fileSize || 0,
      importDate: compressedData.metadata?.importDate || new Date(),
      totalBusinessRoles: compressedData.metadata?.totalBusinessRoles || 0,
      totalSimpleRoles: compressedData.metadata?.totalSimpleRoles || 0,
      totalTransactions: compressedData.metadata?.totalTransactions || 0,
      processingTimeMs: 0 // Pas sauvegardé dans la version compressée
    },
    
    // Données source
    businessRoleTransactions: compressedData.businessRoleTransactions || [],
    simpleRoleTransactions: compressedData.simpleRoleTransactions || [],
    
    // Analyses de couverture - reconstituer les propriétés manquantes
    coverageAnalyses: (compressedData.coverageAnalyses || []).map((analysis: any) => ({
      businessRole: analysis.businessRole,
      totalTransactions: analysis.totalTransactions,
      uniqueTransactions: analysis.uniqueTransactions,
      simpleRoles: (analysis.simpleRoles || []).map((role: any) => ({
        roleName: role.roleName,
        coveragePercentage: role.coveragePercentage,
        coveredTransactions: role.coveredTransactions || [],
        uncoveredTransactions: [], // Sera recalculé si nécessaire
        isSelected: false, // Sera mis à jour selon les sélections
        executionFrequency: 0 // Sera recalculé si nécessaire
      }))
    })),
    
    // Sélections utilisateur
    userSelections: compressedData.userSelections || {},
    
    // 🚀 CORRECTION : Préserver les coefficients sauvegardés au lieu d'utiliser les valeurs par défaut
    analysisParams: {
      minCoverageThreshold: compressedData.analysisParams?.minCoverageThreshold ?? 0,
      includeFrequency: compressedData.analysisParams?.includeFrequency ?? true,
      // 🎯 IMPORTANT : Utiliser les valeurs sauvegardées, pas les valeurs par défaut
      coverageWeight: compressedData.analysisParams?.coverageWeight ?? 50,
      sizeWeight: compressedData.analysisParams?.sizeWeight ?? 50,
      usageWeight: compressedData.analysisParams?.usageWeight ?? 0
    }
  };


  return decompressed;
}

/**
 * Récupère une analyse sauvegardée spécifique par son ID
 */
export async function getSavedAnalysisById(id: string, userId: string): Promise<SimplifiedAnalysisResult> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('saved_analyses')
      .select('data')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Erreur lors de la récupération de l'analyse: ${error.message}`);
    }

    if (!data) {
      throw new Error('Analyse non trouvée');
    }

    // 🚀 NOUVEAU : Décompresser les données si nécessaire
    const analysisData = decompressAnalysisData(data.data);
    
    // Analyse chargée avec succès

    return analysisData;
  } catch (error) {

    throw error;
  }
}

/**
 * Sauvegarde une nouvelle analyse
 */
export async function createSavedAnalysis(
  params: CreateSavedAnalysisParams,
  userId: string
): Promise<string> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('saved_analyses')
      .insert({
        title: params.title,
        description: params.description,
        user_id: userId,
        is_public: params.isPublic || false,
        data: params.data,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Erreur lors de la sauvegarde: ${error.message}`);
    }

    return data.id;
  } catch (error) {

    throw error;
  }
}

/**
 * Met à jour une analyse existante
 */
export async function updateSavedAnalysis(
  id: string,
  params: Partial<CreateSavedAnalysisParams>,
  userId: string
): Promise<void> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (params.title) updateData.title = params.title;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.data) updateData.data = params.data;
    if (params.isPublic !== undefined) updateData.is_public = params.isPublic;

    const { error } = await getSupabaseClient()
      .from('saved_analyses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  } catch (error) {

    throw error;
  }
}

/**
 * Supprime une analyse sauvegardée
 */
export async function deleteSavedAnalysis(id: string, userId: string): Promise<void> {
  try {
    const { error } = await getSupabaseClient()
      .from('saved_analyses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  } catch (error) {

    throw error;
  }
}

/**
 * Reconstruit l'état des rôles sélectionnés à partir des données sauvegardées
 */
export function reconstructSelectedRoles(savedData: SimplifiedAnalysisResult): Map<string, Set<string>> {
  const selectedRolesMap = new Map<string, Set<string>>();
  
  if (savedData.userSelections) {
    Object.entries(savedData.userSelections).forEach(([businessRole, simpleRoles]) => {
      // Vérifier que simpleRoles est un tableau de strings
      if (Array.isArray(simpleRoles)) {
        selectedRolesMap.set(businessRole, new Set(simpleRoles as string[]));
      }
    });
  }
  
  return selectedRolesMap;
}

/**
 * Prépare les données d'analyse pour la sauvegarde avec tous les paramètres
 */
export function prepareAnalysisForSaving(
  analysisResult: SimplifiedAnalysisResult,
  userSelections: Record<string, string[]>,
  weights: {
    coverageWeight: number;
    sizeWeight: number;
    usageWeight: number;
  }
): SimplifiedAnalysisResult {
  return {
    ...analysisResult,
    userSelections,
    analysisParams: {
      ...analysisResult.analysisParams,
      coverageWeight: weights.coverageWeight,
      sizeWeight: weights.sizeWeight,
      usageWeight: weights.usageWeight,
    },
  };
}

/**
 * Sauvegarde une analyse complète avec les sélections utilisateur en base de données
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


    // Vérifier l'authentification avant de continuer
    const supabase = getSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {

      throw new Error(`Erreur d'authentification: ${sessionError.message}`);
    }
    
    if (!session) {

      throw new Error('Vous devez être connecté pour sauvegarder une analyse');
    }


    // Vérifier que l'userId correspond à la session
    if (session.user.id !== userId) {

      throw new Error('ID utilisateur non valide');
    }
    
    // Convertir les sélections en format JSON sérialisable
    const userSelectionsObj: Record<string, string[]> = {};
    userSelections.forEach((simpleRoles, businessRole) => {
      userSelectionsObj[businessRole] = Array.from(simpleRoles);
    });

    // Enrichir l'analysisResult avec les sélections et les coefficients ACTUELS pour le stockage
    const enrichedAnalysisResult = {
      ...analysisResult,
      userSelections: userSelectionsObj,
      analysisParams: {
        ...analysisResult.analysisParams,
        // 🎯 CORRECTION : Utiliser les coefficients actuels de l'interface
        coverageWeight: currentWeights.coverageWeight,
        sizeWeight: currentWeights.sizeWeight,
        usageWeight: currentWeights.usageWeight,
      }
    };



    // 🚀 NOUVEAU : Compresser les données pour éviter le timeout
    const compressedData = compressAnalysisData(enrichedAnalysisResult);
    


    // 🔍 Vérifications avant insertion
    try {
      const jsonString = JSON.stringify(compressedData);
      const dataSizeKB = Math.round(jsonString.length / 1024);
      

      
      // Vérifier si les données sont encore trop volumineuses
      if (dataSizeKB > 500) {

      }
      
    } catch (jsonError) {

      throw new Error('Les données ne peuvent pas être sérialisées en JSON');
    }

    // Insérer en base de données avec les données compressées
    const { data, error } = await getSupabaseClient()
      .from('saved_analyses')
      .insert([{
        title: analysisName,
        description: analysisDescription,
        user_id: userId,
        is_public: false,
        data: compressedData // 🚀 Utiliser les données compressées
      }])
      .select('*')
      .single();

    if (error) {


      throw new Error(`Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'} (Code: ${error.code || 'N/A'})`);
    }

    if (!data) {
      throw new Error('Aucune donnée retournée après la sauvegarde');
    }


    return data as SavedAnalysis;
  } catch (error: any) {

    throw error;
  }
}

/**
 * Met à jour une analyse existante avec de nouvelles sélections
 */
export async function updateAnalysisSelections(
  analysisId: string,
  userSelections: Map<string, Set<string>>,
  userId: string
): Promise<SavedAnalysis> {
  try {

    // Convertir les sélections en format JSON
    const userSelectionsObj: Record<string, string[]> = {};
    userSelections.forEach((simpleRoles, businessRole) => {
      userSelectionsObj[businessRole] = Array.from(simpleRoles);
    });

    // Récupérer l'analyse existante pour calculer les nouvelles métadonnées
    const { data: existingAnalysis, error: fetchError } = await getSupabaseClient()
      .from('saved_analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingAnalysis) {
      throw new Error('Analyse non trouvée ou accès non autorisé');
    }

    // Calculer les nouvelles métadonnées
    const analysisData = existingAnalysis.analysis_data as SimplifiedAnalysisResult;
    const totalBusinessRoles = analysisData.coverageAnalyses.length;
    const completedBusinessRoles = Object.keys(userSelectionsObj).length;
    const progressPercentage = totalBusinessRoles > 0 
      ? Math.round((completedBusinessRoles / totalBusinessRoles) * 100)
      : 0;

    // Mettre à jour les sélections et métadonnées
    const { data, error } = await getSupabaseClient()
      .from('saved_analyses')
      .update({
        user_selections: userSelectionsObj,
        metadata: {
          ...existingAnalysis.metadata,
          completedBusinessRoles,
          progressPercentage,
          lastModified: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', analysisId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {

      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }

    if (!data) {
      throw new Error('Aucune donnée retournée après la mise à jour');
    }



    return data as SavedAnalysis;

  } catch (error: any) {

    throw new Error(`Impossible de mettre à jour les sélections: ${error.message}`);
  }
}

/**
 * Version de test pour sauvegarder avec des données minimales
 */
export async function saveAnalysisWithSelectionsTest(
  analysisName: string,
  analysisDescription: string,
  userId: string
): Promise<SavedAnalysis> {
  try {

    // Vérifier l'authentification
    const supabase = getSupabaseClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Problème d\'authentification');
    }


    // Données minimales pour test
    const minimalData = {
      metadata: {
        totalBusinessRoles: 1,
        totalSimpleRoles: 1,
        totalTransactions: 1
      },
      coverageAnalyses: [],
      businessRoleTransactions: [],
      simpleRoleTransactions: [],
      userSelections: {},
      analysisParams: {
        includeFrequency: true,
        minCoverageThreshold: 0,
        coverageWeight: 50,
        sizeWeight: 50,
        usageWeight: 0
      }
    };
    
    // Données de test préparées
    const testData = {
      title: analysisName,
      dataSize: JSON.stringify(minimalData).length
    };

    // Insérer en base de données
    const { data, error } = await supabase
      .from('saved_analyses')
      .insert([{
        title: testData.title,
        description: analysisDescription,
        user_id: userId,
        is_public: false,
        data: minimalData
      }])
      .select('*')
      .single();

    if (error) {

      throw new Error(`Erreur test: ${error.message || 'Erreur inconnue'}`);
    }


    return data as SavedAnalysis;
    
  } catch (error: any) {

    throw error;
  }
}

/**
 * Compresse les données d'analyse pour la sauvegarde en ne gardant que l'essentiel
 */
function compressAnalysisData(analysisResult: SimplifiedAnalysisResult): any {

  // Ne garder que les données essentielles pour reconstituer l'analyse
  const compressed = {
    // Métadonnées essentielles
    metadata: {
      totalBusinessRoles: analysisResult.metadata?.totalBusinessRoles || 0,
      totalSimpleRoles: analysisResult.metadata?.totalSimpleRoles || 0,
      totalTransactions: analysisResult.metadata?.totalTransactions || 0,
      fileName: analysisResult.metadata?.fileName,
      importDate: analysisResult.metadata?.importDate
    },
    
    // 🎯 IMPORTANT : Paramètres d'analyse avec coefficients
    analysisParams: analysisResult.analysisParams,
    
    // Nom et description
    name: analysisResult.name,
    description: analysisResult.description,
    
    // Sélections utilisateur (essentiel pour la reprise)
    userSelections: analysisResult.userSelections || {},
    
    // Analyses de couverture compressées (seulement les infos essentielles)
    coverageAnalyses: analysisResult.coverageAnalyses.map(analysis => ({
      businessRole: analysis.businessRole,
      totalTransactions: analysis.totalTransactions,
      uniqueTransactions: analysis.uniqueTransactions, // Garder pour reconstituer
      simpleRoles: analysis.simpleRoles.map(role => ({
        roleName: role.roleName,
        coveredTransactions: role.coveredTransactions, // Essentiel pour les sélections
        coveragePercentage: role.coveragePercentage
      }))
    })),
    
    // Transactions métier (compressées - seulement les uniques)
    businessRoleTransactions: analysisResult.businessRoleTransactions.map(tx => ({
      businessRole: tx.businessRole,
      transaction: tx.transaction,
      executionCount: tx.executionCount
    })),
    
    // Transactions rôles simples (compressées - seulement les uniques)
    simpleRoleTransactions: analysisResult.simpleRoleTransactions.map(tx => ({
      simpleRole: tx.simpleRole,
      transaction: tx.transaction
      // Note: SimpleRoleTransaction n'a pas de executionCount
    })),
    
    // Marquer comme données compressées
    _compressed: true,
    _version: '1.0'
  };

  return compressed;
} 
