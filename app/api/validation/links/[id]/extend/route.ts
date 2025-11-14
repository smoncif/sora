/**
 * API Route: PATCH /api/validation/links/[id]/extend
 * Prolonge la date d'expiration d'un lien de validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';
import { z } from 'zod';

const ExtendSchema = z.object({
  newExpirationDate: z.string().datetime(),
});

export async function PATCH(
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
    
    const body = await request.json();
    const validation = ExtendSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Données invalides',
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { newExpirationDate } = validation.data;
    const newDate = new Date(newExpirationDate);
    
    // Vérifier que la nouvelle date est dans le futur
    if (newDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'La date doit être dans le futur' },
        { status: 400 }
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
    
    // Mettre à jour le lien
    const { data, error } = await supabase
      .from('role_validation_links')
      .update({
        expires_at: newExpirationDate,
        status: 'active', // Réactiver si était expiré
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error || !data) {
      console.error('[API /extend] Erreur:', error);
      return NextResponse.json(
        { success: false, error: 'Impossible de prolonger le lien' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        expiresAt: data.expires_at,
        status: data.status,
      },
    });
  } catch (error) {
    console.error('[API /extend] Exception:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}


