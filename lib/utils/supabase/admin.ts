import { createClient } from '@supabase/supabase-js'

/**
 * Client Supabase Admin avec service role key
 * ATTENTION : Utiliser uniquement côté serveur pour les opérations administratives
 * Ne jamais exposer au client
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variables d\'environnement Supabase manquantes pour le client admin')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Vérifier si un email existe déjà dans auth.users (contourne les RLS)
 * Utilisé uniquement côté serveur pour la validation d'inscription
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient()
    
    // Rechercher dans auth.users avec le client admin
    const { data, error } = await adminClient.auth.admin.listUsers()
    
    if (error) {
      console.error('❌ Erreur lors de la vérification admin des utilisateurs:', error)
      return false // En cas d'erreur, permettre l'inscription et laisser Supabase gérer
    }
    
    // Vérifier si l'email existe
    const emailExists = data.users.some(user => 
      user.email && user.email.toLowerCase() === email.toLowerCase()
    )
    
    return emailExists
  } catch (error) {
    console.error('❌ Erreur lors de la vérification d\'email admin:', error)
    return false // En cas d'erreur, permettre l'inscription
  }
} 