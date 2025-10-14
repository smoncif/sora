import { NextRequest, NextResponse } from 'next/server';

/**
 * 🔌 API Route : Lister les sessions SoD d'un utilisateur
 * 
 * GET /api/sod/sessions?userId=xxx
 * 
 * **Optimisations :**
 * - Cache pendant 2 minutes
 * - Liste ordonnée par date de création (plus récentes en premier)
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
    //   .order('created_at', { ascending: false });
    
    // Pour l'instant, retourner un tableau vide
    return NextResponse.json([], {
      headers: {
        // ✅ Cache pendant 2 minutes
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

/**
 * 📝 API Route : Créer une nouvelle session SoD
 * 
 * POST /api/sod/sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Implémenter la création dans Supabase
    // const supabase = createClient();
    // const { data, error } = await supabase
    //   .from('sod_sessions')
    //   .insert(body)
    //   .select()
    //   .single();
    
    const newSession = {
      id: `session-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    };
    
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}



