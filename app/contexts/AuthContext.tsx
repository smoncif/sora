'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, PropsWithChildren } from 'react';
import { useRouter } from 'next/navigation';
import { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { 
  AuthContextValue, 
  UserMetadata, 
  UserRole, 
  Permission 
} from 'lib/types/auth';

// Création du contexte avec une valeur par défaut
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Fonction utilitaire pour mapper un utilisateur Supabase vers le type User du projet
function mapSupabaseUserToAppUser(supabaseUser: import('@supabase/supabase-js').User): import('lib/types/auth').User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    username: (supabaseUser.user_metadata?.username as string) || '',
    fullName: (supabaseUser.user_metadata?.full_name as string) || '',
    role: (supabaseUser.user_metadata?.role as UserRole) || UserRole.USER,
    status: 'active', // à adapter si tu as une logique de statut
    lastLogin: undefined,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

/**
 * Provider du contexte d'authentification
 * Ce composant doit être placé en haut de l'arbre de composants
 * pour que tous les composants puissent accéder au contexte d'authentification
 */
export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const supabase = createClient();
  
  // État de l'authentification
  const [user, setUser] = useState<import('lib/types/auth').User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialized, setInitialized] = useState<boolean>(false);
  
  // Récupération du rôle et des permissions de l'utilisateur
  const userRole = useMemo(() => userMetadata?.role || null, [userMetadata]);
  const userPermissions = useMemo(() => userMetadata?.permissions || [], [userMetadata]);
  
  /**
   * Fonction pour récupérer la session utilisateur
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {

      // Récupérer la session existante
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {

        return false;
      }
      
      if (sessionData?.session) {

        setSession(sessionData.session);
        setUser(mapSupabaseUserToAppUser(sessionData.session.user));
        setUserMetadata(sessionData.session.user.user_metadata as UserMetadata);
        return true;
      }
      
      // Si pas de session, tenter de la rafraîchir une fois

      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {

        return false;
      }
      
      if (refreshData?.session) {

        setSession(refreshData.session);
        setUser(mapSupabaseUserToAppUser(refreshData.session.user));
        setUserMetadata(refreshData.session.user.user_metadata as UserMetadata);
        return true;
      }
      
      // Si toutes les tentatives échouent, nettoyer l'état
      setUser(null);
      setUserMetadata(null);
      setSession(null);
      return false;
    } catch (error) {

      return false;
    }
  }, [supabase]);

  /**
   * Fonction pour vérifier la session
   */
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);

      // Récupérer la session
      const success = await refreshSession();


      return success;
    } catch (error) {

      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshSession]);

  /**
   * Effet pour initialiser le contexte d'authentification
   */
  useEffect(() => {
    // Fonction pour initialiser la session
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Récupérer la session
        const success = await refreshSession();
        
        if (!success) {

          setUser(null);
          setUserMetadata(null);
          setSession(null);
        } else {

        }
      } catch (error) {

      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    
    // Abonnement aux changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {

        if (newSession) {
          setSession(newSession);
          setUser(mapSupabaseUserToAppUser(newSession.user));
          setUserMetadata(newSession.user.user_metadata as UserMetadata);

        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserMetadata(null);

        }
        
        // Rafraîchir le router pour refléter le nouvel état d'authentification
        if (initialized) {
          router.refresh();
        }
      }
    );
    
    // Initialiser l'authentification
    initializeAuth();
    
    // Nettoyer l'abonnement lors du démontage
    return () => {
      subscription.unsubscribe();
    };
  }, [router, initialized, refreshSession, supabase.auth]);

  /**
   * Connexion avec email et mot de passe
   */
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {

        return { success: false, error: error.message };
      }


      // Vérifier si la session est bien établie
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const sessionSuccess = await refreshSession();
      
      if (!sessionSuccess) {

        return { success: false, error: 'Connexion réussie mais session non établie' };
      }


      return { success: true };
    } catch (error: any) {

      return { success: false, error: error.message || 'Erreur de connexion inconnue' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inscription avec email et mot de passe
   */
  const signUp = async (email: string, password: string, metadata?: Partial<UserMetadata>) => {
    try {
      setLoading(true);
      
      // Créer un utilisateur avec des métadonnées
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            role: metadata?.role || UserRole.USER,
            // Date au format ISO pour le suivi
            created_at: new Date().toISOString(),
          },
        },
      });
      
      if (error) {

        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {

      return { success: false, error: error.message || 'Erreur d\'inscription inconnue' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Déconnexion de l'utilisateur
   * @param redirect Si true (par défaut), redirige vers la page de connexion
   */
  const signOut = async (redirect = true) => {
    try {
      setLoading(true);

      // Si redirect est true, rediriger immédiatement
      if (redirect) {

        window.location.replace('/login');
        
        // Déconnecter en arrière-plan via API
        try {
          fetch('/api/auth/sign-out', {
            method: 'POST',
            credentials: 'include',
          }).catch(() => {
            // Ignorer les erreurs car nous sommes déjà en train de quitter la page
          });
        } catch (e) {
          // Ignorer les erreurs potentielles
        }
        
        return; // Ne pas continuer l'exécution
      }
      
      // Exécuter la déconnexion normalement (sans redirection) si redirect est false
      const { error } = await supabase.auth.signOut();
      
      if (error) {

      }
      
      // Nettoyer l'état local
      setUser(null);
      setSession(null);
      setUserMetadata(null);


    } catch (error) {

    } finally {
      setLoading(false);
    }
  };

  /**
   * Demande de réinitialisation du mot de passe
   */
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      
      // URL de redirection après la réinitialisation du mot de passe
      const redirectTo = `${window.location.origin}/reset-password/confirm`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      
      if (error) {

        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {

      return { success: false, error: error.message || 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Confirmation de la réinitialisation du mot de passe
   */
  const confirmPasswordReset = async (password: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) {

        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {

      return { success: false, error: error.message || 'Erreur inconnue' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vérifie si l'utilisateur a le rôle requis
   */
  const hasRole = (requiredRole: UserRole | UserRole[]): boolean => {
    if (!userRole) return false;
    
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }
    
    return userRole === requiredRole;
  };

  /**
   * Vérifie si l'utilisateur a la permission requise
   */
  const hasPermission = (requiredPermission: Permission | Permission[]): boolean => {
    if (!userPermissions || userPermissions.length === 0) return false;
    
    // Détection du rôle administrateur qui a toutes les permissions
    if (userRole === UserRole.ADMIN) return true;
    
    if (Array.isArray(requiredPermission)) {
      return requiredPermission.some(permission => 
        userPermissions.includes(permission)
      );
    }
    
    return userPermissions.includes(requiredPermission);
  };

  // Valeur du contexte
  const value: AuthContextValue = {
    // État
    user,
    userMetadata,
    loading,
    isLoading: loading,
    error: null,
    isAuthenticated: !!user,
    userRole,
    userPermissions: [...userPermissions],
    
    // Méthodes
    signIn,
    signOut,
    signUp,
    hasRole,
    hasPermission,
    refreshSession,
    resetPassword,
    confirmPasswordReset,
    checkSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte d'authentification
 * @returns Le contexte d'authentification
 * @throws {Error} Si utilisé en dehors d'un AuthProvider
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  
  return context;
}; 

