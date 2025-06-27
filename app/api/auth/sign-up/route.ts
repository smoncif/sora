import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';
import { UserRole } from 'lib/types/auth';

/**
 * Route API pour l'inscription
 * 
 * Cette route gère l'inscription côté serveur et permet de définir des métadonnées
 * utilisateur sécurisées côté serveur.
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      firstName,
      lastName,
      role,
      ...otherMetadata 
    } = await request.json();
    
    // Validation des champs requis
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Format d\'email invalide' },
        { status: 400 }
      );
    }
    
    // Validation du mot de passe
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Créer le client Supabase
    const supabase = await createClient();
    
    // Construire les métadonnées utilisateur
    const userMetadata = {
      first_name: firstName,
      last_name: lastName,
      full_name: firstName && lastName ? `${firstName} ${lastName}` : undefined,
      role: role || UserRole.USER, // Par défaut, donner le rôle utilisateur
      status: 'pending_email_confirmation', // Statut initial : en attente de confirmation email
      admin_approved: false, // Non approuvé par admin
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
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback?next=pending-approval`,
      },
    });
    
    // Gérer les erreurs
    if (error) {
      console.error('❌ Supabase auth error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }
    
    // Vérifier si l'email a besoin d'être confirmé
    const emailConfirmationRequired = !data.user?.confirmed_at;
    
    // Si l'utilisateur est créé, créer aussi un profil dans la table profiles
    if (data.user) {
      try {
        // Utiliser le client admin pour créer le profil
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username: data.user.email?.split('@')[0] || '',
            full_name: userMetadata.full_name || '',
            role: userMetadata.role,
            status: 'pending_email_confirmation',
            email_confirmed: false,
            admin_approved: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('❌ Error creating profile:', profileError);
          // Continuer même si la création du profil échoue
        }
      } catch (profileCreationError) {
        console.error('❌ Error in profile creation:', profileCreationError);
        // Continuer même si la création du profil échoue
      }
    }
    
    // Renvoyer les données de l'utilisateur
    return NextResponse.json({
      success: true,
      data: {
        user: data.user,
        emailConfirmationRequired,
        message: emailConfirmationRequired 
          ? 'Compte créé avec succès. Veuillez vérifier votre email pour confirmer votre compte, puis attendre l\'approbation d\'un administrateur.'
          : 'Compte créé avec succès. En attente d\'approbation par un administrateur.',
      },
    });
  } catch (error: any) {
    console.error('❌ Server error in sign-up:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 



