import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Route API pour la connexion
 * 
 * Cette route gère la connexion côté serveur et la gestion des cookies de session.
 * Elle vérifie également que l'utilisateur a confirmé son email et a été approuvé par un admin.
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
    const cookieStore = await cookies();
    
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
    
    // Gérer les erreurs de connexion
    if (error) {
      console.error('❌ Sign-in error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    // Vérifier le statut de validation de l'utilisateur
    if (data.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, email_confirmed, admin_approved, rejection_reason')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('❌ Error fetching user profile:', profileError);
          // Si on ne peut pas récupérer le profil, on laisse passer pour éviter de bloquer les comptes existants
        } else if (profile) {
          // Vérifier le statut de validation
          switch (profile.status) {
            case 'pending_email_confirmation':
              // Déconnecter l'utilisateur
              await supabase.auth.signOut();
              return NextResponse.json(
                { 
                  success: false, 
                  message: 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception (et vos spams).',
                  code: 'EMAIL_NOT_CONFIRMED'
                },
                { status: 403 }
              );

            case 'pending_admin_approval':
              // Déconnecter l'utilisateur
              await supabase.auth.signOut();
              return NextResponse.json(
                { 
                  success: false, 
                  message: 'Votre compte est en attente d\'approbation par un administrateur. Vous recevrez un email une fois votre compte approuvé.',
                  code: 'PENDING_ADMIN_APPROVAL'
                },
                { status: 403 }
              );

            case 'rejected':
              // Déconnecter l'utilisateur
              await supabase.auth.signOut();
              const rejectionMessage = profile.rejection_reason 
                ? `Votre demande de compte a été rejetée. Raison : ${profile.rejection_reason}`
                : 'Votre demande de compte a été rejetée par un administrateur.';
              return NextResponse.json(
                { 
                  success: false, 
                  message: rejectionMessage,
                  code: 'ACCOUNT_REJECTED'
                },
                { status: 403 }
              );

            case 'suspended':
              // Déconnecter l'utilisateur
              await supabase.auth.signOut();
              return NextResponse.json(
                { 
                  success: false, 
                  message: 'Votre compte a été temporairement suspendu. Veuillez contacter un administrateur pour plus d\'informations.',
                  code: 'ACCOUNT_SUSPENDED'
                },
                { status: 403 }
              );

            case 'inactive':
              // Déconnecter l'utilisateur
              await supabase.auth.signOut();
              return NextResponse.json(
                { 
                  success: false, 
                  message: 'Votre compte a été désactivé par un administrateur. Si vous pensez qu\'il s\'agit d\'une erreur, veuillez contacter le support.',
                  code: 'ACCOUNT_INACTIVE'
                },
                { status: 403 }
              );

            case 'active':
              // Tout est bon, continuer
              break;

            default:
              // Statut inconnu, laisser passer par précaution
              console.warn('⚠️ Unknown user status:', profile.status);
              break;
          }
        }
      } catch (validationError) {
        console.error('❌ Error during validation check:', validationError);
        // En cas d'erreur de validation, on laisse passer pour éviter de bloquer
      }
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
    console.error('❌ Server error in sign-in:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 



