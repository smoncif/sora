import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'lib/utils/supabase/server';
import { hasAnyPermission } from 'lib/services/auth/rbacService';

// GET /api/analyses - Liste toutes les analyses auxquelles l'utilisateur a accès
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const publicOnly = searchParams.get('public_only') === 'true';
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Si non authentifié et public_only=true, retourne uniquement les analyses publiques
      if (publicOnly) {
        const { data, error } = await supabase
          .from('saved_analyses')
          .select('id, title, description, user_id, is_public, created_at, updated_at')
          .eq('is_public', true);
          
        if (error) throw error;
        return NextResponse.json({ analyses: data });
      }
      
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    // Pour un utilisateur authentifié
    let query = supabase
      .from('saved_analyses')
      .select('id, title, description, user_id, is_public, created_at, updated_at');
    
    if (publicOnly) {
      // Retourne uniquement les analyses publiques
      query = query.eq('is_public', true);
    } else {
      // Retourne les analyses de l'utilisateur et les analyses publiques
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
    }
    
    // Les admins peuvent voir toutes les analyses (RLS géré par Supabase)
    const { data, error } = await query;
    
    if (error) throw error;
    return NextResponse.json({ analyses: data });
  } catch (error) {

    return NextResponse.json({ error: 'Erreur lors de la récupération des analyses' }, { status: 500 });
  }
}

// POST /api/analyses - Crée une nouvelle analyse
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    
    const { title, description, is_public, data } = await request.json();
    
    const { data: analysis, error } = await supabase
      .from('saved_analyses')
      .insert({
        title,
        description,
        user_id: user.id,
        is_public: is_public || false,
        data
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Création de la première version
    const { error: versionError } = await supabase
      .from('analysis_versions')
      .insert({
        analysis_id: analysis.id,
        version_number: 1,
        data: data,
        changes: 'Version initiale'
      });
    
    if (versionError) throw versionError;
    
    return NextResponse.json({ analysis });
  } catch (error) {

    return NextResponse.json({ error: 'Erreur lors de la création de l\'analyse' }, { status: 500 });
  }
} 


