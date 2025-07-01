import { NextRequest, NextResponse } from 'next/server';
import { updateSession, SupabaseAuthMiddleware } from './lib/utils/supabase/middleware';

/**
 * Routes publiques autorisées (accessibles sans authentification)
 */
const PUBLIC_ROUTES = [
  '/login',
  '/register', 
  '/auth/callback',
  '/api/auth/sign-up',
  '/api/auth/sign-out'
];

/**
 * Vérifie si une route est publique
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Middleware Next.js pour protection globale de l'authentification
 * Ce middleware s'exécute sur chaque requête et protège toutes les routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Mettre à jour la session Supabase
  const response = await updateSession(request);
  
  // Si c'est une route publique, permettre l'accès
  if (isPublicRoute(pathname)) {
    return response;
  }
  
  // Pour toutes les autres routes, vérifier l'authentification
  const { user } = await SupabaseAuthMiddleware.checkAuthentication(request);
  
  if (!user) {
    // Rediriger vers la page de login si non connecté
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Si c'est la page d'accueil (/), rediriger vers le dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Utilisateur connecté, permettre l'accès
  return response;
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
