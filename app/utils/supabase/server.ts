import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

/**
 * Crée un client Supabase pour les composants côté serveur (server components),
 * les route handlers et les server actions.
 * 
 * @example
 * ```tsx
 * // Dans un Server Component
 * import { createClient } from '@/utils/supabase/server';
 * 
 * export default async function ServerComponent() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('table').select('*');
 *   return <div>{JSON.stringify(data)}</div>;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Dans un Server Action
 * 'use server';
 * 
 * import { createClient } from '@/utils/supabase/server';
 * 
 * export async function serverAction() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('table').select('*');
 *   return data;
 * }
 * ```
 */
export async function createClient() {
  // Dans Next.js 15, cookies() retourne maintenant une Promise
  const cookieStore = await cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options, expires: new Date(0) });
        },
      },
    }
  );
} 
