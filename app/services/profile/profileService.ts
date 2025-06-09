/**
 * Service de gestion des profils utilisateurs
 * 
 * Ce service fournit des méthodes pour gérer les profils utilisateurs,
 * indépendamment de l'interface utilisateur et sans dépendance aux hooks React.
 */

import { createClient } from '@/lib/supabase/client';
import { ProfileType, Permission } from '@/types/auth';
import { ServiceResult } from '../user/userService';

// Types pour les profils
export interface ProfileCreateData {
  name: string;
  description: string;
  permissions: Permission[];
  isDefault?: boolean;
}

export interface ProfileUpdateData {
  name?: string;
  description?: string;
  permissions?: Permission[];
  isDefault?: boolean;
}

/**
 * Récupère la liste des profils
 */
export async function getProfiles(): Promise<ServiceResult<ProfileType[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    return {
      success: true,
      data: data as ProfileType[]
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
 * Récupère un profil par son ID
 */
export async function getProfileById(profileId: string): Promise<ServiceResult<ProfileType>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          error: "Profil non trouvé",
          code: "PROFILE_NOT_FOUND"
        };
      }
      
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    return {
      success: true,
      data: data as ProfileType
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
 * Crée un nouveau profil
 */
export async function createProfile(profileData: ProfileCreateData): Promise<ServiceResult<ProfileType>> {
  try {
    const supabase = createClient();
    
    // Vérifier si c'est un profil par défaut
    if (profileData.isDefault) {
      // Désactiver l'option par défaut pour tous les autres profils
      await supabase
        .from('profiles')
        .update({ isDefault: false })
        .eq('isDefault', true);
    }
    
    // Créer le profil
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          name: profileData.name,
          description: profileData.description,
          permissions: profileData.permissions,
          isDefault: profileData.isDefault || false,
          createdAt: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    return {
      success: true,
      data: data as ProfileType
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
 * Met à jour un profil existant
 */
export async function updateProfile(
  profileId: string, 
  profileData: ProfileUpdateData
): Promise<ServiceResult<ProfileType>> {
  try {
    const supabase = createClient();
    
    // Vérifier si on définit ce profil comme défaut
    if (profileData.isDefault) {
      // Désactiver l'option par défaut pour tous les autres profils
      await supabase
        .from('profiles')
        .update({ isDefault: false })
        .eq('isDefault', true);
    }
    
    const updatePayload = {
      ...profileData,
      updatedAt: new Date().toISOString()
    };
    
    // Mettre à jour le profil
    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', profileId)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          error: "Profil non trouvé",
          code: "PROFILE_NOT_FOUND"
        };
      }
      
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    return {
      success: true,
      data: data as ProfileType
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
 * Supprime un profil
 */
export async function deleteProfile(profileId: string): Promise<ServiceResult> {
  try {
    const supabase = createClient();
    
    // Vérifier si le profil existe avant de le supprimer
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id, isDefault')
      .eq('id', profileId)
      .single();
    
    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return { 
          success: false, 
          error: "Profil non trouvé",
          code: "PROFILE_NOT_FOUND"
        };
      }
      
      return { 
        success: false, 
        error: checkError.message,
        code: checkError.code
      };
    }
    
    // Ne pas autoriser la suppression d'un profil par défaut
    if (existingProfile.isDefault) {
      return { 
        success: false, 
        error: "Impossible de supprimer le profil par défaut",
        code: "CANNOT_DELETE_DEFAULT_PROFILE"
      };
    }
    
    // Vérifier si le profil est utilisé par des utilisateurs
    const { data: usersWithProfile, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      return { 
        success: false, 
        error: usersError.message,
        code: usersError.code
      };
    }
    
    const usersUsingProfile = usersWithProfile.users.filter(
      user => user.user_metadata?.profileId === profileId
    );
    
    if (usersUsingProfile.length > 0) {
      return { 
        success: false, 
        error: `Ce profil est utilisé par ${usersUsingProfile.length} utilisateur(s)`,
        code: "PROFILE_IN_USE"
      };
    }
    
    // Supprimer le profil
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);
    
    if (deleteError) {
      return { 
        success: false, 
        error: deleteError.message,
        code: deleteError.code
      };
    }
    
    return {
      success: true
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
 * Récupère le profil par défaut
 */
export async function getDefaultProfile(): Promise<ServiceResult<ProfileType>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('isDefault', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return { 
          success: false, 
          error: "Aucun profil par défaut trouvé",
          code: "DEFAULT_PROFILE_NOT_FOUND"
        };
      }
      
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    return {
      success: true,
      data: data as ProfileType
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
 * Assigne un profil à un utilisateur
 */
export async function assignProfileToUser(
  userId: string, 
  profileId: string
): Promise<ServiceResult> {
  try {
    const supabase = createClient();
    
    // Vérifier que le profil existe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return { 
          success: false, 
          error: "Profil non trouvé",
          code: "PROFILE_NOT_FOUND"
        };
      }
      
      return { 
        success: false, 
        error: profileError.message,
        code: profileError.code
      };
    }
    
    // Mettre à jour les métadonnées de l'utilisateur avec l'ID du profil
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        profileId: profileId,
        permissions: profile.permissions
      }
    });
    
    if (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code
      };
    }
    
    return {
      success: true
    };
  } catch (error: any) {

    return { 
      success: false, 
      error: error.message || "Erreur inconnue",
      code: "UNKNOWN_ERROR"
    };
  }
} 
