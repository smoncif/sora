import { NextRequest } from 'next/server'
import { createClient } from 'lib/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        try {
          // Mettre à jour le statut dans la table profiles après confirmation email
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email_confirmed: true,
              status: 'pending_admin_approval', // Passer au statut suivant
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)

          if (updateError) {
            console.error('❌ Error updating profile after email confirmation:', updateError)
          }
        } catch (profileUpdateError) {
          console.error('❌ Error in profile update:', profileUpdateError)
        }
      }
      
      // Rediriger selon le paramètre next
      if (next === 'pending-approval') {
        return redirect(`${origin}/pending-approval`)
      }
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return redirect(`${origin}/pending-approval`)
      } else if (forwardedHost) {
        return redirect(`https://${forwardedHost}/pending-approval`)
      } else {
        return redirect(`${origin}/pending-approval`)
      }
    }
  }

  // En cas d'erreur, rediriger vers la page de connexion avec un message d'erreur
  return redirect(`${origin}/login?error=auth_callback_error`)
} 



