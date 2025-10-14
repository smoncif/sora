import { NextRequest, NextResponse } from 'next/server';

/**
 * 🔌 API Route : Récupérer la session active d'un utilisateur
 * 
 * GET /api/sod/sessions/active?userId=xxx
 * 
 * **Optimisations :**
 * - Cache court (1 minute) car les sessions actives changent fréquemment
 * - Revalidation en arrière-plan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // TODO: Remplacer par votre logique Supabase réelle
    // import { createClient } from '@/lib/utils/supabase/server';
    // const supabase = createClient();
    // const { data, error } = await supabase
    //   .from('sod_sessions')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .eq('status', 'active')
    //   .order('created_at', { ascending: false })
    //   .limit(1)
    //   .maybeSingle();
    
    // Pour l'instant, retourner null (pas de session active)
    return NextResponse.json(null, {
      headers: {
        // ✅ Cache court pour données dynamiques
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error fetching active session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active session' },
      { status: 500 }
    );
  }
}



