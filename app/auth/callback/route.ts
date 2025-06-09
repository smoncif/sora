import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // Créer un client Supabase avec les cookies de la requête
    const supabase = createRouteHandlerClient({ cookies });
    
    // Échanger le code contre une session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Rediriger vers la page d'accueil après l'authentification
  return NextResponse.redirect(new URL('/', requestUrl.origin));
} 



