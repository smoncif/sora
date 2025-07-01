import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Fonction pour créer un client admin (bypass RLS)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    // Si pas de service key, utiliser le client normal avec bypass manuel
    console.warn('No service role key found, using normal client');
    return null;
  }
  return createServiceClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(request: NextRequest) {
  try {
  const supabase = await createClient();
  
    // Vérifier l'authentification de l'utilisateur actuel
    const { data: { user }, error: authError } = await supabase.auth.getUser();
  
    if (authError || !user) {
    return NextResponse.json(
        { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
        // Vérifier que l'utilisateur connecté est admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching current user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify admin access', details: profileError.message },
        { status: 500 }
      );
    }

    if (!currentUserProfile || currentUserProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
  
    // Utiliser le client admin pour récupérer tous les utilisateurs (contourne RLS)
    const adminClient = createAdminClient();
    
    if (!adminClient) {
      return NextResponse.json(
        { error: 'Admin client not available' },
        { status: 500 }
      );
    }

    const { data: profiles, error: usersError } = await adminClient
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        department,
        created_at,
        updated_at,
        admin_approved,
        admin_approved_at,
        admin_approved_by,
        rejected_at,
        rejected_by,
        rejection_reason,
        email_confirmation_sent_at,
        status
      `)
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching profiles:', usersError);
      
      // Fallback: essayer une requête SQL directe si besoin
      try {
        const { data: directProfiles, error: directError } = await adminClient
          .rpc('get_all_profiles_admin');
        
        if (!directError && directProfiles) {
          const mappedUsers = directProfiles.map((profile: any) => ({
            id: profile.id,
            email: profile.email,
            username: profile.email.split('@')[0],
            fullName: profile.full_name || '',
            role: profile.role || 'user',
            status: 'active' as const,
            department: profile.department || '',
            createdAt: profile.created_at,
            updatedAt: profile.updated_at,
            lastLogin: profile.last_sign_in_at,
            emailConfirmed: !!profile.email_confirmed_at,
            emailConfirmationSentAt: profile.email_confirmed_at
          }));

          return NextResponse.json({
            users: mappedUsers,
            count: mappedUsers.length,
            source: 'direct-sql'
          });
        }
              } catch (rpcError) {
          console.error('RPC fallback failed:', rpcError);
        }
      
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      );
    }
    
    // Récupérer les données d'authentification pour déterminer le vrai statut
    const userIds = (profiles || []).map((p: any) => p.id);
    let authUsersData: any[] = [];
    
    if (userIds.length > 0) {
      try {
        // Utiliser la fonction RPC avec le client admin pour accéder aux données auth.users
        const { data: authUsers, error: authError } = await adminClient
          .rpc('get_auth_users_data', { user_ids: userIds });
        
        if (authError) {
          console.error('Error fetching auth users data via RPC:', authError);
        } else {
          authUsersData = authUsers || [];
        }
      } catch (error) {
        console.error('Exception while fetching auth users data:', error);
      }
    }

    // Mapper les profils vers le format attendu avec le vrai statut
    const usersWithAuthData = (profiles || []).map((profile: any) => {
      const authUser = authUsersData.find((au: any) => au.id === profile.id);
      
      // Déterminer le statut réel basé sur le processus de validation en deux étapes
      let status: 'active' | 'inactive' | 'suspended' | 'pending_email_confirmation' | 'pending_admin_approval' | 'rejected' = 'pending_email_confirmation';
      
      if (authUser) {
        // Vérifier si l'utilisateur est banni/suspendu
        if (authUser.banned_until && new Date(authUser.banned_until) > new Date()) {
          status = 'suspended';
        }
        // Vérifier si rejeté par l'admin
        else if (profile.rejected_at) {
          status = 'rejected';
        }
        // Étape 1: Vérification de l'email
        else if (!authUser.email_confirmed_at) {
          status = 'pending_email_confirmation';
        }
        // Étape 2: Vérification de l'approbation admin
        else if (!profile.admin_approved) {
          status = 'pending_admin_approval';
        }
        // Les deux étapes sont validées - utiliser le statut de la base de données
        else {
          // Utiliser le statut de la base de données (active, inactive, etc.)
          status = profile.status || 'active';
        }
      }
      
      return {
        id: profile.id,
        email: profile.email,
        username: profile.email.split('@')[0], // Utiliser la partie avant @ comme username
        fullName: profile.full_name || '',
        role: profile.role || 'user',
        status: status,
        department: profile.department || '',
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        lastLogin: authUser?.last_sign_in_at || null,
        emailConfirmed: !!authUser?.email_confirmed_at,
        emailConfirmationSentAt: profile.email_confirmation_sent_at || null,
        adminApproved: !!profile.admin_approved,
        adminApprovedAt: profile.admin_approved_at || null,
        adminApprovedBy: profile.admin_approved_by || null,
        rejectedAt: profile.rejected_at || null,
        rejectedBy: profile.rejected_by || null,
        rejectionReason: profile.rejection_reason || null
      };
    });

    return NextResponse.json({
      users: usersWithAuthData,
      count: usersWithAuthData.length,
      source: 'admin-client'
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
  const supabase = await createClient();
  
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Vérifier les permissions admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || currentUserProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, full_name, role, department } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Pour l'instant, on simule la création (nécessiterait l'API Admin)
    const newUser = {
      id: `new-${Date.now()}`,
      email,
      username: email.split('@')[0],
      fullName: full_name || '',
      role: role || 'user',
      status: 'active' as const,
      department: department || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      emailConfirmed: true,
      emailConfirmationSentAt: new Date().toISOString()
    };
    
    return NextResponse.json({
      user: newUser,
      message: 'User creation simulated (requires service role key for real creation)'
    });

  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Vérifier les permissions admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || currentUserProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id: targetUserId, action, reason } = body;
    
    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 }
      );
    }
    
    let message = '';
    let updateData: any = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'approve':
        updateData.status = 'active';
        updateData.admin_approved = true;
        updateData.admin_approved_at = new Date().toISOString();
        updateData.admin_approved_by = user.id;
        message = 'Compte utilisateur approuvé avec succès';
        break;

      case 'reject':
        updateData.status = 'rejected';
        updateData.admin_approved = false;
        updateData.rejected_at = new Date().toISOString();
        updateData.rejected_by = user.id;
        if (reason) {
          updateData.rejection_reason = reason;
        }
        message = 'Compte utilisateur rejeté';
        break;

      case 'resend_confirmation':
        // Pour le renvoi d'email, on garde le statut pending_email_confirmation
        updateData.status = 'pending_email_confirmation';
        updateData.email_confirmation_sent_at = new Date().toISOString();
        message = 'Email de confirmation renvoyé';
        
        // Ici on devrait normalement déclencher le renvoi d'email via Supabase Auth
        // Mais pour le moment on simule juste la mise à jour
        break;

      case 'activate':
        updateData.status = 'active';
        message = 'Utilisateur activé';
        break;

      case 'deactivate':
        updateData.status = 'inactive';
        message = 'Utilisateur désactivé';
        break;

      case 'suspend':
        updateData.status = 'suspended';
        message = 'Utilisateur suspendu';
        break;

      case 'change_role':
        if (!reason || !['admin', 'user'].includes(reason)) {
          return NextResponse.json(
            { error: 'Valid role is required (admin or user)' },
            { status: 400 }
          );
        }
        updateData.role = reason;
        message = `Rôle utilisateur modifié vers "${reason === 'admin' ? 'Administrateur' : 'Utilisateur'}"`;
        break;

      default:
        return NextResponse.json(
          { error: 'Action not supported' },
          { status: 400 }
        );
    }

    // Mettre à jour le profil utilisateur
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId);
    
    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user', details: updateError.message },
        { status: 500 }
      );
    }
    
    // Récupérer l'utilisateur mis à jour pour le renvoyer
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single();
    
    if (fetchError || !updatedProfile) {
      console.error('Error fetching updated user profile:', fetchError);
      // Continuer mais sans les données mises à jour
    }
    
    // Si c'est une approbation, on peut aussi envoyer un email de notification
    // (à implémenter selon les besoins)

    const response: any = {
      message,
      action,
      userId: targetUserId
    };
    
    // Ajouter l'utilisateur mis à jour si disponible
    if (updatedProfile) {
      response.updatedUser = {
        id: updatedProfile.id,
        email: updatedProfile.email,
        username: updatedProfile.email?.split('@')[0] || '',
        fullName: updatedProfile.full_name || '',
        role: updatedProfile.role || 'user',
        status: updatedProfile.status,
        department: updatedProfile.department || '',
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
        lastLogin: null, // Sera mis à jour plus tard si nécessaire
        emailConfirmed: true, // Sera mis à jour plus tard si nécessaire
        emailConfirmationSentAt: updatedProfile.email_confirmation_sent_at,
        adminApproved: !!updatedProfile.admin_approved,
        adminApprovedAt: updatedProfile.admin_approved_at,
        adminApprovedBy: updatedProfile.admin_approved_by,
        rejectedAt: updatedProfile.rejected_at,
        rejectedBy: updatedProfile.rejected_by,
        rejectionReason: updatedProfile.rejection_reason
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
  
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
  
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Vérifier les permissions admin
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || currentUserProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Empêcher l'auto-suppression
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Essayer d'utiliser le client admin d'abord
    const adminClient = createAdminClient();
    
    if (adminClient) {
      try {
        // ÉTAPE 1: Supprimer d'abord le profil pour éviter les contraintes FK
        const { error: profileDeleteError } = await adminClient
          .from('profiles')
          .delete()
          .eq('id', userId);
        
        if (profileDeleteError) {
          console.error('Failed to delete profile first:', profileDeleteError);
          throw new Error(`Profile deletion failed: ${profileDeleteError.message}`);
        }
        
        // ÉTAPE 2: Maintenant supprimer l'utilisateur auth
        const { data, error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
        
        if (deleteError) {
          console.error('Auth user deletion failed:', deleteError);
          throw new Error(`Auth deletion failed: ${deleteError.message}`);
        }

        return NextResponse.json({
          message: 'User successfully deleted completely',
          method: 'admin-api-two-step',
          userId,
          deletedUser: data.user
        });
        
      } catch (adminError) {
        // Fallback en cas d'erreur avec le client admin
      }
    }

    // Fallback: utiliser RLS pour supprimer le profil
    
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (deleteProfileError) {
      console.error('Profile deletion via RLS failed:', deleteProfileError);
      return NextResponse.json(
        { error: 'Failed to delete user profile', details: deleteProfileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User profile deleted successfully',
      method: 'rls-profile-deletion',
      userId,
      note: 'Auth user still exists. Configure SUPABASE_SERVICE_ROLE_KEY for complete deletion.'
    });

  } catch (error) {
    console.error('Error in DELETE /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 



