import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from './server';
import { UserRole } from 'lib/types/auth';

/**
 * Fonction pour mettre à jour la session Supabase dans le middleware Next.js
 * Elle est responsable de:
 * 1. Rafraîchir le token d'authentification (en appelant getUser)
 * 2. Transmettre le token rafraîchi aux Server Components
 * 3. Transmettre le token rafraîchi au navigateur
 */
export async function updateSession(request: NextRequest) {
  // Récupère l'URL de la requête entrante
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Crée le client Supabase avec les cookies de la requête
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Définir les cookies sur la requête et la réponse
          // NextRequest.cookies utilise une API différente de NextResponse.cookies
          request.cookies.set({
            name,
            value,
          });
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // NextResponse.cookies accepte les options complètes
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Supprimer les cookies de la requête et de la réponse
          // NextRequest.cookies utilise une API différente
          request.cookies.delete(name);
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // NextResponse.cookies accepte les options complètes
          response.cookies.set({
            name,
            value: '',
            ...options,
            expires: new Date(0),
          });
        },
      },
    }
  );

  // Rafraîchir la session Auth (force l'écriture des cookies)
  await supabase.auth.getUser();

  return response;
} 

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  emailConfirmed: boolean;
}

/**
 * Middleware d'authentification et de gestion des permissions Supabase
 */
export class SupabaseAuthMiddleware {
  
  /**
   * Vérifie l'authentification de l'utilisateur
   */
  static async checkAuthentication(req?: NextRequest): Promise<{
    user: AuthUser | null;
    error: string | null;
  }> {
    try {
      const supabase = await createClient();
      
      // Récupérer l'utilisateur authentifié
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return {
          user: null,
          error: 'Authentication required - User not logged in'
        };
      }

      // Vérifier si l'email est confirmé
      if (!user.email_confirmed_at) {
        return {
          user: null,
          error: 'Email confirmation required'
        };
      }

      // Récupérer les informations du profil utilisateur depuis la table profiles (source de vérité)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status, admin_approved')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile for auth check:', profileError);
        // Fallback sur les métadonnées si la table profiles n'est pas accessible
        const userRole = user.user_metadata?.role as UserRole || UserRole.USER;
        const userStatus = user.user_metadata?.status || 'active';
        
        return {
          user: {
            id: user.id,
            email: user.email!,
            role: userRole,
            status: userStatus,
            emailConfirmed: true
          },
          error: null
        };
      }

      const userRole = profile.role as UserRole || UserRole.USER;
      const userStatus = profile.status || 'active';

      // Vérifier le statut du compte selon le processus de validation
      
      // Étape 1: En attente d'approbation admin (email déjà vérifié plus haut)
      if (!profile.admin_approved) {
        return {
          user: null,
          error: 'Account pending admin approval'
        };
      }

      // Étape 3: Vérifier le statut final (après approbation)
      if (userStatus === 'suspended') {
        return {
          user: null,
          error: 'Account suspended'
        };
      }

      if (userStatus === 'inactive') {
        return {
          user: null,
          error: 'Account has been deactivated by administrator'
        };
      }

      if (userStatus === 'rejected') {
        return {
          user: null,
          error: 'Account has been rejected'
        };
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        role: userRole,
        status: userStatus,
        emailConfirmed: true
      };

      return { user: authUser, error: null };
      
    } catch (error) {
      console.error('Authentication check failed:', error);
      return {
        user: null,
        error: 'Authentication verification failed'
      };
    }
  }

  /**
   * Vérifie si l'utilisateur a les permissions d'administrateur
   */
  static async checkAdminPermission(req?: NextRequest): Promise<{
    user: AuthUser | null;
    error: string | null;
    hasAdminAccess: boolean;
  }> {
    const { user, error } = await this.checkAuthentication(req);
    
    if (error || !user) {
      return {
        user: null,
        error: error || 'Authentication required',
        hasAdminAccess: false
      };
    }

    // Vérifier le rôle administrateur
    const hasAdminAccess = user.role === UserRole.ADMIN;
    
    if (!hasAdminAccess) {
      return {
        user,
        error: 'Admin privileges required - Access denied',
        hasAdminAccess: false
      };
    }

    return {
      user,
      error: null,
      hasAdminAccess: true
    };
  }

  /**
   * Middleware pour protéger les routes admin
   */
  static async protectAdminRoute(req: NextRequest): Promise<NextResponse | null> {
    const { error, hasAdminAccess } = await this.checkAdminPermission(req);
    
    if (error || !hasAdminAccess) {
      return NextResponse.json(
        { 
          error: error || 'Access denied',
          code: 'access_denied',
          details: 'Insufficient permissions for this resource'
        },
        { status: error?.includes('Authentication required') ? 401 : 403 }
      );
    }

    return null; // Pas d'erreur, continuer
  }

  /**
   * Vérifie les permissions pour des rôles spécifiques
   */
  static async checkRolePermission(
    requiredRoles: UserRole[],
    req?: NextRequest
  ): Promise<{
    user: AuthUser | null;
    error: string | null;
    hasAccess: boolean;
  }> {
    const { user, error } = await this.checkAuthentication(req);
    
    if (error || !user) {
      return {
        user: null,
        error: error || 'Authentication required',
        hasAccess: false
      };
    }

    const hasAccess = requiredRoles.includes(user.role);
    
    if (!hasAccess) {
      return {
        user,
        error: `Required role: ${requiredRoles.join(' or ')}. Current role: ${user.role}`,
        hasAccess: false
      };
    }

    return {
      user,
      error: null,
      hasAccess: true
    };
  }

  /**
   * Créé un JWT admin pour les opérations Supabase Admin API
   */
  static async getAdminJWT(): Promise<string | null> {
    try {
      // Pour les opérations admin, utiliser le service role key
      // Cela doit être configuré dans les variables d'environnement
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
        return null;
      }

      return serviceRoleKey;
    } catch (error) {
      console.error('Failed to get admin JWT:', error);
      return null;
    }
  }

  /**
   * Mise à jour des métadonnées utilisateur avec permissions admin
   */
  static async updateUserMetadata(
    userId: string,
    metadata: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();
      
      // Utiliser l'API Admin de Supabase
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: metadata
      });

      if (error) {
        console.error('Failed to update user metadata:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Update user metadata failed:', error);
      return { success: false, error: 'Failed to update user metadata' };
    }
  }
}

/**
 * Helper pour créer des réponses d'erreur standardisées
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: code || 'error',
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Helper pour créer des réponses de succès standardisées
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
} 

