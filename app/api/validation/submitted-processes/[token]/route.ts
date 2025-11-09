/**
 * API Route: GET /api/validation/submitted-processes/[token]
 * Récupère la liste des processus déjà soumis pour un lien
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    console.log('🔍 [API /submitted-processes] Requête reçue');
    console.log(`  Token: ${token}`);
    
    const supabase = await createClient();
    
    // Récupérer le lien
    console.log('📡 [API /submitted-processes] Récupération du lien depuis Supabase...');
    const { data: linkData, error: linkError } = await supabase
      .from('role_validation_links')
      .select('id')
      .eq('token', token)
      .single();
    
    if (linkError || !linkData) {
      console.error('❌ [API /submitted-processes] Lien non trouvé:', linkError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Lien de validation introuvable' 
        },
        { status: 404 }
      );
    }
    
    console.log('✅ [API /submitted-processes] Lien trouvé:', { linkId: linkData.id });
    
    // Récupérer les processus déjà soumis
    console.log('📡 [API /submitted-processes] Récupération des processus soumis...');
    const { data: results, error: resultsError } = await supabase
      .from('role_validation_results')
      .select('process')
      .eq('link_id', linkData.id);
    
    if (resultsError) {
      console.error('❌ [API /submitted-processes] Erreur Supabase:', resultsError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur lors de la récupération des processus soumis' 
        },
        { status: 500 }
      );
    }
    
    // Extraire les noms de processus
    const submittedProcesses = results?.map(r => r.process).filter(Boolean) || [];
    
    console.log('✅ [API /submitted-processes] Processus soumis récupérés:', {
      count: submittedProcesses.length,
      processes: submittedProcesses,
    });
    
    return NextResponse.json({
      success: true,
      data: submittedProcesses,
    });
  } catch (error) {
    console.error('❌ [API /submitted-processes] Exception:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur serveur' 
      },
      { status: 500 }
    );
  }
}

