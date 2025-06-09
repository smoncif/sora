import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UserRole } from 'lib/types/auth';
import type { CookieOptions } from '@supabase/ssr';

/**
 * Route API pour l'inscription
 * 
 * Cette route gère l'inscription côté serveur et permet de définir des métadonnées
 * utilisateur sécurisées côté serveur.
 */
export async function POST(request: NextRequest) {
  try {
    // Récupérer les données du corps de la requête
    const { email, password, firstName, lastName, role, ...otherMetadata } = await request.json();
    
    // Valider les données obligatoires
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }
    
    // Valider le mot de passe
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }
    
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
    
    // Construire les métadonnées utilisateur
    const userMetadata = {
      first_name: firstName,
      last_name: lastName,
      full_name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
      role: role || UserRole.USER, // Par défaut, donner le rôle utilisateur
      created_at: new Date().toISOString(),
      ...otherMetadata,
    };
    
    // Inscrire l'utilisateur
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
        // URL de redirection après la confirmation par email (si nécessaire)
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });
    
    // Gérer les erreurs
    if (error) {

      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    
    // Vérifier si l'email a besoin d'être confirmé
    const emailConfirmationRequired = !data.user?.confirmed_at;
    
    // Renvoyer les données de l'utilisateur
    return NextResponse.json({
      success: true,
      data: {
        user: data.user,
        emailConfirmationRequired,
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 



