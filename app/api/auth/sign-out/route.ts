import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CookieOptions } from '@supabase/ssr';

/**
 * Route API pour la déconnexion
 * 
 * Cette route gère la déconnexion côté serveur et la suppression des cookies de session.
 * Elle est appelée après la déconnexion côté client pour garantir la cohérence.
 */
export async function POST(request: NextRequest) {
  try {
    // Créer un client Supabase avec les cookies
    const cookieStore = cookies();
    
    // Utiliser la syntaxe type-safe pour la configuration des cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set(name, value, options as unknown as CookieOptions);
            } catch (error) {
              // Gestion silencieuse des erreurs de cookie

            }
          },
          remove(name, options) {
            try {
              cookieStore.delete(name);
            } catch (error) {
              // Gestion silencieuse des erreurs de cookie

            }
          },
        },
      }
    );
    
    // Déconnecter l'utilisateur
    const { error } = await supabase.auth.signOut();
    
    // Gérer les erreurs
    if (error) {

      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    // Nettoyer les cookies explicitement
    // Note: Supabase le fait déjà, mais c'est une bonne pratique de le faire ici aussi
    const authCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'sora-auth',
    ];
    
    // Supprimer tous les cookies d'authentification
    try {
      authCookies.forEach(cookieName => {
        cookieStore.delete(cookieName);
      });
    } catch (error) {

    }
    
    // Réponse réussie
    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie',
      redirectUrl: '/login'
    });
  } catch (error: any) {

    return NextResponse.json(
      { success: false, message: 'Erreur serveur', redirectUrl: '/login' },
      { status: 500 }
    );
  }
} 

