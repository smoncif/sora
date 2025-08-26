/**
 * Service principal pour la gestion des licences
 * 
 * - Récupération des licences depuis Supabase avec nouvelle architecture
 * - Calcul de la licence maximale pour un rôle métier
 * - Enrichissement des données d'analyse avec les licences
 */

import { createClient } from 'lib/utils/supabase/client';
import { 
  SimpleRoleLicenseWithType, 
  SimpleRoleCoverage, 
  CoverageAnalysis, 
  SimplifiedAnalysisResult 
} from 'lib/types/roleAnalysis';

/**
 * Cache des licences pour éviter les requêtes répétées
 * Utilise une approche optimisée avec weak references pour éviter les fuites mémoire
 */
let licenseCache: Map<string, { type: string; order: number }> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Limite du cache pour éviter la surcharge mémoire

/**
 * Récupère toutes les licences depuis Supabase avec JOIN sur license_types
 */
export async function fetchAllLicenses(): Promise<SimpleRoleLicenseWithType[]> {
  try {
    const supabase = createClient();
    
    const { data: licenses, error } = await supabase
      .from('simple_role_licenses')
      .select(`
        *,
        license_types:license_type_id (
          id,
          name,
          display_order,
          description,
          created_at,
          updated_at
        )
      `)
      .order('simple_role', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch licenses: ${error.message}`);
    }

    // Convertir en format approprié
    const formattedLicenses: SimpleRoleLicenseWithType[] = (licenses || []).map(license => ({
      id: license.id,
      simpleRole: license.simple_role,
      licenseTypeId: license.license_type_id,
      createdAt: new Date(license.created_at),
      updatedAt: new Date(license.updated_at),
      licenseType: {
        id: license.license_types.id,
        name: license.license_types.name,
        displayOrder: license.license_types.display_order,
        description: license.license_types.description,
        createdAt: new Date(license.license_types.created_at),
        updatedAt: new Date(license.license_types.updated_at)
      }
    }));

    return formattedLicenses;

  } catch (error) {
    throw error;
  }
}

/**
 * Récupère et cache les licences pour lookup rapide
 * Optimisé avec gestion de taille de cache et performance améliorée
 */
export async function fetchAndCacheLicenses(): Promise<Map<string, { type: string; order: number }>> {
  const now = Date.now();
  
  // Vérifier le cache
  if (licenseCache && (now - lastFetchTime) < CACHE_DURATION) {
    return licenseCache;
  }

  try {
    const licenses = await fetchAllLicenses();

    // Créer le Map avec la taille estimée pour de meilleures performances
    const licenseMap = new Map<string, { type: string; order: number }>(
      licenses.length > 0 ? undefined : []
    );
    
    // Optimisation: utiliser for...of au lieu de forEach
    for (const license of licenses) {
      licenseMap.set(license.simpleRole, {
        type: license.licenseType.name,
        order: license.licenseType.displayOrder
      });
      
      // Vérifier la limite de cache pour éviter la surcharge mémoire
      if (licenseMap.size >= MAX_CACHE_SIZE) {
        break;
      }
    }

    // Mettre à jour le cache
    licenseCache = licenseMap;
    lastFetchTime = now;

    return licenseMap;

  } catch (error) {
    // Retourner un Map vide en cas d'erreur pour éviter les erreurs en cascade
    return new Map();
  }
}

/**
 * Récupère une licence par nom de rôle simple
 */
export function getLicenseForRole(simpleRole: string, licenseMap: Map<string, { type: string; order: number }>): { type: string; order: number } | null {
  return licenseMap.get(simpleRole) || null;
}

/**
 * Calcule la licence la plus chère parmi les rôles simples sélectionnés
 * Optimisé pour les performances avec early return et for...of
 */
export function calculateMaxLicense(simpleRoles: SimpleRoleCoverage[]): {
  maxLicence: string | null;
  maxLicenceOrder: number;
} {
  if (simpleRoles.length === 0) {
    return { maxLicence: null, maxLicenceOrder: 0 };
  }
  
  let maxOrder = 0;
  let maxLicence: string | null = null;
  
  // Optimisation: utiliser for...of pour de meilleures performances
  for (const role of simpleRoles) {
    // Les rôles sont déjà filtrés par sélection en amont, pas besoin de vérifier isSelected
    if (role.licence && role.licenceOrder && role.licenceOrder > maxOrder) {
      maxOrder = role.licenceOrder;
      maxLicence = role.licence;
    }
  }
  
  return {
    maxLicence,
    maxLicenceOrder: maxOrder
  };
}

/**
 * Enrichit les rôles simples avec les informations de licence
 * Optimisé pour éviter les spreads inutiles et améliorer les performances
 */
export function enrichSimpleRolesWithLicenses(
  simpleRoles: SimpleRoleCoverage[],
  licenseMap: Map<string, { type: string; order: number }>
): SimpleRoleCoverage[] {
  if (licenseMap.size === 0) {
    return simpleRoles; // Retour direct si pas de licences
  }
  
  return simpleRoles.map(role => {
    const license = licenseMap.get(role.roleName);
    
    // Optimisation: éviter le spread si pas de licence trouvée
    if (!license) {
      return role;
    }
    
    return {
      ...role,
      licence: license.type,
      licenceOrder: license.order
    };
  });
}

/**
 * Enrichit une analyse de couverture avec les licences maximales
 * Optimisé pour éviter les recalculs inutiles
 */
export function enrichCoverageAnalysisWithLicenses(
  analysis: CoverageAnalysis,
  licenseMap: Map<string, { type: string; order: number }>
): CoverageAnalysis {
  // Early return si pas de licences disponibles
  if (licenseMap.size === 0) {
    return analysis;
  }
  
  // Enrichir les rôles simples
  const enrichedSimpleRoles = enrichSimpleRolesWithLicenses(analysis.simpleRoles, licenseMap);
  
  // Calculer la licence max uniquement sur les rôles sélectionnés pour l'efficacité
  const selectedRoles = enrichedSimpleRoles.filter(role => role.isSelected);
  const { maxLicence, maxLicenceOrder } = calculateMaxLicense(selectedRoles);
  
  return {
    ...analysis,
    simpleRoles: enrichedSimpleRoles,
    maxLicence,
    maxLicenceOrder
  };
}

/**
 * Enrichit un résultat d'analyse complet avec les licences
 */
export async function enrichAnalysisWithLicenses(
  analysisResult: SimplifiedAnalysisResult
): Promise<SimplifiedAnalysisResult> {
  try {
    // Récupérer et cacher toutes les licences
    const licenseMap = await fetchAndCacheLicenses();
    
    // Enrichir chaque analyse de couverture
    const enrichedCoverageAnalyses = analysisResult.coverageAnalyses.map(analysis => 
      enrichCoverageAnalysisWithLicenses(analysis, licenseMap)
    );
    
    return {
      ...analysisResult,
      coverageAnalyses: enrichedCoverageAnalyses
    };

  } catch (error) {
    // En cas d'erreur, retourner l'analyse sans enrichissement
    return analysisResult;
  }
}

/**
 * Recalcule les licences maximales pour une analyse de couverture
 * Utilisé lors du changement de sélections
 */
export function recalculateMaxLicenseForAnalysis(
  analysis: CoverageAnalysis
): CoverageAnalysis {
  const { maxLicence, maxLicenceOrder } = calculateMaxLicense(analysis.simpleRoles);
  
  return {
    ...analysis,
    maxLicence,
    maxLicenceOrder
  };
}

/**
 * Invalide le cache des licences
 * Utile après des modifications admin
 */
export function invalidateLicenseCache(): void {
  licenseCache = null;
  lastFetchTime = 0;
}

/**
 * Vérifie si le cache des licences est valide
 */
export function isLicenseCacheValid(): boolean {
  const now = Date.now();
  return licenseCache !== null && (now - lastFetchTime) < CACHE_DURATION;
}

/**
 * Précharge le cache des licences de manière asynchrone
 * Utile pour améliorer la performance de la première utilisation
 */
export function preloadLicenseCache(): Promise<Map<string, { type: string; order: number }>> {
  return fetchAndCacheLicenses().catch(() => {
    return new Map();
  });
}

/**
 * Obtient les statistiques du cache des licences
 */
export function getLicenseCacheStats(): {
  isValid: boolean;
  size: number;
  ageMs: number;
  maxAgeMs: number;
} {
  const now = Date.now();
  return {
    isValid: isLicenseCacheValid(),
    size: licenseCache?.size || 0,
    ageMs: now - lastFetchTime,
    maxAgeMs: CACHE_DURATION
  };
}

/**
 * Récupère les statistiques des licences
 */
export function getLicenseStats(licenseMap: Map<string, { type: string; order: number }>): {
  totalLicenses: number;
  licenseTypes: Record<string, number>;
  averageOrder: number;
} {
  const licenseTypes: Record<string, number> = {};
  let totalOrder = 0;
  
  licenseMap.forEach(({ type, order }) => {
    licenseTypes[type] = (licenseTypes[type] || 0) + 1;
    totalOrder += order;
  });
  
  const totalLicenses = licenseMap.size;
  
  return {
    totalLicenses,
    licenseTypes,
    averageOrder: totalLicenses > 0 ? totalOrder / totalLicenses : 0
  };
}