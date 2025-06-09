import { NextRequest } from 'next/server';
import { updateSession } from './app/utils/supabase/middleware';

/**
 * Middleware Next.js pour rafraîchir les sessions Supabase
 * Ce middleware s'exécute sur chaque requête qui correspond au pattern matcher
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Configuration du matcher pour le middleware
 * Cela permet au middleware de s'exécuter uniquement sur les routes qui correspondent au pattern
 * et d'éviter les fichiers statiques et les images.
 */
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf celles qui commencent par:
     * - _next/static (fichiers statiques)
     * - _next/image (fichiers d'optimisation d'image)
     * - favicon.ico (favicon)
     * - images et autres types de fichiers communs
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 
