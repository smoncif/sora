/**
 * Service de gestion des utilisateurs
 * 
 * Ce service fournit des méthodes pour gérer les utilisateurs de l'application,
 * indépendamment de l'interface utilisateur et sans dépendance aux hooks React.
 */

import { createClient } from '@/lib/supabase/client';
import { User, UserMetadata, UserRole, Permission } from '@/types/auth';

// Types spécifiques au service utilisateur
export interface UserUpdateData {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  permissions?: Permission[];
  department?: string;
}

export interface UserSearchParams {
  query?: string;
  role?: UserRole;
  department?: string;
  page?: number;
  limit?: number;
}

export interface UserSearchResult {
  users: User[];
  total: number;
  pageCount: number;
  currentPage: number;
}

export interface ServiceResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Convertit un utilisateur Supabase en utilisateur de l'application
 */
export function mapSupabaseUserToAppUser(supabaseUser: any): User {
  if (!supabaseUser) return {} as User;
  
  const metadata = supabaseUser.user_metadata || {};
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    username: metadata.username || supabaseUser.email?.split('@')[0] || '',
    fullName: metadata.full_name || `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim() || '',
    role: metadata.role || UserRole.USER,
    status: supabaseUser.banned ? 'suspended' : supabaseUser.confirmed_at ? 'active' : 'inactive',
    lastLogin: metadata.last_login || supabaseUser.last_sign_in_at,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at,
  };
}

/**
 * Récupère les données de l'utilisateur courant
 */
export async function getCurrentUser(): Promise<ServiceResult<User>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    if (!data.user) {
      return { 
        success: false, 
        error: "Aucun utilisateur connecté",
        code: "AUTH_NOT_AUTHENTICATED"
      };
    }
    
    return {
      success: true,
      data: mapSupabaseUserToAppUser(data.user)
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

/**
 * Récupère les métadonnées de l'utilisateur courant
 */
export async function getCurrentUserMetadata(): Promise<ServiceResult<UserMetadata>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    if (!data.user) {
      return { 
        success: false, 
        error: "Aucun utilisateur connecté",
        code: "AUTH_NOT_AUTHENTICATED"
      };
    }
    
    return {
      success: true,
      data: data.user.user_metadata as UserMetadata
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

/**
 * Met à jour les métadonnées de l'utilisateur courant
 */
export async function updateCurrentUserMetadata(
  metadata: Partial<UserMetadata>
): Promise<ServiceResult<UserMetadata>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    return {
      success: true,
      data: data.user.user_metadata as UserMetadata
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

/**
 * Récupère la liste des utilisateurs
 */
export async function getUsers(params: UserSearchParams = {}): Promise<ServiceResult<UserSearchResult>> {
  try {
    const supabase = createClient();
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    
    // Construire la requête de base
    let query = supabase.auth.admin.listUsers()
    
    const { data, error } = await query;
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    // Filtrer et transformer les résultats
    let filteredUsers = data.users
      .map(mapSupabaseUserToAppUser)
      .filter(user => {
        // Filtrer par rôle si spécifié
        if (params.role && user.role !== params.role) return false;
        
        // Filtrer par département si spécifié
        if (params.department) {
          const userMeta = data.users.find(u => u.id === user.id)?.user_metadata as UserMetadata;
          if (userMeta?.department !== params.department) return false;
        }
        
        // Filtrer par recherche textuelle
        if (params.query) {
          const query = params.query.toLowerCase();
          return (
            user.email.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.fullName.toLowerCase().includes(query)
          );
        }
        
        return true;
      });
    
    // Calculer la pagination
    const total = filteredUsers.length;
    const pageCount = Math.ceil(total / limit);
    
    // Appliquer la pagination
    filteredUsers = filteredUsers.slice(start, start + limit);
    
    return {
      success: true,
      data: {
        users: filteredUsers,
        total,
        pageCount,
        currentPage: page
      }
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

/**
 * Récupère un utilisateur par son ID
 */
export async function getUserById(userId: string): Promise<ServiceResult<User>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    if (!data.user) {
      return { 
        success: false, 
        error: "Utilisateur non trouvé",
        code: "USER_NOT_FOUND"
      };
    }
    
    return {
      success: true,
      data: mapSupabaseUserToAppUser(data.user)
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
}

/**
 * Vérifie si l'utilisateur a le rôle requis
 */
export function hasRole(
  userRole: UserRole | null | undefined,
  requiredRole: UserRole | UserRole[]
): boolean {
  if (!userRole) return false;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(userRole);
}

/**
 * Vérifie si l'utilisateur a la permission requise
 */
export function hasPermission(
  userPermissions: Permission[] | null | undefined,
  requiredPermission: Permission | Permission[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  
  const permissions = Array.isArray(requiredPermission) 
    ? requiredPermission 
    : [requiredPermission];
  
  return permissions.some(permission => userPermissions.includes(permission));
} 
