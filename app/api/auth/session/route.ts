import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Route API pour récupérer la session utilisateur
 * 
 * Cette route permet de récupérer les informations de session de l'utilisateur
 * actuellement connecté côté serveur.
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer les cookies
    const cookieStore = cookies();
    
    // Créer un client Supabase côté serveur avec le support des cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set(name, value, options);
          },
          remove(name, options) {
            cookieStore.delete(name);
          }
        }
      }
    );
    
    // Récupérer la session
    const { data, error } = await supabase.auth.getSession();
    
    // Gérer les erreurs
    if (error) {

      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }
    
    // Vérifier si une session existe
    if (!data.session) {
      // Essayer de rafraîchir la session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        return NextResponse.json(
          { success: false, message: 'Aucune session active' },
          { status: 401 }
        );
      }
      
      // Retourner la session rafraîchie
      return NextResponse.json({
        success: true,
        data: {
          session: {
            expires_at: refreshData.session.expires_at,
          },
          user: refreshData.user,
        },
      });
    }
    
    // Renvoyer les données de la session
    return NextResponse.json({
      success: true,
      data: {
        session: {
          expires_at: data.session.expires_at,
        },
        user: data.session.user,
      },
    });
  } catch (error: any) {

    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 

