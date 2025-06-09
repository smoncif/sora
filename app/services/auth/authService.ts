/**
 * Service d'authentification
 * 
 * Ce service gère toutes les opérations liées à l'authentification
 * des utilisateurs avec Supabase, incluant la connexion, l'inscription, 
 * la déconnexion et la gestion des sessions.
 * 
 * Il agit comme une couche d'abstraction au-dessus de l'API Supabase Auth
 * et expose des méthodes adaptées aux besoins spécifiques de l'application.
 * 
 * @module AuthService
 */

import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { 
  User,
  UserMetadata, 
  UserRole,
  Permission
} from '@/types/auth';

/**
 * Convertit un utilisateur Supabase en utilisateur de l'application
 * 
 * @param {SupabaseUser} supabaseUser - L'utilisateur Supabase à convertir
 * @returns {User} L'utilisateur adapté au format de l'application
 * 
 * @example
 * // Exemple d'utilisation
 * const { data } = await supabase.auth.getUser();
 * if (data.user) {
 *   const appUser = mapSupabaseUserToAppUser(data.user);
 *   // Utiliser appUser...
 * }
 */
export function mapSupabaseUserToAppUser(supabaseUser: SupabaseUser): User {
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
 * Récupère la session utilisateur actuelle depuis Supabase
 * 
 * Cette fonction vérifie si l'utilisateur est actuellement connecté
 * et retourne les détails de sa session ainsi que ses informations utilisateur.
 * 
 * @returns {Promise<{
 *   session: Session | null;
 *   user: User | null;
 *   userMetadata: UserMetadata | null;
 *   success: boolean;
 * }>} Un objet contenant la session, l'utilisateur, ses métadonnées et un indicateur de succès
 * 
 * @example
 * // Vérifier si un utilisateur est connecté
 * const { session, user, success } = await getSession();
 * if (success && user) {
 *   * } else {
 *   * }
 */
export async function getSession(): Promise<{
  session: Session | null;
  user: User | null;
  userMetadata: UserMetadata | null;
  success: boolean;
}> {
  const supabase = createClient();
  try {

    // Récupérer la session existante
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {

      return { session: null, user: null, userMetadata: null, success: false };
    }
    
    if (sessionData?.session) {

      const user = mapSupabaseUserToAppUser(sessionData.session.user);
      const userMetadata = sessionData.session.user.user_metadata as UserMetadata;
      
      return { 
        session: sessionData.session, 
        user, 
        userMetadata,
        success: true 
      };
    }
    
    return { session: null, user: null, userMetadata: null, success: false };
  } catch (error) {

    return { session: null, user: null, userMetadata: null, success: false };
  }
}

/**
 * Rafraîchit la session utilisateur ou tente de la récupérer si inexistante
 * 
 * Cette fonction essaie d'abord de récupérer la session existante. Si celle-ci
 * n'existe pas, elle tente de la rafraîchir via le token de rafraîchissement
 * stocké dans le navigateur.
 * 
 * @returns {Promise<{
 *   session: Session | null;
 *   user: User | null;
 *   userMetadata: UserMetadata | null;
 *   success: boolean;
 * }>} Un objet contenant la session, l'utilisateur, ses métadonnées et un indicateur de succès
 * 
 * @example
 * // Rafraîchir une session expirée ou récupérer une session existante
 * const { success, user } = await refreshSession();
 * if (!success) {
 *   // Rediriger vers la page de connexion
 *   router.push('/login');
 * }
 */
export async function refreshSession(): Promise<{
  session: Session | null;
  user: User | null;
  userMetadata: UserMetadata | null;
  success: boolean;
}> {
  const supabase = createClient();
  try {
    // D'abord, essayer de récupérer la session existante
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {

      return { session: null, user: null, userMetadata: null, success: false };
    }
    
    if (sessionData?.session) {

      const user = mapSupabaseUserToAppUser(sessionData.session.user);
      const userMetadata = sessionData.session.user.user_metadata as UserMetadata;
      
      return { 
        session: sessionData.session, 
        user, 
        userMetadata,
        success: true 
      };
    }
    
    // Si pas de session, tenter de la rafraîchir

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {

      return { session: null, user: null, userMetadata: null, success: false };
    }
    
    if (refreshData?.session) {

      const user = mapSupabaseUserToAppUser(refreshData.session.user);
      const userMetadata = refreshData.session.user.user_metadata as UserMetadata;
      
      return { 
        session: refreshData.session, 
        user, 
        userMetadata,
        success: true 
      };
    }
    
    return { session: null, user: null, userMetadata: null, success: false };
  } catch (error) {

    return { session: null, user: null, userMetadata: null, success: false };
  }
}

/**
 * Connexion avec email et mot de passe
 * 
 * Cette fonction authentifie un utilisateur avec son email et son mot de passe
 * via Supabase, puis vérifie que la session est correctement établie.
 * 
 * @param {string} email - L'adresse email de l'utilisateur
 * @param {string} password - Le mot de passe de l'utilisateur
 * @returns {Promise<{ success: boolean; error?: string }>} Résultat de l'opération avec message d'erreur si échec
 * 
 * @example
 * // Connecter un utilisateur
 * const { success, error } = await signIn('user@example.com', 'password123');
 * if (success) {
 *   *   router.push('/dashboard');
 * } else {
 *   *   // Afficher un message d'erreur dans l'UI
 * }
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {

      return { success: false, error: error.message };
    }


    // Vérifier si la session est bien établie
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { success } = await refreshSession();
    
    if (!success) {

      return { success: false, error: 'Connexion réussie mais session non établie' };
    }


    return { success: true };
  } catch (error: any) {

    return { success: false, error: error.message || 'Erreur de connexion inconnue' };
  }
}

/**
 * Inscription avec email et mot de passe
 * 
 * Crée un nouvel utilisateur dans Supabase avec les informations fournies.
 * Des métadonnées supplémentaires peuvent être associées à l'utilisateur.
 * 
 * @param {string} email - L'adresse email du nouvel utilisateur
 * @param {string} password - Le mot de passe du nouvel utilisateur
 * @param {Partial<UserMetadata>} [metadata] - Métadonnées optionnelles pour l'utilisateur (nom, prénom, etc.)
 * @returns {Promise<{ success: boolean; error?: string }>} Résultat de l'opération avec message d'erreur si échec
 * 
 * @example
 * // Inscrire un nouvel utilisateur
 * const { success, error } = await signUp(
 *   'new.user@example.com', 
 *   'securePassword123', 
 *   { 
 *     username: 'newuser', 
 *     full_name: 'New User',
 *     role: UserRole.USER
 *   }
 * );
 * 
 * if (success) {
 *   alert('Vérifiez votre email pour confirmer votre inscription!');
 * } else {
 *   * }
 */
export async function signUp(
  email: string, 
  password: string, 
  metadata?: Partial<UserMetadata>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
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
  }
}

/**
 * Déconnexion de l'utilisateur
 * 
 * Cette fonction déconnecte l'utilisateur de Supabase et peut optionnellement
 * rediriger vers la page de connexion. En cas de redirection, la déconnexion
 * est effectuée en arrière-plan via une requête API.
 * 
 * @param {boolean} [redirect=true] - Si true, redirige vers la page de connexion
 * @returns {Promise<void>}
 * 
 * @example
 * // Déconnecter l'utilisateur et rediriger
 * await signOut(); // Redirige par défaut
 * 
 * // Déconnecter l'utilisateur sans rediriger
 * await signOut(false);
 * */
export async function signOut(redirect = true): Promise<void> {
  const supabase = createClient();
  try {

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


  } catch (error) {

  }
}

/**
 * Demande de réinitialisation du mot de passe
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
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
  }
}

/**
 * Confirmation de la réinitialisation du mot de passe
 */
export async function confirmPasswordReset(password: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  try {
    const { error } = await supabase.auth.updateUser({
      password,
    });
    
    if (error) {

      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {

    return { success: false, error: error.message || 'Erreur inconnue' };
  }
}

// Configuration des écouteurs d'événements d'authentification
export function setupAuthListeners(
  onAuthStateChange: (event: string, session: Session | null) => void
): () => void {
  const supabase = createClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, newSession) => {

      onAuthStateChange(event, newSession);
    }
  );
  
  // Fonction de nettoyage pour désabonner
  return () => {
    subscription.unsubscribe();
  };
} 
