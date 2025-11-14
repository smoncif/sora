/**
 * API Route: DELETE /api/validation/links/[id]
 * Supprime un lien de validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }
    
    // Vérifier que le lien existe et appartient à l'utilisateur (ou est admin)
    const { data: link } = await supabase
      .from('role_validation_links')
      .select('created_by')
      .eq('id', id)
      .single();
    
    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Lien non trouvé' },
        { status: 404 }
      );
    }
    
    // Vérifier les permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    const isAdmin = profile?.role === 'admin';
    const isOwner = link.created_by === user.id;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 403 }
      );
    }
    
    // Supprimer le lien (CASCADE supprime aussi résultats et brouillons)
    const { error } = await supabase
      .from('role_validation_links')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[API /delete] Erreur:', error);
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer le lien' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Lien supprimé avec succès',
    });
  } catch (error) {
    console.error('[API /delete] Exception:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}


