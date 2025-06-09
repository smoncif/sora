import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Fonction pour mettre à jour la session Supabase dans le middleware Next.js
 * Elle est responsable de:
 * 1. Rafraîchir le token d'authentification (en appelant getUser)
 * 2. Transmettre le token rafraîchi aux Server Components
 * 3. Transmettre le token rafraîchi au navigateur
 */
export async function updateSession(request: NextRequest) {
  // Récupère l'URL de la requête entrante
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Crée le client Supabase avec les cookies de la requête
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Définir les cookies sur la requête et la réponse
          // NextRequest.cookies utilise une API différente de NextResponse.cookies
          request.cookies.set({
            name,
            value,
          });
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // NextResponse.cookies accepte les options complètes
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Supprimer les cookies de la requête et de la réponse
          // NextRequest.cookies utilise une API différente
          request.cookies.delete(name);
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          // NextResponse.cookies accepte les options complètes
          response.cookies.set({
            name,
            value: '',
            ...options,
            expires: new Date(0),
          });
        },
      },
    }
  );

  // Rafraîchir la session Auth (force l'écriture des cookies)
  await supabase.auth.getUser();

  return response;
} 

