/**
 * API Route: GET /api/validation/links
 * Liste tous les liens de validation de l'utilisateur (ou tous si admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /validation/links] Début de la requête');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[API /validation/links] Erreur auth:', authError);
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }
    
    console.log('[API /validation/links] User authentifié:', user.id);
    
    // Récupérer le rôle de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (profileError) {
      console.error('[API /validation/links] Erreur profil:', profileError);
    }
    
    const isAdmin = profile?.role === 'admin';
    console.log('[API /validation/links] isAdmin:', isAdmin);
    
    // Construire la requête selon le rôle
    let query = supabase
      .from('role_validation_links')
      .select(`
        id,
        token,
        mission,
        business_roles,
        created_at,
        expires_at,
        status,
        technical_view_enabled,
        created_by,
        role_validation_results (
          id,
          process,
          submitted_at,
          validator_email,
          validator_name
        ),
        role_validation_drafts (
          id,
          process,
          updated_at
        )
      `);
    
    // Si pas admin, filtrer par created_by
    if (!isAdmin) {
      query = query.eq('created_by', user.id);
    }
    
    console.log('[API /validation/links] Exécution de la requête Supabase...');
    const { data: links, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('[API /validation/links] Erreur Supabase:', error);
      console.error('[API /validation/links] Code erreur:', error.code);
      console.error('[API /validation/links] Message:', error.message);
      console.error('[API /validation/links] Details:', error.details);
      return NextResponse.json(
        { 
          success: false, 
          error: `Erreur lors de la récupération: ${error.message}`,
          details: error.details 
        },
        { status: 500 }
      );
    }
    
    console.log('[API /validation/links] Liens récupérés:', links?.length || 0);
    
    // Enrichir les données
    const enrichedLinks = await Promise.all(
      (links || []).map(async (link) => {
        const now = new Date();
        const expiresAt = new Date(link.expires_at);
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Compter les processus
        const submittedProcesses = link.role_validation_results?.map((r: any) => r.process) || [];
        const draftProcesses = link.role_validation_drafts?.map((d: any) => d.process) || [];
        
        // Supprimer les doublons
        const uniqueSubmitted = [...new Set(submittedProcesses)];
        const uniqueDrafts = [...new Set(draftProcesses.filter((p: string) => !submittedProcesses.includes(p)))];
        
        // Récupérer l'email du créateur si admin
        let creatorEmail = null;
        if (isAdmin && link.created_by) {
          const { data: creatorData } = await supabase.auth.admin.getUserById(link.created_by);
          creatorEmail = creatorData?.user?.email || null;
        }
        
        return {
          id: link.id,
          token: link.token,
          mission: link.mission,
          businessRoles: link.business_roles as string[],
          createdAt: link.created_at,
          expiresAt: link.expires_at,
          status: link.status,
          technicalViewEnabled: link.technical_view_enabled,
          createdBy: link.created_by,
          creatorEmail,
          daysRemaining,
          isExpired: daysRemaining < 0,
          isExpiringSoon: daysRemaining >= 0 && daysRemaining <= 2,
          submittedCount: uniqueSubmitted.length,
          draftCount: uniqueDrafts.length,
          processes: {
            submitted: link.role_validation_results || [],
            drafts: link.role_validation_drafts || [],
          },
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: enrichedLinks,
      isAdmin,
    });
  } catch (error) {
    console.error('[API /validation/links] Exception:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

