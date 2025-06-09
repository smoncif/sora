import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Route API pour la connexion
 * 
 * Cette route gère la connexion côté serveur et la gestion des cookies de session.
 * Elle est utilisée comme fallback si la connexion directe côté client échoue.
 */
export async function POST(request: NextRequest) {
  try {
    // Récupérer les données du corps de la requête
    const { email, password } = await request.json();
    
    // Valider les données
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }
    
    // Créer un client Supabase avec les cookies
    const cookieStore = cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete(name);
          },
        },
      }
    );
    
    // Connecter l'utilisateur
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Gérer les erreurs
    if (error) {

      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    
    // Renvoyer les données de la session
    return NextResponse.json({
      success: true,
      data: {
        user: data.user,
        session: {
          expires_at: data.session?.expires_at,
        },
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 

