import { createBrowserClient } from '@supabase/ssr';

/**
 * Crée un client Supabase pour les composants côté client (client components)
 * Ce client s'exécute uniquement dans le navigateur.
 * 
 * @example
 * ```tsx
 * 'use client';
 * 
 * import { createClient } from '@/utils/supabase/client';
 * 
 * export default function ClientComponent() {
 *   const supabase = createClient();
 *   // Utiliser supabase pour les opérations côté client
 * }
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
} 

